# AI Learning Companion: Comprehensive Architecture & Adaptive Learning Audit

**Audit Date:** October 2026  
**Auditor:** Senior Product Architect, Full-Stack Engineer & AI Systems Engineer  
**Repository:** `ai-learning-companion`  
**Location:** `docs/audit/AI_LEARNING_COMPANION_AUDIT.md`  

---

## 1. Executive Summary

We performed an in-depth, code-level architectural and behavioral audit of the **AI Learning Companion** codebase to assess alignment with our product vision: **a personalized, daily 10–15 minute learning companion that dynamically adapts its curriculum, pacing, and difficulty to individual software engineering learners while hiding rigid future roadmaps.**

### Current Product State
The repository contains a functional, well-structured full-stack monorepo (`apps/backend` using Express ESM, Prisma ORM, PostgreSQL, and Vitest; `apps/frontend` using Next.js 14 App Router, Tailwind CSS, and Lucide icons). All 19 backend test suites pass. 

Key architectural foundations have already been laid:
1. **Goal Selection & Onboarding:** Learners select target roles (e.g., Backend Developer, AI Engineer) and configure daily time budgets (5, 10, 15, 20 mins).
2. **Deterministic Prerequisite Graph:** A directed graph model (`Skill`, `SkillPrerequisite`, `Concept`, `ConceptPrerequisite`, `RoleSkill`) with cycle-detection (`/api/v1/admin/check-cycles`).
3. **Four-Action Recommendation State Machine:** An `AdaptiveEngine` implementing `ADVANCE`, `REINFORCE`, `REVIEW`, and `PREREQUISITE` actions.
4. **Spaced Repetition:** An active SM-2 inspired recall scheduler (`RecallSchedule`, `RecallAttempt`) that prioritizes overdue concepts before new lessons.
5. **Daily Focus UI:** The learner-facing UI (`/today` and `/my-learning`) actively hides upcoming roadmap milestones, directing the learner to a single primary session each day.

### The Core Gaps & Breakdown
Despite these strong foundations, **the learning path is currently pseudo-adaptive and effectively static at runtime**:
1. **Content Bottleneck & Silent Fallback (P0):** Out of 16 seeded concepts across 5 domains, **only 6 concepts have published lessons**. When the `AdaptiveEngine` selects any of the remaining 10 concepts (e.g., `js-async-await`, `node-event-driven`, `sql-joins-fks`), the recommendation service quietly falls back to serving the **JavaScript Event Loop lesson** (`slug: mastering-the-javascript-event-loop`), confusing the learner and breaking the curriculum progression.
2. **Coarse-Grained, Fragile Mastery Jumps (P0):** Mastery estimation is governed by an arbitrary formula in `quizzes.service.js`: passing a 2-question quiz immediately sets `masteryScore = Math.max(70, currentMastery + 25)`. A beginner scoring 100% on two multiple-choice questions jumps from 0 to 70% mastery in one step, permanently bypassing foundational reinforcement.
3. **Identical Remediation on Struggle (P1):** When a learner struggles (`masteryScore < 65`), the engine triggers `REINFORCE`, but serves the **exact same lesson content and quiz** as the initial attempt. There is no alternative explanation, lower difficulty level, or prerequisite decomposition.
4. **Decoupled Session Persistence (P1):** The `LearningSession` table does not reference `QuizAttempt`, `ExplainBackAttempt`, or `RecommendationLog`. Hint usage, retries, and time spent are either not stored or never ingested into the progression algorithm.
5. **Simulated AI Services (P1):** The backend does not have any AI SDK installed (`openai`, `@anthropic-ai/sdk`, or `@google/genai` are absent from `package.json`). `AiService` returns static strings and word-count heuristics.
6. **Leaked Future Syllabus via API (P2):** While `/roadmap` redirects to `/my-learning` in the browser, `GET /api/v1/learning-paths/current` and `GET /api/v1/lessons` remain open and return the complete, sequenced curriculum graph.

---

## 2. Existing Feature Inventory

The following inventory audits every functional capability against the codebase, schema, routes, services, UI components, and test suites.

| Feature Area | Status | Verified Evidence (Files & Symbols) | Current Behavior | Remaining Work |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & Profile** | **Implemented** | [auth.routes.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/auth/auth.routes.js)<br>[auth.service.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/auth/auth.service.js)<br>[auth.test.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/tests/auth.test.js) | JWT signup/signin in HTTP-only cookies and Authorization headers. Passwords hashed with bcrypt (cost 10). Role separation (`LEARNER`, `ADMIN`). | OAuth / Social login (Google, GitHub) stubbed in enum but unconfigured. |
| **Learning Goals & Target Roles** | **Implemented** | [goals.routes.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/goals/goals.routes.js)<br>[schema.prisma:76-92](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/prisma/schema.prisma#L76-L92) | 6 target roles seeded. Learners can activate a goal (`targetRoleId`, `targetReadiness`, `dailyMinutes`). Previous goals are archived. | Allow custom user-defined learning goals not tied to pre-seeded roles. |
| **Multi-Step Onboarding** | **Implemented** | [onboarding.routes.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/onboarding/onboarding.routes.js)<br>[onboarding/page.tsx](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/onboarding/page.tsx) | Multi-step wizard (Role selection -> Experience -> Daily time budget -> Skill self-check). State persisted in `UserProfile` (`onboardingStep`, `onboardingCompleted`). | Connect self-checked skills to initial diagnostic test skipping. |
| **Diagnostic Assessment** | **Implemented** | [assessments.service.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/assessments/assessments.service.js)<br>[assessment/page.tsx](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/assessment/page.tsx) | 6-question initial diagnostic test. Evaluates correctness, updates `UserConcept` and `UserSkill` aggregates deterministically in a transaction. | Questions are static; assessment difficulty does not adapt dynamically during the test itself. |
| **Skill & Concept Graph** | **Implemented** | [catalogue.js:14-160](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/content/catalogue.js#L14-L160)<br>[schema.prisma:94-182](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/prisma/schema.prisma#L94-L182)<br>[admin.routes.js:81-135](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/admin/admin.routes.js#L81-L135) | 5 skills, 16 concepts with explicit `ConceptPrerequisite` edges. Admin DFS cycle-detection endpoint guarantees Directed Acyclic Graph (DAG) integrity. | Skill depth is limited (16 concepts total); lacks sub-concept granularity for micro-remediation. |
| **Internal Roadmap Generator** | **Implemented** | [roadmap.service.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/learning-paths/roadmap.service.js)<br>[schema.prisma:284-314](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/prisma/schema.prisma#L284-L314) | Topological sorting with Kahn's algorithm over unsatisfied prerequisites. Annotates each item with an explainable `reason`. | Redundant synchronization with `UserConcept.masteryScore`; exposed directly via `/current` route. |
| **Dynamic Daily Selection** | **Partially Implemented** | [adaptive-engine.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/recommendations/adaptive-engine.js)<br>[recommendations.service.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/recommendations/recommendations.service.js) | Evaluates 4 deterministic rules: 1. `REVIEW` (due recall), 2. `REINFORCE` (mastery < 65), 3. `PREREQUISITE` (unmet dependency), 4. `ADVANCE`. Adapts stages to time budget. | **Critical failure:** Falls back to `js-event-loop` when recommended concept has no lesson. Ignores time spent, hints, and retries. |
| **Lesson Content & Storage** | **Partially Implemented** | [catalogue.js:169-498](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/content/catalogue.js#L169-L498)<br>[schema.prisma:316-350](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/prisma/schema.prisma#L316-L350) | 6 published 9-stage lessons stored in PostgreSQL (`Lesson`, `LessonActivity`). High educational quality with analogies and production examples. | **10 of 16 concepts have 0 lessons.** No dynamic generation mechanism for unseeded lessons or adaptive remediation variants. |
| **Interactive Activities** | **Implemented** | [ConceptVisualizer.tsx](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/components/visualizations/ConceptVisualizer.tsx)<br>[lessons/[slug]/page.tsx](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/lessons/%5Bslug%5D/page.tsx) | 6 interactive visualizations: Event Loop runtime, Load Balancer dispatcher, B-Tree index traversal, Cache-Aside flow, RAG pipeline, Closure scope. | Activities are hardcoded to 6 slugs; no general visualization renderer or dynamic sandbox. |
| **Quiz & Evaluation** | **Implemented** | [quizzes.service.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/quizzes/quizzes.service.js)<br>[quizzes.routes.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/quizzes/quizzes.routes.js) | Multiple-choice questions graded deterministically. Explanations returned per option. Updates `UserConcept` in a database transaction. | Single pass jumps mastery to 70%. Question banks are static (1-2 questions per quiz) with no retry variations. |
| **Coding Challenges** | **Missing / Dead Schema** | [schema.prisma:430-463](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/prisma/schema.prisma#L430-L463) | Models `CodingChallenge` and `CodeSubmission` exist in Prisma. | **0 routes, 0 services, 0 seed data, 0 UI components.** Practical stage in UI only renders a prompt and "Show Solution" toggle. |
| **Explain-Back Synthesis** | **Partially Implemented** | [ai.routes.js:126-219](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/ai/ai.routes.js#L126-L219)<br>[ai.service.js:51-109](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/ai/ai.service.js#L51-L109) | Learner writes explanation in their own words. Graded on accuracy, completeness, and clarity. Blends 50% into concept mastery. | Uses naive regex and word count (`length < 15`, `includes('because')`). Real LLM evaluation is completely unconfigured. |
| **Mastery Calculation** | **Broken / Simplistic** | [quizzes.service.js:96-105](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/quizzes/quizzes.service.js#L96-L105) | `newMastery = isPassed ? Math.min(100, Math.max(70, current + 25)) : Math.max(0, current - 10)`. | **Flawed progression:** Passing once guarantees >= 70% and marks concept complete. Fails to account for confidence, attempts, or retention decay. |
| **Adaptive Difficulty** | **Partially Implemented** | [adaptive-engine.js:357-431](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/recommendations/adaptive-engine.js#L357-L431) | Adapts stage count to session time: 5m (5 stages), 10m (7 stages), 15m (8 stages), 20m (9 stages). | Does not adjust conceptual difficulty or explanation complexity. Struggling learners receive the same lesson instead of easier scaffolds. |
| **Learning Session History** | **Partially Implemented** | [learning-sessions.routes.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/learning-sessions/learning-sessions.routes.js)<br>[learning-paths.routes.js:10-119](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/learning-paths/learning-paths.routes.js#L10-L119) | Tracks session start, progress stage, duration, completion, and XP reward. Resumable via `active/:lessonId`. | `LearningSession` is disconnected from `QuizAttempt` and `ExplainBackAttempt`. Does not snapshot before/after mastery, hints, or content version. |
| **Spaced Recall (SR)** | **Implemented** | [recall.routes.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/recall/recall.routes.js)<br>[recall/page.tsx](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/recall/page.tsx) | Self-rating (1 to 5). Dynamic multiplier (`1.6x` to `2.2x`, cap 90 days; reset to 1 day on fail). Overdue reviews prioritized on `/today`. | Decay is not integrated into `UserConcept.masteryScore`. Review interface uses self-rating instead of active retrieval questions. |
| **Progress & Telemetry UI** | **Implemented** | [analytics.routes.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/analytics/analytics.routes.js)<br>[progress/page.tsx](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/progress/page.tsx) | Displays weekly learning minutes, completed sessions, concepts mastered, streak continuity, and skill category bars. | Well-designed and objective; avoids unsupported claims. |
| **Continuity & Streaks** | **Implemented** | [quizzes.service.js:229-250](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/quizzes/quizzes.service.js#L229-L250)<br>[Navbar.tsx:91-97](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/components/layout/Navbar.tsx#L91-L97) | Tracks daily activity date, increments consecutive days, resets if > 1 day gap. Idempotent XP transactions prevent reward farming. | Working reliably. |
| **AI Socratic Tutor** | **Partially Implemented** | [AiTutorDrawer.tsx](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/components/tutor/AiTutorDrawer.tsx)<br>[ai.service.js:17-48](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/ai/ai.service.js#L17-L48) | UI drawer available in lessons. Backend persists messages to `AiConversation` and `AiMessage`. | Fallback returns static canned Socratic questions. No LLM integration or streaming responses. |
| **Voice & Audio Features** | **Missing** | [docs/01-PRD-AI-Learning-Companion.md](file:///Users/yashgupta/Desktop/me/ai-learning-companion/docs/01-PRD-AI-Learning-Companion.md) | Documented in PRD as Phase 2 vision. | 0 implementation in codebase. |
| **Scheduled Jobs & Worker** | **Missing** | [schema.prisma:611-625](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/prisma/schema.prisma#L611-L625) | `Notification` model exists in database. | No BullMQ, Celery, node-cron, or external cron workers. Abandonment detection and email/push notifications are unimplemented. |
| **Subscriptions & Billing** | **Partially Implemented** | [subscriptions.routes.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/subscriptions/subscriptions.routes.js)<br>[subscription/page.tsx](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/subscription/page.tsx) | `FREE` and `PRO` plans seeded. Checks `isPro` for entitlements. Checkout returns a staging notice if `STRIPE_SECRET_KEY` is absent. | Real webhook listeners and live checkout sessions not configured. |
| **Admin Management** | **Implemented** | [admin.routes.js](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/admin/admin.routes.js)<br>[admin/page.tsx](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/admin/page.tsx) | Guards routes with `requireAdmin`. Metrics dashboard, skill creator, and graph cycle verification. | Graph editing is read-only; no UI to add prerequisite edges. |

---

## 3. Current End-to-End Architecture

```
+-----------------------------------------------------------------------------------------+
|                                    FRONTEND (Next.js 14)                                |
|                                                                                         |
|  /today                /lessons/[slug]              /my-learning             /recall     |
|  [Daily CTA Card]  --> [9-Stage Player]         --> [Mastery History]   --> [Recall UI] |
|  - Action Badge        - Visualizer (6 types)       - Active Focus          - Rating 1-5|
|  - Time estimate       - AI Tutor Drawer            - Mastered Concepts     - SM-2 Queue|
|  - Reason text         - Quiz & Explain-back        - Reinforce Needs                   |
|                        - Resumable Session                                              |
+-----------------------------------------------------------------------------------------+
                                           | HTTP Requests (JWT Cookie / Header)
                                           v
+-----------------------------------------------------------------------------------------+
|                                  BACKEND API (Express ESM)                              |
|                                                                                         |
|  /api/v1/today/recommendation         --> RecommendationsService.getTodayRecommendation |
|  /api/v1/sessions/*                   --> Session Start / Progress / Complete Routes     |
|  /api/v1/quizzes/:id/submit           --> QuizService.submitQuiz (Grades & Updates UC)  |
|  /api/v1/recall/*                     --> Spaced Repetition Rescheduler                 |
|  /api/v1/learning-paths/*             --> RoadmapService / History Route                |
|  /api/v1/ai/*                         --> AiService (Mock Heuristics Fallback)          |
+-----------------------------------------------------------------------------------------+
                                           | Prisma ORM (Pool)
                                           v
+-----------------------------------------------------------------------------------------+
|                                  DATABASE (PostgreSQL)                                  |
|                                                                                         |
|  Curriculum Graph     Learner State            Session Data          Spaced Repetition  |
|  - skills             - user_concepts          - learning_sessions   - recall_schedules |
|  - skill_prereqs      - user_skills            - quiz_attempts       - recall_attempts  |
|  - concepts           - learning_goals         - explain_attempts    - recommendation_  |
|  - concept_prereqs    - streaks                - learning_activities   logs             |
|  - role_skills        - xp_transactions                                                 |
|  - lessons & quizzes                                                                    |
+-----------------------------------------------------------------------------------------+
```

---

## 4. Current Data Flow Diagram

```mermaid
flowchart TD
    classDef client fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px;
    classDef api fill:#f8fafc,stroke:#64748b,stroke-width:2px;
    classDef engine fill:#fef3c7,stroke:#d97706,stroke-width:2px;
    classDef db fill:#ecfdf5,stroke:#059669,stroke-width:2px;
    classDef missing fill:#fee2e2,stroke:#dc2626,stroke-width:2px,stroke-dasharray: 5 5;

    User([Learner Opens /today]):::client -->|GET /api/v1/today/recommendation| RouteRec[recommendations.routes.js]:::api
    RouteRec --> SvcRec[RecommendationsService.js]:::api
    SvcRec --> Engine[AdaptiveEngine.evaluateNextAction]:::engine

    Engine -->|1. Check Overdue| DB_Recall[(recall_schedules)]:::db
    Engine -->|2. Check Mastery < 65| DB_UC[(user_concepts)]:::db
    Engine -->|3. Check Prerequisites < 60| DB_Prereq[(concept_prerequisites)]:::db
    Engine -->|4. Check Candidate Concepts| DB_Concepts[(concepts & lessons)]:::db

    Engine -->|Logs Decision| DB_RecLog[(recommendation_logs)]:::db
    Engine -- ActionType: ADVANCE / REINFORCE / REVIEW / PREREQUISITE --> SvcRec
    SvcRec -->|Finds Lesson for Concept| DB_Lessons[(lessons)]:::db

    subgraph Content_Bottleneck [Content Availability Check]
        DB_Lessons -->|Lesson Found| ValidLesson[Return Concept Lesson]:::api
        DB_Lessons -.->|Lesson Missing (10 of 16 Concepts)| FallbackLesson[SILENT FALLBACK to Event Loop Lesson]:::missing
    end

    ValidLesson --> UI_Today[Render /today Hero Card]:::client
    FallbackLesson --> UI_Today

    UI_Today -->|Learner Clicks Start Session| UI_Lesson[Render /lessons/slug 9-Stage Player]:::client
    UI_Lesson -->|POST /api/v1/sessions/start| DB_Sess[(learning_sessions STARTED)]:::db
    UI_Lesson -->|PATCH /sessions/:id/progress| DB_SessProgress[(learning_sessions IN_PROGRESS)]:::db

    UI_Lesson -->|Stage 6: Submit Quiz| RouteQuiz[POST /api/v1/quizzes/:id/submit]:::api
    RouteQuiz --> SvcQuiz[quizzes.service.js]:::api

    subgraph State_Update_Transaction [Database Transaction]
        SvcQuiz --> DB_QA[(quiz_attempts & responses)]:::db
        SvcQuiz -->|score >= 70? Set mastery = max 70, current + 25| DB_UCUpdate[(user_concepts)]:::db
        SvcQuiz -->|Recompute Average| DB_USUpdate[(user_skills)]:::db
        SvcQuiz -->|Reschedule +1 or +3 Days| DB_RSUpdate[(recall_schedules)]:::db
        SvcQuiz -->|Award 50-75 XP| DB_XP[(xp_transactions)]:::db
        SvcQuiz -->|Increment Continuity| DB_Streak[(streaks)]:::db
    end

    UI_Lesson -->|Stage 7: Optional Explain-Back| RouteExplain[POST /api/v1/ai/explain-back]:::api
    RouteExplain --> MockAI[AiService: Word-Count Heuristic]:::missing
    MockAI -->|Blend 50% Mastery| DB_UCUpdate

    UI_Lesson -->|Stage 8: Session Complete| RouteComplete[PATCH /api/v1/sessions/:id/complete]:::api
    RouteComplete --> DB_SessComp[(learning_sessions COMPLETED)]:::db
    RouteComplete --> DB_Act[(learning_activities)]:::db

    UI_Lesson -->|Click Return to Today| User
```

---

## 5. Current Learning Progression Algorithm

The selection, evaluation, and update cycle was verified line-by-line across `adaptive-engine.js`, `quizzes.service.js`, `assessments.service.js`, and `recall.routes.js`.

### Step 1: Decision Evaluation (`AdaptiveEngine.evaluateNextAction`)
The engine evaluates four sequential priority rules:

1. **Rule 1 (Spaced Review - `REVIEW`):**
   - Query: `recallSchedule.findFirst({ where: { userId, scheduledAt: { lte: now }, status: 'SCHEDULED' }, orderBy: { scheduledAt: 'asc' } })`.
   - If found: returns `actionType: 'REVIEW'`, concept, lesson, and reason.
2. **Rule 2 (Targeted Weakness - `REINFORCE`):**
   - Query: `userConcept.findFirst({ where: { userId, attempts: { gt: 0 }, masteryScore: { lt: 65 } }, orderBy: { updatedAt: 'desc' } })`.
   - If found: returns `actionType: 'REINFORCE'`, concept, lesson, and reason.
3. **Rule 3 (Target / In-Progress Prerequisite Check - `PREREQUISITE`):**
   - Checks if the learner's active roadmap has an `IN_PROGRESS` item or an explicit target concept.
   - For all concept prerequisites: if `masteryScore < 60`, returns `actionType: 'PREREQUISITE'` for the missing prerequisite.
4. **Rule 4 (Next Unmastered Candidate - `ADVANCE` or `PREREQUISITE`):**
   - Loads candidate concepts for `activeGoal.targetRole.roleSkills` ordered by `orderIndex ASC, createdAt ASC`.
   - Finds the first concept with `masteryScore < 70`.
   - Evaluates its prerequisites:
     - If any prerequisite has `masteryScore < 60`: returns `actionType: 'PREREQUISITE'` pointing to the prerequisite.
     - If all prerequisites have `masteryScore >= 60`: returns `actionType: 'ADVANCE'` pointing to the candidate.
   - Fallback: If all concepts have `masteryScore >= 70`, returns the first concept for maintenance.

### Step 2: Session Pacing (`AdaptiveEngine.getTimeAdaptedConfig`)
The learner's `dailyMinutes` setting (from `user_profiles`) determines which stages are enabled in the frontend player:
- **<= 5 min:** 5 stages (Overview, Simple Explanation, Visualization, Quiz, Summary). Max 1 quiz question.
- **<= 10 min:** 7 stages (+ Simple Example, Real Project). Max 2 quiz questions.
- **<= 15 min:** 8 stages (+ Practical Application Challenge). Max 2 quiz questions.
- **> 15 min (20 min):** 9 stages (+ Explain-Back Synthesis). Max 3 quiz questions.

### Step 3: Performance Evaluation & Mastery Calculation
Performance is evaluated upon quiz submission (`QuizService.submitQuiz`):
1. **Scoring:** `scorePercentage = (correctAnswers / totalQuestions) * 100`.
2. **Mastery Formula:**
   - If `scorePercentage >= 70`: `newMastery = Math.min(100, Math.max(70, currentMastery + 25))`.
   - If `scorePercentage < 70`: `newMastery = Math.max(0, currentMastery - 10)`.
3. **Skill Aggregation:**
   - `userSkill.masteryScore = round(average of all userConcepts in skill)`.
4. **Spaced Interval Update:**
   - If passed: `intervalDays = 3`, `scheduledAt = now + 3 days`, `predictedRecall = 0.9`.
   - If failed: `intervalDays = 1`, `scheduledAt = now + 1 day`, `predictedRecall = 0.6`.

---

## 6. Adaptive Learning Gap Analysis

### Contrast: Required vs. Current Behavior

```
+----------------------------------------------------------------------------------------------------+
| SCENARIO: Two learners select the "Backend Developer" goal starting at "Closures & Lexical Scope"  |
+----------------------------------------------------------------------------------------------------+

                          LEARNER A (Fast Learner)                 LEARNER B (Struggling Learner)
                          ------------------------                 ------------------------------
User Actions:             - Completes session in 7 mins            - Takes 14 mins, views hint
                          - 100% quiz score on first try           - 0% quiz score (confused lexical vs dynamic)
                          - Accurate Explain-Back                  - Unclear Explain-Back

Intended Product          - System recognizes high confidence      - System detects misconception: lexical binding
Behavior:                 - Advances to deeper application or      - Next day: Does NOT advance to Async/Await
                            next concept with higher challenge     - Serves targeted remediation:
                          - No redundant low-level drills            * Simpler breakdown of execution context
                                                                     * Interactive scope-chain visual exercise
                                                                     * Different quiz testing specific error

Actual Codebase           - Quiz jumps mastery from 0 to 70%       - Quiz sets mastery to 0%, logs misconception
Behavior Today:           - Tomorrow: Evaluates js-closures = 70%  - Tomorrow: Rule 2 flags mastery < 65
                          - Advances to js-async-await             - Recommends REINFORCE on js-closures
                          - BUT: js-async-await has NO lesson!     - BUT: Serves the EXACT SAME LESSON AGAIN!
                            Silently serves Event Loop lesson!       Same text, same visual, same 2 questions!
```

### Gap Matrix Across Required Signals

| Signal | Present in Schema? | Recorded at Runtime? | Used by Adaptive Engine? | Evaluation & Gap Detail |
| :--- | :---: | :---: | :---: | :--- |
| **Correctness & Answer Quality** | Yes | Yes | **Partial** | Only binary MCQ score is checked (>= 70%). Answer quality in explain-back is a mock heuristic. Coding submissions are not executed. |
| **Hint Usage** | No | No | **No** | UI renders `hint` toggle, but click events are never sent to backend or persisted. Hint-heavy passes are treated identically to independent passes. |
| **Repeated Misconceptions** | Yes | Yes | **No** | `user_concepts.misconceptions` records mistakes, but `AdaptiveEngine` only checks `masteryScore < 65`. It never inspects misconception content or recurrence. |
| **Attempts & Retries** | Yes | Yes | **No** | `attempts` and `correct_attempts` increment, but are not factored into mastery formulas or difficulty decisions. |
| **Completion vs. Abandonment** | Yes | Partial | **No** | `learning_sessions.status` supports `ABANDONED`, but abandonment is never detected or handled. Dropping out midway leaves the learner stuck. |
| **Time Spent (Interpreted)** | Yes | Yes | **No** | `durationSeconds` is saved for analytics only. A learner spending 40 mins on a 10 min lesson is treated identically to one spending 3 mins. |
| **Spaced Recall & Retention** | Yes | Yes | **Yes** | Active via `recall_schedules` and SM-2 interval multipliers. Due reviews take priority. However, mastery score does not decay over time. |
| **Mastery Uncertainty / Confidence** | Yes | Hardcoded | **No** | `confidenceScore` is hardcoded to `Math.min(100, Math.max(50, newMastery))` or static 85/40. No standard error or Bayesian probability modeling. |
| **Prerequisite Readiness** | Yes | Yes | **Yes** | Prerequisite scores are verified (< 60 triggers `PREREQUISITE`). Only checks 1 level deep; candidate pool is filtered by target role. |
| **Available Daily Time** | Yes | Yes | **Partial** | Adapts stage count (5/7/8/9 stages) in UI player. Does not select shorter or longer concepts to fit the learner's schedule. |

---

## 7. Database and Data Integrity Findings

### Model Analysis & Relationship Deficiencies

```
+----------------------------------------------------------------------------------------------------+
|                               CURRENT ENTITY RELATIONSHIP DISCONNECTS                              |
|                                                                                                    |
|   +-----------------------+              +-----------------------+                                 |
|   |    LearningSession    |              |      QuizAttempt      |                                 |
|   +-----------------------+              +-----------------------+                                 |
|   | id: UUID              |              | id: UUID              |                                 |
|   | userId: UUID          |              | userId: UUID          |                                 |
|   | lessonId: UUID        |              | quizId: UUID          |                                 |
|   | status: STARTED...    |              | score: Float          |                                 |
|   | durationSeconds: Int  |              | completedAt: DateTime |                                 |
|   +-----------------------+              +-----------------------+                                 |
|               |                                      |                                             |
|               X- - - - - NO FOREIGN KEY - - - - - - -X                                             |
|                                                                                                    |
|   A session does not know which QuizAttempt or ExplainBackAttempt occurred inside it!              |
|   Mastery before and after the session is NOT snapshotted!                                         |
+----------------------------------------------------------------------------------------------------+
```

1. **Decoupled Session Telemetry:**
   - `LearningSession` records when a user starts and finishes a lesson, but has **no foreign keys** to `QuizAttempt`, `ExplainBackAttempt`, or `CodeSubmission`.
   - If a learner takes a quiz multiple times or abandons it, the session record cannot reconstruct what transpired.
2. **Missing Longitudinal Mastery History:**
   - `UserConcept` only stores the current scalar `masteryScore` and `confidenceScore`.
   - When mastery changes from 45% to 70%, the previous score, timestamp delta, and attribution are lost. There is no `ConceptMasterySnapshot` or historical log to visualize mastery velocity.
3. **Dead / Unused Database Models:**
   - `CodingChallenge` (`coding_challenges`) and `CodeSubmission` (`code_submissions`) exist in `schema.prisma:430-463`, but have 0 routes, 0 controllers, and 0 seeds.
   - `Notification` (`notifications`) exists in `schema.prisma:611-625`, but has 0 background handlers.
4. **Duplicated & Out-of-Sync State:**
   - `LearningPathItem.status` (`PENDING`, `IN_PROGRESS`, `COMPLETED`) duplicates `UserConcept.masteryScore`.
   - In `quizzes.service.js`, passing a quiz updates `LearningPathItem.status = 'COMPLETED'`. However, `assessments.service.js` updates `UserConcept` without updating `LearningPathItem`. `RoadmapService.generateRoadmap` dynamically recomputes status based on `masteryScore >= 75`, making the persisted column unreliable.
5. **Missing Performance Indexes:**
   - `learning_sessions`: Lacks composite index on `[userId, lessonId, status]` (heavily queried to detect resumable sessions).
   - `recall_schedules`: Lacks composite index on `[userId, scheduledAt, status]` (scanned on every `/today/recommendation` call).
   - `learning_activities`: Lacks index on `[userId, createdAt]` (scanned on every recommendation to compute 7-day weekly learning minutes).
   - `user_concepts`: Lacks index on `[userId, masteryScore]` (filtered on every recommendation for weak concepts).

---

## 8. API and Frontend Exposure Audit

The product brief mandates: *"The complete learning path may exist internally as a skill graph... However, we do not want to expose the entire fixed roadmap to the learner... Audit every screen, API response, component, and endpoint that exposes upcoming topics, a full curriculum, a complete roadmap, or a fixed lesson sequence."*

### Exposure Findings

| Endpoint / Screen | Component / Route | Exposure Status | Finding & Evidence |
| :--- | :--- | :--- | :--- |
| **`GET /api/v1/learning-paths/current`** | [learning-paths.routes.js:121-129](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/learning-paths/learning-paths.routes.js#L121-L129) | **EXPOSED (LEAK)** | Returns the complete `items` array with all upcoming concepts, sequence numbers, skills, and prerequisite reasons in plain JSON. Any client inspection reveals the full internal curriculum. |
| **`GET /api/v1/lessons`** | [lessons.routes.js:9-25](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/lessons/lessons.routes.js#L9-L25) | **EXPOSED (LEAK)** | Returns an unpaginated array of all published lessons across all skills and concepts in the system. |
| **`/roadmap` Frontend Route** | [roadmap/page.tsx:1-20](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/roadmap/page.tsx#L1-L20) | **PROTECTED (REDIRECT)** | Safely redirects to `/my-learning` with comment: *"In Companion.ai, future roadmap remains hidden. Redirect to My Learning."* |
| **`/my-learning` Screen** | [my-learning/page.tsx:1-258](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/my-learning/page.tsx#L1-L258) | **ALIGNED** | Only displays: 1. Current Active Focus, 2. Completed Concepts, 3. Concepts Needing Reinforcement, 4. Recent Activity Log. Completely hides future concepts. |
| **`/today` Screen** | [today/page.tsx:1-249](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/today/page.tsx#L1-L249) | **ALIGNED** | Clean singular focus. Renders only today's recommended milestone card, estimated time, and continuity indicators. |
| **`/progress` Screen** | [progress/page.tsx:1-199](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/progress/page.tsx#L1-L199) | **ALIGNED** | Communicates aggregate progress (overall mastery, studied vs mastered counts, minutes) without listing future unstudied topics. |

**Action Required:**
- Deprecate or guard `GET /api/v1/learning-paths/current` so that ordinary learners cannot query future sequenced nodes.
- Remove `GET /api/v1/lessons` (or restrict it to admin users). Learners should only retrieve lessons for which they have an active recommendation or completed history.

---

## 9. AI and Content Quality Findings

### 1. Simulated Provider Abstraction
Inspection of `apps/backend/src/modules/ai/ai.service.js` revealed:
- `isRealProviderConfigured()` checks `config.aiProvider` and API keys.
- However, **no real AI API calls exist in the codebase**. When an API key is set, line 43 and line 98 return hardcoded placeholder objects:
  ```javascript
  // ai.service.js:41-47
  return {
    reply: `Let's examine how this connects to ${lessonContext?.conceptName}. What would be your first intuition?`,
    provider: config.aiProvider,
    model: 'gpt-4o-mini',
    tokens: { input: 200, output: 100 }
  };
  ```
- `package.json` contains no LLM SDKs (`openai`, `@anthropic-ai/sdk`, or `@google/genai` are absent).

### 2. Heuristic Rubric vs. Real Semantic Grading
In `AiService.evaluateExplainBack`:
- Scoring is computed via word count and string matching:
  - `length < 15`: accuracy = 55, completeness = 45, clarity = 60.
  - `length > 40`: accuracy += 15, completeness += 20.
  - Contains `'because'` or `'tradeoff'`: accuracy += 10, clarity += 10.
- A learner pasting 40 words of technical nonsense containing "because" and "tradeoff" will receive an 85%+ score, which is then blended 50% into their concept mastery!

### 3. Separation of Deterministic Rules and AI Generation
- **Current Strength:** The progression logic in `AdaptiveEngine` is 100% deterministic code. The AI is not permitted to hallucinate or mutate learner state directly.
- **Current Limitation:** Because there is no real AI content generator, the system cannot generate alternative explanations, custom code challenges, or remediation scaffolds for learners who struggle.

---

## 10. Prioritized Issues

### Priority 0 (P0): Core Learning Flow Broken or Unsafe
1. **Content Deficiency & Silent Fallback Loop**
   - **Impact:** 10 of 16 concepts lack lessons. Recommending them silently routes the learner to `mastering-the-javascript-event-loop`, stalling progress.
   - **Evidence:** [recommendations.service.js:60-68](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/recommendations/recommendations.service.js#L60-L68); [today/page.tsx:111](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/today/page.tsx#L111).
   - **Fix:** Author the 10 missing lessons or implement an AI-backed dynamic lesson generation pipeline with strict validation.
2. **Coarse-Grained Instant Mastery Jump**
   - **Impact:** Single quiz pass jumps mastery to >= 70%, permanently bypassing reinforcement.
   - **Evidence:** [quizzes.service.js:98](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/quizzes/quizzes.service.js#L98) (`Math.max(70, currentMastery + 25)`).
   - **Fix:** Replace instant jump with a weighted evidence model factoring attempt counts, quiz difficulty, and hint usage.

### Priority 1 (P1): Required for Correct Adaptive Daily Learning
3. **Identical Remediation on REINFORCE**
   - **Impact:** Struggling learners receive the identical lesson and questions they previously failed.
   - **Evidence:** [adaptive-engine.js:101-112](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/recommendations/adaptive-engine.js#L101-L112).
   - **Fix:** Introduce multiple lesson variations (`STANDARD`, `SCAFFOLDED_REMEDIAL`, `DEEP_DIVE`) and select variants based on `actionType`.
4. **Decoupled Session Telemetry & Missing Hint / Retry Tracking**
   - **Impact:** Hint usage and attempts are not captured in the session; before/after mastery is lost.
   - **Evidence:** [learning-sessions.routes.js:142-185](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/learning-sessions/learning-sessions.routes.js#L142-L185).
   - **Fix:** Add `hintsUsed`, `initialMastery`, `finalMastery`, and foreign keys linking `QuizAttempt` and `ExplainBackAttempt` to `LearningSession`.
5. **Real AI Integration with Structured Output Validation**
   - **Impact:** Socratic tutor and explain-back evaluation return mock placeholders.
   - **Evidence:** [ai.service.js:20-48](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/ai/ai.service.js#L20-L48).
   - **Fix:** Integrate official SDK (`@google/genai` or `openai`), enforce strict Zod schemas for evaluations, and add caching.

### Priority 2 (P2): Important Product Quality Improvements
6. **Leaked Future Roadmap via API**
   - **Impact:** `GET /api/v1/learning-paths/current` and `GET /api/v1/lessons` leak upcoming topics.
   - **Evidence:** [learning-paths.routes.js:122-129](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/learning-paths/learning-paths.routes.js#L122-L129).
   - **Fix:** Restrict `/current` to return only the active in-progress item or restrict it to admin role; remove global `/lessons` endpoint.
7. **Interactive Practical Sandbox**
   - **Impact:** Stage 6 "Practical Challenge" only displays text and a "Show Solution" button. Dead `CodingChallenge` models in database.
   - **Evidence:** [lessons/[slug]/page.tsx:450-496](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/lessons/%5Bslug%5D/page.tsx#L450-L496).
   - **Fix:** Connect coding challenges to an interactive code editor with client-side or sandbox evaluation.
8. **Missing Composite Database Indexes**
   - **Impact:** Inefficient table scans on `learning_sessions`, `recall_schedules`, and `user_concepts`.
   - **Evidence:** [schema.prisma:352-367, 483-498](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/prisma/schema.prisma#L352-L367).
   - **Fix:** Add composite indexes in Prisma schema.

### Priority 3 (P3): Future Enhancements
9. **Voice Tutor** (Phase 2 multimodal audio).
10. **Background Cron Worker** (Automated session abandonment detection and email/push reminders).
11. **Automated Stripe Billing Webhooks**.

---

## 11. Target Architecture Proposal

The target architecture preserves the existing tech stack (Next.js 14, Express ESM, Prisma ORM, PostgreSQL) and makes targeted improvements to achieve genuine adaptivity without rewriting the application.

```mermaid
flowchart TD
    subgraph Client_Experience [Learner Experience (Next.js 14)]
        UI_Today[/today Dashboard: Single Daily Objective & Continuity]
        UI_Player[/lessons/slug: Dynamic 10-15 Min Session Player]
        UI_Journal[/my-learning: Historical Mastery & Focus Journal]
    end

    subgraph API_Gateway [Express API v1]
        Route_Today[GET /today/recommendation]
        Route_Session[Session Lifecycle: /start, /progress, /complete]
        Route_Quiz[POST /quizzes/:id/submit]
        Route_Explain[POST /ai/explain-back]
    end

    subgraph Progression_Core [Deterministic Progression Engine]
        Engine[Adaptive Progression Engine]
        MasteryEstimator[Multi-Signal Mastery Estimator]
        SR_Scheduler[Spaced Retention Scheduler]
    end

    subgraph Content_Pipeline [Educational Content Delivery]
        Catalogue[Curated Content Catalogue (PostgreSQL)]
        AI_Generator[AI Content Generator & Evaluator]
        ZodValidator[Strict Zod Output Validation]
    end

    subgraph Storage [Authoritative PostgreSQL State]
        DB_UserConcepts[(user_concepts: mastery, confidence, attempts)]
        DB_Sessions[(learning_sessions: hints, before/after mastery)]
        DB_Attempts[(quiz_attempts & explain_back_attempts)]
        DB_Recall[(recall_schedules & recall_attempts)]
    end

    UI_Today -->|1. Fetch Recommendation| Route_Today
    Route_Today --> Engine

    Engine -->|Query State| DB_UserConcepts
    Engine -->|Query Overdue| DB_Recall
    Engine --> MasteryEstimator
    MasteryEstimator -->|Select Action: ADVANCE / REINFORCE / REVIEW / PREREQ| Engine

    Engine -->|Action & Time Budget| Route_Today
    Route_Today -->|2. Launch Focused Lesson| UI_Player

    UI_Player -->|3. Record Telemetry (Hints, Retries)| Route_Session
    UI_Player -->|4. Submit Knowledge Check| Route_Quiz
    UI_Player -->|5. Submit Synthesis| Route_Explain

    Route_Explain --> AI_Generator
    AI_Generator --> ZodValidator
    ZodValidator --> Route_Explain

    Route_Quiz --> MasteryEstimator
    Route_Explain --> MasteryEstimator
    Route_Session --> DB_Sessions

    MasteryEstimator -->|Update Score & Confidence| DB_UserConcepts
    MasteryEstimator -->|Reschedule Retention Interval| SR_Scheduler
    SR_Scheduler --> DB_Recall

    UI_Journal -->|View Verified Progress Only| DB_UserConcepts
```

### Key Architectural Enhancements
1. **Multi-Signal Mastery Estimator:**
   Replaces the +25 / -10 rule with an evidence-backed calculation:
   `ΔMastery = f(Score, HintsUsed, AttemptNumber, TimeSpentWeight, QuestionDifficulty)`
   - Correct without hints: +18% to +22%. Requires >= 2 successful sessions across separate days to achieve 75%+ mastery.
   - Correct with hints: +8% to +12%.
   - Failed attempt: -8% to -15%, captures specific misconception key.
2. **Differentiated Remediation Paths:**
   - `ADVANCE`: Standard conceptual explanation, visual animation, production example, standard quiz.
   - `REINFORCE`: Simplified analogy, decomposed prerequisite micro-step, targeted diagnostic practice addressing the exact recorded misconception.
   - `REVIEW`: Active retrieval flash question testing previously mastered concepts.
   - `PREREQUISITE`: Seamlessly bridges missing foundational dependencies.
3. **Correlated Session Records:**
   Extend `LearningSession` with foreign keys to its attempts, storing:
   - `initialMastery` and `finalMastery`.
   - `hintsUsedCount`.
   - `contentVersion`.

---

## 12. Implementation Plan

```
PHASE 1 (P0): Core Progression & Content Integrity
├── Seed 10 Missing Concept Lessons in catalogue.js & database
├── Eliminate Silent Event Loop Fallback in recommendations.service.js
└── Implement Weighted Multi-Signal Mastery Estimator (Replace +25/-10)

PHASE 2 (P1): Session Telemetry & Differentiated Remediation
├── Migration: Add session-attempt FKs, hintsUsed, before/after mastery
├── Capture Hint Toggles & Retries in LessonPlayerPage
└── Author/Generate Scaffolded Remediation Variants for REINFORCE

PHASE 3 (P1/P2): Real AI Integration & Strict Output Schemas
├── Install official LLM SDK (@google/genai or openai)
├── Implement Semantic Rubric with Strict Zod Validation for Explain-Back
└── Add Socratic Tutor Context Grounding & Prompt Templates

PHASE 4 (P2): Surface Hardening & Performance Optimization
├── Deprecate/Guard GET /learning-paths/current and GET /lessons
├── Add Performance Composite Indexes on PostgreSQL Tables
└── Connect Interactive Coding Challenge Runner
```

### Verification Criteria for Each Phase
- **Phase 1:** Vitest suite verifies that any concept selected by the engine resolves to its own valid lesson slug, never falling back to Event Loop. Passing a quiz on an unmastered concept requires multiple successful attempts to exceed 75%.
- **Phase 2:** Database inspection confirms that `learning_sessions` rows contain populated `initialMastery`, `finalMastery`, `hintsUsed`, and linked `quizAttemptId`.
- **Phase 3:** Integration tests verify that `POST /api/v1/ai/explain-back` produces structured scores from a live or mocked LLM responding to actual technical substance rather than word length.
- **Phase 4:** HTTP curl test verifies that non-admin requests to `/api/v1/learning-paths/current` and `/api/v1/lessons` return 403 Forbidden or 404 Not Found.

---

## 13. Acceptance Criteria

1. **Fast Learners Advance Appropriately:**
   A learner scoring 100% on a concept without hints on Day 1 receives an advanced application or progresses to the next dependency-ready concept on Day 2.
2. **Struggling Learners Receive Scaffolding:**
   A learner scoring < 65% on a concept is recommended `REINFORCE` on Day 2, receiving a different, simplified explanation addressing their recorded mistake rather than the identical lesson.
3. **Progressive Difficulty Recovery:**
   Once a struggling learner demonstrates understanding on a reinforced concept, their mastery increases and the engine advances them to standard difficulty.
4. **Dynamic Daily Selection:**
   Every call to `GET /api/v1/today/recommendation` evaluates current mastery, due reviews, and prerequisites, selecting an optimal next session with an explainable reason.
5. **Session Duration Fits 10–15 Minutes:**
   Stage configurations enforce that 10–15 minute daily budgets correspond to 7–8 focused stages, preventing session fatigue.
6. **Complete Learning History Persistence:**
   Every session stores duration, before/after mastery, hints used, quiz answers, and identified misconceptions.
7. **Prevention of Arbitrary Lessons:**
   The recommendation engine must never silently fall back to an unrelated lesson.
8. **Hidden Future Roadmap:**
   No learner-facing API or UI reveals the full future list of lessons or roadmap milestones.
9. **Resilient AI Failure Recovery:**
   If the AI provider times out or fails, deterministic fallbacks ensure the learner can complete their daily session without corrupted progress.
10. **Preservation of Existing Passing Functionality:**
    All existing 19 backend tests and frontend routes continue to function without regressions.

---

## 14. Open Questions and Assumptions

1. **Lesson Authoring vs. Dynamic LLM Generation:**
   *Decision needed:* Should the 10 missing concept lessons and remedial variations be statically curated in `catalogue.js` (guaranteeing 100% deterministic human-reviewed quality) or generated on-demand by an LLM with Zod validation?  
   *Recommendation:* Curate core baseline lessons in `catalogue.js` to ensure production-grade accuracy, and use LLMs for personalized Socratic tutoring, explain-back grading, and dynamic remedial hints.
2. **Preferred AI Provider:**
   *Decision needed:* Which AI provider SDK should be installed as primary (`@google/genai`, `openai`, or `@anthropic-ai/sdk`)?
3. **Coding Sandbox Environment:**
   *Decision needed:* For the dead `CodingChallenge` feature, should code execution run in the browser (e.g., Web Workers / Pyodide / QuickJS) or in a secure backend container sandbox?
