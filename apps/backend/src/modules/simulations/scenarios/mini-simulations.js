/**
 * Focused Mini-Simulations for Targeted Skill Remediation
 * Targeted 3-5 minute drills triggered when an evidence gap is detected.
 * Seamlessly returns to the main problem upon completion.
 */

export const miniSimulations = [
  {
    scenarioId: 'mini-sd-db-indexing',
    version: '1.0.0',
    goalId: 'system-design',
    type: 'MINI_SIMULATION',
    targetedSkillId: 'sd-data-modeling',
    title: 'Focused Drill: Compound Index Ordering & Selective Filtering',
    description: 'Diagnose why a query filtering by tenant, date, and status still scans 500,000 rows despite an index existing. Select the optimal index column order and verify index coverage.',
    relevantSkills: ['sd-data-modeling', 'sd-db-scaling'],
    initialState: {
      query: 'SELECT id, amount FROM orders WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 20',
      existingIndex: 'CREATE INDEX idx_orders_status ON orders(status)',
      rowsScanned: 500000,
      executionTimeMs: 1400
    },
    availableEvidence: [
      {
        id: 'ev-cardinality',
        title: 'Column Cardinality Stats',
        type: 'STATS',
        data: {
          tenant_id: 'High cardinality (12,000 distinct tenants)',
          status: 'Low cardinality (4 distinct values: PENDING, PAID, CANCELLED, REFUNDED)',
          created_at: 'Continuous timestamp'
        }
      }
    ],
    allowedActions: [
      {
        id: 'act-mini-idx-status-first',
        label: 'Create index: orders(status, tenant_id, created_at)',
        isCorrect: false,
        criticalFailure: null
      },
      {
        id: 'act-mini-idx-optimal-compound',
        label: 'Create index: orders(tenant_id, status, created_at DESC) following the Equality-Range-Sort heuristic',
        isCorrect: true,
        criticalFailure: null
      }
    ],
    verificationCheck: 'Assert EXPLAIN query plan switches to "Index Scan using idx_orders_optimal" with 20 rows scanned and execution time < 2ms.'
  },
  {
    scenarioId: 'mini-be-concurrency-locks',
    version: '1.0.0',
    goalId: 'backend-development',
    type: 'MINI_SIMULATION',
    targetedSkillId: 'be-persistence-tx',
    title: 'Focused Drill: Row-Level Locking vs Optimistic Versioning',
    description: 'Resolve a race condition in high-frequency wallet balance deductions. Choose between SELECT FOR UPDATE vs optimistic version checks and evaluate latency vs lock contention.',
    relevantSkills: ['be-persistence-tx', 'be-idempotency'],
    initialState: {
      concurrencyConflictsPerSecond: 85,
      isolationLevel: 'READ COMMITTED'
    },
    availableEvidence: [
      {
        id: 'ev-conflict-rate',
        title: 'Wallet Mutation Conflict Rate',
        type: 'METRICS',
        data: 'Under high concurrency on single user account, optimistic retry loops experience 75% failure rate due to repeated collision.'
      }
    ],
    allowedActions: [
      {
        id: 'act-mini-pessimistic-lock',
        label: 'Apply pessimistic row lock: `SELECT balance FROM wallets WHERE id = $1 FOR UPDATE` inside transaction',
        isCorrect: true,
        criticalFailure: null
      },
      {
        id: 'act-mini-optimistic-retry',
        label: 'Use optimistic update without lock: `UPDATE wallets SET balance = balance - $1 WHERE id = $2 AND balance >= $1`',
        isCorrect: true, // Also valid alternative depending on use case
        criticalFailure: null
      }
    ],
    verificationCheck: 'Assert balance never drops below zero and all parallel deductions are serialized without error.'
  }
];
