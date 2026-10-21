# Teem Golf API

Nx and Bun workspace for the Teem Golf API. The CDK app is `apps/golf-api`. Shared code is `libs/`. The app generator is `tools/generators`.

## Commands

```bash
bun install
bun run lint
bun run typecheck
bun run test
bun run build
bun run synth
```

`tools/verify.sh` runs that list after clearing AWS credential variables.

Create an app with:

```bash
bun run generate:app -- website
bun install
```

The generator writes `AGENTS.md` and `README.md` for the new app. It adds a `scope:<name>` row to `tools/module-boundaries.json`.

## Layout

An app has `src/functions`, `src/lambdas`, `src/constructs`, and `src/stacks`. Stacks import constructs. Lambdas import functions. Functions import packages, not AWS. Apps do not import other apps. ESLint enforces both rules. Tag rules live in `tools/module-boundaries.json`.

## Gotchas

Use Bun. Do not add a pnpm, npm, or yarn lockfile.

`cdk synth` for `golf-api` bundles the health Lambda with esbuild. It does not need AWS credentials. Do not store account ids in this repo.

`libs/utils` writes `dist` when it builds. App typecheck and synth depend on that build. Nx runs the dependency first.

Deploy order is the list in `cdk-deploy-order.txt`.
