# Architecture Decisions & Schema Improvements

This document records the design decisions and ERD schema improvements implemented for the **AI Learning Companion**.

---

## 1. ERD Schema Improvements Before Migration

During our analysis of `docs/02-ERD-AI-Learning-Companion.md`, several critical improvements were made before generating the Prisma schema and running migrations:

1. **User Identity & Role Authorization:**
   - Added a `role` field (`LEARNER`, `ADMIN`) to the `users` table. This provides clean, database-enforced role separation so that administrative endpoints (`/api/v1/admin/*`) are strictly guarded.

2. **Compound Unique Constraints & Idempotency:**
   - **`UserSkill`:** Added `@@unique([userId, skillId])`. Prevents duplicate skill progress records per user.
   - **`UserConcept`:** Added `@@unique([userId, conceptId])`. Guarantees single source of truth for concept mastery.
   - **`RoleSkill`:** Added `@@unique([targetRoleId, skillId])`.
   - **`SkillPrerequisite` & `ConceptPrerequisite`:** Added compound uniques `@@unique([skillId, prerequisiteSkillId])` and `@@unique([conceptId, prerequisiteConceptId])`.
   - **`RecallSchedule`:** Added `@@unique([userId, conceptId])`. Prevents multiple overlapping spaced repetition timers for the same concept.
   - **`XpTransaction`:** Added `@@unique([userId, sourceType, sourceId])`. Explicitly guarantees idempotency and prevents reward duplication for the same learning or quiz event.

3. **Onboarding State Resumption:**
   - Enhanced `UserProfile` with `onboardingCompleted` (Boolean) and `onboardingStep` (Int). Learners can drop off at step 1 or 2 and resume seamlessly upon return.

4. **Numeric Precision:**
   - Utilized `Float` for mastery and confidence scores (scaled [0.0, 100.0]) and percentages, allowing ergonomic JSON serialization while maintaining decimal fidelity.

---

## 2. Graph-Based Dependency Resolution & Cycle Detection

- **Topological Sorting:** The roadmap generator treats skills and concepts as a directed graph. Rather than relying on non-deterministic LLM hallucinations, concepts with missing prerequisites are placed *after* their prerequisites in the learning sequence.
- **Explainability:** Each `LearningPathItem` stores a human-readable `reason` attribute explaining why it was sequenced (e.g. "Builds upon: Call Stack & Concurrency", "Directly required for Backend Developer role").
- **Admin Cycle Detection Engine:** The backend includes a depth-first search (DFS) cycle-detection routine (`/api/v1/admin/check-cycles`) with state tracking (unvisited, visiting, visited) to verify that administrative updates do not introduce cyclic dependencies.

---

## 3. Spaced Repetition (Recall Scheduler)

- Review intervals adapt dynamically based on learner feedback:
  - If a concept is recalled easily (rating 4–5): interval multiplies by `1.9x`–`2.2x` (capped at 90 days).
  - If recalled with difficulty (rating 3): interval increases moderately (`1.6x`).
  - If forgotten or struggled heavily (rating 1–2): interval resets to `1 day`.
- Integrates directly with the "Today's Learning" dashboard, alerting the learner when review items are due before proceeding to new lessons.

---

## 4. AI Provider Abstraction & Fallback Transparency

- The AI service abstraction (`AiService`) inspects environment variables (`AI_PROVIDER`, `OPENAI_API_KEY`, etc.).
- When credentials are not provided, it transparently returns structured Socratic guidance and heuristic rubric evaluations without fabricating fake external AI calls.
- In both cases, the application remains fully functional, testable, and secure.
