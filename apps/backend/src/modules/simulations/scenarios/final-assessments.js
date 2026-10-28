/**
 * Final Goal Assessments & Capstone Challenges
 * Required independent proofs of practical engineering competence before a goal can be marked complete.
 */

export const finalAssessments = [
  {
    assessmentId: 'assessment-system-design-capstone',
    version: '1.0.0',
    goalId: 'system-design',
    type: 'FINAL_CHALLENGE',
    title: 'Capstone: Global Real-Time Collaborative Document Platform',
    description: 'Synthesize a production-ready distributed architecture for Google Docs-scale collaborative editing. Support 100,000 concurrent active document rooms, sub-50ms keystroke synchronization, offline convergence, and multi-region failover.',
    relevantSkills: ['sd-metrics-sla', 'sd-api-contracts', 'sd-data-modeling', 'sd-db-scaling', 'sd-caching-lb', 'sd-async-queues', 'sd-cap-tradeoffs', 'sd-resilience-patterns', 'sd-e2e-architecture'],
    stages: [
      {
        stageIndex: 1,
        title: 'Step 1: Real-Time Protocol & Connection State Management',
        question: 'Choose the communication protocol and gateway connection topology for 100,000 concurrent editing sessions with bi-directional sub-50ms message delivery.',
        options: [
          {
            id: 'opt-polling',
            label: 'HTTP Short Polling every 500ms to stateless API servers',
            isCorrect: false,
            criticalFailure: {
              code: 'INEFFICIENT_CONNECTION_OVERHEAD',
              reason: 'HTTP short polling creates massive TCP connection handshake churn and cannot satisfy sub-50ms latency.'
            }
          },
          {
            id: 'opt-websocket-cluster',
            label: 'Persistent WebSocket connections terminated at stateful Edge Gateway cluster with Redis Pub/Sub backplane routing document rooms',
            isCorrect: true,
            criticalFailure: null
          }
        ]
      },
      {
        stageIndex: 2,
        title: 'Step 2: Conflict Resolution & Distributed Convergence',
        question: 'How should concurrent offline keystrokes from two geographically separated users editing the same paragraph be merged without a central locking bottleneck?',
        options: [
          {
            id: 'opt-crdt-ot',
            label: 'Conflict-free Replicated Data Types (CRDTs) or Operational Transformation (OT) with vector clocks to achieve strong eventual consistency without centralized lock',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'opt-last-write-wins',
            label: 'Last-Write-Wins (LWW) based on client local wall-clock timestamp',
            isCorrect: false,
            criticalFailure: {
              code: 'SILENT_DATA_LOSS_LWW',
              reason: 'LWW clobbers concurrent edits silently due to client clock skew, corrupting document history.'
            }
          }
        ]
      },
      {
        stageIndex: 3,
        title: 'Step 3: Multi-Region Persistence & Snapshot Compaction',
        question: 'Document change logs grow unboundedly. How should the document state be persisted and compacted efficiently?',
        options: [
          {
            id: 'opt-snapshot-compaction',
            label: 'Append-only changelog with periodic periodic snapshot compaction to object storage (S3) and active state in memory/distributed cache',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'opt-single-blob-rewrite',
            label: 'Rewrite entire document JSON blob to single relational row on every single keystroke',
            isCorrect: false,
            criticalFailure: {
              code: 'DATABASE_WRITE_SATURATION',
              reason: 'Rewriting whole documents on every keystroke exhausts database write IOPS immediately.'
            }
          }
        ]
      }
    ],
    passingThreshold: 85
  },
  {
    assessmentId: 'assessment-backend-capstone',
    version: '1.0.0',
    goalId: 'backend-development',
    type: 'FINAL_CHALLENGE',
    title: 'Capstone: High-Reliability Webhook Ingestion & Dispatch Engine',
    description: 'Design and harden a multi-tenant webhook engine that receives 50,000 events/second, guarantees at-least-once delivery with tenant isolation, and prevents noisy neighbors from starving critical webhook deliveries.',
    relevantSkills: ['be-api-contracts', 'be-persistence-tx', 'be-auth-security', 'be-idempotency', 'be-async-jobs', 'be-observability', 'be-testing-strategy'],
    stages: [
      {
        stageIndex: 1,
        title: 'Step 1: Multi-Tenant Ingestion & Fair Rate Limiting',
        question: 'A single tenant floods the webhook ingestion gateway with 40,000 requests/second, threatening to starve other tenants. How do you isolate tenants fairly?',
        options: [
          {
            id: 'opt-token-bucket-tenant',
            label: 'Per-tenant distributed Token Bucket / Leaky Bucket rate limiting using Redis, with separate queue tiers for high-priority vs bulk webhooks',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'opt-global-rate-limit',
            label: 'Single global rate limit across all tenants',
            isCorrect: false,
            criticalFailure: {
              code: 'NOISY_NEIGHBOR_COLLAPSE',
              reason: 'A single malicious or buggy tenant can consume the entire global quota and block all other customers.'
            }
          }
        ]
      },
      {
        stageIndex: 2,
        title: 'Step 2: Signature Verification & Secure Delivery',
        question: 'How should outgoing webhooks be signed so destination customer servers can cryptographically verify authenticity without replay attacks?',
        options: [
          {
            id: 'opt-hmac-sha256',
            label: 'Compute HMAC-SHA256 signature over payload + timestamp header using per-tenant secret key, rejecting requests with timestamp older than 5 minutes',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'opt-unauthenticated-post',
            label: 'Plain HTTP POST without signature or secret header',
            isCorrect: false,
            criticalFailure: {
              code: 'UNAUTHENTICATED_WEBHOOK_VULNERABILITY',
              reason: 'Unsigned webhooks allow attackers to forge arbitrary events to customer webhooks.'
            }
          }
        ]
      }
    ],
    passingThreshold: 85
  },
  {
    assessmentId: 'assessment-fullstack-capstone',
    version: '1.0.0',
    goalId: 'full-stack-development',
    type: 'FINAL_CHALLENGE',
    title: 'Capstone: Real-Time Collaborative Analytics Dashboard',
    description: 'Construct a secure, real-time analytics portal with responsive SSR filtering, optimistic chart state, and resilient server-sent event (SSE) streams.',
    relevantSkills: ['fs-api-contracts', 'fs-state-caching', 'fs-auth-flow', 'fs-db-persistence', 'fs-perf-optimization', 'fs-e2e-testing'],
    stages: [
      {
        stageIndex: 1,
        title: 'Step 1: Full Stack Data Flow & Optimistic Mutation',
        question: 'How do you structure client-server synchronization to allow instant filter feedback with zero network race conditions?',
        options: [
          {
            id: 'opt-optimistic-abort',
            label: 'Use optimistic state update with AbortController on in-flight requests and URL search params as the single source of truth',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'opt-uncontrolled-fetch',
            label: 'Trigger uncancelled fetch on every keypress without debounce or request cancellation',
            isCorrect: false,
            criticalFailure: null
          }
        ]
      }
    ],
    passingThreshold: 80
  }
];
