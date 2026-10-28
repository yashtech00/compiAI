# Unified Editorial UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework every public, learner, and administrative screen into one accessible black/white/acid-lime editorial design system without changing product behavior.

**Architecture:** Replace fixed route-local palette values progressively with shared semantic CSS/Tailwind tokens and strengthen the current primitives before migrating shells and route layouts. Keep existing Next.js routes, API calls, data wiring, Lucide icons, and Recharts data intact; compose the learner and admin variants from the same foundations with different spacing and density.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS 3, Lucide React, Recharts, Framer Motion.

**Spec:** `docs/superpowers/specs/2026-10-27-unified-editorial-ui-design.md`

## Global Constraints

- Preserve current route paths, authentication, API behavior, data wiring, and responsive support.
- Use `#111111` ink, `#F8F8F4`/white canvas, and `#D8FF19` lime only as an emphasis signal; never use lime text where contrast is insufficient.
- Retain Geist and Geist Mono; use mono for metrics, tags, levels, and code-adjacent metadata.
- Preserve a permanently dark lesson workspace while other chrome respects light/dark theme.
- Use semantic status tokens and labels/icons; charts must not convey state by color alone.
- Do not introduce a UI framework or new production dependency.
- Preserve the user’s existing uncommitted work; never overwrite unrelated source changes.

## Review Focus

- Keyboard-only navigation: focus rings remain visible in light, dark, lime, and dark-lesson surfaces.
- Color contrast: lime is never the only readable text treatment or the only way to identify status.
- Narrow layouts: sidebar, data tables, dashboard cards, and lesson stages remain usable below the desktop breakpoint.
- App behavior: restyling cannot change form submission, route transitions, loading/error states, or API data rendering.
- Theme boundaries: the lesson player stays dark while public, learner, and admin pages follow the selected app theme.

## File Structure

- `apps/frontend/src/app/globals.css` — global semantic tokens, base typography, focus, selection, motion, and educational-content styling.
- `apps/frontend/tailwind.config.ts` — Tailwind aliases for the semantic system and legacy migration compatibility.
- `apps/frontend/src/components/ui/{Button,Card,Badge,ProgressBar}.tsx` — shared primitive variants and interactive states.
- `apps/frontend/src/components/layout/Navbar.tsx`, `apps/frontend/src/components/dashboard/{DashboardShell,Sidebar,Topbar}.tsx`, `apps/frontend/src/app/admin/layout.tsx` — learner/admin navigation and shell hierarchy.
- `apps/frontend/src/components/{hero,landing}/**` and `apps/frontend/src/app/page.tsx` — public marketing experience.
- `apps/frontend/src/app/{today,progress,roadmap,my-learning,recall,onboarding,assessment,subscription}/page.tsx` plus `apps/frontend/src/app/(auth)/**/page.tsx` — learner workflows.
- `apps/frontend/src/app/lessons/[slug]/page.tsx` and `apps/frontend/src/components/{lessons,tutor}/**` — dark study workspace and stage views.
- `apps/frontend/src/app/admin/**/page.tsx` — data-dense administrative pages and status/analytics treatments.

### Task 1: Establish semantic foundations and upgrade primitives

**Files:**
- Modify: `apps/frontend/src/app/globals.css`, `apps/frontend/tailwind.config.ts`
- Modify: `apps/frontend/src/components/ui/Button.tsx`, `apps/frontend/src/components/ui/Card.tsx`, `apps/frontend/src/components/ui/Badge.tsx`, `apps/frontend/src/components/ui/ProgressBar.tsx`

**Interfaces:**
- Consumes: Existing primitive props and `ThemeContext` class-based theme behavior.
- Produces: Backward-compatible primitive variants and shared `brand`, `surface`, `ink`, `signal`, and semantic utility aliases.

- [ ] **Step 1: Record baseline frontend checks and the visual state of primary/disabled buttons, cards, badges, progress, and focus treatments**

Run: `npm run lint --workspace=frontend && npm run build:frontend`
Expected: Capture existing failures before edits; if a command fails, distinguish baseline failures from redesign regressions.

- [ ] **Step 2: Define the semantic light/dark token scale and reduced-motion/focus rules in `globals.css`**

Use the exact ink, canvas, lime, neutral, semantic status, and dark-study roles in the spec; retain existing markdown/content selectors but route their color values through the new roles.

- [ ] **Step 3: Extend `tailwind.config.ts` and migrate the four shared primitives without changing their public props**

Keep `Button` variants (`primary`, `secondary`, `outline`, `ghost`, `danger`), `Card.hoverEffect`, and existing badge/progress inputs. Add only compatible aliases/variants needed by callers.

- [ ] **Step 4: Verify shared-state regression coverage**

Run: `npm run lint --workspace=frontend && npm run build:frontend`
Expected: PASS; manually keyboard-test primary, disabled, danger, and dark-surface primitive states at desktop and mobile widths.

### Task 2: Redesign global, learner, and admin navigation shells

**Files:**
- Modify: `apps/frontend/src/app/layout.tsx`, `apps/frontend/src/components/layout/Navbar.tsx`
- Modify: `apps/frontend/src/components/dashboard/DashboardShell.tsx`, `apps/frontend/src/components/dashboard/Sidebar.tsx`, `apps/frontend/src/components/dashboard/Topbar.tsx`
- Modify: `apps/frontend/src/app/admin/layout.tsx`

**Interfaces:**
- Consumes: Task 1 primitives/tokens and existing route/link/auth interfaces.
- Produces: Responsive learner and admin shells with consistent selected, hover, compact, mobile-menu, and sign-out states.

- [ ] **Step 1: Inventory every existing navigation destination and authenticated state before layout edits**

Check: Learner nav, dashboard nav, admin nav, mobile menu, admin unauthenticated view, and sign-out affordance retain their current href/action.

- [ ] **Step 2: Implement the shared editorial shell treatment and preserve responsive navigation behavior**

Give learner chrome warm, open surfaces and admin chrome an ink rail/light work area. Keep ARIA labels, auth branches, `usePathname`, and mobile sidebar state unchanged.

- [ ] **Step 3: Verify route and accessibility behavior through the shells**

Run: `npm run lint --workspace=frontend && npm run build:frontend`
Expected: PASS; check selected navigation, focus order, mobile drawer dismissal, and unauthorized admin route rendering.

### Task 3: Migrate the public and learner workflow surfaces

**Files:**
- Modify: `apps/frontend/src/app/page.tsx`, `apps/frontend/src/components/hero/**`, `apps/frontend/src/components/landing/**`
- Modify: `apps/frontend/src/app/(auth)/**/page.tsx`, `apps/frontend/src/app/onboarding/page.tsx`, `apps/frontend/src/app/assessment/page.tsx`
- Modify: `apps/frontend/src/app/today/page.tsx`, `apps/frontend/src/app/progress/page.tsx`, `apps/frontend/src/app/roadmap/page.tsx`, `apps/frontend/src/app/my-learning/page.tsx`, `apps/frontend/src/app/recall/page.tsx`, `apps/frontend/src/app/subscription/page.tsx`

**Interfaces:**
- Consumes: Task 1 tokens/primitives and Task 2 shared shells.
- Produces: A consistent public funnel and action-led learner experience without changing data/API contracts.

- [ ] **Step 1: Preserve existing loading, empty, error, completed, and selected state branches while identifying fixed blue/purple/gradient treatments to replace**

Check: Every conditional branch that displays learning data, form state, or billing/review status remains present after conversion.

- [ ] **Step 2: Recompose marketing, authentication, onboarding, and assessment around editorial hierarchy**

Use oversized ink headlines, lime as signal, bordered cards, visible task progression, and accessible form selection states. Do not alter form names, handlers, or submission behavior.

- [ ] **Step 3: Recompose today, progress, roadmap, learning history, recall, and subscription views around one primary action and scannable mastery context**

Maintain existing API loading and links. Use lime for mastered/active emphasis only and ensure all charts/status chips have text or icon support.

- [ ] **Step 4: Verify learner-flow regression coverage**

Run: `npm run lint --workspace=frontend && npm run build:frontend`
Expected: PASS; manually verify public-to-signup, onboarding selection, assessment state, review due, empty history, and subscription status at 375px and desktop.

### Task 4: Create the permanent dark lesson and tutor workspace

**Files:**
- Modify: `apps/frontend/src/app/lessons/[slug]/page.tsx`
- Modify: `apps/frontend/src/components/lessons/**`, `apps/frontend/src/components/tutor/AiTutorDrawer.tsx`, `apps/frontend/src/components/visualizations/ConceptVisualizer.tsx`

**Interfaces:**
- Consumes: Task 1 semantic status/primitive styles and existing lesson-stage props/data contracts.
- Produces: A dark, high-focus lesson shell whose progression, content, quiz, code, tutor, and completion states stay intact.

- [ ] **Step 1: Map all lesson stage renderers and terminal/loading/error branches before styling changes**

Check: Concept, architecture, code walkthrough, practical challenge, quiz, explain-back, summary, completion, tutor, and visualizer remain rendered through their existing stage contracts.

- [ ] **Step 2: Implement the dark study surface and stage hierarchy with accessible contrast**

Use the ink surface, near-white reading text, restrained lime verification/primary action, mono metadata, and semantic alert colors; do not follow global light/dark theme inside the study workspace.

- [ ] **Step 3: Verify lesson interaction states**

Run: `npm run lint --workspace=frontend && npm run build:frontend`
Expected: PASS; manually verify keyboard focus, code overflow, stage navigation, quiz feedback, tutor drawer, and completion on mobile and desktop.

### Task 5: Migrate all administrative pages to the editorial data workspace

**Files:**
- Modify: `apps/frontend/src/app/admin/login/page.tsx`, `apps/frontend/src/app/admin/page.tsx`
- Modify: `apps/frontend/src/app/admin/{analytics,adaptation,content,roadmaps,roles,settings,system}/page.tsx`
- Modify: `apps/frontend/src/app/admin/students/page.tsx`, `apps/frontend/src/app/admin/students/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 1 primitives and Task 2 admin shell.
- Produces: Dense, responsive admin overview, table, detail, filter, data visualization, and operational-status experiences with unchanged data behavior.

- [ ] **Step 1: Inventory admin data states and mutable/destructive actions before converting visual treatment**

Check: Tables, filters, chart legends/tooltips, loading/error/empty states, buttons, content actions, and student links keep their handlers and labels.

- [ ] **Step 2: Apply the light-data-workspace/ink-rail pattern across overview, intelligence, content, system, and settings screens**

Use tight layout rhythm, readable tables, visual grouping, explicit status text, and lime selected/key-series states. Do not encode destructive meaning in lime.

- [ ] **Step 3: Verify operational usability and responsive tables**

Run: `npm run lint --workspace=frontend && npm run build:frontend`
Expected: PASS; manually test admin login, authorization fallback, one table/filter page, one chart page, one detail page, and a narrow-screen overflow strategy.

### Task 6: Audit and complete the migration

**Files:**
- Modify: all changed frontend files from Tasks 1–5 only where audit findings require it.

**Interfaces:**
- Consumes: completed shared system and migrated routes.
- Produces: a complete product-level visual refresh with no legacy purple dashboard theme on active surfaces.

- [ ] **Step 1: Search for legacy palette usage and classify remaining instances**

Run: `rg -n "(purple|violet|indigo|#315EF7|#7C35D5|#8F4BE8|#6D5EF7)" apps/frontend/src`
Expected: Remaining matches are intentionally semantic or are migrated to new tokens; no dashboard/lesson/admin brand-purple treatment remains.

- [ ] **Step 2: Perform final automated verification**

Run: `npm run lint --workspace=frontend && npm run build:frontend`
Expected: PASS.

- [ ] **Step 3: Perform the final manual visual and interaction review**

Check: Public landing, auth, learner dashboard, onboarding/assessment, roadmap/progress, lesson/tutor, admin dashboard, table/detail, analytics, light/dark modes, 375px mobile, and desktop widths.

- [ ] **Step 4: Commit the verified redesign separately from pre-existing user work**

Use targeted `git add` paths only after confirming the diff excludes unrelated files. Commit message: `feat(frontend): unify editorial learning UI`.

## Self-review

- **Spec coverage:** Tasks 1–6 cover global tokens, shared controls, public/auth, learner, dark lesson/tutor, admin, responsive behavior, charts, and verification.
- **Step scan:** Every task has a baseline/inventory, a bounded implementation action, and an explicit command or behavioral verification.
- **Type consistency:** Existing component props, route interfaces, and auth/data contracts remain unchanged; no new public types are required.
- **Review focus:** The five listed interaction/visual risks are assigned to Tasks 1–5 and checked again in Task 6.
- **Proportion:** Route changes are grouped by shared UI surface to keep each increment reviewable while acknowledging the product-wide scope.
