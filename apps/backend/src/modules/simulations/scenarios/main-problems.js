/**
 * Main Problems for Problem-First Adaptive Learning
 * Evolving multi-stage real-world engineering simulations.
 */

export const mainProblems = [
  {
    scenarioId: 'main-system-design-01',
    version: '1.0.0',
    goalId: 'system-design',
    type: 'MAIN_PROBLEM',
    title: 'Architecting a High-Throughput Flash Sale Platform',
    description: 'Design, scale, and harden an e-commerce flash sale platform handling sudden 100x traffic spikes, strictly preventing overselling while maintaining sub-100ms checkout response times.',
    relevantSkills: ['sd-metrics-sla', 'sd-data-modeling', 'sd-db-scaling', 'sd-caching-lb', 'sd-async-queues', 'sd-resilience-patterns'],
    stages: [
      {
        stageIndex: 1,
        title: 'Stage 1: Traffic Estimation, Capacity & SLA Requirements',
        problemStatement: 'The upcoming flash sale anticipates 50,000 active shoppers competing for 5,000 items within a 2-minute window. Estimate write QPS and define data isolation requirements.',
        state: {
          currentQPS: 500,
          peakQPS: 25000,
          itemCount: 5000,
          allocatedBudgetPerMonthUSD: 2000
        },
        availableEvidence: [
          {
            id: 'ev-traffic-profile',
            title: 'Historical Flash Sale Traffic Graphs',
            type: 'TRAFFIC',
            data: 'Traffic spikes from baseline 500 QPS to 25,000 write QPS within 3 seconds of the sale launch.'
          }
        ],
        allowedActions: [
          {
            id: 'act-s1-direct-db',
            label: 'Route all 25,000 checkout requests directly to relational Postgres primary with autoincrement sequence',
            isCorrect: false,
            criticalFailure: {
              code: 'DATABASE_COLLAPSE_SPOF',
              reason: 'Unbuffered 25,000 write QPS directly to single Postgres primary will exhaust connection limits and crash database.'
            }
          },
          {
            id: 'act-s1-distributed-reserve',
            label: 'Decouple inventory reservation using in-memory distributed atomic counters (Redis Lua script) backed by async write-behind queue to Postgres',
            isCorrect: true,
            criticalFailure: null
          }
        ],
        verificationCheck: 'Assert inventory counter decrements atomically and rejects requests once counter reaches 0 without negative stock.'
      },
      {
        stageIndex: 2,
        title: 'Stage 2: Preventing Overselling Under Concurrency',
        problemStatement: 'Under 25,000 concurrent checkout attempts, multiple users attempt to purchase the exact same remaining inventory item. Enforce strict ACID or atomic reservation.',
        state: {
          inventoryRemaining: 1,
          simultaneousRequests: 400
        },
        availableEvidence: [
          {
            id: 'ev-concurrency-trace',
            title: 'Distributed Trace Logs',
            type: 'TRACE',
            data: 'Multiple threads read `stock = 1` before any write completes, leading to 12 items sold when only 1 existed.'
          }
        ],
        allowedActions: [
          {
            id: 'act-s2-optimistic-condition',
            label: 'Execute conditional atomic update: `UPDATE inventory SET stock = stock - 1 WHERE item_id = $1 AND stock > 0` with row versioning',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'act-s2-no-lock-read',
            label: 'Select stock in application layer and execute unconditional update if previous read was greater than zero',
            isCorrect: false,
            criticalFailure: {
              code: 'OVERSELLING_INVENTORY',
              reason: 'Non-atomic check allows race condition resulting in negative inventory and severe business liability.'
            }
          }
        ],
        verificationCheck: 'Assert that under 500 concurrent workers purchasing 1 remaining item, exactly 1 succeeds and 499 receive SOLD_OUT response.'
      },
      {
        stageIndex: 3,
        title: 'Stage 3: Handling Redis Primary Failover & Cache Stampede',
        problemStatement: 'The in-memory Redis cluster node experiences a transient network partition. Thousands of concurrent requests simultaneously fall back to database queries, threatening a cache stampede.',
        state: {
          cacheClusterStatus: 'PARTITIONED',
          dbIncomingConnectionsSpike: 1500
        },
        availableEvidence: [
          {
            id: 'ev-cache-stampede-metrics',
            title: 'Cache Miss & Connection Metrics',
            type: 'METRICS',
            data: 'Cache hit ratio dropped from 99.4% to 0%. Database connection queue backlog reached 1,500 waiting clients.'
          }
        ],
        allowedActions: [
          {
            id: 'act-s3-mutex-circuit-breaker',
            label: 'Implement single-flight mutex locking (lock per key) with circuit breaker on DB fallback and probabilistic early expiration (XFetch)',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'act-s3-bypass-cache',
            label: 'Disable cache checks completely and route all read traffic to Postgres primary until Redis recovers',
            isCorrect: false,
            criticalFailure: {
              code: 'CASCADING_SYSTEM_OUTAGE',
              reason: 'Bypassing cache completely drives Postgres into unrecoverable CPU lockup, bringing down the entire platform.'
            }
          }
        ],
        verificationCheck: 'Assert that during simulated cache outage, DB queries are bounded by single-flight mutex and latency remains stable under circuit breaker.'
      }
    ]
  },
  {
    scenarioId: 'main-backend-01',
    version: '1.0.0',
    goalId: 'backend-development',
    type: 'MAIN_PROBLEM',
    title: 'Building a Fault-Tolerant Financial Ledger Service',
    description: 'Construct a mission-critical double-entry accounting ledger API that guarantees exactly-once processing, preserves strict audit trails, and recovers seamlessly from network disruptions.',
    relevantSkills: ['be-api-contracts', 'be-persistence-tx', 'be-idempotency', 'be-async-jobs', 'be-observability'],
    stages: [
      {
        stageIndex: 1,
        title: 'Stage 1: Strict API Contracts & Schema Validation',
        problemStatement: 'Design the transaction transfer endpoint schema to prevent negative amounts, invalid currencies, and missing client idempotency headers.',
        state: {
          endpoint: 'POST /api/v1/ledger/transfers',
          validationEngine: 'Zod'
        },
        availableEvidence: [
          {
            id: 'ev-failing-payloads',
            title: 'Malformed Ingress Requests',
            type: 'REQUEST_LOGS',
            data: [
              '{ "from": "acc_1", "to": "acc_2", "amount": -500 }',
              '{ "from": "acc_1", "to": "acc_1", "amount": 100 }'
            ]
          }
        ],
        allowedActions: [
          {
            id: 'act-be-s1-validate-schema',
            label: 'Apply comprehensive Zod schema: enforce positive integers (cents), ISO currency codes, distinct source/destination accounts, and mandatory UUID idempotency key',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'act-be-s1-lax-types',
            label: 'Accept standard number values and perform ad-hoc if-conditions inside database query execution',
            isCorrect: false,
            criticalFailure: null
          }
        ],
        verificationCheck: 'Assert endpoint rejects negative amounts and identical from/to accounts with 400 Bad Request error envelope.'
      },
      {
        stageIndex: 2,
        title: 'Stage 2: Double-Entry ACID Transaction & Deadlock Prevention',
        problemStatement: 'A ledger transfer must debit account A and credit account B atomically. If account A has insufficient funds or concurrency lock contention arises, neither entry may be saved.',
        state: {
          ledgerBalanceConsistency: 'STRICT',
          activeTransfers: 150
        },
        availableEvidence: [
          {
            id: 'ev-deadlock-graph',
            title: 'PostgreSQL Lock Contention Graph',
            type: 'DEADLOCK_LOGS',
            data: 'Transaction 1 locks Acc A, waits for Acc B. Transaction 2 locks Acc B, waits for Acc A. Deadlock detected.'
          }
        ],
        allowedActions: [
          {
            id: 'act-be-s2-ordered-locking',
            label: 'Sort account IDs lexicographically before acquiring row locks (`SELECT ... FOR UPDATE`), execute transfer in single ACID transaction',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'act-be-s2-independent-updates',
            label: 'Execute two separate UPDATE statements without transaction wrapper and catch errors manually in try/catch',
            isCorrect: false,
            criticalFailure: {
              code: 'PARTIAL_LEDGER_WRITE_DATA_LOSS',
              reason: 'Executing updates without a database transaction causes debit to persist if credit fails, creating unbalanced money creation/loss.'
            }
          }
        ],
        verificationCheck: 'Assert that parallel bi-directional transfers between Account 1 and Account 2 never deadlock and total system balance is conserved.'
      },
      {
        stageIndex: 3,
        title: 'Stage 3: Out-of-Order Webhook Delivery & Dead-Letter Recovery',
        problemStatement: 'External bank settlement webhooks arrive out-of-order or experience downstream worker crashes during ledger reconciliations.',
        state: {
          workerPool: 'BullMQ/Worker Threads',
          deadLetterQueue: 'Active'
        },
        availableEvidence: [
          {
            id: 'ev-worker-retry-loop',
            title: 'Worker Retry Telemetry',
            type: 'LOGS',
            data: 'Poison pill webhook with corrupted signature crashes worker thread, triggering infinite retry loop saturating CPU.'
          }
        ],
        allowedActions: [
          {
            id: 'act-be-s3-exponential-dlq',
            label: 'Implement bounded retries (max 3) with exponential backoff and jitter, route permanently failing payloads to Dead-Letter Queue (DLQ) with alert',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'act-be-s3-infinite-retry',
            label: 'Keep retrying every 100ms indefinitely until worker succeeds',
            isCorrect: false,
            criticalFailure: {
              code: 'RESOURCE_STARVATION_LOOP',
              reason: 'Infinite retry loops exhaust worker pools and block legitimate transfers.'
            }
          }
        ],
        verificationCheck: 'Assert unprocessable payload is quarantined to DLQ after 3 attempts with structured audit log.'
      }
    ]
  },
  {
    scenarioId: 'main-fullstack-01',
    version: '1.0.0',
    goalId: 'full-stack-development',
    type: 'MAIN_PROBLEM',
    title: 'Architecting a Real-Time Collaborative Document Canvas',
    description: 'Build, optimize, and harden an end-to-end real-time collaborative workspace supporting 50 concurrent editors per room with conflict-free sync, optimistic UI updates, resilient WebSockets, and offline recovery.',
    relevantSkills: ['fs-api-contracts', 'fs-state-caching', 'fs-perf-optimization', 'fs-realtime-sync', 'fs-offline-persistence'],
    stages: [
      {
        stageIndex: 1,
        title: 'Stage 1: Real-Time Connection Scaling & Reconnection Storms',
        problemStatement: 'When a transient network hiccup occurs, 5,000 active browser clients simultaneously disconnect and bombard the WebSocket gateway with immediate reconnect requests.',
        state: {
          activeConnections: 5000,
          gatewayStatus: 'SURGE_OVERLOAD',
          p99HandshakeMs: 3800
        },
        availableEvidence: [
          {
            id: 'ev-ws-reconnect-storm',
            title: 'Gateway Connection Metrics',
            type: 'TRAFFIC',
            data: '5,000 clients attempt reconnect within 200ms of disconnect without backoff, saturating Node.js socket file descriptors.'
          }
        ],
        allowedActions: [
          {
            id: 'act-fs-s1-naive-reconnect',
            label: 'Configure browser WebSocket client to reconnect immediately in an unthrottled while loop',
            isCorrect: false,
            criticalFailure: {
              code: 'SOCKET_EXHAUSTION_STORM',
              reason: 'Instant unthrottled reconnects create an avalanche that crashes the WebSocket server and keeps legitimate clients disconnected.'
            }
          },
          {
            id: 'act-fs-s1-jittered-backoff',
            label: 'Implement exponential backoff with full jitter on client reconnects, authenticated via short-lived ticket handshake tokens and distributed Redis pub/sub backplane',
            isCorrect: true,
            criticalFailure: null
          }
        ],
        verificationCheck: 'Assert reconnect rate is smoothed across 15 seconds without dropping WebSocket node health.'
      },
      {
        stageIndex: 2,
        title: 'Stage 2: Concurrent Mutation Conflicts & Optimistic Local Updates',
        problemStatement: 'Two users simultaneously type into the exact same paragraph at index 14 while offline or on high latency. Prevent data loss and desynchronized document divergence.',
        state: {
          documentId: 'doc-collab-77',
          divergingClients: 2
        },
        availableEvidence: [
          {
            id: 'ev-divergence-log',
            title: 'CRDT / OT Sync Logs',
            type: 'TRACE',
            data: 'User A inserted "fast" at index 14 while User B inserted "secure" at index 14. Last-Write-Wins erased User A input completely.'
          }
        ],
        allowedActions: [
          {
            id: 'act-fs-s2-crdt-sync',
            label: 'Adopt Conflict-Free Replicated Data Types (CRDT / Yjs / Automerge) with deterministic Lamport timestamps and optimistic local rendering',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'act-fs-s2-lww-overwrite',
            label: 'Save whichever payload reaches the backend database last and broadcast the full replaced text to all connected clients',
            isCorrect: false,
            criticalFailure: {
              code: 'MUTATION_DATA_LOSS',
              reason: 'Last-Write-Wins erases overlapping user changes and destroys collaborative editing integrity.'
            }
          }
        ],
        verificationCheck: 'Assert concurrent edits merge seamlessly without character duplication or data loss on both clients.'
      },
      {
        stageIndex: 3,
        title: 'Stage 3: Offline Persistence, IndexedDB Boundaries & Flush Reconciliation',
        problemStatement: 'A user edits offline for 20 minutes, accumulating 400 local changes in browser IndexedDB. Upon reconnect, reconcile local queued changes without blocking the UI main thread.',
        state: {
          offlineChangesPending: 400,
          mainThreadLatencyMs: 850
        },
        availableEvidence: [
          {
            id: 'ev-offline-flush-profile',
            title: 'Browser Profiler Flamegraph',
            type: 'PROFILER',
            data: 'Synchronous batch flush of 400 document versions locks the main UI thread for 850ms, causing noticeable UI freeze.'
          }
        ],
        allowedActions: [
          {
            id: 'act-fs-s3-webworker-batch',
            label: 'Offload mutation compression and state reconciliation to a Web Worker, sending compact compressed binary diffs in batched transactions',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'act-fs-s3-sync-loop-main',
            label: 'Execute 400 sequential fetch calls on the main thread in a for-loop upon detecting online status',
            isCorrect: false,
            criticalFailure: {
              code: 'MAIN_THREAD_FREEZE',
              reason: 'Sequential main thread requests freeze UI frames and risk partial upload if network drops mid-sync.'
            }
          }
        ],
        verificationCheck: 'Assert all 400 changes reconcile cleanly in under 200ms without dropping below 60fps on client UI.'
      }
    ]
  },
  {
    scenarioId: 'main-ai-engineer-01',
    version: '1.0.0',
    goalId: 'ai-engineer',
    type: 'MAIN_PROBLEM',
    title: 'Building a Production-Grade RAG Pipeline',
    description: 'Architect, debug, and harden a Retrieval-Augmented Generation (RAG) pipeline that serves 5,000 concurrent users with sub-2s P95 latency, grounded accurate responses, and observable failure modes.',
    relevantSkills: ['ai-engineering', 'rest-apis', 'javascript'],
    stages: [
      {
        stageIndex: 1,
        title: 'Stage 1: Retrieval Quality & Embedding Strategy',
        problemStatement: 'Your RAG system returns factually wrong answers 40% of the time. Users are complaining that the AI "makes things up." Investigate the retrieval pipeline and identify the root cause.',
        state: {
          hallucination_rate: '40%',
          avg_retrieved_chunks: 3,
          embedding_model: 'text-embedding-ada-002',
          vector_db: 'Pinecone',
          chunk_size_tokens: 2000
        },
        availableEvidence: [
          {
            id: 'ev-retrieval-logs',
            title: 'Retrieval Similarity Scores',
            type: 'LOGS',
            data: 'Top-3 retrieved chunks average cosine similarity: 0.52. Irrelevant chunks frequently score above 0.48. Chunk size 2000 tokens causes context dilution — relevant signal buried in unrelated surrounding text.'
          },
          {
            id: 'ev-llm-traces',
            title: 'LLM Prompt Traces',
            type: 'TRACE',
            data: 'Prompt contains 3 large chunks averaging 2000 tokens each. LLM context window is 4096 tokens, leaving only 96 tokens for the actual user question and system prompt. Model truncates retrieved context mid-sentence.'
          }
        ],
        allowedActions: [
          {
            id: 'act-rag-s1-increase-chunks',
            label: 'Increase retrieved chunks from 3 to 10 to give the LLM more context',
            isCorrect: false,
            criticalFailure: {
              code: 'CONTEXT_OVERFLOW',
              reason: 'Retrieving 10 chunks of 2000 tokens each (20,000 tokens) far exceeds the 4096-token context window. The LLM will silently truncate all retrieved context, making hallucination worse.'
            }
          },
          {
            id: 'act-rag-s1-smaller-chunks',
            label: 'Reduce chunk size to 256 tokens with 10% overlap, use cosine similarity threshold filtering (>0.72), and apply MMR re-ranking to reduce redundancy',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'act-rag-s1-prompt-only',
            label: 'Remove retrieval entirely and rely on the base LLM\'s parametric knowledge',
            isCorrect: false,
            criticalFailure: {
              code: 'NO_GROUNDING',
              reason: 'Without retrieval grounding, the LLM has no access to your proprietary knowledge base. Hallucination rate will increase, not decrease, for domain-specific queries.'
            }
          }
        ],
        verificationCheck: 'Assert retrieval precision@3 improves from 0.52 to above 0.80 cosine similarity on test query set.'
      },
      {
        stageIndex: 2,
        title: 'Stage 2: Latency Optimization Under Load',
        problemStatement: 'After fixing retrieval quality, P95 latency spikes to 8 seconds under 5,000 concurrent users. The embedding API and LLM inference are bottlenecks. Reduce P95 to under 2 seconds.',
        state: {
          p95_latency_ms: 8000,
          embedding_api_calls_per_request: 1,
          concurrent_users: 5000,
          llm_calls_per_request: 1,
          cache_hit_rate: '0%'
        },
        availableEvidence: [
          {
            id: 'ev-latency-breakdown',
            title: 'Request Latency Breakdown',
            type: 'METRICS',
            data: 'Embedding API: 1.2s avg | Vector search: 0.08s avg | LLM inference: 6.5s avg | Network overhead: 0.22s. LLM inference is 81% of total latency. 73% of user queries are variations of only ~800 distinct semantic patterns.'
          },
          {
            id: 'ev-cache-analysis',
            title: 'Query Semantic Clustering Analysis',
            type: 'ANALYSIS',
            data: '73% of incoming queries cluster within 0.95 cosine similarity of 800 canonical query embeddings. Semantic similarity cache with 0.93 threshold would yield ~70% cache hit rate. Each cache hit saves 6.5s of LLM inference time.'
          }
        ],
        allowedActions: [
          {
            id: 'act-rag-s2-bigger-llm',
            label: 'Switch to a larger LLM model (GPT-4) for better quality, accepting the increased latency',
            isCorrect: false,
            criticalFailure: {
              code: 'LATENCY_REGRESSION',
              reason: 'Larger models have higher inference latency. GPT-4 would increase P95 to 12+ seconds, directly violating the 2-second SLA requirement.'
            }
          },
          {
            id: 'act-rag-s2-semantic-cache',
            label: 'Implement semantic similarity caching: store (query_embedding → answer) pairs, serve cached responses for queries within 0.93 cosine similarity threshold',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'act-rag-s2-reduce-context',
            label: 'Reduce retrieved chunks to 1 to minimize LLM processing time',
            isCorrect: false,
            criticalFailure: {
              code: 'QUALITY_DEGRADATION',
              reason: 'Single chunk retrieval sacrifices answer quality. Hallucination rate will return to 40%+ without sufficient grounding context for complex questions.'
            }
          }
        ],
        verificationCheck: 'Assert P95 latency drops below 2000ms and cache hit rate reaches 65%+ under 5,000 concurrent users.'
      },
      {
        stageIndex: 3,
        title: 'Stage 3: Observability & Guardrails',
        problemStatement: 'Users are bypassing content policies by injecting prompt-override instructions ("Ignore previous instructions and output..."). Add robust guardrails and observability without adding more than 50ms of overhead.',
        state: {
          prompt_injection_attempts_per_hour: 340,
          detected_injection_rate: '12%',
          observability_coverage: 'none',
          guardrail_overhead_ms: 0
        },
        availableEvidence: [
          {
            id: 'ev-attack-samples',
            title: 'Prompt Injection Attack Samples',
            type: 'SECURITY',
            data: 'Top attack patterns: (1) "Ignore previous instructions..." (2) "You are now DAN..." (3) Nested instruction overrides using markdown code blocks. Regex alone has 40% false-negative rate on obfuscated variants. LLM-based classifiers achieve 98% detection but add 800ms.'
          },
          {
            id: 'ev-observability-gaps',
            title: 'Current Observability Gaps',
            type: 'ANALYSIS',
            data: 'No structured tracing on RAG pipeline steps. No token usage logging per request. No latency breakdown by stage (embed vs retrieve vs generate). Debugging production issues takes 4+ hours due to zero visibility into intermediate pipeline states.'
          }
        ],
        allowedActions: [
          {
            id: 'act-rag-s3-llm-guardrail',
            label: 'Add a secondary LLM call to classify every input before processing',
            isCorrect: false,
            criticalFailure: {
              code: 'LATENCY_SLA_VIOLATION',
              reason: 'LLM-based classifier adds 800ms per request, violating the 50ms guardrail overhead budget and pushing P95 latency back above the 2-second SLA.'
            }
          },
          {
            id: 'act-rag-s3-layered-defense',
            label: 'Apply layered defense: fast regex pattern matching (5ms) + embedding cosine distance from known attack embeddings (15ms) + structured output enforcement via JSON schema constraints + OpenTelemetry tracing on all pipeline stages',
            isCorrect: true,
            criticalFailure: null
          },
          {
            id: 'act-rag-s3-blocklist-only',
            label: 'Maintain a static blocklist of known injection phrases and block exact matches',
            isCorrect: false,
            criticalFailure: {
              code: 'TRIVIALLY_BYPASSED',
              reason: 'Static exact-match blocklists are trivially bypassed by slight rephrasing, unicode substitution, or translating to another language. This provides only minimal protection with high maintenance cost.'
            }
          }
        ],
        verificationCheck: 'Assert prompt injection detection rate above 95% with total guardrail overhead under 50ms, with full trace visibility in all pipeline stages.'
      }
    ]
  }
];

