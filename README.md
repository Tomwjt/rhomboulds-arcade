# Rhomboulds Arcade

An online games portal. It has a games hub and one game so far, **Tic-Tac-Toe** (two players, one screen). The hub's footer shows whether the build is healthy.

Built with [Vite](https://vite.dev) (dev server and bundler) and [Vitest](https://vitest.dev) (tests). Plain HTML, CSS and JavaScript, with no framework.

## Requirements

- Node.js 20.19 or newer. CI uses the version in `.nvmrc` (24), so `nvm use` matches it.
- npm

## Getting started

```sh
npm install
npm run dev
```

Open http://localhost:5173 for the hub, or go straight to http://localhost:5173/games/tic-tac-toe/. The hub's footer shows a status dot:

- **green**: `/health.json` responded with `"status": "ok"` (shows version, mode and build time)
- **red**: the health check failed (shows the reason)
- **grey**: still checking

## Scripts

| Command              | What it does                                         |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`        | Start the dev server with hot reload                 |
| `npm run lint`       | Lint all JavaScript with ESLint                      |
| `npm test`           | Run the test suite once                              |
| `npm run test:watch` | Run tests in watch mode                              |
| `npm run build`      | Build a production bundle into `dist/`               |
| `npm run preview`    | Serve the built `dist/` locally (http://localhost:4173) |
| `npm run ci`         | Lint, test and build: the same checks CI runs        |
| `npm run risk`       | Flag risky changes on your branch vs `origin/main`   |

## Health check

Every build writes `dist/health.json`:

```json
{
  "status": "ok",
  "name": "rhomboulds-arcade",
  "version": "0.1.0",
  "mode": "production",
  "builtAt": "2026-11-25T21:20:55.881Z"
}
```

Use it to confirm a build or deploy went out:

```sh
npm run build && npm run preview
curl http://localhost:4173/health
```

- In `dev` and `preview`, the payload is served at both `/health` and `/health.json`.
- In a static deployment, only `/health.json` exists, because it's a plain file in `dist/`. Point uptime checks there.
- `version` comes from `package.json`. `builtAt` is the build time (in dev, the time the server started).

The payload comes from a small Vite plugin in `vite.config.js`.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on every push to `main`. It has one job, **Lint, test & build**, which:

1. installs exact dependencies from `package-lock.json` with `npm ci`, using a cached npm store
2. runs `npm run lint`, `npm test` and `npm run build`
3. checks that `dist/health.json` reports `"status": "ok"` in production mode

To reproduce it locally, run `npm ci && npm run ci`.

Runs are deterministic: Node comes from `.nvmrc`, dependencies from the lockfile, the runner image is pinned (`ubuntu-24.04`), and actions are pinned to commit SHAs. A newer push to the same branch cancels the run already in progress.

Lint errors appear as inline annotations on the PR diff, because `setup-node` registers ESLint problem matchers.

### PR risk check

`.github/workflows/pr-review.yml` runs on pull requests and flags changes that deserve a closer look:

- CI, dependency, build-config or health-check edits
- added `.only`/`.skip` or `eslint-disable`
- new workflow write permissions
- deleted tests
- source changes without test changes
- PRs over 500 lines

Findings appear as warning annotations and in the job summary. The check is **advisory and never fails**: it's there to prompt the reviewer, not to block. It needs no `npm install` and no secrets. The rules live in `scripts/risk-rules.js`.

**Blocking merges:** the workflow reports a status, but GitHub only blocks a merge when branch protection requires it. Go to *Settings → Branches* (or *Rules → Rulesets*), add a rule for `main`, and require the **Lint, test & build** status check to pass.

## Project layout

```
index.html          Games hub (landing page)
games/<slug>/       One HTML page per game (e.g. games/tic-tac-toe/)
src/games/<slug>/   Game code: logic.js (pure rules), main.js (UI), style.css
src/main.js         Entry point; wires up the status indicator
src/status.js       Fetches and describes the health check
src/health.js       Builds the health payload (used by the Vite plugin)
src/style.css       Styles (light and dark)
scripts/            Repo tooling (PR risk checker)
tests/              Vitest unit tests
vite.config.js      Vite config and the health plugin
eslint.config.js    ESLint config
.nvmrc              Node version used by CI
.github/workflows/  CI and PR review workflows
CLAUDE.md           Architecture, conventions and rules for contributors
```

## Adding a game

See "Games" in `CLAUDE.md`. In short: add the page and code under `games/<slug>/` and `src/games/<slug>/`, register the page in `vite.config.js` (`build.rolldownOptions.input`), link it from the hub, and add tests for its logic.

## Deploying

`npm run build` produces a fully static site in `dist/`. Any static host works (GitHub Pages, Netlify, Cloudflare Pages, S3, and so on). If you deploy under a sub-path, set `base` in `vite.config.js`. The status indicator already respects it.
