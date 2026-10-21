# Nx, Bun, and the health route

The public Teem Golf API follows the Origin monorepo scaffold, fitted to a layout that uses one folder per app, `libs/` for shared code, and `tools/` for generators.

## Nx instead of Pants

The work repository that this layout mirrors runs tasks with Pants. This API uses Nx. Each app and library has a `project.json`. `nx run-many` is the lint, typecheck, test, build, and synth entrypoint. There is no `pants.toml` and no `BUILD` file.

## Bun instead of pnpm

The current Origin scaffold installs with Bun. An older branch installed with pnpm and tested with Jest. This repo keeps Bun and `bun test`. It does not commit a pnpm lockfile.

## Where the health route came from

The current Origin app scaffold leaves `GolfApiStack` empty. The older branch adds `GET /health`, an HTTP API, log groups, and `@teem-labs/utils`. Those pieces are in `golf-api` here. A generated app stays empty, matching the current generator, and also gets `AGENTS.md` and `README.md`.

## No pinned account

The stack does not set an AWS account or region. Deploy uses the caller environment. Log groups keep one week of logs and are deleted with the stack. That retention is the policy from the older app, and it does not name an account.
