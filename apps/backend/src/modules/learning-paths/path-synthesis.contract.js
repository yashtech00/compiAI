import { z } from 'zod';

export const MilestoneSchema = z.object({
  topicSlug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(3).max(120),
  domainSkillSlug: z.string().min(2).max(60),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  measurableObjective: z.string().min(10).max(400),
  estimatedSessions: z.number().int().min(1).max(10),
  prerequisiteTopicSlugs: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),
  whyThisMatters: z.string().min(10).max(400)
});

export const PathSynthesisSchema = z.object({
  pathTitle: z.string().min(5).max(150),
  targetRole: z.string().min(3).max(100),
  pedagogicalApproach: z.string().min(15).max(600),
  estimatedTotalWeeks: z.number().int().min(1).max(52),
  milestones: z.array(MilestoneSchema).min(3).max(30)
});

/**
 * Validates path synthesis structure, enforces unique slugs,
 * validates prerequisite references, detects dependency cycles via Kahn's algorithm,
 * and returns the topologically sorted milestones.
 */
export function validateAndSortMilestones(pathProposal) {
  // 1. Zod schema validation
  const validated = PathSynthesisSchema.parse(pathProposal);
  const { milestones } = validated;

  // 2. Check for unique topic slugs
  const slugSet = new Set();
  const milestoneBySlug = new Map();

  for (const m of milestones) {
    if (slugSet.has(m.topicSlug)) {
      throw new Error(`Duplicate milestone slug detected: "${m.topicSlug}". All milestone slugs must be unique.`);
    }
    slugSet.add(m.topicSlug);
    milestoneBySlug.set(m.topicSlug, m);
  }

  // 3. Check for valid prerequisite references & self-dependencies
  for (const m of milestones) {
    for (const prereqSlug of m.prerequisiteTopicSlugs) {
      if (prereqSlug === m.topicSlug) {
        throw new Error(`Self-dependency detected: milestone "${m.topicSlug}" cannot depend on itself.`);
      }
      if (!slugSet.has(prereqSlug)) {
        throw new Error(
          `Invalid prerequisite: milestone "${m.topicSlug}" references unknown prerequisite "${prereqSlug}".`
        );
      }
    }
  }

  // 4. Cycle detection using Kahn's algorithm (Topological Sort)
  const inDegree = new Map();
  const adjList = new Map();

  for (const slug of slugSet) {
    inDegree.set(slug, 0);
    adjList.set(slug, []);
  }

  for (const m of milestones) {
    inDegree.set(m.topicSlug, m.prerequisiteTopicSlugs.length);
    for (const prereqSlug of m.prerequisiteTopicSlugs) {
      adjList.get(prereqSlug).push(m.topicSlug);
    }
  }

  const queue = [];
  for (const [slug, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(slug);
    }
  }

  const sortedSlugs = [];
  while (queue.length > 0) {
    const currentSlug = queue.shift();
    sortedSlugs.push(currentSlug);

    for (const neighborSlug of adjList.get(currentSlug)) {
      const newDeg = inDegree.get(neighborSlug) - 1;
      inDegree.set(neighborSlug, newDeg);
      if (newDeg === 0) {
        queue.push(neighborSlug);
      }
    }
  }

  if (sortedSlugs.length !== milestones.length) {
    const unvisited = milestones.filter(m => !sortedSlugs.includes(m.topicSlug)).map(m => m.topicSlug);
    throw new Error(
      `Dependency cycle detected in learning path milestones. Unresolvable cycle involving: ${unvisited.join(', ')}`
    );
  }

  // 5. Return validated path with milestones sorted in topological order
  const topologicallySortedMilestones = sortedSlugs.map(slug => milestoneBySlug.get(slug));

  return {
    ...validated,
    milestones: topologicallySortedMilestones
  };
}
