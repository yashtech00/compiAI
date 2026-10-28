# Unified Editorial UI Design

## Intent

Refresh the entire AI Learning Companion—learner surfaces and the admin console—around the supplied reference: high-contrast black typography, generous editorial whitespace, off-white surfaces, and an acid-lime signal color. The outcome should feel like one confident learning product rather than a lime landing page alongside a purple dashboard and a separate administration system.

## Goals

- Establish a single accessible visual token system for light and dark modes.
- Make the learner's next action, current mastery, and review priority easy to scan.
- Give lessons a focused, low-distraction reading and practice environment.
- Make administrative data, content workflows, and system health dense but readable.
- Preserve all existing routes, behavior, data fetching, authentication, and responsive support.

## Non-goals

- No backend, database, API, or learning-engine changes.
- No replacement of the existing information architecture or route structure.
- No gratuitous animation, gradients, or decorative imagery that competes with course material.

## Chosen approach

### Unified editorial system (chosen)

Use one shared design language with role-appropriate density. Primary surfaces are warm white or near-black; acid lime is reserved for meaningful emphasis such as primary actions, active states, verified mastery, and progress. Learner screens use open spacing and a single clear action; admin screens use tighter tables, filters, and analytical panels while retaining the same tokens, typography, and component geometry.

### Alternatives considered

1. Role-specific themes: visually separate learner and admin experiences. Rejected because it continues the current fragmented product feel.
2. Minimal token-only reskin: quickest path, but leaves hierarchy, card density, and task clarity unchanged.

## Visual foundations

- **Ink:** `#111111` for high-focus surfaces and headline text.
- **Canvas:** `#F8F8F4` / white for working surfaces.
- **Lime signal:** `#D8FF19` (with a darker accessible text/outline companion) for action and mastery.
- **Neutrals:** warm gray scale for borders and secondary copy; avoid the existing purple-first palette.
- **Success/info/attention:** restrained green, blue, and amber semantic tokens that remain distinguishable from the brand lime.
- **Typography:** use the installed Geist and Geist Mono fonts; oversized, tight headline scale; mono for metrics, tags, levels, and code-adjacent labels.
- **Shape:** 12–20px card radii, thin black/neutral borders, soft but purposeful shadows; rounded pills only for status and filters.
- **Motion:** brief opacity/translate transitions for navigation, cards, and progress; respect reduced-motion preferences.

## Experience changes

### Shared primitives

- Rework `Button`, `Card`, `Badge`, and `ProgressBar` around the token system, with explicit primary, secondary, quiet, destructive, success, and loading/disabled states.
- Add shared page headers, stat/metric tiles, empty states, table/filter treatments, and mobile-safe action placement where repeated markup currently diverges.
- Replace one-off fixed colors with semantic variables or Tailwind aliases.

### Learner product

- **Marketing/landing:** retain the existing story but make lime the purposeful signal, not a pervasive background; use asymmetric editorial composition and real-time mastery cards inspired by the reference.
- **Dashboard/today/progress/roadmap:** promote one next-learning action, a concise mastery snapshot, recent work, reviews due, and streak/context signals. Reduce decorative competition between cards.
- **Lessons and tutor:** create a high-focus dark study shell with readable content width, clear stage progression, visible completion state, and an unobtrusive AI tutor entry point.
- **Onboarding, assessment, auth, subscription, recall:** use step framing, visible progress, clear decision language, and mobile-first form controls.

### Admin console

- Use an ink sidebar/shell with a light data workspace, lime selection and success states, and consistent sectional headers.
- Standardize analytics cards, tables, filters, destructive actions, roadmap/content editors, system-status views, and student detail screens.
- Make operational priority and state obvious through typography and semantic status—not color alone.
- Include the public marketing, authentication, and admin-login routes, so every entry point belongs to the same product.

## Implementation boundaries

- Start by inventorying existing global styles, Tailwind tokens, shared primitives, learner shell, dashboard shell, and admin layout.
- Consolidate tokens and primitives before touching route-level layouts.
- Migrate screens in this order: shared foundations → global/navigation shells → learner dashboard and lesson player → remaining learner flows → admin shell and pages.
- Keep the lesson workspace dark in either app theme; respect the user theme elsewhere.
- Give charts explicit roles: lime only for the selected/key series, semantic comparison colors plus labels, tooltips, or patterns for other series.
- Preserve current component APIs where possible and use transitional token aliases while route-local colors are migrated.
- Verify keyboard focus, text contrast, form states, tables, mobile breakpoints, dark mode, and build/type checks after each layer.

## Acceptance criteria

- Every current learner and admin route renders with the shared black/white/lime system; no purple dashboard palette remains.
- Primary actions, selected navigation, completion/mastery, warning, and destructive states are recognizable without relying solely on color.
- Learner core routes and admin core routes are usable on mobile and desktop.
- Existing user flows and API behavior remain intact.
- `npm run build:frontend` passes, alongside the relevant existing tests/lint/type checks available in the repository.

## Open implementation calls

- Preserve current application functionality while replacing presentation incrementally.
- Treat the user’s supplied reference as directional inspiration, not a pixel-for-pixel source.
- Do not introduce a new UI framework unless an implementation constraint makes it necessary; build on Next.js, Tailwind, and existing Lucide/Recharts usage.
