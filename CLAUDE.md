# CLAUDE.md

Guidance for Claude (and anyone else) working in this repo. `README.md` covers how to run things. This file covers how the code is organised and how changes should be made.

## What this is

Rhomboulds Arcade is an online games portal at a very early stage. Right now it is a single static landing page: a header, an empty "Games" placeholder, and a footer status indicator backed by `/health.json`. **There are no games yet. Don't add any unless the task asks for one.**

## Architecture

- **Static site, no framework.** Plain HTML, CSS and ES modules. Vite runs the dev server and builds into `dist/`. There is no backend.
- `index.html`: the only page. Markup lives here, not in JS.
- `src/main.js`: the entry point. It only wires the DOM to logic in other modules.
- `src/status.js`: fetches and describes the health check. Logic is kept out of the DOM so it can be tested.
- `src/health.js`: builds the health payload. It's pure, so the Vite plugin and the tests can both import it.
- `src/style.css`: all styles. Colours are CSS variables on `:root`, with dark-mode overrides.
- `vite.config.js`: Vite config, plus the `arcade-health` plugin. The plugin serves `/health` and `/health.json` in dev and preview, and writes `dist/health.json` at build time.
- `scripts/`: Node-only repo tooling. Currently the PR risk checker: `risk-rules.js` (pure logic) and `risk-check.js` (the command-line wrapper).
- `tests/`: Vitest unit tests, named `<module>.test.js`.
- `.github/workflows/`:
  - `ci.yml` runs lint, test, build and a health-check verification on PRs and pushes to `main`. This is the merge gate.
  - `pr-review.yml` runs the risk checker on PRs. It's advisory and never fails.

### The health contract

`/health.json` must keep returning `{ "status": "ok", "name", "version", "mode", "builtAt" }`. Deploy checks and CI depend on it. Adding fields is fine. Renaming or removing fields, or changing what `status` means, is a breaking change: call it out in the PR.

## Coding conventions

- ES modules everywhere (`"type": "module"`). Use named exports.
- 2-space indentation, single quotes, semicolons, trailing commas in multi-line literals. Keep lines under about 120 characters. Match the surrounding code.
- Keep logic in small pure functions and push I/O (DOM, `fetch`, `fs`, `git`) to the edges. Pass dependencies such as `fetch` in as parameters so tests don't need globals or a browser.
- Browser code goes in `src/`. Node-only code goes in `scripts/` or `*.config.js`. ESLint applies matching globals per folder (`eslint.config.js`).
- Comments explain *why*, not *what*. Add a short JSDoc block to exported functions whose shape isn't obvious.
- **Dependencies:** avoid adding them. Prefer the platform and Node built-ins. If one is truly needed, use a dev dependency where possible, commit the updated `package-lock.json`, and say why in the PR.
- Accessibility basics: semantic elements, `aria-*` only where semantics fall short, and text for every status shown by colour.

## Testing expectations

- `npm test` must pass. New or changed logic in `src/` or `scripts/` gets unit tests in `tests/`.
- Test behaviour through public exports, not internals. Cover the failure paths too (look at how `status.test.js` handles HTTP errors, bad payloads and thrown errors).
- No `.only` or `.skip` in committed tests. Don't delete or weaken a test to make it pass. Fix the code, or explain in the PR why the expected behaviour changed.
- Tests must be deterministic: no real network, no dependence on the current time (inject dates, as `buildHealthPayload` does), no reliance on test order.
- Before saying work is done, run **`npm run ci`** (lint, test, build). That's what CI runs.

## Rules for making changes

1. **Stay in scope.** Do only what the task asks. No drive-by refactors, renames, reformatting or "while I'm here" features. If you spot something else worth fixing, mention it instead of changing it.
2. **Update tests with the code.** Behaviour changes update the tests in the same change.
3. **Update docs with the code.** If a command, script, file layout or the health contract changes, update `README.md` and this file.
4. **Don't weaken the guardrails.** Don't loosen ESLint rules, add `eslint-disable`, skip CI steps, or broaden workflow `permissions` unless the task is specifically about that, and explain it if you do.
5. **Keep CI deterministic.** Actions are pinned to full commit SHAs with a `# vX.Y.Z` comment, the runner image is pinned, and Node comes from `.nvmrc`. Keep it that way when editing workflows.
6. **Lockfile:** install with `npm ci`. Only change `package-lock.json` through `npm install <pkg>`. Never edit it by hand.
7. **Git:** don't commit, push, open PRs or change branches unless asked. Never commit to `main` directly. Use a branch and a PR.
8. **Report honestly.** If something fails or you skipped a step, say so and include the output.

## PR risk check

`pr-review.yml` runs `node scripts/risk-check.js` on every PR. It posts warnings (annotations plus a job summary) when a PR:

- touches CI, dependencies, build/lint config or the health check
- adds `.only`/`.skip` or `eslint-disable`
- adds workflow write permissions or `pull_request_target`
- deletes a test file
- changes `src/` without touching `tests/`
- changes more than 500 lines

To run it locally against `main`, use `npm run risk` (or `node scripts/risk-check.js <base-ref>`). New rules go in `scripts/risk-rules.js`, with a test in `tests/risk-rules.test.js`.
