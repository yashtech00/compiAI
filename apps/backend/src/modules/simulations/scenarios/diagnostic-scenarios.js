/**
 * Diagnostic Scenarios for Goal-Based Interactive Simulations
 * Provides 5-10 minute interactive problem-solving scenarios for initial skill baselining.
 */

export const diagnosticScenarios = [
  {
    scenarioId: 'diagnostic-system-design',
    version: '1.0.0',
    goalId: 'system-design',
    type: 'DIAGNOSTIC',
    title: 'High-Latency Incident in Notification Dispatcher',
    description: 'During morning peak hours, user notifications are delayed by up to 45 seconds. The API gateway reports P99 response times exceeding 4.2 seconds. Diagnose the bottleneck, select the optimal architectural fix, and verify performance.',
    relevantSkills: ['sd-metrics-sla', 'sd-data-modeling', 'sd-db-scaling', 'sd-caching-lb'],
    initialState: {
      status: 'DEGRADED',
      trafficQPS: 18000,
      p99LatencyMs: 4200,
      dbCpuPercent: 96,
      connectionPoolAvailable: 2,
      activeConnections: 98
    },
    availableEvidence: [
      {
        id: 'ev-metrics',
        title: 'System & Gateway Metrics',
        type: 'METRICS',
        data: {
          ingressQPS: 18000,
          egressQPS: 12500,
          p50LatencyMs: 240,
          p99LatencyMs: 4200,
          dbConnectionPool: '98/100 connections saturated',
          memoryUsagePercent: 62
        }
      },
      {
        id: 'ev-logs',
        title: 'Application Error Logs',
        type: 'LOGS',
        data: [
          '[WARN] Connection pool starved: pool.acquire() exceeded timeout (3000ms)',
          '[ERROR] QueryTimeoutException: query on table `user_devices` exceeded 2500ms',
          '[WARN] Gateway retrying failed downstream notification push'
        ]
      },
      {
        id: 'ev-query-plan',
        title: 'Database EXPLAIN ANALYZE Plan',
        type: 'QUERY_PLAN',
        data: {
          query: 'SELECT token, platform FROM user_devices WHERE user_id = $1 AND is_active = true',
          plan: 'Seq Scan on user_devices (cost=0.00..84500.12 rows=3 width=48) (actual time=2140.12..2140.18)',
          filter: '(user_id = $1 AND is_active = true)',
          rowsRemovedByFilter: 12450000,
          indexUsed: null
        }
      },
      {
        id: 'ev-git-diff',
        title: 'Recent Deploy Git Commit Diff',
        type: 'GIT_DIFF',
        data: `commit a82ef3b\nAuthor: dev@company.com\n- Index on user_devices(device_id) remained unchanged\n+ Added active device filter without compound index (user_id, is_active)`
      }
    ],
    allowedActions: [
      {
        id: 'act-diag-cpu',
        category: 'DIAGNOSIS',
        label: 'Diagnose: Application server CPU exhaustion due to JSON serialization overhead',
        isCorrect: false
      },
      {
        id: 'act-diag-db-index',
        category: 'DIAGNOSIS',
        label: 'Diagnose: Unindexed sequential scan on user_devices saturating DB connection pool during peak queries',
        isCorrect: true
      },
      {
        id: 'act-diag-network',
        category: 'DIAGNOSIS',
        label: 'Diagnose: Cross-datacenter network packet loss between API gateway and push provider',
        isCorrect: false
      },
      {
        id: 'act-fix-vertical-scale',
        category: 'IMPLEMENTATION',
        label: 'Fix: Double API server instance count and scale up gateway container memory',
        isCorrect: false,
        criticalFailure: null
      },
      {
        id: 'act-fix-compound-index',
        category: 'IMPLEMENTATION',
        label: 'Fix: Create compound index (user_id, is_active) concurrently and route read queries through cache-aside redis layer',
        isCorrect: true,
        criticalFailure: null
      },
      {
        id: 'act-fix-disable-push',
        category: 'IMPLEMENTATION',
        label: 'Fix: Drop the notification filter and delete historic user_devices records in production without backup',
        isCorrect: false,
        criticalFailure: {
          code: 'DATA_LOSS_VULNERABILITY',
          reason: 'Deleting user devices in production without retention policy or backup causes irreversible device token loss.'
        }
      },
      {
        id: 'act-verify-loadtest',
        category: 'VERIFICATION',
        label: 'Verify: Run synthetic 20,000 QPS load test and verify P99 latency drops below 200ms and pool utilization stays under 40%',
        isCorrect: true
      },
      {
        id: 'act-verify-none',
        category: 'VERIFICATION',
        label: 'Verify: Assume fix worked because deployment succeeded with exit code 0',
        isCorrect: false
      }
    ]
  },
  {
    scenarioId: 'diagnostic-backend',
    version: '1.0.0',
    goalId: 'backend-development',
    type: 'DIAGNOSTIC',
    title: 'Duplicate Charges and Race Condition in Checkout API',
    description: 'Customers report being double-billed when submitting orders on slow mobile connections. The payment gateway confirms duplicate charges for the same order payload within a 200ms window. Identify the race condition, implement idempotent transactional guarantees, and verify behavior.',
    relevantSkills: ['be-api-contracts', 'be-persistence-tx', 'be-idempotency', 'be-auth-security'],
    initialState: {
      status: 'CRITICAL_BUG',
      duplicateChargeRatePercent: 8.5,
      endpoint: 'POST /api/v1/orders/checkout',
      transactionIsolation: 'READ COMMITTED',
      idempotencyLocking: 'None'
    },
    availableEvidence: [
      {
        id: 'ev-request-logs',
        title: 'Concurrent API Access Logs',
        type: 'LOGS',
        data: [
          '[INFO] 10:14:02.102 POST /api/v1/orders/checkout - Client IP 203.0.113.4 Idempotency-Key: idemp_982fa1',
          '[INFO] 10:14:02.185 POST /api/v1/orders/checkout - Client IP 203.0.113.4 Idempotency-Key: idemp_982fa1',
          '[WARN] 10:14:02.210 Both threads check `order.status === PENDING` and both proceed to invoke payment gateway charge()!'
        ]
      },
      {
        id: 'ev-code-snippet',
        title: 'Controller Implementation (checkout.controller.js)',
        type: 'CODE',
        data: `async function checkout(req, res) {\n  const existing = await Order.findOne({ idempotencyKey: req.headers['idempotency-key'] });\n  if (existing && existing.status === 'PAID') return res.json(existing);\n  \n  const charge = await paymentGateway.charge(req.body.amount); // External API call\n  const order = await Order.create({ ...req.body, status: 'PAID', chargeId: charge.id });\n  return res.status(201).json(order);\n}`
      },
      {
        id: 'ev-db-locks',
        title: 'Database Schema & Constraints',
        type: 'DB_SCHEMA',
        data: {
          table: 'orders',
          uniqueConstraints: ['id (PRIMARY KEY)'],
          missingConstraints: 'No unique constraint on idempotency_key column'
        }
      }
    ],
    allowedActions: [
      {
        id: 'act-diag-client-retry',
        category: 'DIAGNOSIS',
        label: 'Diagnose: Blame client mobile app for firing multiple click events and tell users not to double-click',
        isCorrect: false
      },
      {
        id: 'act-diag-check-then-act',
        category: 'DIAGNOSIS',
        label: 'Diagnose: Classic "Check-Then-Act" race condition without atomic unique constraint or row-level lock allowing parallel threads to charge payment gateway',
        isCorrect: true
      },
      {
        id: 'act-fix-client-debounce',
        category: 'IMPLEMENTATION',
        label: 'Fix: Add JavaScript button disabled state on frontend only without backend mutation changes',
        isCorrect: false,
        criticalFailure: null
      },
      {
        id: 'act-fix-atomic-idempotency',
        category: 'IMPLEMENTATION',
        label: 'Fix: Add unique DB constraint on idempotency_key, insert in-flight reservation token atomically inside ACID transaction before external charge',
        isCorrect: true,
        criticalFailure: null
      },
      {
        id: 'act-fix-ignore-errors',
        category: 'IMPLEMENTATION',
        label: 'Fix: Catch all duplicate key errors and silently refund charges via non-authenticated cron endpoint',
        isCorrect: false,
        criticalFailure: {
          code: 'BROKEN_AUTHORIZATION',
          reason: 'Exposing unauthenticated refund cron endpoint introduces severe security authorization vulnerability.'
        }
      },
      {
        id: 'act-verify-concurrency-test',
        category: 'VERIFICATION',
        label: 'Verify: Run parallel concurrent request harness firing 50 simultaneous identical requests and assert exactly 1 charge is created and 49 receive 200/409 with identical payload',
        isCorrect: true
      },
      {
        id: 'act-verify-single-request',
        category: 'VERIFICATION',
        label: 'Verify: Test endpoint once using Postman and check that single request returns 201',
        isCorrect: false
      }
    ]
  },
  {
    scenarioId: 'diagnostic-fullstack',
    version: '1.0.0',
    goalId: 'full-stack-development',
    type: 'DIAGNOSTIC',
    title: 'State Desynchronization & Waterfall Rendering in Dashboard',
    description: 'Users experience noticeable UI stutter and outdated profile data after editing account settings. Network inspection reveals an uncoordinated cascade of sequential HTTP requests and missing optimistic updates.',
    relevantSkills: ['fs-api-contracts', 'fs-state-caching', 'fs-perf-optimization'],
    initialState: {
      status: 'DEGRADED_UX',
      networkWaterfallCount: 7,
      totalLoadTimeMs: 3400,
      clientCache: 'Disabled'
    },
    availableEvidence: [
      {
        id: 'ev-network-waterfall',
        title: 'Browser Network DevTools Timeline',
        type: 'WATERFALL',
        data: {
          sequentialRequests: [
            { url: '/api/v1/user/me', durationMs: 400 },
            { url: '/api/v1/user/settings', durationMs: 450, dependsOn: '/api/v1/user/me' },
            { url: '/api/v1/user/notifications', durationMs: 500, dependsOn: '/api/v1/user/settings' },
            { url: '/api/v1/user/billing', durationMs: 600, dependsOn: '/api/v1/user/notifications' }
          ]
        }
      },
      {
        id: 'ev-react-profile',
        title: 'React Component Profile & Re-renders',
        type: 'PROFILER',
        data: {
          component: 'DashboardOverview',
          reRenderCount: 8,
          wastedRendersMs: 680,
          cause: 'Each sequential fetch updates local component state separately triggering repeated layout shifts'
        }
      }
    ],
    allowedActions: [
      {
        id: 'act-diag-waterfall',
        category: 'DIAGNOSIS',
        label: 'Diagnose: Component waterfalls in nested useEffect hooks causing sequential round-trips and fragmented state re-renders',
        isCorrect: true
      },
      {
        id: 'act-fix-batching-cache',
        category: 'IMPLEMENTATION',
        label: 'Fix: Implement parallel data loading (Promise.all/React Server Component) with query caching and optimistic UI updates on mutations',
        isCorrect: true,
        criticalFailure: null
      },
      {
        id: 'act-verify-lighthouse',
        category: 'VERIFICATION',
        label: 'Verify: Audit Largest Contentful Paint (LCP) reduction below 1.2s and verify zero stale UI flashes on mutation rollback test',
        isCorrect: true
      }
    ]
  }
];
