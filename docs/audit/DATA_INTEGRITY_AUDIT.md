# Data-Integrity Audit: Mock Data, Learner State, and Onboarding-to-Adaptive-Learning Alignment

## Executive Summary

This audit assesses the data integrity, learner profile persistence, and data flow of the AI Learning Companion platform. Following the initial audit and Gemini adaptive learning integration, this phase verifies whether any unintended mock data, fabricated learner metrics, or broken onboarding mappings remain in the system.

---

## 1. End-to-End Data Flow Trace

The expected learner lifecycle follows this sequence:
```
Signup → Onboarding → Persisted Learner Profile → Initial Learning Path → Today's Recommendation → Lesson → Assessment → Persisted Evidence → Adaptive Decision
```

### Trace Details:
1. **Signup (`POST /api/v1/auth/signup`)**:
   - Creates `User`, `UserProfile` (`onboardingCompleted: false`, `onboardingStep: 1`), `Streak` (`currentStreak: 0`, `longestStreak: 0`), and `Subscription` (`FREE` plan).
   - Data source: **Real persisted user data**.
2. **Onboarding (`POST /api/v1/onboarding/step`)**:
   - Step 1: Saves `targetRoleId` and `goalTitle` into `LearningGoal`.
   - Step 2: Saves `experienceLevel` and `dailyMinutes` into `UserProfile`.
   - Step 3: Saves self-reported `knownSkillSlugs`.
   - Data source: **Real persisted user data** (with one flaw identified below regarding synthetic mastery).
3. **Onboarding Completion (`POST /api/v1/onboarding/complete`)**:
   - Updates `onboardingCompleted: true`, `onboardingStep: 5`.
   - Initial roadmap generation occurs lazily or on completion.
4. **Initial Learning Path (`RoadmapService.generateRoadmap(userId)`)**:
   - Reads `LearningGoal` and `targetRole.roleSkills`.
   - Filters candidate concepts for target skills.
   - Evaluates prerequisite DAG and current mastery.
   - Queries Gemini (or deterministic topological sort fallback) for sequence.
   - Persists version 1 `LearningPath` and `LearningPathItem`s.
5. **Today's Recommendation (`GET /api/v1/today/recommendation`)**:
   - Evaluates `AdaptiveEngine.evaluateNextAction(userId)`.
   - Checks due recalls, weak concepts, prerequisite gaps, and roadmap `IN_PROGRESS` concept.
   - Tailors session structure based on `dailyMinutes` (10, 15, or 20 mins).
6. **Lesson & Assessment Delivery (`GET /api/v1/lessons/:slug`, `POST /api/v1/quizzes/:id/submit`)**:
   - Renders 9-stage curriculum content.
   - Grades quiz responses and records `QuizAttempt`.
   - Updates `UserConcept` with `MasteryEngine.evaluateAssessmentOutcome` incorporating `hintsUsed`.
7. **Adaptive Decisions (`AdaptiveEngine`)**:
   - Layer 1: Immediate adaptation on next action.
   - Layer 2: Mini-analysis checkpoint every 3 completed sessions.
   - Layer 3: Full review checkpoint every 5 active days.

---

## 2. Classification of Data Sources

| Data Element | Classification | Status & Verification |
| :--- | :--- | :--- |
| **Curriculum Concepts & Lessons** | Real seeded curriculum data | Verified in `apps/backend/src/content/catalogue.js` (15 concepts, complete 9-stage lessons). |
| **Subscription Plans & Roles** | Real seeded product configuration | Verified in `apps/backend/prisma/seed.js` (`FREE`, `PRO`, 6 roles, 13 skills). |
| **User Profiles, Streaks, XP** | Real persisted user data | Stored in PostgreSQL, dynamically computed per authenticated learner. |
| **Progress Dashboard Metrics** | Real persisted user data | Computed via `analytics.routes.js` from `learningActivity`, `learningSession`, `userConcept`. |
| **Socratic AI Tutor** | Gemini-generated / Deterministic fallback | Gemini 2.5 Flash when configured; deterministic Socratic hint when key missing. |
| **Explain-Back Rubrics** | Gemini-generated / Deterministic fallback | Structured JSON rubric when configured; deterministic heuristic rubric when key missing. |
| **Periodic Path Revisions** | Gemini-generated / Deterministic fallback | Proposes adjustments; validated against DB & prerequisite DAG before activation. |
| **Known Skills Onboarding Mastery** | **Synthetic learner progress (FLAGGED)** | Previously set `masteryScore: 50.0` automatically upon selecting a skill checkbox. |
| **Diagnostic Assessment Scoring** | **Overconfident synthetic estimate (FLAGGED)** | Previously set `masteryScore: 100` on single correct diagnostic answer. |
| **Frontend Lesson Slug Fallback** | **Hardcoded demonstration data (FLAGGED)** | Fallback to `'mastering-the-javascript-event-loop'` in `today/page.tsx` and `assessment/page.tsx`. |

---

## 3. Detailed Audit Findings & Recommended Fixes

### Finding 1: Synthetic 50% Mastery Assigned on Onboarding Skill Selection
- **Location**: [`apps/backend/src/modules/onboarding/onboarding.routes.js`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/onboarding/onboarding.routes.js#L107-L120)
- **Problem**: When a user selected known skills in onboarding step 3, the backend created `UserSkill` records with `masteryScore: 50.0` and `confidenceScore: 50.0`.
- **User Impact**: A learner who simply checks "JavaScript" immediately has a fabricated 50% mastery score displayed on their dashboard and progress page before answering a single question or completing a single lesson.
- **Fix**: Self-reported skills in onboarding must be stored as baseline profile exposure or interest, not verified mastery. `UserSkill.masteryScore` must start at 0 until verified by assessment or practice evidence.

### Finding 2: Overconfident Diagnostic Assessment Mastery (100% on 1 Question)
- **Location**: [`apps/backend/src/modules/assessments/assessments.service.js`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/assessments/assessments.service.js#L139-L160)
- **Problem**: Diagnostic questions computed `accuracy = outcome.correct / outcome.total` and directly set `masteryScore = accuracy * 100` and `confidenceScore = 100`.
- **User Impact**: Answering a single introductory question correctly leaped the concept to 100% mastery and 100% confidence, skipping lessons entirely based on fragile evidence.
- **Fix**: Diagnostic results should calibrate an initial baseline (e.g., 40-50% for correct answers, indicating familiarity without claiming complete mastery; 0-15% for incorrect answers, indicating need for instruction).

### Finding 3: Hardcoded Event Loop Slug Fallback in Frontend UI
- **Location**: [`apps/frontend/src/app/today/page.tsx`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/today/page.tsx#L111) and [`apps/frontend/src/app/assessment/page.tsx`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/assessment/page.tsx#L115)
- **Problem**: Both pages included `const targetSlug = ... || 'mastering-the-javascript-event-loop';`.
- **User Impact**: If a concept's lesson was unavailable or in review, the UI silently routed the learner to the JavaScript Event Loop lesson, contradicting their chosen track (e.g., PostgreSQL or System Design).
- **Fix**: Remove the fallback slug. If `act.lessonSlug` is null or `actionType === 'CONTENT_UNAVAILABLE'`, display an honest "Curriculum Module in Preparation" state and disable the start button.

### Finding 4: Mandatory Diagnostic Assessment Without Low-Friction Skip
- **Location**: [`apps/frontend/src/app/onboarding/page.tsx`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/onboarding/page.tsx#L112)
- **Problem**: Step 3 forced the learner directly to `/assessment` without an option to skip to daily learning. On `/assessment`, there was no "Skip for now" control.
- **User Impact**: Learners looking for a 60–90 second setup were forced into an unexpected multi-question test.
- **Fix**: Provide a prominent "Start Learning Today" primary option, with an optional "Take 2-Minute Diagnostic" secondary option. On the diagnostic page, provide an explicit "Skip & Go to Today's Learning" button.

### Finding 5: Onboarding Completion Did Not Trigger Immediate Roadmap Generation
- **Location**: [`apps/backend/src/modules/onboarding/onboarding.routes.js`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/onboarding/onboarding.routes.js#L135-L150)
- **Problem**: `POST /onboarding/complete` only marked `onboardingCompleted: true` in `UserProfile` without initializing the version 1 roadmap.
- **User Impact**: The initial roadmap was deferred until the user visited `/today`, causing an extra delay and potential race conditions.
- **Fix**: Call `RoadmapService.generateRoadmap(req.user.id)` inside `onboarding/complete` and return the initialized roadmap and first recommended milestone in the completion response.

### Finding 6: Experience Level Did Not Differentiate Initial Starting Point in Deterministic Fallback
- **Location**: [`apps/backend/src/modules/learning-paths/roadmap.service.js`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/learning-paths/roadmap.service.js)
- **Problem**: When Gemini was unconfigured, topological sort ordered concepts solely by catalogue `orderIndex`, ignoring `experienceLevel = 'ADVANCED'` or `'INTERMEDIATE'`.
- **User Impact**: An experienced software engineer was forced to start at the absolute beginner concept even if their target role was System Design or Backend Architecture.
- **Fix**: In deterministic roadmap planning, calibrate initial concept candidate sequence by learner experience level: beginners start at foundational difficulty 1; intermediate/advanced learners with prerequisite readiness start at intermediate concepts while respecting DAG constraints.

---

## 4. Remediation Plan

1. **Backend Onboarding Route Fix**:
   - Eliminate synthetic 50% mastery in `onboarding.routes.js`.
   - Initialize roadmap version 1 inside `POST /onboarding/complete`.
2. **Diagnostic Assessment Calibrated Scoring**:
   - Update `assessments.service.js` to assign calibrated baseline scores (45% for correct, 10% for incorrect) rather than binary 0% / 100%.
3. **Frontend Slug Fallback Removal**:
   - Remove `'mastering-the-javascript-event-loop'` fallbacks in `today/page.tsx` and `assessment/page.tsx`.
   - Add honest unavailable state.
4. **Onboarding UX Streamlining (60-90s Flow)**:
   - Modernize `onboarding/page.tsx` with focused 3 steps, 10/15/20 min options, and optional diagnostic skip.
   - Add skip button on `assessment/page.tsx`.
5. **Deterministic Experience-Aware Path Ordering**:
   - Enhance `roadmap.service.js` so that `experienceLevel` calibrates candidate sequence without violating prerequisite DAG rules.
6. **Automated Verification**:
   - Implement `apps/backend/tests/onboarding-alignment.test.js` validating all 7 scenarios in Phase E.

---

## 5. Verification & Remediation Results

### Files Changed & Rationale
1. [`apps/backend/src/modules/onboarding/onboarding.routes.js`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/onboarding/onboarding.routes.js):
   - Eliminated synthetic 50% `masteryScore` in `UserSkill`.
   - Connected `RoadmapService.generateRoadmap` directly to `POST /onboarding/complete`.
2. [`apps/backend/src/modules/assessments/assessments.service.js`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/assessments/assessments.service.js):
   - Calibrated diagnostic assessment scoring to 45% (correct) / 10% (incorrect), preventing overconfident 100% mastery leaps.
3. [`apps/backend/src/modules/learning-paths/roadmap.service.js`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/learning-paths/roadmap.service.js):
   - Added experience-aware topological sorting respecting DAG prerequisites.
   - Included `knownSkills` in prompt context for Gemini pedagogical planner.
4. [`apps/backend/src/modules/recommendations/adaptive-engine.js`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/src/modules/recommendations/adaptive-engine.js):
   - Updated roadmap traversal to fetch items in sequence order and select the first unmastered concept (`masteryScore < 70`), correctly advancing learners as milestones are conquered.
5. [`apps/frontend/src/app/onboarding/page.tsx`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/onboarding/page.tsx):
   - Streamlined into a 60–90s flow with 10/15/20 min daily time options.
   - Added dual launch controls: Primary "Start Daily Learning" (direct to `/today`) and Secondary "Quick Diagnostic (2 min)".
6. [`apps/frontend/src/app/today/page.tsx`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/today/page.tsx):
   - Removed hardcoded Event Loop fallback slug.
   - Added explicit `CONTENT_UNAVAILABLE` state with disabled start button and editorial review notice.
7. [`apps/frontend/src/app/assessment/page.tsx`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/frontend/src/app/assessment/page.tsx):
   - Removed fallback slug.
   - Added header "Skip for now &rarr;" button to prevent learners from being trapped in diagnostics.
8. [`apps/backend/tests/onboarding-alignment.test.js`](file:///Users/yashgupta/Desktop/me/ai-learning-companion/apps/backend/tests/onboarding-alignment.test.js):
   - Added 7 comprehensive automated tests validating Phase E scenarios.

### Test Execution Results
- **Backend Test Suite**: 8 test suites passed, 48/48 tests passed (including all 7 onboarding alignment scenarios).
- **Frontend Production Build**: `npm run build` succeeded with exit code 0; all 17 routes compiled and generated cleanly.
- **Database Safety**: Zero destructive operations executed; zero learner progress wiped. Database schema models (`LearningPath`, `UserConcept`, `UserSkill`, `Streak`) maintained full referential integrity.
