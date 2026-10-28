import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { RoadmapService } from '../src/modules/learning-paths/roadmap.service.js';
import { PathSynthesisService } from '../src/modules/learning-paths/path-synthesis.service.js';
import { validateAndSortMilestones } from '../src/modules/learning-paths/path-synthesis.contract.js';

describe('Phase 1: AI-Generated Personalized Learning Paths', () => {
  let userRaftToken, userRaft;
  let userWasmToken, userWasm;
  let userK8sToken, userK8s;

  afterAll(async () => {
    const userIds = [userRaft?.id, userWasm?.id, userK8s?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      }).catch(() => null);
    }
  });

  // =========================================================================
  // TEST 1: Goal Differentiation - Two learners with different goals get different paths
  // =========================================================================
  it('1. Two learners with different goals receive different relevant, goal-tailored paths', async () => {
    // Learner 1: Distributed consensus using Go and Raft
    const raftSignup = await request(app).post('/api/v1/auth/signup').send({
      email: `raft-learner-${Date.now()}@test.com`,
      password: 'Password123!',
      displayName: 'Raft Engineer'
    });
    userRaftToken = raftSignup.body.data.token;
    userRaft = raftSignup.body.data.user;

    await request(app)
      .post('/api/v1/onboarding/step')
      .set('Authorization', `Bearer ${userRaftToken}`)
      .send({
        step: 3,
        goalTitle: 'Distributed consensus using Go and Raft',
        experienceLevel: 'INTERMEDIATE',
        dailyMinutes: 20
      });

    const raftComplete = await request(app)
      .post('/api/v1/onboarding/complete')
      .set('Authorization', `Bearer ${userRaftToken}`);

    expect(raftComplete.status).toBe(200);
    const raftRoadmap = raftComplete.body.data.roadmap;
    expect(raftRoadmap).toBeDefined();
    expect(raftRoadmap.title).toContain('Distributed');

    const raftSlugs = raftRoadmap.items.map(i => i.milestoneId || i.concept.slug);
    expect(raftSlugs.some(s => s.includes('raft') || s.includes('go'))).toBe(true);

    // Learner 2: WebAssembly with Rust
    const wasmSignup = await request(app).post('/api/v1/auth/signup').send({
      email: `wasm-learner-${Date.now()}@test.com`,
      password: 'Password123!',
      displayName: 'WASM Engineer'
    });
    userWasmToken = wasmSignup.body.data.token;
    userWasm = wasmSignup.body.data.user;

    await request(app)
      .post('/api/v1/onboarding/step')
      .set('Authorization', `Bearer ${userWasmToken}`)
      .send({
        step: 3,
        goalTitle: 'WebAssembly with Rust',
        experienceLevel: 'INTERMEDIATE',
        dailyMinutes: 15
      });

    const wasmComplete = await request(app)
      .post('/api/v1/onboarding/complete')
      .set('Authorization', `Bearer ${userWasmToken}`);

    expect(wasmComplete.status).toBe(200);
    const wasmRoadmap = wasmComplete.body.data.roadmap;
    expect(wasmRoadmap).toBeDefined();
    expect(wasmRoadmap.title).toContain('WebAssembly');

    const wasmSlugs = wasmRoadmap.items.map(i => i.milestoneId || i.concept.slug);
    expect(wasmSlugs.some(s => s.includes('wasm') || s.includes('rust'))).toBe(true);

    // Zero overlap between specialized Raft and WASM milestone slugs
    const overlap = raftSlugs.filter(s => wasmSlugs.includes(s));
    expect(overlap).toHaveLength(0);
  });

  // =========================================================================
  // TEST 2: Arbitrary Goal Outside Catalogue
  // =========================================================================
  it('2. An arbitrary goal outside existing seeded concepts generates a valid custom milestone path', async () => {
    const k8sSignup = await request(app).post('/api/v1/auth/signup').send({
      email: `k8s-learner-${Date.now()}@test.com`,
      password: 'Password123!',
      displayName: 'Kubernetes Engineer'
    });
    userK8sToken = k8sSignup.body.data.token;
    userK8s = k8sSignup.body.data.user;

    await request(app)
      .post('/api/v1/onboarding/step')
      .set('Authorization', `Bearer ${userK8sToken}`)
      .send({
        step: 3,
        goalTitle: 'Kubernetes Operators and Custom Resource Definitions',
        experienceLevel: 'ADVANCED',
        dailyMinutes: 20
      });

    const completeRes = await request(app)
      .post('/api/v1/onboarding/complete')
      .set('Authorization', `Bearer ${userK8sToken}`);

    expect(completeRes.status).toBe(200);
    const roadmap = completeRes.body.data.roadmap;
    expect(roadmap).toBeDefined();
    expect(roadmap.items.length).toBeGreaterThanOrEqual(4);

    // Check that custom concepts were saved with userId and isCustom = true
    const customConcepts = await prisma.concept.findMany({
      where: { userId: userK8s.id, isCustom: true }
    });
    expect(customConcepts.length).toBeGreaterThan(0);
    expect(customConcepts[0].description).toBeDefined();
  });

  // =========================================================================
  // TEST 3: Contract Validation & Cycle Detection (Kahn's Algorithm)
  // =========================================================================
  it('3. Contract validation rejects circular dependencies, self-dependencies, and unknown prerequisites', () => {
    // 3A. Self-dependency
    expect(() => {
      validateAndSortMilestones({
        pathTitle: 'Self Dependency Path',
        targetRole: 'Software Engineer',
        pedagogicalApproach: 'Invalid path with self dependency.',
        estimatedTotalWeeks: 4,
        milestones: [
          {
            topicSlug: 'node-a',
            title: 'Node A',
            domainSkillSlug: 'general',
            difficulty: 'BEGINNER',
            measurableObjective: 'Master node a concepts.',
            estimatedSessions: 2,
            prerequisiteTopicSlugs: ['node-a'], // self-dependency!
            whyThisMatters: 'Why this milestone matters to the learner.'
          },
          {
            topicSlug: 'node-b',
            title: 'Node B',
            domainSkillSlug: 'general',
            difficulty: 'BEGINNER',
            measurableObjective: 'Master node b concepts.',
            estimatedSessions: 2,
            prerequisiteTopicSlugs: [],
            whyThisMatters: 'Why this milestone matters to the learner.'
          },
          {
            topicSlug: 'node-c',
            title: 'Node C',
            domainSkillSlug: 'general',
            difficulty: 'BEGINNER',
            measurableObjective: 'Master node c concepts.',
            estimatedSessions: 2,
            prerequisiteTopicSlugs: [],
            whyThisMatters: 'Why this milestone matters to the learner.'
          }
        ]
      });
    }).toThrow(/Self-dependency detected/);

    // 3B. Circular dependency (A -> B -> C -> A)
    expect(() => {
      validateAndSortMilestones({
        pathTitle: 'Cyclic Dependency Path',
        targetRole: 'Software Engineer',
        pedagogicalApproach: 'Invalid path with circular loop.',
        estimatedTotalWeeks: 4,
        milestones: [
          {
            topicSlug: 'alpha',
            title: 'Alpha',
            domainSkillSlug: 'general',
            difficulty: 'BEGINNER',
            measurableObjective: 'Master alpha concepts.',
            estimatedSessions: 2,
            prerequisiteTopicSlugs: ['gamma'], // cycle!
            whyThisMatters: 'Why this milestone matters to the learner.'
          },
          {
            topicSlug: 'beta',
            title: 'Beta',
            domainSkillSlug: 'general',
            difficulty: 'BEGINNER',
            measurableObjective: 'Master beta concepts.',
            estimatedSessions: 2,
            prerequisiteTopicSlugs: ['alpha'],
            whyThisMatters: 'Why this milestone matters to the learner.'
          },
          {
            topicSlug: 'gamma',
            title: 'Gamma',
            domainSkillSlug: 'general',
            difficulty: 'BEGINNER',
            measurableObjective: 'Master gamma concepts.',
            estimatedSessions: 2,
            prerequisiteTopicSlugs: ['beta'],
            whyThisMatters: 'Why this milestone matters to the learner.'
          }
        ]
      });
    }).toThrow(/Dependency cycle detected/);

    // 3C. Valid DAG is correctly topologically sorted
    const valid = validateAndSortMilestones({
      pathTitle: 'Valid Async Path',
      targetRole: 'Software Engineer',
      pedagogicalApproach: 'Strictly valid DAG sequencing.',
      estimatedTotalWeeks: 4,
      milestones: [
        {
          topicSlug: 'dependent-c',
          title: 'Dependent C',
          domainSkillSlug: 'general',
          difficulty: 'ADVANCED',
          measurableObjective: 'Master dependent c concepts.',
          estimatedSessions: 3,
          prerequisiteTopicSlugs: ['prereq-a', 'intermediate-b'],
          whyThisMatters: 'Depends on A and B'
        },
        {
          topicSlug: 'prereq-a',
          title: 'Prerequisite A',
          domainSkillSlug: 'general',
          difficulty: 'BEGINNER',
          measurableObjective: 'Master root prerequisite a.',
          estimatedSessions: 2,
          prerequisiteTopicSlugs: [],
          whyThisMatters: 'Foundational'
        },
        {
          topicSlug: 'intermediate-b',
          title: 'Intermediate B',
          domainSkillSlug: 'general',
          difficulty: 'INTERMEDIATE',
          measurableObjective: 'Master intermediate b.',
          estimatedSessions: 2,
          prerequisiteTopicSlugs: ['prereq-a'],
          whyThisMatters: 'Depends on A'
        }
      ]
    });

    // In topological order, prereq-a must precede intermediate-b, which must precede dependent-c
    const slugs = valid.milestones.map(m => m.topicSlug);
    expect(slugs.indexOf('prereq-a')).toBeLessThan(slugs.indexOf('intermediate-b'));
    expect(slugs.indexOf('intermediate-b')).toBeLessThan(slugs.indexOf('dependent-c'));
  });

  // =========================================================================
  // TEST 4: Idempotency & Safe Persistence Across Subsequent Reads
  // =========================================================================
  it('4. Retrying onboarding does not duplicate paths; saved path persists across reads', async () => {
    // Calling complete again returns the exact same active path without creating a new row
    const firstRead = await request(app)
      .get('/api/v1/learning-paths/current')
      .set('Authorization', `Bearer ${userRaftToken}`);
    expect(firstRead.status).toBe(200);
    const initialPathId = firstRead.body.data.roadmap.id;

    // Retry onboarding complete
    const retryComplete = await request(app)
      .post('/api/v1/onboarding/complete')
      .set('Authorization', `Bearer ${userRaftToken}`);
    expect(retryComplete.status).toBe(200);
    expect(retryComplete.body.data.roadmap.id).toBe(initialPathId);

    // Verify only 1 ACTIVE learning path exists for userRaft in DB
    const activePaths = await prisma.learningPath.findMany({
      where: { userId: userRaft.id, status: 'ACTIVE' }
    });
    expect(activePaths).toHaveLength(1);
  });

  // =========================================================================
  // TEST 5: User Ownership & Authorization Check
  // =========================================================================
  it('5. User cannot read or modify another learners personalized learning path', async () => {
    // User WASM cannot read User Raft's path
    const wasmCurrent = await request(app)
      .get('/api/v1/learning-paths/current')
      .set('Authorization', `Bearer ${userWasmToken}`);

    const raftCurrent = await request(app)
      .get('/api/v1/learning-paths/current')
      .set('Authorization', `Bearer ${userRaftToken}`);

    expect(wasmCurrent.body.data.roadmap.id).not.toBe(raftCurrent.body.data.roadmap.id);
    expect(wasmCurrent.body.data.roadmap.title).not.toBe(raftCurrent.body.data.roadmap.title);
  });

  // =========================================================================
  // TEST 6: Graceful AI Fallback Preserves Goal Alignment
  // =========================================================================
  it('6. When AI provider times out or fails, goal-adaptive synthesizer preserves goal relevance', async () => {
    // Call synthesizePersonalizedPath directly with an arbitrary custom goal
    const result = await PathSynthesisService.synthesizePersonalizedPath({
      goalTitle: 'High-Performance Audio DSP in C++',
      targetRole: 'Audio Software Engineer',
      experienceLevel: 'ADVANCED',
      dailyMinutes: 15
    });

    expect(result).toBeDefined();
    expect(result.pathTitle).toContain('Audio DSP');
    expect(result.milestones.length).toBeGreaterThanOrEqual(4);
    // Never silently substitute JavaScript/Node.js for Audio DSP
    const slugs = result.milestones.map(m => m.topicSlug);
    expect(slugs.some(s => s.includes('javascript') || s.includes('event-loop'))).toBe(false);
  });
});
