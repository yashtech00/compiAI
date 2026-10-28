/**
 * Backend Development Master Path - Version 1.0.0
 * Canonical, versioned curriculum definition.
 */

export const backendDevelopmentCurriculumV1 = {
  goalId: 'backend-development',
  version: '1.0.0',
  title: 'Backend Engineering & Distributed Services',
  description: 'Design robust APIs, manage relational persistence, implement bulletproof auth, prevent duplicate writes, and observe production services.',
  finalAssessmentId: 'assessment-backend-capstone',
  estimatedEffort: {
    totalMinutes: 680,
    recommendedSessions: 22,
    provisionalRange: '18-26 sessions'
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
    { id: 'be-api-contracts', title: 'RESTful API Contracts & Schema Validation', category: 'API Engineering' },
    { id: 'be-persistence-tx', title: 'Relational Schema, Migrations & ACID Transactions', category: 'Persistence' },
    { id: 'be-auth-security', title: 'JWT, Session Management, RBAC & Security Boundaries', category: 'Security' },
    { id: 'be-idempotency', title: 'Idempotency Keys & Concurrency Control', category: 'Reliability' },
    { id: 'be-async-jobs', title: 'Background Processing & Job Queue Lifecycles', category: 'Architecture' },
    { id: 'be-observability', title: 'Structured Logging, Tracing & Error Handling', category: 'Operations' },
    { id: 'be-testing-strategy', title: 'Unit, Integration & Contract Testing', category: 'Quality' }
  ],
  modules: [
    {
      id: 'be-mod-1',
      title: 'API Contracts, Input Validation & Error Envelopes',
      description: 'Implement rigorous schema validation, sanitization, and standardized REST error envelopes.',
      order: 1,
      requiredSkills: ['be-api-contracts'],
      estimatedMinutes: 60,
      scenarioIds: ['scenario-be-api-01']
    },
    {
      id: 'be-mod-2',
      title: 'Database Persistence, Migrations & Transactions',
      description: 'Execute relational schema migrations, ACID transactions, and optimistic locking.',
      order: 2,
      requiredSkills: ['be-persistence-tx'],
      estimatedMinutes: 90,
      scenarioIds: ['scenario-be-db-01']
    },
    {
      id: 'be-mod-3',
      title: 'Authentication, Authorization & Secrets Management',
      description: 'Implement secure JWT signing, refresh tokens, role-based access control, and environment isolation.',
      order: 3,
      requiredSkills: ['be-auth-security'],
      estimatedMinutes: 90,
      scenarioIds: ['scenario-be-auth-01']
    },
    {
      id: 'be-mod-4',
      title: 'Idempotent Writes & Concurrency Safety',
      description: 'Prevent race conditions, duplicate billing/write events, and design distributed idempotency tokens.',
      order: 4,
      requiredSkills: ['be-idempotency'],
      estimatedMinutes: 90,
      scenarioIds: ['scenario-be-idempotency-01']
    },
    {
      id: 'be-mod-5',
      title: 'Asynchronous Job Processing & Resilience',
      description: 'Implement reliable workers, retry policies with jitter, and dead-letter queue recovery.',
      order: 5,
      requiredSkills: ['be-async-jobs'],
      estimatedMinutes: 100,
      scenarioIds: ['scenario-be-workers-01']
    },
    {
      id: 'be-mod-6',
      title: 'Observability: Metrics, Tracing & Incident Recovery',
      description: 'Emit correlation IDs, structured audit logs, APM traces, and diagnose production regressions.',
      order: 6,
      requiredSkills: ['be-observability', 'be-testing-strategy'],
      estimatedMinutes: 120,
      scenarioIds: ['scenario-be-incident-01']
    }
  ],
  prerequisites: [
    { sourceModuleId: 'be-mod-1', targetModuleId: 'be-mod-2' },
    { sourceModuleId: 'be-mod-2', targetModuleId: 'be-mod-3' },
    { sourceModuleId: 'be-mod-2', targetModuleId: 'be-mod-4' },
    { sourceModuleId: 'be-mod-4', targetModuleId: 'be-mod-5' },
    { sourceModuleId: 'be-mod-3', targetModuleId: 'be-mod-6' },
    { sourceModuleId: 'be-mod-5', targetModuleId: 'be-mod-6' }
  ]
};
