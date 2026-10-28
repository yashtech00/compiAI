# Phase 5: Production Reliability, AI Resilience & Observability Report

**Date:** October 17, 2026  
**System:** AI Learning Companion for Software Engineers  
**Target:** Production Reliability, AI Resilience, Concurrency Safety, and Observability  
**Status:** Complete & Verified (117 Passing Backend Tests, Clean Frontend Production Build)

---

## 1. Reliability Gaps Discovered During Audit

Prior to Phase 5, the application had completed migration from a static catalog to dynamic, on-demand AI learning paths and JIT lessons (Phases 1–4). An exhaustive audit of the backend codebase identified critical reliability, resilience, and concurrency vulnerabilities:

1. **Scattered, Unresilient AI Invocation**:
   - Direct calls to `@google/genai` were scattered across `session-generator.service.js`, `path-synthesis.service.js`, `adaptive-engine.js`, and `ai.service.js`.
   - Timeout handling was handled via ad-hoc `Promise.race([ai.models.generateContent(...), setTimeout(...)])`, which leaked promises and did not cancel pending connections.
   - Retries did not exist or retried indiscriminately regardless of whether the error was permanent (400, 401, 403) or transient.

2. **HTTP 429 Quota Exhaustion & Infinite Retry Vulnerability**:
   - Gemini free-tier quota exhaustion (`RESOURCE_EXHAUSTED` / HTTP 429) carries multi-hour reset delays (e.g., `Please retry in 11h...`). Indiscriminate retries or tight retry loops risk freezing worker threads and exhausting Node process memory.
   - Quota exhaustion was not distinguished from transient 503 network hiccups or bad model JSON.

3. **Dishonest Fallback Metadata**:
   - In earlier iterations, deterministic scaffolds returned `isAiGenerated: true` and generic model labels without distinguishing genuinely AI-synthesized content from deterministic fallback scaffolding in internal metadata.
   - Failure to record `generationSource` (`AI_SYNTHESIZED` vs `DETERMINISTIC_SCAFFOLD`) obscured model performance metrics.

4. **Distributed Concurrency & Multi-Process Idempotency Risks**:
   - Roadmap generation relied partially on an in-memory `Map` (`inFlightGenerations`). In a multi-process, containerized cluster (Kubernetes / ECS / multi-instance PM2), concurrent requests from the same user on different instances would race, risking duplicate active paths.
   - Session generation had an in-memory lock, but when two processes raced past it, a PostgreSQL uniqueness violation (`P2002`) on `Lesson.idempotencyKey` threw an unhandled 500 error instead of recovering the winner's persisted lesson.

5. **XP & Assessment Idempotency**:
   - Quiz submission awarded XP inside a transaction, but concurrent double-submissions could race before database uniqueness constraints were reached, potentially triggering unhandled transaction rollback.

6. **Missing Guardrails and Generation Budgets**:
   - No bounding on concurrent AI calls existed, allowing sudden bursts of learner traffic to exhaust the Node event loop and socket pools.
   - No sliding-window per-user generation budgets existed, allowing a single abusive script or automated crawler to exhaust the entire platform's API quota.
   - Input strings (`userExplanation`, `goalTitle`) had unbounded length in routes, exposing the system to prompt inflation, high memory overhead, and denial of service.

7. **Sensitive Credential Exposure in Telemetry**:
   - Logger output did not systematically sanitize API keys (`AIza...`), Bearer tokens, passwords, or cookies in error stacks and metadata objects.

8. **Health Check Coupling**:
   - `/health` only checked PostgreSQL (`SELECT 1`). An external AI provider outage could either go completely unnoticed by operators or, conversely, cause the entire pod to report unhealthy and restart needlessly.

---

## 2. Architecture Changes and Rationale

### A. Centralized Resilient AI Provider Layer (`ResilientAiProvider`)
We centralized all AI invocations behind `apps/backend/src/modules/ai/resilient-ai-provider.js`:
- **Circuit Breaker Pattern**:
  - States: `CLOSED`, `OPEN`, `HALF_OPEN`.
  - Trips to `OPEN` after 4 consecutive transient or quota failures (`failureThreshold = 4`).
  - Cooldown timer: 30 seconds (`cooldownPeriodMs = 30000`).
  - Probes in `HALF_OPEN`; on success, smoothly transitions back to `CLOSED` and resets failure counts.
- **Concurrency Semaphore**:
  - Limits concurrent external AI provider calls to a maximum of 4 (`_maxConcurrentCalls = 4`).
  - Queued requests wait with a bounded timeout (1500ms) before returning backpressure, protecting the backend from socket exhaustion.
- **Error Classification**:
  - `RATE_LIMIT` (HTTP 429 / RESOURCE_EXHAUSTED): Non-retryable. Immediately recorded in metrics and triggers honest fallback without retry storms.
  - `TIMEOUT` (HTTP 504 / AbortError): Retryable with exponential backoff.
  - `TRANSIENT` (ECONNRESET, ETIMEDOUT, 502, 503): Retryable up to 2 times with exponential backoff and randomized jitter.
  - `INVALID_OUTPUT` (Malformed JSON): Retryable up to 2 times.
  - `PERMANENT` (400, 401, 403, bad API key): Non-retryable; throws immediately.
- **Zero-Credential Testability**:
  - Injected mock client interface (`setMockClient`, `resetMockClient`, `resetState`) allows unit and integration test suites to run deterministically without requiring live API keys.

### B. Distributed Multi-Process Idempotency
- **PostgreSQL Advisory Transaction Locks**:
  - In `RoadmapService._executeGenerateRoadmap`, path persistence is wrapped in `prisma.$transaction` using:
    ```sql
    SELECT pg_advisory_xact_lock(hashtext(userId));
    ```
  - This serializes roadmap generation per learner across all Node.js cluster processes without blocking concurrent requests for different learners.
  - External AI calls (`synthesizePersonalizedPath`) remain *outside* the database transaction, preventing long-held open database transactions during external network latency.
  - Inside the lock, `RoadmapService` re-checks for existing active paths if `!options.force`, safely coalescing concurrent requests.
- **P2002 Unique Constraint Collision Recovery**:
  - In `SessionGeneratorService._persistSessionTransactionally`, any database uniqueness collision on `idempotencyKey` (`P2002`) is caught and immediately recovers the existing valid persisted record, ensuring multi-process safety.

### C. Honest and Safe Fallback Generation
- **Objective Validation**:
  - Milestones missing a valid measurable objective are rejected immediately with a clear recoverable error (`Cannot generate learning session: milestone lacks a valid measurable objective.`), preventing the synthesis of fabricated content.
- **Explicit Metadata Separation**:
  - JIT lessons and learning paths record both `isAiGenerated: true` (for dynamic JIT lessons vs static pre-seeded catalogue lessons) AND honest internal metadata:
    - `generationSource: 'AI_SYNTHESIZED' | 'DETERMINISTIC_SCAFFOLD'`
    - `isTrulyAiGenerated: true | false`
    - `generationModel: modelName`

### D. Generation Budgets & Abuse Resistance
- **Per-User Generation Limits**:
  - Sliding window rate limiting enforces a maximum of 15 generation calls per user per 15-minute window (`_maxGenerationsPerWindow = 15`).
  - Excess requests throw `UserBudgetExceededError` (HTTP 429), incrementing `budgetRejections` metrics without impacting other learners.
- **Input Bounds & Schema Validation**:
  - `goalTitle` validated in `onboarding.routes.js`: `.trim().min(2).max(200)`
  - `userExplanation` validated in `ai.routes.js`: `.trim().min(10).max(5000)`
  - `tutorMessage` validated: `.trim().min(2).max(1000)`

### E. Privacy-Conscious Logging & Credential Redaction
- `apps/backend/src/utils/logger.js` was enhanced with recursive object traversal and regex masking:
  - Redacts Google/Gemini API keys (`/AIza[0-9A-Za-z\-_]{35}/g` -> `[REDACTED_CREDENTIAL]`).
  - Redacts Bearer tokens, JWT strings, passwords, cookie headers, and sensitive auth keys.
  - Sanitizes both message strings and nested error/metadata objects.

### F. Observability & Decoupled Health Checks
- Updated `/api/v1/health` endpoint:
  - Verifies database connectivity (`SELECT 1`).
  - Provides a complete `aiProvider` status snapshot:
    - `status`: `operational` | `degraded`
    - `circuitBreaker`: `CLOSED` | `OPEN` | `HALF_OPEN`
    - `metrics`: Total requests, successes, failures, retries, 429 quota exhaustion, circuit breaker trips, fallback usage, budget rejections, and token estimates.
  - Returns HTTP 200 even when AI provider is degraded, ensuring container orchestrators (Kubernetes / ECS) do not restart healthy pods during third-party AI outages.

---

## 3. Policy Specification

| Policy | Setting | Behavior / Rationale |
| :--- | :--- | :--- |
| **Max Retries** | 2 retries (3 total attempts) | Prevents retry storms while absorbing transient packet drops. |
| **Backoff & Jitter** | `300ms * 2^(attempt-1) + jitter(0-200ms)` | Bounded exponential backoff; spreads retry load across workers. |
| **Request Timeout** | 3000ms – 3500ms | Bounded latency; prevents hanging connections from exhausting pools. |
| **Overall Deadline** | 10000ms | Hard ceiling on cumulative generation lifecycle including all retries. |
| **Circuit Breaker** | 4 failures -> OPEN -> 30s cooldown -> HALF_OPEN | Isolates failing provider; shields downstream infrastructure. |
| **Concurrency Cap** | 4 concurrent calls | Prevents thread pool and outbound TCP socket starvation. |
| **Per-User Budget**| 15 calls / 15 minutes | Protects platform quota against abusive scripts or rapid refresh loops. |
| **Quota (429) Policy**| 0 retries (immediate fallback) | Quota limits have hours-long delays; retries are wasteful and blocked. |

---

## 4. Concurrency and Idempotency Guarantees

1. **JIT Session Generation**:
   - `idempotencyKey = \`session:\${userId}:\${conceptId}:\${attempt}\``
   - Prisma schema enforces `@@unique([idempotencyKey])` on `Lesson`.
   - On concurrent collision, `P2002` handler retrieves and returns the winner's persisted record.
2. **Roadmap Generation**:
   - PostgreSQL advisory transaction lock (`pg_advisory_xact_lock`) serializes path creation per `userId`.
   - Lock is released automatically when transaction commits or aborts.
   - Idempotent re-check inside transaction returns existing active path if `!options.force`.
3. **Quiz Submission & XP**:
   - `XpTransaction` schema enforces `@@unique([userId, sourceType, sourceId])`.
   - `QuizService.submitQuiz` verifies prior XP awards inside `$transaction`, and catches any concurrent `P2002` conflict without erroring.
   - Prevents duplicate XP awards across repeated submissions or browser double-clicks.
4. **Offline Resilience**:
   - Persisted lessons, activities, quizzes, and learning progress remain 100% accessible via database reads even when the AI circuit breaker is `OPEN`.

---

## 5. Database Schema & Migration Assessment

- **Existing Constraints Verified**:
  - `Lesson.idempotencyKey`: `@unique` (Migration `20261017000001_add_jit_session_models`).
  - `XpTransaction`: `@@unique([userId, sourceType, sourceId])` (Prisma core).
  - `LearningPath`: Versioned with active status flags and previous path links.
- **No Schema Changes Required**:
  - All Phase 5 reliability guarantees are achieved using existing PostgreSQL constraints, advisory locks, and internal JSON metadata fields (`Lesson.generationModel`, `LearningPath.evidenceSummary`).
  - No disruptive database migrations were needed; 100% backward compatible with existing learner data.

---

## 6. Verification and Test Results

### Backend Test Execution
All 13 backend test suites executed cleanly:
```bash
npm --prefix apps/backend test
```

**Results:**
- **Test Files**: 13 passed (13 total)
- **Tests**: 117 passed (117 total, 0 failed, 0 skipped)
- **Duration**: 5.50s

### Dedicated Reliability Suite (`apps/backend/tests/reliability.test.js`)
All 20 required reliability scenarios verified:
1. `Successful AI generation records metadata, latency, and tokens` -> **PASS**
2. `Transient network failure triggers exponential backoff and succeeds on retry` -> **PASS**
3. `Rate limiting (429) is classified as non-retryable quota failure without retry storms` -> **PASS**
4. `Quota exhaustion immediately yields goal-aligned deterministic fallback without looping` -> **PASS**
5. `Provider timeout is handled and respects bounded request duration` -> **PASS**
6. `Malformed JSON output is classified as INVALID_OUTPUT and retried safely` -> **PASS**
7. `Deterministic scaffold succeeds and returns honest metadata without external AI` -> **PASS**
8. `Fallback rejects milestones with missing or empty objectives with recoverable error` -> **PASS**
9. `Repeated requests for the same milestone reuse the existing persisted lesson` -> **PASS**
10. `Concurrent requests with same idempotency key safely coalesce and return identical lesson` -> **PASS**
11. `Database uniqueness conflict (P2002) recovers existing record without failing` -> **PASS**
12. `In-flight generation lock safely cleans up on completion or error` -> **PASS**
13. `Per-user generation limits block excessive requests within sliding window` -> **PASS**
14. `Excessive or invalid inputs are rejected at boundary` -> **PASS**
15. `Provider outage (Circuit Breaker OPEN) does not disrupt access to existing lessons` -> **PASS**
16. `Repeated quiz submissions award XP strictly once (idempotent)` -> **PASS**
17. `Logger sanitizes credentials and tokens in messages and metadata` -> **PASS**
18. `Observability snapshot reports accurate metrics and provider status` -> **PASS**
19. `Circuit breaker trips to OPEN on repeated failures, probes in HALF_OPEN, and recovers to CLOSED` -> **PASS**
20. `Cross-learner unauthorized quiz access is rejected with FORBIDDEN` -> **PASS**

### Frontend Build Execution
```bash
npm --prefix apps/frontend run build
```
**Results:**
- Compiled successfully with 0 errors (`Next.js 14.2.35`).
- 17/17 static and dynamic routes built cleanly.

### Live Health Endpoint Verification
```bash
curl -s http://localhost:5001/api/v1/health
```
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "aiProvider": {
      "status": "operational",
      "circuitBreaker": "CLOSED",
      "configuredModel": "gemini-2.5-flash",
      "isConfigured": true
    },
    "observability": {
      "requestsTotal": 0,
      "requestsSuccess": 0,
      "requestsFailed": 0,
      "requestsRetried": 0,
      "quotaExhaustedCount": 0,
      "circuitBreakerTrips": 0,
      "fallbackUsage": 0,
      "budgetRejections": 0,
      "concurrencyWaitCount": 0,
      "estimatedInputTokens": 0,
      "estimatedOutputTokens": 0,
      "lastLatencyMs": 0
    },
    "timestamp": "2026-10-17T13:04:57.452Z",
    "version": "1.0.0"
  },
  "message": "System operational"
}
```

---

## 7. Known Limitations and Dependencies

1. **In-Memory Observability Window**:
   - The metrics snapshot is maintained in-memory on the active Node process. In multi-instance deployments, each process maintains its local window. For fleet-wide aggregation in Phase 6+, export metrics to Prometheus / OpenTelemetry.
2. **Provider Quota Visibility**:
   - Google Gemini API returns quota headers in error responses (`RetryInfo.retryDelay`), but does not expose pre-emptive quota counters. Our provider tracks local usage and reacts immediately to 429 headers without retry waste.
3. **PostgreSQL Advisory Locks**:
   - `pg_advisory_xact_lock(hashtext(userId))` works within PostgreSQL. If PostgreSQL is swapped for an incompatible database, a distributed lock provider (such as Redis Redlock) would be required. Under PostgreSQL, this is zero-dependency and native.

---

## 8. Production-Readiness Checklist

- [x] AI Provider abstracted behind centralized resilience layer (`ResilientAiProvider`).
- [x] Circuit breaker implemented with CLOSED, OPEN, and HALF_OPEN states.
- [x] Exponential backoff with randomized jitter applied to transient failures only.
- [x] HTTP 429 quota exhaustion terminates retries immediately and triggers honest fallback.
- [x] Fallback generation labeled honestly (`generationSource: 'DETERMINISTIC_SCAFFOLD'`).
- [x] Unusable milestones lacking measurable objectives rejected safely with recoverable errors.
- [x] Distributed concurrency locks (`pg_advisory_xact_lock`) protect roadmap generation.
- [x] Multi-process `P2002` database collisions on idempotency keys safely recover existing records.
- [x] Repeated quiz submissions idempotent; no duplicate XP awarded.
- [x] Per-user generation budgets enforced (max 15/15m).
- [x] Concurrency bounded (max 4 concurrent AI calls).
- [x] Boundary input length validation on `goalTitle`, `userExplanation`, and tutor messages.
- [x] Automatic credential, token, and API key redaction in logger.
- [x] Health check decoupled: core DB health distinguished from AI provider status.
- [x] Persisted lessons and progress accessible during AI provider outages.
- [x] 117 passing automated backend tests across 13 test suites.
- [x] Frontend Next.js production build succeeds with 0 errors.
