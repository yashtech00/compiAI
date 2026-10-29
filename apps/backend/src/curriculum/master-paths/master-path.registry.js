/**
 * Master Path Curriculum Registry
 * Canonical registry for versioned engineering curricula.
 * Manages Master Paths and provides goal-agnostic personalized branch initialization.
 */

import { validateCurriculum } from './curriculum-validator.js';
import { systemDesignCurriculumV1 } from './system-design.v1.js';
import { backendDevelopmentCurriculumV1 } from './backend-development.v1.js';
import { fullStackDevelopmentCurriculumV1 } from './full-stack-development.v1.js';

class MasterPathRegistryService {
  constructor() {
    this.registry = new Map(); // key: `${goalId}:${version}`
    this.latestVersions = new Map(); // key: goalId -> latestVersion
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    this.registerCurriculum(systemDesignCurriculumV1);
    this.registerCurriculum(backendDevelopmentCurriculumV1);
    this.registerCurriculum(fullStackDevelopmentCurriculumV1);

    this.initialized = true;
  }

  /**
   * Registers a curriculum definition after rigorous structural and graph validation.
   * @param {Object} curriculum 
   */
  registerCurriculum(curriculum) {
    validateCurriculum(curriculum);

    const key = `${curriculum.goalId}:${curriculum.version}`;
    this.registry.set(key, Object.freeze(JSON.parse(JSON.stringify(curriculum))));

    // Track latest version (lexicographical or explicit)
    const currentLatest = this.latestVersions.get(curriculum.goalId);
    if (!currentLatest || curriculum.version >= currentLatest) {
      this.latestVersions.set(curriculum.goalId, curriculum.version);
    }
  }

  /**
   * Retrieves a Master Path by goalId and version.
   * @param {string} goalId 
   * @param {string} version 'latest' or semantic version
   * @returns {Object|null}
   */
  normalizeGoalId(goalId) {
    if (!goalId || typeof goalId !== 'string') return goalId;
    const map = {
      'full-stack-developer': 'full-stack-development',
      'fullstack-developer': 'full-stack-development',
      'fullstack-development': 'full-stack-development',
      'backend-developer': 'backend-development',
      'frontend-developer': 'full-stack-development',
      'ai-developer': 'ai-engineer',
      'ai-engineering': 'ai-engineer'
    };
    return map[goalId] || goalId;
  }

  getMasterPath(goalId, version = 'latest') {
    this.init();

    const normalizedGoalId = this.normalizeGoalId(goalId);
    const resolvedVersion = version === 'latest' 
      ? (this.latestVersions.get(normalizedGoalId) || this.latestVersions.get(goalId))
      : version;

    if (!resolvedVersion) return null;

    const key = `${normalizedGoalId}:${resolvedVersion}`;
    return this.registry.get(key) || this.registry.get(`${goalId}:${resolvedVersion}`) || null;
  }

  /**
   * Lists all supported goals with metadata.
   */
  listSupportedGoals() {
    this.init();
    const goals = [];

    for (const [goalId, latestVer] of this.latestVersions.entries()) {
      const curriculum = this.getMasterPath(goalId, latestVer);
      if (curriculum) {
        goals.push({
          goalId: curriculum.goalId,
          version: curriculum.version,
          title: curriculum.title,
          description: curriculum.description,
          moduleCount: curriculum.modules.length,
          skillCount: curriculum.skills.length,
          estimatedEffort: curriculum.estimatedEffort,
          finalAssessmentId: curriculum.finalAssessmentId
        });
      }
    }

    return goals;
  }

  /**
   * Instantiates a clean, personalized learner roadmap from the canonical Master Path.
   * Does NOT mutate the Master Path.
   * @param {string} goalId 
   * @param {Object} options Optional customization (e.g. diagnostic skip list)
   * @returns {Object} Personalized roadmap structure
   */
  instantiatePersonalizedPath(goalId, options = {}) {
    const masterPath = this.getMasterPath(goalId);
    if (!masterPath) {
      throw new Error(`Cannot instantiate path: Unknown goalId '${goalId}'`);
    }

    const { diagnosticExemptSkills = [] } = options;
    const exemptSkillSet = new Set(diagnosticExemptSkills);

    // Map modules into personalized milestones
    const milestones = masterPath.modules.map(mod => {
      // Check if all required skills for this module are already proven exempt
      const allExempt = mod.requiredSkills.every(s => exemptSkillSet.has(s));

      return {
        masterModuleId: mod.id,
        title: mod.title,
        description: mod.description,
        order: mod.order,
        requiredSkills: [...mod.requiredSkills],
        estimatedMinutes: mod.estimatedMinutes,
        scenarioIds: [...mod.scenarioIds],
        status: allExempt ? 'SKIPPED_BY_DIAGNOSTIC' : 'LOCKED',
        masteryScore: allExempt ? 85 : 0,
        branchType: 'MASTER' // 'MASTER', 'REMEDIATION', 'PREREQUISITE'
      };
    });

    // Unlock the first non-exempt milestone
    const firstActive = milestones.find(m => m.status === 'LOCKED');
    if (firstActive) {
      firstActive.status = 'ACTIVE';
    }

    return {
      goalId: masterPath.goalId,
      masterPathVersion: masterPath.version,
      title: masterPath.title,
      description: masterPath.description,
      milestones,
      prerequisites: [...masterPath.prerequisites],
      masteryCriteria: { ...masterPath.masteryCriteria },
      finalAssessmentId: masterPath.finalAssessmentId,
      createdAt: new Date().toISOString()
    };
  }
}

export const MasterPathRegistry = new MasterPathRegistryService();
