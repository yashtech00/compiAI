import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class AiService {
  static _client = null;

  /**
   * Lazily initializes and returns the GoogleGenAI instance
   */
  static getClient() {
    if (!this._client && config.geminiApiKey) {
      this._client = new GoogleGenAI({ apiKey: config.geminiApiKey });
    }
    return this._client;
  }

  /**
   * Evaluates if a real AI provider is configured with valid credentials
   */
  static isRealProviderConfigured() {
    return Boolean(config.geminiApiKey && config.geminiApiKey !== 'your-gemini-api-key-here');
  }

  /**
   * Generates a Socratic tutor response contextualized to learner and lesson
   */
  static async getTutorResponse({ userQuestion, lessonContext, learnerState }) {
    if (!this.isRealProviderConfigured()) {
      return this._deterministicTutorFallback(lessonContext);
    }

    try {
      const ai = this.getClient();
      const prompt = `You are a world-class Socratic software engineering companion.
Your learner is studying: ${lessonContext?.conceptName || 'software engineering'} (${lessonContext?.skillName || 'Engineering'}).
Current lesson objective: ${lessonContext?.objective || 'Master core engineering tradeoffs'}.
Learner's name: ${learnerState?.name || 'Engineer'}.

Learner question: "${userQuestion}"

Instructions:
1. Do NOT immediately give the full code solution or direct answer.
2. Provide a thoughtful Socratic hint or guiding question that prompts the learner to inspect runtime mechanics, memory, execution order, or architectural tradeoffs.
3. Keep the tone encouraging, concise, and focused (2-4 sentences max).`;

      const response = await Promise.race([
        ai.models.generateContent({
          model: config.geminiModel,
          contents: prompt
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), config.geminiTimeoutMs)
        )
      ]);

      const text = response.text || '';
      return {
        reply: text.trim(),
        provider: 'gemini',
        model: config.geminiModel,
        tokens: {
          input: response.usageMetadata?.promptTokenCount || 100,
          output: response.usageMetadata?.candidatesTokenCount || 80
        }
      };
    } catch (err) {
      logger.warn(`Gemini tutor call failed: ${err.message}. Falling back to deterministic Socratic guidance.`);
      return this._deterministicTutorFallback(lessonContext);
    }
  }

  /**
   * Evaluates learner's explain-back attempt using structured rubrics
   */
  static async evaluateExplainBack({ userExplanation, conceptName, learningObjective }) {
    if (!this.isRealProviderConfigured()) {
      return this._deterministicExplainBackFallback({ userExplanation, conceptName });
    }

    try {
      const ai = this.getClient();
      const prompt = `You are evaluating a software engineer's conceptual explanation of "${conceptName}".
Learning objective: "${learningObjective || 'Solid mental model and architectural comprehension'}".
Learner's explanation:
"""${userExplanation}"""

Evaluate this explanation across three dimensions (0-100 score):
- accuracyScore: Technical accuracy and absence of falsehoods.
- completenessScore: Covers essential architectural/runtime mechanisms.
- clarityScore: Clear communication without vague buzzwords.
- overallScore: Weighted composite score (0.4*accuracy + 0.35*completeness + 0.25*clarity).
- misconceptions: Array of any identified conceptual misunderstandings (empty if none).
- feedback: Constructive 2-3 sentence feedback for the learner.`;

      const response = await Promise.race([
        ai.models.generateContent({
          model: config.geminiModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                accuracyScore: { type: Type.INTEGER },
                completenessScore: { type: Type.INTEGER },
                clarityScore: { type: Type.INTEGER },
                overallScore: { type: Type.INTEGER },
                misconceptions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                feedback: { type: Type.STRING }
              },
              required: ['accuracyScore', 'completenessScore', 'clarityScore', 'overallScore', 'misconceptions', 'feedback']
            }
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), config.geminiTimeoutMs)
        )
      ]);

      const parsed = JSON.parse(response.text || '{}');
      return {
        isConfigured: true,
        provider: 'gemini',
        accuracyScore: Math.min(100, Math.max(0, Number(parsed.accuracyScore) || 70)),
        completenessScore: Math.min(100, Math.max(0, Number(parsed.completenessScore) || 70)),
        clarityScore: Math.min(100, Math.max(0, Number(parsed.clarityScore) || 70)),
        overallScore: Math.min(100, Math.max(0, Number(parsed.overallScore) || 70)),
        misconceptions: Array.isArray(parsed.misconceptions) ? parsed.misconceptions : [],
        feedback: String(parsed.feedback || `Evaluated explanation for ${conceptName}.`)
      };
    } catch (err) {
      logger.warn(`Gemini explain-back call failed: ${err.message}. Falling back to deterministic rubric.`);
      return this._deterministicExplainBackFallback({ userExplanation, conceptName });
    }
  }

  /**
   * Generates initial personalized learning path recommendations from onboarding evidence
   */
  static async generateInitialPath({ learnerProfile, candidateConcepts, targetOutcome }) {
    if (!this.isRealProviderConfigured()) {
      return null; // Signals caller to use deterministic topological sort directly
    }

    try {
      const ai = this.getClient();
      const prompt = `You are an expert curriculum architect for software engineers.
Target Outcome: "${targetOutcome}"
Learner Profile:
- Experience Level: ${learnerProfile?.experienceLevel || 'BEGINNER'}
- Daily Available Learning Time: ${learnerProfile?.dailyMinutes || 15} minutes/day
- Self-Assessed Known Skills: ${JSON.stringify(learnerProfile?.knownSkills || [])}

Candidate Available Concepts (ID, Name, Skill, Prerequisite IDs):
${JSON.stringify(candidateConcepts.map(c => ({
  id: c.id,
  name: c.name,
  skill: c.skill?.name,
  prerequisiteIds: c.prerequisites?.map(p => p.prerequisiteConceptId) || []
})))}

Task:
Propose an optimal pedagogical sequence for these concepts.
CRITICAL CONSTRAINTS:
1. Every concept in 'orderedConceptIds' MUST be one of the candidate IDs listed above.
2. A concept must NEVER appear before any of its prerequisite IDs in the sequence.
3. Do not invent any new concept IDs.
4. Provide structured JSON.`;

      const response = await Promise.race([
        ai.models.generateContent({
          model: config.geminiModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                learningApproach: { type: Type.STRING },
                recommendedPacing: { type: Type.STRING },
                orderedConceptIds: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                pedagogicalNotes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      conceptId: { type: Type.STRING },
                      reason: { type: Type.STRING }
                    },
                    required: ['conceptId', 'reason']
                  }
                },
                confidence: { type: Type.NUMBER }
              },
              required: ['learningApproach', 'recommendedPacing', 'orderedConceptIds', 'confidence']
            }
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), config.geminiTimeoutMs)
        )
      ]);

      const parsed = JSON.parse(response.text || '{}');
      return parsed;
    } catch (err) {
      logger.warn(`Gemini initial path generation failed: ${err.message}. Defaulting to deterministic sort.`);
      return null;
    }
  }

  /**
   * Analyzes accumulated learning evidence for Layer 2 (mini-analysis) or Layer 3 (full/long-term review)
   */
  static async analyzeLearningEvidence({
    analysisType, // 'MINI' | 'FULL' | 'LONG_TERM'
    evidenceWindow,
    recentSessions,
    learnerProfile,
    currentPath,
    accumulatedMisconceptions,
    recallHistory
  }) {
    if (!this.isRealProviderConfigured()) {
      return this._deterministicAnalysisFallback({
        analysisType,
        evidenceWindow,
        recentSessions,
        accumulatedMisconceptions
      });
    }

    try {
      const ai = this.getClient();
      const prompt = `You are the adaptive learning intelligence for an AI software engineering companion.
Perform a pedagogical analysis (${analysisType} review) based on recent learning evidence.

Learner Profile:
- Target Role / Outcome: ${learnerProfile?.targetRole || 'Software Engineer'}
- Daily Time Budget: ${learnerProfile?.dailyMinutes || 15} minutes
- Experience Level: ${learnerProfile?.experienceLevel || 'INTERMEDIATE'}

Evidence Window: ${JSON.stringify(evidenceWindow)}
Recent Learning Sessions:
${JSON.stringify((recentSessions || []).map(s => ({
  lessonTitle: s.lesson?.title,
  conceptId: s.lesson?.conceptId,
  conceptName: s.lesson?.concept?.name,
  durationMinutes: Math.round((s.durationSeconds || 0) / 60),
  hintsUsed: s.hintsUsed || 0,
  initialMastery: s.initialMastery,
  finalMastery: s.finalMastery,
  status: s.status
})))}

Accumulated Misconception Tags:
${JSON.stringify(accumulatedMisconceptions || [])}

Spaced Recall Retention:
${JSON.stringify(recallHistory || [])}

Current Active Roadmap Items:
${JSON.stringify((currentPath?.items || []).map(item => ({
  sequenceOrder: item.sequenceOrder,
  conceptId: item.conceptId,
  conceptName: item.concept?.name,
  status: item.status
})))}

Task:
Analyze this evidence. Propose whether to advance, offer targeted practice, or remediate prerequisites.
CRITICAL CONSTRAINTS:
1. Do not invent concept IDs. Any conceptId referenced must match an existing concept from the current roadmap or session evidence.
2. Do not skip prerequisites.
3. Return schema-conforming JSON proposal.`;

      const response = await Promise.race([
        ai.models.generateContent({
          model: config.geminiModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                analysisType: { type: Type.STRING },
                evidenceWindow: { type: Type.STRING },
                summary: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                identifiedGaps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      conceptId: { type: Type.STRING },
                      conceptName: { type: Type.STRING },
                      evidence: { type: Type.STRING }
                    },
                    required: ['conceptId', 'evidence']
                  }
                },
                recommendedActions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      action: { type: Type.STRING },
                      conceptId: { type: Type.STRING },
                      reason: { type: Type.STRING }
                    },
                    required: ['action', 'conceptId', 'reason']
                  }
                },
                proposedPathChanges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      conceptId: { type: Type.STRING },
                      action: { type: Type.STRING },
                      targetPosition: { type: Type.INTEGER },
                      reason: { type: Type.STRING }
                    },
                    required: ['conceptId', 'action', 'reason']
                  }
                },
                rationale: { type: Type.STRING },
                reviewAt: { type: Type.STRING }
              },
              required: [
                'analysisType',
                'evidenceWindow',
                'summary',
                'confidence',
                'identifiedGaps',
                'recommendedActions',
                'proposedPathChanges',
                'rationale',
                'reviewAt'
              ]
            }
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), config.geminiTimeoutMs)
        )
      ]);

      const parsed = JSON.parse(response.text || '{}');
      return {
        ...parsed,
        analysisType,
        provider: 'gemini',
        model: config.geminiModel
      };
    } catch (err) {
      logger.warn(`Gemini evidence analysis failed: ${err.message}. Using deterministic evidence analysis.`);
      return this._deterministicAnalysisFallback({
        analysisType,
        evidenceWindow,
        recentSessions,
        accumulatedMisconceptions
      });
    }
  }

  // --- Fallback Deterministic Engines ---

  static _deterministicTutorFallback(lessonContext) {
    const conceptName = lessonContext?.conceptName || 'this concept';
    const socraticHints = [
      `Great question about **${conceptName}**! Think about how the runtime execution stack behaves in this scenario. What step happens first?`,
      `Consider the tradeoff: if we optimize for memory efficiency here, what happens to lookup speed? How does ${conceptName} balance both?`,
      `Let's break that down: in your recent practice on **${conceptName}**, what was the primary source of the error? Can you apply that same reasoning to this question?`
    ];

    const selectedHint = socraticHints[Math.floor(Math.random() * socraticHints.length)];

    return {
      reply: `${selectedHint}\n\n*Note: Running in local companion mode. To connect Gemini, configure GEMINI_API_KEY in your environment.*`,
      provider: 'mock',
      model: 'companion-socratic-v1',
      tokens: { input: 120, output: 85 }
    };
  }

  static _deterministicExplainBackFallback({ userExplanation, conceptName }) {
    const words = (userExplanation || '').trim().split(/\s+/).filter(Boolean);
    const length = words.length;
    const lower = (userExplanation || '').toLowerCase();

    let accuracy = 70;
    let completeness = 65;
    let clarity = 75;
    const misconceptions = [];

    if (length < 15) {
      accuracy = 55;
      completeness = 45;
      clarity = 60;
      misconceptions.push('Explanation is too brief to demonstrate full conceptual understanding.');
    } else if (length > 40) {
      completeness += 20;
      accuracy += 15;
    }

    if (lower.includes('why') || lower.includes('because') || lower.includes('instead') || lower.includes('tradeoff')) {
      accuracy = Math.min(95, accuracy + 10);
      clarity = Math.min(95, clarity + 10);
    }

    const overall = Math.round((accuracy * 0.4) + (completeness * 0.35) + (clarity * 0.25));

    return {
      isConfigured: false,
      provider: 'mock',
      accuracyScore: accuracy,
      completenessScore: completeness,
      clarityScore: clarity,
      overallScore: overall,
      misconceptions: misconceptions.length > 0 ? misconceptions : [],
      feedback: `Your explanation captures key aspects of **${conceptName}**. To make it even stronger, connect the architectural reason with real-world production tradeoffs.\n\n*(Evaluated via local heuristic rubric; configure GEMINI_API_KEY for full semantic LLM grading)*`
    };
  }

  static _deterministicAnalysisFallback({
    analysisType,
    evidenceWindow,
    recentSessions,
    accumulatedMisconceptions
  }) {
    const totalSessions = recentSessions?.length || 0;
    const totalHints = (recentSessions || []).reduce((acc, s) => acc + (s.hintsUsed || 0), 0);
    const hasMisconceptions = (accumulatedMisconceptions || []).length > 0;

    let summary = `Evaluated ${totalSessions} recent session(s) in evidence window.`;
    if (totalHints > 3) {
      summary += ` High hint dependency detected (${totalHints} hints used). Targeted independent practice recommended.`;
    } else if (hasMisconceptions) {
      summary += ` Recurring conceptual misconceptions flagged in recent evaluations.`;
    } else {
      summary += ` Steady mastery progression observed with consistent independent problem solving.`;
    }

    return {
      analysisType,
      evidenceWindow: typeof evidenceWindow === 'string' ? evidenceWindow : 'recent-sessions',
      summary,
      confidence: 0.8,
      identifiedGaps: (accumulatedMisconceptions || []).slice(0, 2).map((m, idx) => ({
        conceptId: m.conceptId || 'unknown',
        conceptName: m.conceptName || 'Reinforcement Concept',
        evidence: typeof m === 'string' ? m : m.misconception || 'Struggled on practice quiz'
      })),
      recommendedActions: [
        {
          action: hasMisconceptions || totalHints > 3 ? 'PRACTICE' : 'ADVANCE',
          conceptId: recentSessions?.[0]?.lesson?.conceptId || '',
          reason: hasMisconceptions ? 'Address identified misconceptions' : 'Continue milestone progression'
        }
      ],
      proposedPathChanges: [],
      rationale: 'Deterministic evidence evaluation based on session hints, quiz accuracy, and misconception tags.',
      reviewAt: analysisType === 'MINI' ? '3_SESSIONS' : '5_ACTIVE_DAYS',
      provider: 'deterministic',
      model: 'deterministic-rules-engine'
    };
  }
}
