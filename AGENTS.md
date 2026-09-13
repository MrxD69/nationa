# Nationa — agent doctrine

## Prime directive

SPEED. Ship max functional surface fast for investor pitch. Correctness + beautiful UX matter. Deep robustness not.

## Runtime (never violate)

`pnpm dev:local` ALWAYS running (Nuxt web :3001, Hono API :3000).
NEVER run: `pnpm build`, `pnpm check-types`, `pnpm typecheck`, `pnpm test*`, `pnpm check`, `oxlint`, `oxfmt`, `pnpm install`, `turbo run *`, migrations, any verify/CI command.
User tests the running app manually and flags issues. Never ask to run them. Only read-only/local commands allowed.

## No review, ever

`reviewer` agent disabled. Never spawn it. No review at plan, architect, or build stage. A workstream is DONE when its builder reports `## END-OF-REPORT` with criteria met.

## Max parallelism (mandatory)

Partition every plan into independent workstreams by file/dir/section, ZERO file overlap. Spawn many subagents in ONE message, parallel waves. Dependents wait only on real prerequisites. Track waves with todowrite. Never serialize work that can run concurrently.

## Hard gates

Downstream workstreams start ONLY after prerequisites report done. No partial handoff on a broken foundation — halt and re-delegate instead of proceeding.

## Product quality

UI/UX beautiful, responsive, thoughtful on mobile AND desktop. Tailwind + Nuxt UI patterns. Clear to non-technical tester: obvious labels, no dead ends, self-explanatory flows. Happy-path functionality works end-to-end. NO deep error handling — minimal obvious guards only; explicitly cut edge cases.

## Clarity

Specs, delegation prompts, reports explicit + unambiguous: exact file paths, shapes, criteria. Zero fluff.

## Git guardrails

FORBIDDEN unless user asked in current message: git reset/restore/checkout --/clean -fd/stash/rebase/commit/push/add -A, any full-repo restore. Read-only allowed: git status --short, git diff --stat, git log --oneline -10, git branch --show-current. Touch only files assigned in prompt; never clobber parallel work.
