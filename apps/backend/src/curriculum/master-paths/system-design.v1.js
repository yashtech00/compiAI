/**
 * System Design Master Path - Version 1.0.0
 * Canonical, versioned curriculum definition.
 */

export const systemDesignCurriculumV1 = {
  goalId: 'system-design',
  version: '1.0.0',
  title: 'System Design & Scalable Architecture',
  description: 'Master large-scale distributed systems, high availability, database scaling, caching, and practical architecture design.',
  finalAssessmentId: 'assessment-system-design-capstone',
  estimatedEffort: {
    totalMinutes: 720,
    recommendedSessions: 24,
    provisionalRange: '20-28 sessions'
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
    { id: 'sd-metrics-sla', title: 'Latency, Throughput, and SLA Estimation', category: 'Fundamentals' },
    { id: 'sd-api-contracts', title: 'High-Scale API Design & Protocol Selection', category: 'API Design' },
    { id: 'sd-data-modeling', title: 'Relational vs Non-Relational Data Modeling', category: 'Data & Persistence' },
    { id: 'sd-db-scaling', title: 'Replication, Sharding, and Index Tuning', category: 'Data & Persistence' },
    { id: 'sd-caching-lb', title: 'Cache Topologies, Invalidation & Load Balancing', category: 'Scalability' },
    { id: 'sd-async-queues', title: 'Event-Driven Queues, Backpressure & Dead Letters', category: 'Reliability' },
    { id: 'sd-cap-tradeoffs', title: 'CAP Theorem, PACELC, & Distributed Consensus', category: 'Distributed Systems' },
    { id: 'sd-resilience-patterns', title: 'Circuit Breakers, Retries, Rate Limiting & Failover', category: 'Reliability' },
    { id: 'sd-e2e-architecture', title: 'End-to-End System Synthesis & Bottleneck Analysis', category: 'Architecture' }
  ],
  modules: [
    {
      id: 'sd-mod-1',
      title: 'Requirements, Metrics & Capacity Estimation',
      description: 'Calculate QPS, storage growth, bandwidth envelopes, and define strict availability SLOs.',
      order: 1,
      requiredSkills: ['sd-metrics-sla'],
      estimatedMinutes: 60,
      scenarioIds: ['scenario-sd-metrics-01']
    },
    {
      id: 'sd-mod-2',
      title: 'API & Data Contract Design',
      description: 'Design idempotent REST/gRPC interfaces, pagination strategies, and boundary validation.',
      order: 2,
      requiredSkills: ['sd-api-contracts'],
      estimatedMinutes: 60,
      scenarioIds: ['scenario-sd-api-01']
    },
    {
      id: 'sd-mod-3',
      title: 'Databases & Query Performance',
      description: 'Choose SQL vs NoSQL, resolve N+1 patterns, analyze query execution plans, and design secondary indexes.',
      order: 3,
      requiredSkills: ['sd-data-modeling'],
      estimatedMinutes: 90,
      scenarioIds: ['scenario-sd-db-01']
    },
    {
      id: 'sd-mod-4',
      title: 'Database Scaling: Replication & Sharding',
      description: 'Configure read replicas, write sharding keys, handle replication lag and failover split-brains.',
      order: 4,
      requiredSkills: ['sd-db-scaling'],
      estimatedMinutes: 90,
      scenarioIds: ['scenario-sd-sharding-01']
    },
    {
      id: 'sd-mod-5',
      title: 'Caching Strategies & Load Balancing',
      description: 'Implement Cache-Aside, Write-Through, consistent hashing, and mitigate cache stampedes.',
      order: 5,
      requiredSkills: ['sd-caching-lb'],
      estimatedMinutes: 90,
      scenarioIds: ['scenario-sd-cache-01']
    },
    {
      id: 'sd-mod-6',
      title: 'Asynchronous Queues & Event-Driven Reliability',
      description: 'Decouple ingestion with distributed message brokers, at-least-once delivery, and dead-letter handling.',
      order: 6,
      requiredSkills: ['sd-async-queues'],
      estimatedMinutes: 90,
      scenarioIds: ['scenario-sd-queues-01']
    },
    {
      id: 'sd-mod-7',
      title: 'Distributed Consistency & Resilience',
      description: 'Apply CAP/PACELC trade-offs, circuit breakers, rate limits, and multi-region recovery.',
      order: 7,
      requiredSkills: ['sd-cap-tradeoffs', 'sd-resilience-patterns'],
      estimatedMinutes: 120,
      scenarioIds: ['scenario-sd-resilience-01']
    },
    {
      id: 'sd-mod-8',
      title: 'End-to-End System Synthesis',
      description: 'Synthesize full architecture, verify fault isolation, defend trade-offs, and conduct chaos failure analysis.',
      order: 8,
      requiredSkills: ['sd-e2e-architecture'],
      estimatedMinutes: 120,
      scenarioIds: ['scenario-sd-e2e-01']
    }
  ],
  prerequisites: [
    { sourceModuleId: 'sd-mod-1', targetModuleId: 'sd-mod-2' },
    { sourceModuleId: 'sd-mod-2', targetModuleId: 'sd-mod-3' },
    { sourceModuleId: 'sd-mod-3', targetModuleId: 'sd-mod-4' },
    { sourceModuleId: 'sd-mod-3', targetModuleId: 'sd-mod-5' },
    { sourceModuleId: 'sd-mod-5', targetModuleId: 'sd-mod-6' },
    { sourceModuleId: 'sd-mod-4', targetModuleId: 'sd-mod-7' },
    { sourceModuleId: 'sd-mod-6', targetModuleId: 'sd-mod-7' },
    { sourceModuleId: 'sd-mod-7', targetModuleId: 'sd-mod-8' }
  ]
};
