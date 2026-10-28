# Phase 4 — Complete Dynamic Curriculum Migration & Static-Curriculum Decoupling Report

**Repository:** AI Learning Companion for Software Engineers  
**Date:** October 17, 2026  
**Status:** Completed & Verified  

---

## Executive Summary

Phase 4 completes the transition from a static, preseeded catalogue to a **100% dynamic, evidence-driven, goal-adaptive learning system**.

Learners can now specify **any legitimate software engineering learning goal**—such as *Distributed consensus with Go and Raft*, *Rust for WebAssembly*, *Building production-grade AI agents*, *Compiler design and LLVM IR*, *PostgreSQL query optimization*, or *Kubernetes controller development*—and receive an end-to-end personalized learning experience.

The seeded catalogue of 18 concepts and static lessons remains intact as optional reference data, but it **no longer restricts, gates, or dictates** path synthesis, milestone sequencing, JIT session generation, or learner progression.

All 12 backend test suites (97 tests) pass, the Next.js production build succeeds with zero errors, and all 25 live database-backed E2E verification checks succeed.

---

## 1. Remaining Static-Curriculum Dependencies Found (Audit Inventory)

Prior to our Phase 4 implementation, an exhaustive codebase audit identified the following remaining points of coupling:

1. **Hardcoded Skill Fallback Filter in Adaptive Engine (`adaptive-engine.js:536–551`)**:
   - When no active role skills were present, the fallback candidate query filtered concepts strictly against a static array of 7 skill slugs: `['javascript', 'backend-dev', 'databases', 'system-design', 'ai-engineering', 'rest-apis', 'postgresql']`.
   - The query enforced `skillId: { in: targetSkillIds }`, which completely excluded any custom concepts where `skillId` was `null` or matched a non-seeded skill.

2. **Static Prerequisite Lesson Assumption in Adaptive Engine (`adaptive-engine.js:605–618`)**:
   - In CASE 4A (Prerequisite Gap Detected), the engine inspected only `missingPrereq.lessons?.[0]` (pre-existing static lessons).
   - If a custom prerequisite milestone had no prewritten static lesson, the system failed to trigger Just-In-Time session generation.

3. **Public Lesson Listing Scope Leak (`lessons.routes.js:12–14`)**:
   - `GET /api/v1/lessons` queried all `status: 'PUBLISHED'` lessons without scoping to `{ OR: [{ userId: null }, { userId: req.user.id }] }`.
   - While individual lesson retrieval was protected, the bulk listing endpoint could leak custom lessons generated for other learners.

4. **Regeneration Race Conditions & Milestone Completion Inheritance (`roadmap.service.js`)**:
   - Simultaneous regeneration calls could race, creating duplicate `ACTIVE` learning paths.
   - During path regeneration, completed milestones were either not carried over or carried over based purely on raw concept ID rather than strict equivalence of the `targetOutcome` / `measurableObjective`.
   - If path synthesis threw an error during regeneration, the failure handling did not explicitly guarantee that the user's existing active path remained safely intact.

5. **Frontend Null Pointer Vulnerabilities on Custom Concept Skills (`LessonPlayerPage` & `RecallPage`)**:
   - In `apps/frontend/src/app/lessons/[slug]/page.tsx` (line 338) and `apps/frontend/src/app/recall/page.tsx` (line 132), the UI accessed `lesson.concept.skill.name` without null-safe optional chaining.
   - For custom concepts created without an associated seeded skill, this caused a client-side JavaScript runtime exception.

---

## 2. Changes Implemented & Architectural Rationale

### A. Decoupled Adaptive Recommendation Engine (`adaptive-engine.js`)
- **Dynamic Skill Resolution**: Replaced the hardcoded 7-skill list with a dynamic query of all active skills (`prisma.skill.findMany`).
- **Unrestricted Custom Concept Query**: Rebuilt the `candidateConcepts` query so that a learner's custom concepts (`isCustom: true, userId: userId`) are always eligible candidates regardless of whether `skillId` is null or matches a target role.
- **JIT Synthesis for Prerequisite Gaps**: Added `SessionGeneratorService.getOrCreateSession` to CASE 4A so that custom prerequisite milestones without published lessons are synthesized on demand.

### B. Safe Path Regeneration & Concurrency Lock (`roadmap.service.js`)
- **In-Flight Regeneration Lock**: Implemented an in-memory `inFlightGenerations` lock map keyed by `${userId}:${options.force ? 'force' : 'default'}`. Simultaneous or rapid duplicate clicks on `/learning-paths/regenerate` await the exact same generation task, completely preventing duplicate active paths.
- **Strict Objective Equivalence for Completion Inheritance**: When regenerating, previously completed milestones are evaluated. Completed status is **only** inherited if the milestone's `targetOutcome` / `measurableObjective` matches the previously completed objective (`prevObjective === newObjective`). If the objective has changed or expanded, the milestone reverts to `PENDING` or `IN_PROGRESS`.
- **Synthesis Failure Protection**: Wrapped path synthesis in an error-handling block that catches generation errors and preserves the user's existing active path untouched.

### C. Multi-Tenant Cross-Learner Authorization (`lessons.routes.js`)
- Scoped `GET /api/v1/lessons` with `{ OR: [{ userId: null }, { userId: req.user.id }] }`, ensuring learners can discover legacy reference lessons and their own generated lessons, but never another learner's private custom content.

### D. Frontend Robustness (`page.tsx` in lessons and recall)
- Updated TypeScript interfaces and JSX in `LessonPlayerPage` and `RecallPage` to safely handle `concept.skill?.name || 'Milestone'`, preventing runtime crashes on arbitrary goals.

---

## 3. Files Changed

| File Path | Description of Changes |
| :--- | :--- |
| `apps/backend/src/modules/recommendations/adaptive-engine.js` | Decoupled skill slugs, allowed custom concepts with null `skillId`, added JIT fallback for custom prerequisite gaps. |
| `apps/backend/src/modules/learning-paths/roadmap.service.js` | Added in-flight concurrency lock, safe milestone completion inheritance based on objective match, and failure protection. |
| `apps/backend/src/modules/lessons/lessons.routes.js` | Scoped lesson listing to public reference lessons and current user's generated lessons. |
| `apps/frontend/src/app/lessons/[slug]/page.tsx` | Made `skill` optional in `LessonData` and added null-safe fallback rendering in header. |
| `apps/frontend/src/app/recall/page.tsx` | Made `skill` optional in `DueItem` and added null-safe fallback badge rendering. |
| `apps/backend/tests/dynamic-curriculum.test.js` | Added 18 comprehensive regression tests covering all Phase 4 scenarios. |
| `apps/backend/e2e_phase4_verification.js` | Live database-backed E2E script validating arbitrary goals, JIT sessions, and isolation. |

---

## 4. Schema Changes & Migration Details

**No schema migration was required.**  
The Prisma schema already supported:
- `Concept.isCustom` (`Boolean @default(false)`) and `Concept.userId` (`String?`)
- `Concept.skillId` (`String?`, nullable)
- `Lesson.userId` (`String?`, nullable)
- `LearningPath.version` (`Int @default(1)`) and `LearningPath.previousPathId` (`String?`)
- `LearningPathItem.status` (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`)

All changes operate within the existing database schema without data loss or schema alterations.

---

## 5. Backward Compatibility Decisions

1. **Seeded Catalogue Preserved**:
   - The 18 preseeded concepts (e.g. `js-event-loop`, `react-hooks`, `db-indexes`, `sql-joins`) and their associated lessons and quizzes remain available in PostgreSQL.
   - Existing learners who started with seeded concepts can continue their journeys without disruption.
2. **Deterministic Fallbacks on Quota Limits**:
   - If the Gemini API returns a 429 quota exhaustion or network timeout, the system falls back to the deterministic goal scaffold synthesizer (`generateGoalScaffold`) and tech-specific scaffolding rather than crashing or substituting unrelated seeded content.
3. **Roadmap Privacy Preserved**:
   - Standard learners still only see their current focus (`/today`) and completed history (`/my-learning`), protecting the focused 10–15 minute daily learning experience.

---

## 6. Tests and Exact Results

### Backend Automated Test Suite (`vitest`)
Command: `npm --prefix apps/backend test`

```
Test Files  12 passed (12)
     Tests  97 passed (97)
  Duration  4.67s
```

All 12 test suites passed:
1. `tests/dynamic-curriculum.test.js` (18/18 passed)
2. `tests/session-generation.test.js` (11/11 passed)
3. `tests/adaptive-intelligence.test.js` (14/14 passed)
4. `tests/adaptation-layers.test.js` (8/8 passed)
5. `tests/path-synthesis.test.js` (6/6 passed)
6. `tests/mastery.test.js` (7/7 passed)
7. `tests/gemini.test.js` (7/7 passed)
8. `tests/onboarding-alignment.test.js` (7/7 passed)
9. `tests/engine.test.js` (7/7 passed)
10. `tests/adaptive.test.js` (6/6 passed)
11. `tests/auth.test.js` (5/5 passed)
12. `tests/health.test.js` (1/1 passed)

### The 18 Phase 4 Required Scenarios (`tests/dynamic-curriculum.test.js`)

| # | Scenario | Status | Result |
| :- | :--- | :--- | :--- |
| 1 | Goal absent from catalogue produces valid path | PASS | Custom goal "Compiler Design in C++ and LLVM IR" produced valid DAG path |
| 2 | Custom milestone generates lesson without static lesson | PASS | Generated playable lesson with 6 activities and quiz |
| 3 | Existing seeded concepts still work | PASS | Seeded concepts and published lessons remain operational |
| 4 | Path remains stable across requests & refreshes | PASS | Exact same roadmap ID and version returned on repeated calls |
| 5 | Failed regeneration preserves valid active path | PASS | Active path remains untouched if regeneration encounters an error |
| 6 | Regeneration preserves historical attempts and XP | PASS | Historical quiz attempts and XP transactions are 100% preserved |
| 7 | Changed milestone objective does not inherit invalid completion | PASS | Milestone reverts to pending/in-progress when objective changes |
| 8 | Invalid prerequisite references are rejected | PASS | Zod schema rejects unknown prerequisite slug references |
| 9 | Cyclic prerequisite dependencies are rejected | PASS | Kahn's topological sort detects and rejects dependency cycles |
| 10 | Completed milestone with low mastery does not trigger endless reinforcement | PASS | Engine advances to next milestone; does not loop on completed items |
| 11 | Learner who passes milestone advances | PASS | Decision advances cleanly to next eligible milestone |
| 12 | Single quiz pass does not imply durable mastery | PASS | Mastery engine caps single-pass mastery at 45; does not fabricate exemplary 100% |
| 13 | Duplicate quiz submissions do not duplicate XP | PASS | XP transactions are idempotent; re-submission awards 0 duplicate XP |
| 14 | Cross-learner isolation enforced | PASS | Learner B receives 403 Forbidden when requesting Learner A's custom lesson |
| 15 | Missing generated content produces safe recoverable result | PASS | Safe 404/422 response; zero unrelated seeded lesson substitution |
| 16 | Concurrent path generation locked | PASS | Concurrent calls are deduplicated into a single task; exactly 1 active path |
| 17 | Legacy static lessons remain accessible | PASS | `userId: null` lessons remain discoverable and readable |
| 18 | Fully completed path reaches terminal state | PASS | Returns `actionType: 'COMPLETED'` with `isPathCompleted: true` |

### Live Backend Verification (`apps/backend/e2e_phase4_verification.js`)
Command: `node apps/backend/e2e_phase4_verification.js`

```
========================================================================
Phase 4: Complete Dynamic Curriculum Migration Live E2E Verification
Target Backend: http://localhost:5001/api/v1
========================================================================

  [PASS] 1. Backend server is alive and responding
  [PASS] 2. Learner A registered successfully
  [PASS] 3. Learner A profile & arbitrary goal saved
  [PASS] 4. Onboarding completed successfully
  [PASS] 5. Synthesized dynamic path with 4 milestones
  [PASS] 6. Dynamic path target matches arbitrary goal exactly: "Kubernetes Custom Controller Development in Go"
  [PASS] 7. Synthesized milestones are deeply aligned with Kubernetes controllers
  [PASS] 8. Today recommendation loaded
  [PASS] 9. Action type is ADVANCE for first milestone: Foundations & Core Primitives of Kubernetes Custom Controller Development in Go
  [PASS] 10. JIT lesson slug generated: "kubernetes-custom-controller-development-in-go-foundations-4548f0ba"
  [PASS] 11. JIT synthesized lesson retrieved
  [PASS] 12. Lesson contains 6 pedagogical activities
  [PASS] 13. Lesson includes assessment quiz
  [PASS] 14. Quiz contains 2 questions
  [PASS] 15. Quiz question answer key is HIDDEN prior to submission
  [PASS] 16. Quiz question explanation is HIDDEN prior to submission
  [PASS] 17. Learner B is forbidden (403) from accessing Learner A custom lesson
  [PASS] 18. Quiz submitted and graded successfully
  [PASS] 19. Graded score received: 33%
  [PASS] 20. Re-submitting quiz is idempotent and succeeds safely
  [PASS] 21. Re-submission awarded 0 duplicate XP
  [PASS] 22. Learning path successfully regenerated with safe versioning
  [PASS] 23. Path version incremented from v1 to v2
  [PASS] 24. Reference lesson catalogue endpoint loaded
  [PASS] 25. Preseeded reference lessons remain intact and accessible

========================================================================
Live Verification Complete: 25 / 25 checks PASSED
========================================================================
```

### Frontend Production Build
Command: `npm --prefix apps/frontend run build`
- Result: **Compiled successfully (0 errors)**. All 17 static and dynamic pages generated.

---

## 7. Remaining Risks and Unresolved Dependencies

1. **Gemini API Rate Limiting (Free Tier)**:
   - When running rapid repeated tests or during high concurrency, Gemini Free Tier quotas (20 requests/day for `gemini-2.5-flash`) can trigger HTTP 429.
   - **Mitigation in place**: The system includes a robust, goal-adaptive deterministic scaffold synthesizer that produces high-quality milestone DAGs and lesson activities without ever stalling the user or corrupting the database.
2. **Process Management**:
   - The backend runs on port 5001 and frontend runs on port 3000. Both dev servers remain active and healthy.

---

## 8. Manual Verification Steps

To manually test an arbitrary learning goal through the web interface:

1. **Sign Up**:
   - Open `http://localhost:3000/signup`.
   - Create an account (e.g. `raft_learner@example.com`).
2. **Onboard with an Unseeded Goal**:
   - Enter an arbitrary goal: e.g. `Distributed systems with Go and Raft consensus`.
   - Select `Intermediate` level and `15 minutes/day`.
   - Complete onboarding.
3. **Verify Today Recommendation**:
   - Navigate to `http://localhost:3000/today`.
   - Confirm the recommendation shows:
     - Action Badge: `Today's Recommended Milestone`.
     - Milestone title tailored to Go Raft (e.g., *Raft RPC & Leader Election*).
     - No errors regarding missing static concepts or skills.
4. **Study & Complete Lesson**:
   - Click **Start Today's Learning**.
   - Navigate through the lesson stages: Overview, Mental Model, Visual Diagram, Real Project Walkthrough, Quiz.
   - Notice quiz answer keys are not visible until submitted.
   - Submit the quiz.
5. **Verify Progression**:
   - After quiz submission, return to `/today`.
   - Confirm the engine advances to the second Raft milestone.
6. **Check Learning Records**:
   - Navigate to `http://localhost:3000/my-learning`.
   - Confirm the completed milestone is listed under *Mastered in History* with the correct custom title.

---

## 9. Final Verdict

**Arbitrary-goal software engineering learning is genuinely supported end to end.**

A learner can enter any legitimate software engineering goal, receive a validated topological DAG roadmap synthesized specifically for that goal, generate pedagogical learning sessions and assessments on demand, progress through milestone completion based on quiz evidence, and reach path completion—all without requiring preseeded catalogue concepts or prewritten static lessons.
