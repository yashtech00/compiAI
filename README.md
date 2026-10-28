# AI Learning Companion

> **"Tell me what you want to become. I'll tell you what to learn today."**

A personalized microlearning platform designed for aspiring and working software engineers. Rather than requiring learners to navigate static courses, AI Learning Companion continuously determines what to learn next based on engineering target roles, baseline diagnostic mastery, prerequisite graphs, learning history, and spaced repetition.

---

## Architecture & Technology Stack

### Monorepo Structure

```text
├── apps/
│   ├── backend/          # Node.js + Express (ES Modules) + Prisma ORM + Vitest
│   └── frontend/         # Next.js 14 App Router + TypeScript + Tailwind CSS + TanStack Query + Recharts
├── docs/                 # PRD, ERD, DFD, and Architecture Reference
├── docker-compose.yml    # Persistent PostgreSQL 16 container with healthchecks
├── package.json          # Root monorepo workspace scripts
└── .env.example          # Documented environment configuration
```

### Backend (`apps/backend`)
- **Runtime & Framework:** Node.js (v20+ / ES Modules `"type": "module"`) with Express.js.
- **Database & ORM:** PostgreSQL running in Docker, managed through Prisma ORM 5 with strict migrations and relations.
- **Authentication:** bcrypt password hashing + JWT session tokens stored in secure, HTTP-only cookies (with Bearer header support).
- **Validation & Security:** Zod schema validation, centralized error handling, request ID tracing, structured logging, and rate-limiting on sensitive endpoints.
- **Testing:** Vitest with Supertest testing unit paths, authorization, and the end-to-end learning lifecycle.

### Frontend (`apps/frontend`)
- **Framework:** Next.js 14 App Router with TypeScript.
- **Styling & Aesthetics:** Tailored dark slate design system with Tailwind CSS, custom badges, progress bars, and Lucide icons.
- **Data & State Management:** TanStack React Query for server-state caching, React Hook Form, and modular Context for session state.
- **Visualizations:** Recharts for weekly learning activity time distributions and skill mastery metrics.

---

## Core Product Capabilities

1. **Multi-Step Onboarding & Resumption:** Collects target engineering roles, experience levels, daily availability, and prior technology exposure with persistent partial saving.
2. **Deterministic Diagnostic Assessment:** Evaluates baseline knowledge without exposing answer keys. Calculates skill/concept baseline scores and flags strong concepts vs. growth areas.
3. **Graph-Driven Personalized Roadmap:** Computes an explainable sequence using topological sorting over prerequisite relationships. Ensures foundational topics (e.g. Call Stack, Key-Value TTLs) are mastered before advanced concepts (Event Loop starvation, Cache Invalidation).
4. **"Today's Learning" Dashboard:** Highlights one clear primary call to action, estimated duration, streak tracking, and review alerts.
5. **Interactive Microlearning Player:** Structured 10–15 minute daily sessions combining recall questions, concept explanations, interactive code examples, quizzes, and explain-back synthesis.
6. **AI Socratic Tutor & Explain-Back:** Contextualized tutor that prompts deeper thinking rather than flat answers. Automated rubric evaluating technical accuracy, completeness, clarity, and misconceptions.
7. **Spaced Repetition Scheduler:** Automatically schedules review intervals (1, 3, 6, 12+ days) based on quiz and recall ratings to counteract knowledge decay.
8. **Gamification & Anti-Duplication:** Idempotent XP transactions prevent reward exploitation while streaks and milestones track real progress.
9. **Role-Based Admin Console & DAG Validation:** Admin panel featuring cycle-detection algorithms (DFS) to verify prerequisite graphs remain Directed Acyclic Graphs (DAGs).

---

## Getting Started Locally

### Prerequisites
- Node.js (v20 or v22+)
- Docker & Docker Compose

### 1. Environment Configuration
Copy `.env.example` to `.env` in the root directory (and `apps/backend/.env`):
```bash
cp .env.example .env
cp .env.example apps/backend/.env
```

### 2. Start PostgreSQL via Docker
```bash
npm run db:up
```
*Note: Runs PostgreSQL 16 on port `5433` with a persistent Docker volume and healthcheck.*

### 3. Run Prisma Migrations and Seed
```bash
npm run db:migrate
npm run db:seed
```
*Seeds subscription plans, achievements, target engineering roles, 13 core skills, concepts, prerequisites, diagnostic assessments, curated lessons, and the admin account.*

### 4. Run Development Servers
In separate terminals or using the root commands:
```bash
# Start backend (runs on http://localhost:5001 with nodemon)
npm run dev:backend

# Start frontend (runs on http://localhost:3000)
npm run dev:frontend
```

### 5. Running Automated Tests
```bash
npm run test
```
Executes all 13 comprehensive integration and unit tests covering healthchecks, authentication, onboarding, assessment scoring, roadmap generation, quiz engine, spaced repetition, and admin authorization.

### 6. Production Frontend Build
```bash
npm run build:frontend
```

---

## Seed Accounts

- **Admin Account:**
  - Email: `admin@companion.ai`
  - Password: `AdminSecurePass123!`
  - Access: Access to `/admin` curriculum management and DAG cycle verification.
- **Learners:**
  - Create any new learner account at `/signup` to walk through the multi-step onboarding wizard and diagnostic assessment!
