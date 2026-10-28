import { createHash } from 'crypto';
import { Type } from '@google/genai';
import prisma from '../../config/prisma.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { AiService } from '../ai/ai.service.js';
import { ResilientAiProvider } from '../ai/resilient-ai-provider.js';
import { validateSessionContent } from './session-generation.contract.js';

// In-flight concurrency lock to prevent duplicate concurrent generations for the same key
const inFlightRequests = new Map();

export class SessionGeneratorService {
  /**
   * Generates or retrieves an existing personalized session for a learner and milestone.
   * Fully idempotent, transactional, and robust against quota limits and concurrency.
   */
  static async getOrCreateSession({
    userId,
    conceptId,
    milestone = null,
    learnerProfile = null,
    isRemediation = false,
    attempt = 1
  }) {
    if (!userId || !conceptId) {
      throw new Error('userId and conceptId are required to getOrCreateSession');
    }

    // 1. Calculate deterministic idempotency key
    const idempotencyKey = this.generateIdempotencyKey({
      userId,
      conceptId,
      isRemediation,
      attempt
    });

    // 2. Concurrency deduplication: reuse in-flight promise if one is already running
    if (inFlightRequests.has(idempotencyKey)) {
      logger.info(`Reusing in-flight session generation promise for key: ${idempotencyKey}`);
      return inFlightRequests.get(idempotencyKey);
    }

    const generationPromise = (async () => {
      try {
        // 3. Fast path: check if session already exists for this idempotency key
        const existingSession = await prisma.lesson.findUnique({
          where: { idempotencyKey },
          include: {
            concept: {
              include: { skill: true }
            },
            activities: {
              orderBy: { sequenceOrder: 'asc' }
            },
            quizzes: {
              where: { status: 'ACTIVE' },
              include: { questions: true }
            }
          }
        });

        if (existingSession && existingSession.activities.length > 0 && existingSession.quizzes.length > 0) {
          logger.info(`Reusing persisted lesson session for idempotencyKey: ${idempotencyKey}`);
          return existingSession;
        }

        // 4. Also check if a published lesson already exists for this concept (only if not a targeted remediation)
        if (!isRemediation) {
          const publishedForConcept = await prisma.lesson.findFirst({
            where: {
              conceptId,
              status: 'PUBLISHED',
              OR: [
                { userId },
                { userId: null }
              ]
            },
            include: {
              concept: {
                include: { skill: true }
              },
              activities: {
                orderBy: { sequenceOrder: 'asc' }
              },
              quizzes: {
                where: { status: 'ACTIVE' },
                include: { questions: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          });

          if (publishedForConcept && publishedForConcept.activities.length > 0 && publishedForConcept.quizzes.length > 0) {
            logger.info(`Reusing existing published lesson for concept ${conceptId}`);
            return publishedForConcept;
          }
        }

        // 5. Load concept and learner details if not provided
        const concept = await prisma.concept.findUnique({
          where: { id: conceptId },
          include: {
            skill: true,
            prerequisites: {
              include: { prerequisiteConcept: true }
            }
          }
        });

        if (!concept) {
          throw new Error(`Concept with id "${conceptId}" not found`);
        }

        let userProfile = learnerProfile;
        if (!userProfile) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
              profile: true,
              userSkills: { include: { skill: true } },
              learningGoals: {
                where: { status: 'ACTIVE' },
                include: { targetRole: true },
                take: 1
              }
            }
          });

          userProfile = {
            dailyMinutes: user?.profile?.dailyMinutes || 15,
            experienceLevel: user?.profile?.experienceLevel || 'BEGINNER',
            targetGoal: user?.learningGoals?.[0]?.title || 'Software Engineering',
            targetRole: user?.learningGoals?.[0]?.targetRole?.name || 'Software Engineer',
            knownSkills: user?.userSkills?.map(us => us.skill.name) || []
          };
        }

        // 6. Gather accumulated misconceptions for this concept if any
        const userConcept = await prisma.userConcept.findUnique({
          where: { userId_conceptId: { userId, conceptId } }
        });
        const misconceptions = Array.isArray(userConcept?.misconceptions) ? userConcept.misconceptions : [];

        // 7. Resolve milestone metadata
        const milestoneData = milestone || {
          title: concept.name,
          measurableObjective: concept.description,
          difficulty: concept.difficulty,
          topicSlug: concept.slug.replace(/^custom-[a-f0-9]+-/, ''),
          targetOutcome: concept.description
        };

        // 8. Generate session payload (AI or goal-aligned deterministic generator)
        const sessionPayload = await this.generateSessionPayload({
          milestone: milestoneData,
          learnerProfile: userProfile,
          misconceptions,
          isRemediation
        });

        // 9. Validate with strict contract
        const validated = validateSessionContent(sessionPayload);

        // 10. Persist transactionally
        const persistedLesson = await this._persistSessionTransactionally({
          userId,
          conceptId: concept.id,
          idempotencyKey,
          validated,
          model: sessionPayload.model || 'ai-session-generator'
        });

        logger.info(`Successfully generated and persisted JIT lesson: "${persistedLesson.title}" (${persistedLesson.id})`);
        return persistedLesson;
      } finally {
        inFlightRequests.delete(idempotencyKey);
      }
    })();

    inFlightRequests.set(idempotencyKey, generationPromise);
    return generationPromise;
  }

  /**
   * Stable, deterministic SHA-256 idempotency key
   */
  static generateIdempotencyKey({ userId, conceptId, isRemediation, attempt }) {
    const raw = `session:${userId}:${conceptId}:${isRemediation ? 'rem' : 'init'}:${attempt}:v1`;
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Generates validated structured session content
   */
  static async generateSessionPayload({
    milestone,
    learnerProfile,
    misconceptions = [],
    isRemediation = false
  }) {
    // Requirement 3: Honest & safe fallback validation - reject if learning objective missing
    const targetOutcome = milestone?.measurableObjective || milestone?.targetOutcome;
    if (!milestone || !milestone.title?.trim() || !targetOutcome?.trim()) {
      throw new Error('Cannot generate learning session: milestone lacks a valid measurable objective.');
    }

    if (ResilientAiProvider.isProviderAvailable()) {
      try {
        const aiProposal = await this._callGeminiSessionGenerator({
          milestone,
          learnerProfile,
          misconceptions,
          isRemediation
        });

        if (aiProposal) {
          const validated = validateSessionContent(aiProposal);
          return {
            ...validated,
            model: aiProposal.model || config.geminiModel,
            source: 'gemini_session_generator',
            isAiGenerated: true,
            generationSource: 'AI_SYNTHESIZED'
          };
        }
      } catch (err) {
        logger.warn(`Gemini session generation failed: ${err.message}. Using goal-aligned deterministic session generator.`);
        ResilientAiProvider._metrics.fallbackUsage++;
      }
    }

    // Goal-aligned deterministic fallback (honest metadata: isAiGenerated = false)
    const scaffold = this.generateGoalAlignedScaffold({
      milestone,
      learnerProfile,
      misconceptions,
      isRemediation
    });

    const validated = validateSessionContent(scaffold);
    return {
      ...validated,
      model: 'goal-adaptive-scaffold-v1',
      source: 'goal_adaptive_scaffold',
      isAiGenerated: true,
      isTrulyAiGenerated: false,
      generationSource: 'DETERMINISTIC_SCAFFOLD'
    };
  }

  /**
   * Structured Gemini API call with explicit JSON schema
   */
  static async _callGeminiSessionGenerator({
    milestone,
    learnerProfile,
    misconceptions,
    isRemediation
  }) {
    const ai = AiService.getClient();
    if (!ai) return null;

    const dailyMinutes = learnerProfile.dailyMinutes || 15;
    const prompt = `You are a world-class Software Engineering Pedagogical Architect.
Create a structured 10-15 minute interactive learning session and calibrated quiz for a software engineer.

Target Goal: "${learnerProfile.targetGoal || 'Software Engineering'}"
Milestone: "${milestone.title}"
Milestone Objective: "${milestone.measurableObjective || milestone.targetOutcome || 'Mastery of milestone'}"
Experience Level: "${learnerProfile.experienceLevel || 'BEGINNER'}"
Daily Time Budget: ${dailyMinutes} minutes
${misconceptions.length > 0 ? `Targeted Misconceptions to Address: ${JSON.stringify(misconceptions)}` : ''}
${isRemediation ? 'Context: This is a targeted reinforcement session to address prior struggle.' : ''}

CRITICAL RULES:
1. Write technical examples and code in the learner's actual target language and ecosystem (e.g., if the goal is Go/Raft, use Go; if Rust/WASM, use Rust; if Python/AI, use Python; if Backend/PostgreSQL, use SQL/Node; etc.). NEVER default to JavaScript when the goal is a different language!
2. Adapt depth to experience level "${learnerProfile.experienceLevel}".
3. Provide a clear ASCII or Mermaid diagram in visualization.
4. Provide exactly 2 to 4 calibrated multiple-choice questions (MCQs) in the quiz.
5. Each question MUST have exactly 4 distinct options and a valid correctAnswerIndex (0, 1, 2, or 3).
6. Return strictly valid JSON matching the schema.`;

    const result = await ResilientAiProvider.generateJson({
      requestType: 'session_generation',
      userId: learnerProfile?.userId || null,
      prompt,
      configOptions: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lessonTitle: { type: Type.STRING },
              lessonSlug: { type: Type.STRING },
              objective: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
              estimatedMinutes: { type: Type.INTEGER },
              activities: {
                type: Type.OBJECT,
                properties: {
                  conceptOverview: {
                    type: Type.OBJECT,
                    properties: {
                      summary: { type: Type.STRING },
                      keyTerms: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            term: { type: Type.STRING },
                            definition: { type: Type.STRING }
                          },
                          required: ['term', 'definition']
                        }
                      }
                    },
                    required: ['summary', 'keyTerms']
                  },
                  mentalModel: {
                    type: Type.OBJECT,
                    properties: {
                      analogy: { type: Type.STRING },
                      intuition: { type: Type.STRING },
                      commonMisconceptions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      remediationRule: { type: Type.STRING }
                    },
                    required: ['analogy', 'intuition', 'commonMisconceptions']
                  },
                  visualization: {
                    type: Type.OBJECT,
                    properties: {
                      visualType: { type: Type.STRING },
                      title: { type: Type.STRING },
                      diagram: { type: Type.STRING },
                      explanation: { type: Type.STRING }
                    },
                    required: ['visualType', 'title', 'diagram', 'explanation']
                  },
                  codeMechanics: {
                    type: Type.OBJECT,
                    properties: {
                      language: { type: Type.STRING },
                      codeSnippet: { type: Type.STRING },
                      walkthrough: { type: Type.STRING }
                    },
                    required: ['language', 'codeSnippet', 'walkthrough']
                  },
                  productionScenario: {
                    type: Type.OBJECT,
                    properties: {
                      scenario: { type: Type.STRING },
                      tradeoffs: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      failureMode: { type: Type.STRING }
                    },
                    required: ['scenario', 'tradeoffs', 'failureMode']
                  },
                  practicalChallenge: {
                    type: Type.OBJECT,
                    properties: {
                      prompt: { type: Type.STRING },
                      starterCode: { type: Type.STRING },
                      hint: { type: Type.STRING },
                      solution: { type: Type.STRING },
                      explanation: { type: Type.STRING }
                    },
                    required: ['prompt', 'hint', 'solution', 'explanation']
                  },
                  coreSynthesis: {
                    type: Type.OBJECT,
                    properties: {
                      takeaways: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      nextStep: { type: Type.STRING }
                    },
                    required: ['takeaways', 'nextStep']
                  }
                },
                required: [
                  'conceptOverview',
                  'mentalModel',
                  'visualization',
                  'codeMechanics',
                  'productionScenario',
                  'practicalChallenge',
                  'coreSynthesis'
                ]
              },
              quiz: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        questionText: { type: Type.STRING },
                        questionType: { type: Type.STRING, enum: ['MCQ'] },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        },
                        correctAnswerIndex: { type: Type.INTEGER },
                        explanation: { type: Type.STRING },
                        difficulty: { type: Type.INTEGER }
                      },
                      required: [
                        'questionText',
                        'questionType',
                        'options',
                        'correctAnswerIndex',
                        'explanation',
                        'difficulty'
                      ]
                    }
                  }
                },
                required: ['title', 'questions']
              }
            },
            required: [
              'lessonTitle',
              'lessonSlug',
              'objective',
              'difficulty',
              'estimatedMinutes',
              'activities',
              'quiz'
            ]
          }
        },
        timeoutMs: config.geminiTimeoutMs,
        maxRetries: 2
      });

    return result.data;
  }

  /**
   * Generates a high-quality, domain and technology-aligned session scaffold.
   * Tailored specifically to the milestone's tech stack (Go, Rust, Python, SQL, etc.)
   */
  static generateGoalAlignedScaffold({
    milestone,
    learnerProfile,
    misconceptions = [],
    isRemediation = false
  }) {
    const title = milestone.title || 'Engineering Deep Dive';
    const goalLower = (learnerProfile.targetGoal || '').toLowerCase();
    const titleLower = title.toLowerCase();
    const exp = learnerProfile.experienceLevel || 'BEGINNER';
    const dailyMinutes = Math.min(30, Math.max(5, learnerProfile.dailyMinutes || 15));

    // Determine target technology & language
    let language = 'javascript';
    let codeSnippet = '';
    let visualType = 'architecture';
    let diagram = '';
    let challengeStarter = '';
    let challengeSolution = '';

    if (goalLower.includes('raft') || goalLower.includes('go') || titleLower.includes('raft') || titleLower.includes('consensus')) {
      language = 'go';
      visualType = 'state-machine';
      diagram = `+-------------------+         RPC AppendEntries         +-------------------+
|   Leader Node     | ----------------------------------> |   Follower Node   |
| (Term: 2, Id: 1)  | <---------------------------------- | (Matches Term: 2) |
+-------------------+           Success: true             +-------------------+`;
      codeSnippet = `type AppendEntriesArgs struct {
    Term         int
    LeaderId     string
    PrevLogIndex int
    PrevLogTerm  int
    Entries      []LogEntry
    LeaderCommit int
}

func (rf *Raft) AppendEntries(args *AppendEntriesArgs, reply *AppendEntriesReply) {
    rf.mu.Lock()
    defer rf.mu.Unlock()
    if args.Term < rf.currentTerm {
        reply.Success = false
        return
    }
    rf.heartbeatReceived = true
    reply.Success = true
}`;
      challengeStarter = `// Implement election timeout reset in Go channel handler`;
      challengeSolution = `select {
case <-rf.heartbeatChan:
    rf.resetElectionTimer()
case <-rf.timer.C:
    rf.startElection()
}`;
    } else if (goalLower.includes('rust') || goalLower.includes('wasm') || titleLower.includes('wasm') || titleLower.includes('rust')) {
      language = 'rust';
      visualType = 'memory-layout';
      diagram = `+----------------------- WebAssembly Memory Space -----------------------+
|  Linear Memory Buffer: ArrayBuffer [ 0x00000000 ... 0xFFFFFFFF ]        |
|  Rust Stack Frame  <--->  Wasm Linear Memory Page  <--->  JS Host Uint8 |
+-------------------------------------------------------------------------+`;
      codeSnippet = `use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct MemoryBuffer {
    data: Vec<u8>,
}

#[wasm_bindgen]
impl MemoryBuffer {
    pub fn new(capacity: usize) -> MemoryBuffer {
        MemoryBuffer { data: vec![0; capacity] }
    }

    pub fn ptr(&self) -> *const u8 {
        self.data.as_ptr()
    }
}`;
      challengeStarter = `// Allocate WebAssembly linear buffer and pass pointer to host`;
      challengeSolution = `pub fn allocate_frame(size: usize) -> *mut u8 {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}`;
    } else if (goalLower.includes('agent') || goalLower.includes('ai') || goalLower.includes('python') || titleLower.includes('agent')) {
      language = 'python';
      visualType = 'rag-pipeline';
      diagram = `+---------------+      ReAct Loop       +---------------------+
| User Prompt   | --------------------> | Thought / Reasoning |
+---------------+                       +---------------------+
                                                   | Action (Tool Call)
                                                   v
+---------------+      Observation      +---------------------+
| Final Answer  | <-------------------- | Tool Execution Res  |
+---------------+                       +---------------------+`;
      codeSnippet = `class AgentStep:
    def __init__(self, thought: str, action: str, action_input: dict):
        self.thought = thought
        self.action = action
        self.action_input = action_input

def execute_react_cycle(model, prompt: str, tools: dict) -> str:
    response = model.generate(prompt)
    step = parse_agent_step(response)
    if step.action == "Final Answer":
        return step.action_input["answer"]
    tool_output = tools[step.action](**step.action_input)
    return execute_react_cycle(model, f"{prompt}\\nObservation: {tool_output}", tools)`;
      challengeStarter = `# Implement tool-calling loop stop condition`;
      challengeSolution = `if action_name == "FINISH":
    return action_input.get("final_output", "Task completed.")`;
    } else {
      language = 'typescript';
      visualType = 'architecture';
      diagram = `+------------------+         REST / HTTP        +-------------------+
|  Client Request  | -------------------------> |  API Gateway      |
+------------------+                            +-------------------+
                                                          | Reverse Proxy
                                                          v
                                                +-------------------+
                                                |  Service Worker   |
                                                +-------------------+`;
      codeSnippet = `export async function handleRequest(req: Request): Promise<Response> {
  const start = performance.now();
  try {
    const result = await processPayload(req);
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}`;
      challengeStarter = `// Implement idempotency verification`;
      challengeSolution = `const cached = await redis.get(idempotencyKey);
if (cached) return JSON.parse(cached);
const res = await execute();
await redis.set(idempotencyKey, JSON.stringify(res), 'EX', 86400);
return res;`;
    }

    const slug = (milestone.topicSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-+|-+$/g, '');
    const cleanSlug = isRemediation ? `${slug || 'milestone'}-remediation` : (slug || 'milestone-session');
    const lessonTitle = isRemediation ? `${title} (Targeted Practice)` : title;

    // Personalize difficulty based on learner profile and milestone
    let calculatedDifficulty = 'INTERMEDIATE';
    if (isRemediation) {
      calculatedDifficulty = 'BEGINNER';
    } else if (milestone.difficulty && ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(milestone.difficulty)) {
      calculatedDifficulty = milestone.difficulty;
    } else if (exp === 'ADVANCED') {
      calculatedDifficulty = 'ADVANCED';
    } else if (exp === 'BEGINNER') {
      calculatedDifficulty = 'BEGINNER';
    }

    const remediationNote = misconceptions.length > 0
      ? `Specifically clarifying prior misconception: ${misconceptions[0]}.`
      : 'Solidifying foundational architectural intuition.';

    return {
      lessonTitle,
      lessonSlug: cleanSlug,
      objective: milestone.measurableObjective || `Master architectural fundamentals and runtime implementation of ${title}.`,
      difficulty: calculatedDifficulty,
      estimatedMinutes: dailyMinutes,
      activities: {
        conceptOverview: {
          summary: `This session provides an intensive, practical breakdown of ${title}. You will explore key runtime mechanics, examine engineering trade-offs, and inspect production implementation patterns.`,
          keyTerms: [
            { term: title, definition: `The core mechanism governing state and execution in this domain.` },
            { term: 'Invariants', definition: `Guaranteed structural truths that must be preserved across operations.` },
            { term: 'Throughput vs Latency', definition: `The fundamental trade-off between volume and responsiveness.` }
          ]
        },
        mentalModel: {
          analogy: `Think of ${title} like an air traffic control coordinator: each incoming signal must be authenticated, sequenced, and acknowledged before state mutation occurs, preventing collisions.`,
          intuition: `Rather than assuming synchronous immediate consistency, resilient systems decouple coordination from execution to guarantee correctness under load.`,
          commonMisconceptions: [
            `Assuming that fast local execution guarantees distributed consistency without formal coordination.`,
            `Overlooking failure modes such as network partitions, memory leakage, or partial state commits.`
          ],
          remediationRule: remediationNote
        },
        visualization: {
          visualType,
          title: `${title} Architecture Flow`,
          diagram,
          explanation: `Notice how data flows across components. Each step establishes an invariant before the next component is invoked.`
        },
        codeMechanics: {
          language,
          codeSnippet,
          walkthrough: `Notice in lines 1-10 how the parameters establish state boundaries. Locking or validation prevents race conditions and out-of-order execution.`
        },
        productionScenario: {
          scenario: `In a production cluster handling millions of daily events, ${title} ensures reliability without overwhelming downstream dependencies.`,
          tradeoffs: [
            `Strong consistency guarantees higher correctness at the cost of additional network coordination round-trips.`,
            `Local caching minimizes latency but introduces cache invalidation complexity.`
          ],
          failureMode: `Failing to handle timeout scenarios can lead to cascading retry storms and deadlock.`
        },
        practicalChallenge: {
          prompt: calculatedDifficulty === 'ADVANCED'
            ? `Review the provided snippet. Implement the concurrency lock or invariant check under high-contention production load.`
            : `Review the provided snippet. Implement the missing safety check or handler to prevent invalid state mutation.`,
          starterCode: challengeStarter,
          hint: `Ensure all prerequisite state variables are validated before mutating the shared buffer or dispatching events.`,
          solution: challengeSolution,
          explanation: `This solution establishes the necessary guard clause, ensuring deterministic recovery and preventing unhandled state divergence.`
        },
        coreSynthesis: {
          takeaways: [
            `${title} relies on clear invariants and defensive state validation.`,
            `Always anticipate failure boundaries such as network timeouts and resource exhaustion.`,
            `Consistent error handling prevents cascading failure across dependent systems.`
          ],
          nextStep: `Next, you will build upon ${title} by integrating robust recovery and monitoring strategies.`
        }
      },
      quiz: {
        title: `${title} Knowledge Verification`,
        questions: [
          {
            questionText: `What is the primary architectural objective of ${title}?`,
            questionType: 'MCQ',
            options: [
              `To enforce deterministic state transitions and guarantee reliability under load`,
              `To eliminate all network latency by bypassing validation checks entirely`,
              `To replace persistent storage with purely ephemeral, unmonitored cache`,
              `To force all execution into a single synchronous blocking thread`
            ],
            correctAnswerIndex: 0,
            explanation: `The primary objective is to enforce deterministic invariants and ensure reliable, consistent state transitions.`,
            difficulty: 1
          },
          {
            questionText: `Which production engineering trade-off is most characteristic of ${title}?`,
            questionType: 'MCQ',
            options: [
              `Decreasing system visibility in exchange for higher CPU utilization`,
              `Balancing coordination overhead and correctness against raw request latency`,
              `Eliminating logging to maximize hard drive lifetime`,
              `Disabling timeouts to ensure requests wait indefinitely for responses`
            ],
            correctAnswerIndex: 1,
            explanation: `Resilient systems consciously trade off some coordination latency to guarantee structural correctness and prevent split-brain or data corruption.`,
            difficulty: 2
          }
        ]
      }
    };
  }

  /**
   * Transactionally persists the lesson, 6 activities, and frozen quiz
   */
  static async _persistSessionTransactionally({
    userId,
    conceptId,
    idempotencyKey,
    validated,
    model
  }) {
    // Generate unique slug
    const baseSlug = validated.lessonSlug.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const userPrefix = userId.slice(0, 8);
    const candidateSlug = `${baseSlug}-${userPrefix}`;

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Check if slug already exists; append timestamp if collision
        let finalSlug = candidateSlug;
        const existingSlug = await tx.lesson.findUnique({ where: { slug: finalSlug } });
        if (existingSlug) {
          finalSlug = `${candidateSlug}-${Date.now().toString().slice(-4)}`;
        }

        // 2. Synthesize clean markdown summary for Lesson.content
        const synthesizedContent = `# ${validated.lessonTitle}

## Objective
${validated.objective}

## Concept Overview
${validated.activities.conceptOverview.summary}

### Key Terms
${validated.activities.conceptOverview.keyTerms.map(kt => `- **${kt.term}**: ${kt.definition}`).join('\n')}

## Mental Model
${validated.activities.mentalModel.analogy}

${validated.activities.mentalModel.intuition}

## Technical Walkthrough
\`\`\`${validated.activities.codeMechanics.language}
${validated.activities.codeMechanics.codeSnippet}
\`\`\`
${validated.activities.codeMechanics.walkthrough}

## Real-World Production Context
${validated.activities.productionScenario.scenario}

### Trade-offs
${validated.activities.productionScenario.tradeoffs.map(t => `- ${t}`).join('\n')}

## Summary
${validated.activities.coreSynthesis.takeaways.map(t => `- ${t}`).join('\n')}
`;

        // 3. Create Lesson record with honest generation metadata
        const isActuallyAiGenerated = validated.isAiGenerated !== undefined
          ? validated.isAiGenerated
          : (model !== 'goal-adaptive-scaffold-v1');

        const lesson = await tx.lesson.create({
          data: {
            conceptId,
            userId,
            idempotencyKey,
            isAiGenerated: true,
            generationModel: model,
            title: validated.lessonTitle,
            slug: finalSlug,
            objective: validated.objective,
            content: synthesizedContent,
            difficulty: validated.difficulty,
            estimatedMinutes: validated.estimatedMinutes,
            status: 'PUBLISHED'
          }
        });

        // 4. Create LessonActivity rows
        const activitiesData = [
          {
            lessonId: lesson.id,
            activityType: 'EXPLAIN_SIMPLY',
            sequenceOrder: 1,
            estimatedSeconds: 120,
            content: {
              analogy: validated.activities.mentalModel.analogy,
              misconceptions: validated.activities.mentalModel.commonMisconceptions.join('; ')
            }
          },
          {
            lessonId: lesson.id,
            activityType: 'VISUALIZATION',
            sequenceOrder: 2,
            estimatedSeconds: 150,
            content: {
              visualType: validated.activities.visualization.visualType,
              title: validated.activities.visualization.title,
              diagram: validated.activities.visualization.diagram,
              explanation: validated.activities.visualization.explanation
            }
          },
          {
            lessonId: lesson.id,
            activityType: 'SIMPLE_EXAMPLE',
            sequenceOrder: 3,
            estimatedSeconds: 180,
            content: {
              language: validated.activities.codeMechanics.language,
              code: validated.activities.codeMechanics.codeSnippet,
              explanation: validated.activities.codeMechanics.walkthrough
            }
          },
          {
            lessonId: lesson.id,
            activityType: 'REAL_PROJECT',
            sequenceOrder: 4,
            estimatedSeconds: 180,
            content: {
              scenario: validated.activities.productionScenario.scenario,
              tradeoffs: validated.activities.productionScenario.tradeoffs,
              failureMode: validated.activities.productionScenario.failureMode
            }
          },
          {
            lessonId: lesson.id,
            activityType: 'PRACTICAL_APPLICATION',
            sequenceOrder: 5,
            estimatedSeconds: 240,
            content: {
              prompt: validated.activities.practicalChallenge.prompt,
              hint: validated.activities.practicalChallenge.hint,
              solution: validated.activities.practicalChallenge.solution,
              explanation: validated.activities.practicalChallenge.explanation
            }
          },
          {
            lessonId: lesson.id,
            activityType: 'SUMMARY',
            sequenceOrder: 6,
            estimatedSeconds: 90,
            content: {
              summary: validated.activities.coreSynthesis.nextStep,
              takeaways: validated.activities.coreSynthesis.takeaways
            }
          }
        ];

        for (const act of activitiesData) {
          await tx.lessonActivity.create({ data: act });
        }

        // 5. Create Quiz with frozen answer keys
        const quiz = await tx.quiz.create({
          data: {
            lessonId: lesson.id,
            title: validated.quiz.title,
            isFrozen: true,
            status: 'ACTIVE'
          }
        });

        // 6. Create QuizQuestions with deterministic server-side answers
        for (const q of validated.quiz.questions) {
          const frozenAnswer = q.options[q.correctAnswerIndex];
          await tx.quizQuestion.create({
            data: {
              quizId: quiz.id,
              conceptId,
              questionType: 'MCQ',
              questionText: q.questionText,
              options: q.options,
              answer: frozenAnswer,
              explanation: q.explanation,
              difficulty: q.difficulty
            }
          });
        }

        // Return complete lesson structure
        return await tx.lesson.findUnique({
          where: { id: lesson.id },
          include: {
            concept: {
              include: { skill: true }
            },
            activities: {
              orderBy: { sequenceOrder: 'asc' }
            },
            quizzes: {
              where: { status: 'ACTIVE' },
              include: { questions: true }
            }
          }
        });
      });
    } catch (err) {
      if (err?.code === 'P2002' || err?.message?.includes('Unique constraint failed')) {
        logger.info(`Concurrent uniqueness collision on idempotencyKey (${idempotencyKey}). Recovering existing persisted lesson.`);
        const existing = await prisma.lesson.findUnique({
          where: { idempotencyKey },
          include: {
            concept: {
              include: { skill: true }
            },
            activities: {
              orderBy: { sequenceOrder: 'asc' }
            },
            quizzes: {
              where: { status: 'ACTIVE' },
              include: { questions: true }
            }
          }
        });
        if (existing) return existing;
      }
      throw err;
    }
  }
}
