import { describe, it, expect } from 'vitest';
import { validateCurriculum, CurriculumValidationError } from '../src/curriculum/master-paths/curriculum-validator.js';
import { MasterPathRegistry } from '../src/curriculum/master-paths/master-path.registry.js';
import { systemDesignCurriculumV1 } from '../src/curriculum/master-paths/system-design.v1.js';
import { backendDevelopmentCurriculumV1 } from '../src/curriculum/master-paths/backend-development.v1.js';
import { fullStackDevelopmentCurriculumV1 } from '../src/curriculum/master-paths/full-stack-development.v1.js';

describe('Phase 1: Master Path Curriculum Registry & Dependency Graph', () => {
  it('1. Validates canonical System Design curriculum v1 successfully', () => {
    expect(() => validateCurriculum(systemDesignCurriculumV1)).not.toThrow();
  });

  it('2. Validates canonical Backend Development curriculum v1 successfully', () => {
    expect(() => validateCurriculum(backendDevelopmentCurriculumV1)).not.toThrow();
  });

  it('3. Validates canonical Full Stack Development curriculum v1 successfully', () => {
    expect(() => validateCurriculum(fullStackDevelopmentCurriculumV1)).not.toThrow();
  });

  it('4. Rejects curriculum with missing required top-level attributes', () => {
    const invalidCurriculum = { ...systemDesignCurriculumV1 };
    delete invalidCurriculum.finalAssessmentId;

    expect(() => validateCurriculum(invalidCurriculum)).toThrow(CurriculumValidationError);
  });

  it('5. Rejects curriculum with non-existent skill references', () => {
    const badSkillCurriculum = JSON.parse(JSON.stringify(systemDesignCurriculumV1));
    badSkillCurriculum.modules[0].requiredSkills.push('ghost-skill-999');

    expect(() => validateCurriculum(badSkillCurriculum)).toThrow(CurriculumValidationError);
  });

  it('6. Detects and rejects circular dependencies in prerequisite graph', () => {
    const cyclicCurriculum = JSON.parse(JSON.stringify(systemDesignCurriculumV1));
    // Introduce cycle: sd-mod-8 -> sd-mod-1
    cyclicCurriculum.prerequisites.push({
      sourceModuleId: 'sd-mod-8',
      targetModuleId: 'sd-mod-1'
    });

    expect(() => validateCurriculum(cyclicCurriculum)).toThrow(CurriculumValidationError);
  });

  it('7. MasterPathRegistry lists all 3 supported engineering goals', () => {
    const goals = MasterPathRegistry.listSupportedGoals();
    expect(goals.length).toBeGreaterThanOrEqual(3);

    const goalIds = goals.map(g => g.goalId);
    expect(goalIds).toContain('system-design');
    expect(goalIds).toContain('backend-development');
    expect(goalIds).toContain('full-stack-development');
  });

  it('8. Retrieves immutable Master Path and prevents external mutation from corrupting registry', () => {
    const path = MasterPathRegistry.getMasterPath('system-design', 'latest');
    expect(path).toBeDefined();
    expect(path.goalId).toBe('system-design');

    // Attempt mutation should throw or fail silently because object is frozen
    expect(() => {
      path.title = 'Mutated Title';
    }).toThrow();
  });

  it('9. Instantiates personalized learner path and respects diagnostic exemption', () => {
    const personalized = MasterPathRegistry.instantiatePersonalizedPath('system-design', {
      diagnosticExemptSkills: ['sd-metrics-sla']
    });

    expect(personalized.goalId).toBe('system-design');
    expect(personalized.milestones.length).toBe(8);

    // Module 1 required 'sd-metrics-sla', so it should be SKIPPED_BY_DIAGNOSTIC
    const mod1 = personalized.milestones.find(m => m.masterModuleId === 'sd-mod-1');
    expect(mod1.status).toBe('SKIPPED_BY_DIAGNOSTIC');

    // Module 2 should be ACTIVE as the next entry point
    const mod2 = personalized.milestones.find(m => m.masterModuleId === 'sd-mod-2');
    expect(mod2.status).toBe('ACTIVE');
  });
});
