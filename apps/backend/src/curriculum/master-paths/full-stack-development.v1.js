/**
 * Full Stack Development Master Path - Version 1.0.0
 * Canonical, versioned curriculum definition.
 */

export const fullStackDevelopmentCurriculumV1 = {
  goalId: 'full-stack-development',
  version: '1.0.0',
  title: 'Full Stack Web Engineering & Architecture',
  description: 'Bridge frontend user experience, responsive state management, and reliable backend service contracts with unified end-to-end testing.',
  finalAssessmentId: 'assessment-fullstack-capstone',
  estimatedEffort: {
    totalMinutes: 750,
    recommendedSessions: 25,
    provisionalRange: '20-30 sessions'
  },
  masteryCriteria: {
    threshold: 80,
    requireVerification: true,
    requireNoCriticalFailures: true,
    dimensionWeights: {
      diagnosis: 0.30,
      investigation: 0.25,
      implementation: 0.25,
      verification: 0.20
    }
  },
  skills: [
    { id: 'fs-api-contracts', title: 'Shared Types, OpenAPI & Client-Server Contracts', category: 'API Design' },
    { id: 'fs-state-caching', title: 'Client State, Optimistic Updates & Cache Synchronization', category: 'Frontend' },
    { id: 'fs-auth-flow', title: 'Cookie/JWT Auth Flows, CSRF, & Session Lifecycles', category: 'Security' },
    { id: 'fs-db-persistence', title: 'Data Modeling, Relations & Server Actions', category: 'Persistence' },
    { id: 'fs-perf-optimization', title: 'SSR/SSG, Network Waterfalls & Bundle Budgets', category: 'Performance' },
    { id: 'fs-e2e-testing', title: 'Full Stack Integration, Mocking & End-to-End Testing', category: 'Quality' }
  ],
  modules: [
    {
      id: 'fs-mod-1',
      title: 'Type-Safe Client-Server Contracts',
      description: 'Define shared TypeScript schemas, input validation, and typed API clients.',
      order: 1,
      requiredSkills: ['fs-api-contracts'],
      estimatedMinutes: 60,
      scenarioIds: ['scenario-fs-contracts-01']
    },
    {
      id: 'fs-mod-2',
      title: 'Full Stack Authentication & Session Lifecycles',
      description: 'Implement secure httpOnly cookies, refresh tokens, role gating, and SSR auth state.',
      order: 2,
      requiredSkills: ['fs-auth-flow'],
      estimatedMinutes: 90,
      scenarioIds: ['scenario-fs-auth-01']
    },
    {
      id: 'fs-mod-3',
      title: 'Client State, Server State & Optimistic UI',
      description: 'Manage optimistic mutations, rollback on server error, and cache invalidation.',
      order: 3,
      requiredSkills: ['fs-state-caching'],
      estimatedMinutes: 90,
      scenarioIds: ['scenario-fs-state-01']
    },
    {
      id: 'fs-mod-4',
      title: 'Persistence & Server-Side Data Operations',
      description: 'Implement database schemas, transactional mutations, and relational querying for views.',
      order: 4,
      requiredSkills: ['fs-db-persistence'],
      estimatedMinutes: 90,
      scenarioIds: ['scenario-fs-db-01']
    },
    {
      id: 'fs-mod-5',
      title: 'Full Stack Performance: Eliminating Waterfalls',
      description: 'Audit network waterfalls, parallelize fetch requests, configure edge caching and streaming.',
      order: 5,
      requiredSkills: ['fs-perf-optimization'],
      estimatedMinutes: 90,
      scenarioIds: ['scenario-fs-perf-01']
    },
    {
      id: 'fs-mod-6',
      title: 'End-to-End Resilience & Contract Testing',
      description: 'Run cross-boundary tests, verify error boundary recovery, and diagnose full-stack regressions.',
      order: 6,
      requiredSkills: ['fs-e2e-testing'],
      estimatedMinutes: 120,
      scenarioIds: ['scenario-fs-incident-01']
    }
  ],
  prerequisites: [
    { sourceModuleId: 'fs-mod-1', targetModuleId: 'fs-mod-2' },
    { sourceModuleId: 'fs-mod-1', targetModuleId: 'fs-mod-3' },
    { sourceModuleId: 'fs-mod-2', targetModuleId: 'fs-mod-4' },
    { sourceModuleId: 'fs-mod-3', targetModuleId: 'fs-mod-5' },
    { sourceModuleId: 'fs-mod-4', targetModuleId: 'fs-mod-6' },
    { sourceModuleId: 'fs-mod-5', targetModuleId: 'fs-mod-6' }
  ]
};
