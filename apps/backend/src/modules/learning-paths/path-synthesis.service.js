import { Type } from '@google/genai';
import { AiService } from '../ai/ai.service.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { validateAndSortMilestones } from './path-synthesis.contract.js';

export class PathSynthesisService {
  /**
   * Synthesizes an individualized, dependency-validated learning path from learner profile.
   * Can generate paths for any legitimate software engineering goal (e.g. Raft in Go, WASM in Rust, etc.)
   */
  static async synthesizePersonalizedPath({
    goalTitle = 'Become a Software Engineer',
    targetRole = 'Software Engineer',
    experienceLevel = 'BEGINNER',
    dailyMinutes = 15,
    knownSkills = [],
    existingMastery = {}
  }) {
    // 1. If Gemini AI is configured, try live AI synthesis
    if (AiService.isRealProviderConfigured()) {
      try {
        const aiProposal = await this._callGeminiPathSynthesizer({
          goalTitle,
          targetRole,
          experienceLevel,
          dailyMinutes,
          knownSkills
        });

        if (aiProposal) {
          const validated = validateAndSortMilestones(aiProposal);
          logger.info(`AI successfully synthesized personalized path for goal: "${goalTitle}" (${validated.milestones.length} milestones)`);
          return {
            ...validated,
            source: 'gemini_path_synthesizer',
            model: config.geminiModel
          };
        }
      } catch (err) {
        logger.warn(`Gemini path synthesis failed: ${err.message}. Using goal-aligned deterministic synthesizer.`);
      }
    }

    // 2. Deterministic goal-aligned scaffold synthesizer (zero unrelated fallback!)
    const scaffold = this.generateGoalScaffold({
      goalTitle,
      targetRole,
      experienceLevel,
      dailyMinutes,
      knownSkills
    });

    const validated = validateAndSortMilestones(scaffold);
    return {
      ...validated,
      source: 'goal_adaptive_scaffold_synthesizer',
      model: 'deterministic-v1'
    };
  }

  /**
   * Calls Gemini with structured output schema to synthesize an individualized path
   */
  static async _callGeminiPathSynthesizer({
    goalTitle,
    targetRole,
    experienceLevel,
    dailyMinutes,
    knownSkills
  }) {
    const ai = AiService.getClient();
    if (!ai) return null;

    const prompt = `You are a Principal Curriculum Architect and Technical Mentor for Software Engineers.
A software engineering learner has defined their specific career or learning goal.

Learner Profile:
- Goal: "${goalTitle}"
- Target Role: "${targetRole}"
- Current Experience Level: "${experienceLevel}" (calibrate concept difficulty accordingly)
- Daily Available Learning Budget: ${dailyMinutes} minutes/day
- Self-Reported Known Skills: ${JSON.stringify(knownSkills)}

Task:
Synthesize an individualized, dependency-aware milestone learning path to take this learner from their current level to mastery of this goal.
The goal can be ANY legitimate engineering topic (e.g. "Distributed consensus in Go", "WebAssembly with Rust", "Building AI Agents", "Cloud Infrastructure", "Kubernetes Operators").

Requirements:
1. Generate between 5 and 10 progressive milestones.
2. Each milestone must have a stable kebab-case topicSlug (e.g. "raft-log-replication", "wasm-linear-memory").
3. Each milestone must have a clear title, difficulty, domain skill slug, measurable objective, and why it matters.
4. Define prerequisiteTopicSlugs carefully. Every prerequisite slug MUST refer to an earlier milestone's topicSlug.
5. NO dependency cycles. The graph must be a strict Directed Acyclic Graph (DAG).
6. Calibrate for a learner spending ${dailyMinutes} minutes/day.
7. Return strictly valid JSON matching the schema.`;

    const response = await Promise.race([
      ai.models.generateContent({
        model: config.geminiModel,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pathTitle: { type: Type.STRING },
              targetRole: { type: Type.STRING },
              pedagogicalApproach: { type: Type.STRING },
              estimatedTotalWeeks: { type: Type.INTEGER },
              milestones: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    topicSlug: { type: Type.STRING },
                    title: { type: Type.STRING },
                    domainSkillSlug: { type: Type.STRING },
                    difficulty: {
                      type: Type.STRING,
                      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']
                    },
                    measurableObjective: { type: Type.STRING },
                    estimatedSessions: { type: Type.INTEGER },
                    prerequisiteTopicSlugs: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    whyThisMatters: { type: Type.STRING }
                  },
                  required: [
                    'topicSlug',
                    'title',
                    'domainSkillSlug',
                    'difficulty',
                    'measurableObjective',
                    'estimatedSessions',
                    'prerequisiteTopicSlugs',
                    'whyThisMatters'
                  ]
                }
              }
            },
            required: ['pathTitle', 'targetRole', 'pedagogicalApproach', 'estimatedTotalWeeks', 'milestones']
          }
        }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), Math.min(config.geminiTimeoutMs || 3500, 4000))
      )
    ]);

    const parsed = JSON.parse(response.text || '{}');
    return parsed;
  }

  /**
   * Deterministic goal-aligned curriculum synthesizer.
   * Tailors milestones specifically to the learner's actual goal words and domain.
   * Guarantees zero DAG cycles, correct prerequisites, and goal alignment without external API dependencies.
   */
  static generateGoalScaffold({
    goalTitle = 'Software Engineering',
    targetRole = 'Software Engineer',
    experienceLevel = 'BEGINNER',
    dailyMinutes = 15,
    knownSkills = []
  }) {
    const cleanGoal = goalTitle.trim();
    const lower = cleanGoal.toLowerCase();

    // Specialized template detection for common specialized engineering domains
    if (lower.includes('raft') || (lower.includes('go') && lower.includes('distributed')) || lower.includes('consensus')) {
      return {
        pathTitle: `Distributed Systems & Consensus in Go`,
        targetRole: targetRole || 'Distributed Systems Engineer',
        pedagogicalApproach: `Hands-on systems implementation building from Go concurrency primitives to full Raft state machine replication and RPC network failure resilience.`,
        estimatedTotalWeeks: 8,
        milestones: [
          {
            topicSlug: 'go-concurrency-primitives',
            title: 'Go Concurrency Primitives & Channels',
            domainSkillSlug: 'golang',
            difficulty: 'BEGINNER',
            measurableObjective: 'Master goroutines, buffered channels, select blocks, and sync.Mutex under concurrent loads.',
            estimatedSessions: 3,
            prerequisiteTopicSlugs: [],
            whyThisMatters: 'Distributed consensus engines rely heavily on lock-free message passing and synchronization in Go.'
          },
          {
            topicSlug: 'rpc-network-failure-models',
            title: 'RPC Communication & Network Failure Models',
            domainSkillSlug: 'distributed-systems',
            difficulty: 'INTERMEDIATE',
            measurableObjective: 'Design RPC clients and servers handling packet loss, network partitions, and message reordering.',
            estimatedSessions: 4,
            prerequisiteTopicSlugs: ['go-concurrency-primitives'],
            whyThisMatters: 'Consensus nodes communicate over unreliable networks; nodes must expect and handle dropped RPCs.'
          },
          {
            topicSlug: 'raft-leader-election',
            title: 'Raft Leader Election & Term Timers',
            domainSkillSlug: 'distributed-systems',
            difficulty: 'INTERMEDIATE',
            measurableObjective: 'Implement randomized election timeouts, RequestVote RPCs, and split-vote resolution.',
            estimatedSessions: 4,
            prerequisiteTopicSlugs: ['rpc-network-failure-models'],
            whyThisMatters: 'Leader election is the foundation of high-availability coordination in Raft consensus.'
          },
          {
            topicSlug: 'raft-log-replication',
            title: 'Raft Log Replication & Commit Index Guarantees',
            domainSkillSlug: 'distributed-systems',
            difficulty: 'ADVANCED',
            measurableObjective: 'Implement AppendEntries RPC, log consistency checks, and uncommitted entry rollbacks.',
            estimatedSessions: 5,
            prerequisiteTopicSlugs: ['raft-leader-election'],
            whyThisMatters: 'Guarantees that state machine logs across all cluster nodes converge to an identical history.'
          },
          {
            topicSlug: 'raft-state-machine-recovery',
            title: 'State Machine Persistence & Crash Recovery',
            domainSkillSlug: 'distributed-systems',
            difficulty: 'ADVANCED',
            measurableObjective: 'Persist Raft term, votedFor, and log entries to disk and recover state machine on reboot.',
            estimatedSessions: 4,
            prerequisiteTopicSlugs: ['raft-log-replication'],
            whyThisMatters: 'Ensures zero data loss during server reboots and cluster-wide power outages.'
          }
        ]
      };
    }

    if (lower.includes('wasm') || lower.includes('rust') || lower.includes('webassembly')) {
      return {
        pathTitle: `High-Performance WebAssembly with Rust`,
        targetRole: targetRole || 'Systems & Frontend Infrastructure Engineer',
        pedagogicalApproach: `Deep-dive from Rust ownership memory mechanics to compiling WASM bytecode, memory sharing, and browser runtime interop.`,
        estimatedTotalWeeks: 6,
        milestones: [
          {
            topicSlug: 'rust-ownership-memory-safety',
            title: 'Rust Ownership, Borrowing & Memory Model',
            domainSkillSlug: 'rust',
            difficulty: 'BEGINNER',
            measurableObjective: 'Understand stack vs heap allocation, lifetimes, mutable references, and compile-time safety.',
            estimatedSessions: 3,
            prerequisiteTopicSlugs: [],
            whyThisMatters: 'Writing predictable WebAssembly requires explicit understanding of memory boundaries and allocation.'
          },
          {
            topicSlug: 'wasm-linear-memory',
            title: 'WebAssembly Linear Memory & Bytecode Execution',
            domainSkillSlug: 'webassembly',
            difficulty: 'INTERMEDIATE',
            measurableObjective: 'Inspect WebAssembly stack machine instructions and linear memory buffer manipulation.',
            estimatedSessions: 3,
            prerequisiteTopicSlugs: ['rust-ownership-memory-safety'],
            whyThisMatters: 'WASM operates over a contiguous array of raw bytes; mastering linear memory prevents buffer corruption.'
          },
          {
            topicSlug: 'wasm-bindgen-interop',
            title: 'Rust to WASM Toolchain & wasm-bindgen',
            domainSkillSlug: 'webassembly',
            difficulty: 'INTERMEDIATE',
            measurableObjective: 'Export Rust structs, serialize data across the JS-WASM boundary, and profile call overhead.',
            estimatedSessions: 4,
            prerequisiteTopicSlugs: ['wasm-linear-memory'],
            whyThisMatters: 'Bridges JavaScript high-level objects with low-level compiled Rust binaries efficiently.'
          },
          {
            topicSlug: 'wasm-high-performance-rendering',
            title: 'High-Performance DOM & Canvas Rendering with WASM',
            domainSkillSlug: 'performance',
            difficulty: 'ADVANCED',
            measurableObjective: 'Build real-time computation kernels executing in WebAssembly writing directly to Canvas pixel buffers.',
            estimatedSessions: 4,
            prerequisiteTopicSlugs: ['wasm-bindgen-interop'],
            whyThisMatters: 'Enables 60+ FPS visual computing, game engines, and audio synthesis in the web platform.'
          }
        ]
      };
    }

    if (lower.includes('ai agent') || lower.includes('agentic') || lower.includes('llm')) {
      return {
        pathTitle: `Production AI Agents & LLM Systems`,
        targetRole: targetRole || 'AI Systems Engineer',
        pedagogicalApproach: `Architecting robust, observable autonomous agents from structured prompt tool calling to multi-agent state machines and evaluation guardrails.`,
        estimatedTotalWeeks: 6,
        milestones: [
          {
            topicSlug: 'llm-structured-outputs-tools',
            title: 'LLM Tool Calling & Structured Output Schemas',
            domainSkillSlug: 'ai-engineering',
            difficulty: 'BEGINNER',
            measurableObjective: 'Implement function calling with JSON schemas, validate structured parameters, and handle schema retries.',
            estimatedSessions: 3,
            prerequisiteTopicSlugs: [],
            whyThisMatters: 'Agents interact with external systems through deterministic, schema-enforced tool invocation.'
          },
          {
            topicSlug: 'agent-react-loops',
            title: 'Agent Reason-Act (ReAct) Loops & State Machines',
            domainSkillSlug: 'ai-engineering',
            difficulty: 'INTERMEDIATE',
            measurableObjective: 'Build resilient thought-action-observation loops with step bounds, timeouts, and state persistence.',
            estimatedSessions: 4,
            prerequisiteTopicSlugs: ['llm-structured-outputs-tools'],
            whyThisMatters: 'Prevents infinite hallucination loops and gives agents deterministic decision-making checkpoints.'
          },
          {
            topicSlug: 'agent-context-memory-rag',
            title: 'Agent Memory, Vector Retrieval & Context Pruning',
            domainSkillSlug: 'ai-engineering',
            difficulty: 'INTERMEDIATE',
            measurableObjective: 'Integrate semantic episodic memory with sliding context window pruning to avoid context overflow.',
            estimatedSessions: 4,
            prerequisiteTopicSlugs: ['agent-react-loops'],
            whyThisMatters: 'Long-running agents require scalable memory retrieval without blowing token budgets or latency.'
          },
          {
            topicSlug: 'agent-guardrails-evals',
            title: 'Agent Evals, Safety Guardrails & Human-in-the-Loop',
            domainSkillSlug: 'ai-engineering',
            difficulty: 'ADVANCED',
            measurableObjective: 'Implement automated regression test suites, tool execution permission gates, and output guardrails.',
            estimatedSessions: 4,
            prerequisiteTopicSlugs: ['agent-context-memory-rag'],
            whyThisMatters: 'Ensures autonomous agents behave predictably and safely in production environments.'
          }
        ]
      };
    }

    if (lower.includes('backend') || (targetRole && targetRole.toLowerCase().includes('backend'))) {
      const isAdvanced = experienceLevel === 'ADVANCED';
      return {
        pathTitle: `Backend Engineering Mastery Path`,
        targetRole: targetRole || 'Backend Developer',
        pedagogicalApproach: `Structured engineering path from core server runtime mechanics and HTTP protocol semantics to relational indexing, caching, and scalable system design.`,
        estimatedTotalWeeks: 8,
        milestones: isAdvanced ? [
          {
            topicSlug: 'rest-resource-design',
            title: 'RESTful Resource Design',
            domainSkillSlug: 'rest-apis',
            difficulty: 'BEGINNER',
            measurableObjective: 'Design scalable REST interfaces with proper HTTP verb semantics, status codes, and idempotency keys.',
            estimatedSessions: 3,
            prerequisiteTopicSlugs: [],
            whyThisMatters: 'Clean API contracts ensure reliable communication between distributed clients and microservices.'
          },
          {
            topicSlug: 'sql-indexing',
            title: 'B-Tree Indexing Strategies',
            domainSkillSlug: 'postgresql',
            difficulty: 'INTERMEDIATE',
            measurableObjective: 'Implement B-Tree indexes, analyze EXPLAIN execution plans, and optimize slow table scans.',
            estimatedSessions: 4,
            prerequisiteTopicSlugs: ['rest-resource-design'],
            whyThisMatters: 'Database query efficiency is the primary performance bottleneck in production backend architectures.'
          },
          {
            topicSlug: 'js-event-loop',
            title: 'Event Loop & Concurrency',
            domainSkillSlug: 'javascript',
            difficulty: 'INTERMEDIATE',
            measurableObjective: 'Analyze call stack, microtask queue, macrotask queue, and unblocked I/O scheduling.',
            estimatedSessions: 3,
            prerequisiteTopicSlugs: [],
            whyThisMatters: 'High-throughput backend services require deep comprehension of asynchronous non-blocking runtimes.'
          },
          {
            topicSlug: 'sd-load-balancing',
            title: 'Horizontal Scaling & Load Balancing',
            domainSkillSlug: 'system-design',
            difficulty: 'INTERMEDIATE',
            measurableObjective: 'Architect load-balanced stateless service clusters, database read replicas, and circuit breakers.',
            estimatedSessions: 5,
            prerequisiteTopicSlugs: ['sql-indexing'],
            whyThisMatters: 'Prepares engineers to build scalable, resilient infrastructure handling high concurrent traffic.'
          }
        ] : [
          {
            topicSlug: 'js-closures',
            title: 'Closures & Lexical Scope',
            domainSkillSlug: 'javascript',
            difficulty: 'BEGINNER',
            measurableObjective: 'Master lexical scoping, variable retention across execution contexts, and closure patterns.',
            estimatedSessions: 3,
            prerequisiteTopicSlugs: [],
            whyThisMatters: 'Fundamental for asynchronous callbacks, encapsulation, and higher-order functions in JavaScript.'
          },
          {
            topicSlug: 'js-async-await',
            title: 'Promises & Async/Await',
            domainSkillSlug: 'javascript',
            difficulty: 'BEGINNER',
            measurableObjective: 'Manage asynchronous control flow, error handling, and Promise combinators.',
            estimatedSessions: 3,
            prerequisiteTopicSlugs: ['js-closures'],
            whyThisMatters: 'Critical for orchestrating database and API network operations asynchronously.'
          },
          {
            topicSlug: 'js-event-loop',
            title: 'Event Loop & Concurrency',
            domainSkillSlug: 'javascript',
            difficulty: 'INTERMEDIATE',
            measurableObjective: 'Analyze call stack, microtask queue, macrotask queue, and unblocked I/O scheduling.',
            estimatedSessions: 3,
            prerequisiteTopicSlugs: ['js-async-await'],
            whyThisMatters: 'High-throughput backend services require deep comprehension of asynchronous non-blocking runtimes.'
          },
          {
            topicSlug: 'rest-resource-design',
            title: 'RESTful Resource Design',
            domainSkillSlug: 'rest-apis',
            difficulty: 'BEGINNER',
            measurableObjective: 'Design scalable REST interfaces with proper HTTP verb semantics, status codes, and idempotency keys.',
            estimatedSessions: 3,
            prerequisiteTopicSlugs: [],
            whyThisMatters: 'Clean API contracts ensure reliable communication between distributed clients and microservices.'
          },
          {
            topicSlug: 'sql-indexing',
            title: 'B-Tree Indexing Strategies',
            domainSkillSlug: 'postgresql',
            difficulty: 'INTERMEDIATE',
            measurableObjective: 'Implement B-Tree indexes, analyze EXPLAIN execution plans, and optimize slow table scans.',
            estimatedSessions: 4,
            prerequisiteTopicSlugs: ['rest-resource-design'],
            whyThisMatters: 'Database query efficiency is the primary performance bottleneck in production backend architectures.'
          }
        ]
      };
    }

    // Generic dynamic synthesizer for ANY other arbitrary software engineering goal
    // Formats slugs and titles strictly from the user's specific goal words
    const baseSlug = cleanGoal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'core-domain';
    const isAdvanced = experienceLevel === 'ADVANCED' || experienceLevel === 'INTERMEDIATE';

    return {
      pathTitle: `${cleanGoal} Mastery Path`,
      targetRole: targetRole || 'Software Engineer',
      pedagogicalApproach: `Personalized curriculum calibrated for ${experienceLevel} level, sequencing core mental models, production mechanics, and system design for ${cleanGoal}.`,
      estimatedTotalWeeks: 6,
      milestones: [
        {
          topicSlug: `${baseSlug}-foundations`,
          title: `Foundations & Core Primitives of ${cleanGoal}`,
          domainSkillSlug: baseSlug.slice(0, 30),
          difficulty: isAdvanced ? 'INTERMEDIATE' : 'BEGINNER',
          measurableObjective: `Master foundational mental models, runtime primitives, and execution mechanics for ${cleanGoal}.`,
          estimatedSessions: 3,
          prerequisiteTopicSlugs: [],
          whyThisMatters: `Solid comprehension of fundamental building blocks is essential before architecting complex solutions.`
        },
        {
          topicSlug: `${baseSlug}-patterns-mechanics`,
          title: `Core Architectural Patterns for ${cleanGoal}`,
          domainSkillSlug: baseSlug.slice(0, 30),
          difficulty: 'INTERMEDIATE',
          measurableObjective: `Implement industry-standard architectural patterns and modular component design for ${cleanGoal}.`,
          estimatedSessions: 4,
          prerequisiteTopicSlugs: [`${baseSlug}-foundations`],
          whyThisMatters: `Translates theoretical concepts into maintainable, idiomatic production engineering code.`
        },
        {
          topicSlug: `${baseSlug}-performance-edge-cases`,
          title: `Failure Modes, Performance & Concurrency in ${cleanGoal}`,
          domainSkillSlug: baseSlug.slice(0, 30),
          difficulty: 'ADVANCED',
          measurableObjective: `Diagnose bottleneck constraints, race conditions, memory leaks, and edge-case failure modes in ${cleanGoal}.`,
          estimatedSessions: 4,
          prerequisiteTopicSlugs: [`${baseSlug}-patterns-mechanics`],
          whyThisMatters: `Differentiates surface-level familiarity from production-grade engineering mastery.`
        },
        {
          topicSlug: `${baseSlug}-systems-integration`,
          title: `Production Scalability & Systems Integration for ${cleanGoal}`,
          domainSkillSlug: baseSlug.slice(0, 30),
          difficulty: 'ADVANCED',
          measurableObjective: `Design resilient end-to-end distributed interfaces, telemetry monitoring, and fault-tolerant pipelines.`,
          estimatedSessions: 5,
          prerequisiteTopicSlugs: [`${baseSlug}-performance-edge-cases`],
          whyThisMatters: `Validates readiness to ship and maintain large-scale real-world software engineering workloads.`
        }
      ]
    };
  }
}
