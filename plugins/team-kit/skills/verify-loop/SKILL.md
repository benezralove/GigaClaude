---
name: verify-loop
description: "Use when setting up or running a project's verification loop — tests, static analysis, linting, or typechecking. Triggers on 'set up tests', 'add static analysis', 'add the verify loop', 'check this project', or /verify-loop. Detects project type (Laravel/PHP via composer.json → Larastan + Pint + Pest/PHPUnit; Next/TS via package.json → Vitest + Playwright + tsc + ESLint), installs the toolchain locally, drops in canonical configs from templates, and wires a single `check` command."
---

# /verify-loop

Set up and run a consistent verification loop for any project: format-check, static analysis, typecheck, and tests, all behind a single `check` command. The toolchain installs **per-project (local, version-pinned)** — never global — but the recipe and configs are reused from this skill, so every repo converges on the same gate.

## Why this exists

The fast path for AI-assisted coding is a feedback loop the agent can run unattended: static analysis + tests that surface errors before a human looks. This skill makes that loop identical across every repo without globally installing anything (which causes version drift and breaks CI/fresh-clones). Package-manager caches already share the *downloads*; this skill shares the *setup*.

## Usage

```
/verify-loop            # detect project type, set up the loop, wire `check`
/verify-loop run        # just run the existing `check` gate
/verify-loop setup      # force (re)install + config, even if partially present
```

## Step 1 — Detect project type

Look at the current directory (and the target repo if one was named):

- `composer.json` present → **PHP path**. If `laravel/framework` is in `require` → Laravel (Larastan + Pint + artisan/Pest). Else plain PHP (PHPStan + PHPUnit/Pest).
- `package.json` present → **JS/TS path**. If `typescript` is in devDependencies → add `tsc --noEmit`. Detect framework (`next`, `react`, `vue`) to pick the test environment.
- Both present (e.g. a Laravel app with a Vite/JS build) → set up both, but the primary `check` is the backend one; wire the JS `check` too only if there's real frontend code (`resources/js`, components).

Never impose a UI system. If the repo uses Bootstrap, keep Bootstrap — do not add Tailwind/shadcn.

## Step 2 — Install the toolchain (LOCAL, pinned)

**PHP / Laravel:**
```bash
composer require --dev larastan/larastan --no-interaction      # static analysis (Laravel-aware)
composer require --dev laravel/pint --no-interaction           # formatter (often already present)
# tests: Pest is nicer but optional — PHPUnit already ships with Laravel
composer require --dev pestphp/pest pestphp/pest-plugin-laravel --with-all-dependencies --no-interaction
```

**JS / TS:**
```bash
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vite-tsconfig-paths
npm i -D @playwright/test
npx playwright install     # browsers (machine-wide cache, shared across projects)
```
Use whatever package manager the repo already uses (`npm`, `bun`, `pnpm`) — check the lockfile. Installs may prompt; that's fine (they're occasional). Only the `check`/`test` runners are on the global allowlist.

## Step 3 — Drop in configs from templates

Copy from `~/.claude/skills/verify-loop/templates/` into the repo, adapting paths/ports:

| Template | Goes to | Adapt |
|---|---|---|
| `phpstan.neon` | repo root | `paths` (app, plus database/routes if used); `level` |
| `vitest.config.ts` | repo root | `exclude` dirs |
| `vitest.setup.ts` | repo root | — |
| `playwright.config.ts` | repo root | `baseURL` port to match the repo's dev script |

For an **existing** PHP codebase, run `vendor/bin/phpstan analyse` once; if it floods, generate a baseline so new code is checked but legacy issues don't block:
```bash
vendor/bin/phpstan analyse --generate-baseline
```
Then raise `level` over time.

## Step 4 — Wire the single `check` command

**PHP** — add to `composer.json` scripts:
```json
"check": [
    "vendor/bin/pint --test",
    "vendor/bin/phpstan analyse",
    "@php artisan test"
]
```
**JS/TS** — add to `package.json` scripts (adjust `lint` to the repo's existing one; use `bun run`/`pnpm` if that's the manager):
```json
"typecheck": "tsc --noEmit",
"test": "vitest run",
"test:e2e": "playwright test",
"check": "npm run typecheck && npm run lint && npm run test"
```

## Step 5 — Run it once and report

Run `composer check` (PHP) or `npm run check` (JS). Report the baseline: what passes, what's flagged, and the phpstan level / baseline status. That `check` is the gate for all future work in the repo.

## Notes

- **Local, not global.** Never `composer global require` / `npm i -g` these tools. Per-project pinning keeps repos reproducible; the caches already dedupe downloads.
- **Respect what's there.** Don't replace an existing test runner, lint config, or UI framework — extend it.
- Pairs with the global CLAUDE.md "Verify loop" rule: `check` is the verification gate to run before declaring work done.
