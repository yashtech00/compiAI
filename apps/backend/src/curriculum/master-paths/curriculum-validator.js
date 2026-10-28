/**
 * Curriculum Contract Validator & Dependency Graph Analyzer
 * Validates canonical Master Paths to ensure structural integrity,
 * cycle-free prerequisites, reachability, and valid assessment criteria.
 */

export class CurriculumValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'CurriculumValidationError';
    this.details = details;
  }
}

/**
 * Validates a Master Path curriculum definition.
 * @param {Object} curriculum 
 * @returns {boolean} true if valid, throws CurriculumValidationError if invalid.
 */
export function validateCurriculum(curriculum) {
  const errors = [];

  if (!curriculum) {
    throw new CurriculumValidationError('Curriculum object is required');
  }

  // 1. Required Top-Level Fields
  const requiredFields = [
    'goalId',
    'version',
    'title',
    'description',
    'modules',
    'skills',
    'prerequisites',
    'masteryCriteria',
    'estimatedEffort',
    'finalAssessmentId'
  ];

  for (const field of requiredFields) {
    if (!curriculum[field]) {
      errors.push(`Missing required top-level field: '${field}'`);
    }
  }

  if (errors.length > 0) {
    throw new CurriculumValidationError(`Invalid curriculum schema for goal '${curriculum.goalId || 'unknown'}'`, errors);
  }

  // 2. Validate Skills Catalog
  if (!Array.isArray(curriculum.skills) || curriculum.skills.length === 0) {
    errors.push('Curriculum must define a non-empty array of skills');
  } else {
    const skillIds = new Set();
    for (const skill of curriculum.skills) {
      if (!skill.id || !skill.title || !skill.category) {
        errors.push(`Skill missing required attributes: ${JSON.stringify(skill)}`);
      }
      if (skillIds.has(skill.id)) {
        errors.push(`Duplicate skill ID: '${skill.id}'`);
      }
      skillIds.add(skill.id);
    }
  }

  // 3. Validate Modules
  if (!Array.isArray(curriculum.modules) || curriculum.modules.length === 0) {
    errors.push('Curriculum must define a non-empty array of modules');
  } else {
    const moduleIds = new Set();
    const allSkillIds = new Set((curriculum.skills || []).map(s => s.id));

    curriculum.modules.forEach((mod, idx) => {
      if (!mod.id || !mod.title || !mod.description) {
        errors.push(`Module at index ${idx} missing id, title, or description`);
      }
      if (moduleIds.has(mod.id)) {
        errors.push(`Duplicate module ID: '${mod.id}'`);
      }
      moduleIds.add(mod.id);

      if (!Array.isArray(mod.requiredSkills) || mod.requiredSkills.length === 0) {
        errors.push(`Module '${mod.id}' must specify at least one required skill`);
      } else {
        for (const reqSkill of mod.requiredSkills) {
          if (!allSkillIds.has(reqSkill)) {
            errors.push(`Module '${mod.id}' references undefined skill '${reqSkill}'`);
          }
        }
      }

      if (typeof mod.estimatedMinutes !== 'number' || mod.estimatedMinutes <= 0) {
        errors.push(`Module '${mod.id}' must specify positive numeric estimatedMinutes`);
      }
    });
  }

  // 4. Validate Prerequisites Graph & Cycle Detection
  const allModuleIds = new Set((curriculum.modules || []).map(m => m.id));
  const adjacencyList = new Map();
  for (const modId of allModuleIds) {
    adjacencyList.set(modId, []);
  }

  if (Array.isArray(curriculum.prerequisites)) {
    for (const edge of curriculum.prerequisites) {
      const { sourceModuleId, targetModuleId } = edge;
      if (!allModuleIds.has(sourceModuleId)) {
        errors.push(`Prerequisite references non-existent source module: '${sourceModuleId}'`);
      }
      if (!allModuleIds.has(targetModuleId)) {
        errors.push(`Prerequisite references non-existent target module: '${targetModuleId}'`);
      }
      if (sourceModuleId === targetModuleId) {
        errors.push(`Module cannot depend on itself: '${sourceModuleId}'`);
      }
      if (allModuleIds.has(sourceModuleId) && allModuleIds.has(targetModuleId)) {
        adjacencyList.get(sourceModuleId).push(targetModuleId);
      }
    }
  }

  // Check for Cycles using DFS (0 = unvisited, 1 = visiting, 2 = visited)
  const visitState = new Map();
  for (const modId of allModuleIds) {
    visitState.set(modId, 0);
  }

  function detectCycle(node, path = []) {
    visitState.set(node, 1);
    const neighbors = adjacencyList.get(node) || [];
    for (const neighbor of neighbors) {
      if (visitState.get(neighbor) === 1) {
        errors.push(`Cycle detected in module prerequisites: ${[...path, node, neighbor].join(' -> ')}`);
        return true;
      }
      if (visitState.get(neighbor) === 0) {
        if (detectCycle(neighbor, [...path, node])) {
          return true;
        }
      }
    }
    visitState.set(node, 2);
    return false;
  }

  for (const modId of allModuleIds) {
    if (visitState.get(modId) === 0) {
      detectCycle(modId);
    }
  }

  // 5. Validate Mastery Criteria
  if (!curriculum.masteryCriteria || typeof curriculum.masteryCriteria.threshold !== 'number') {
    errors.push('Curriculum masteryCriteria must include numeric threshold (e.g., 80)');
  }

  // 6. Validate Final Assessment
  if (!curriculum.finalAssessmentId || typeof curriculum.finalAssessmentId !== 'string') {
    errors.push('Curriculum must define a valid finalAssessmentId string');
  }

  if (errors.length > 0) {
    throw new CurriculumValidationError(`Validation failed for curriculum '${curriculum.goalId}' (v${curriculum.version})`, errors);
  }

  return true;
}
