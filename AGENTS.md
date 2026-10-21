# Teem Golf API

Nx and Bun workspace for the Teem Golf API. The CDK apps are `apps/budgets` and `apps/golf-api`. Shared code is `libs/`. The app generator is `tools/generators`.

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

The generator writes `AGENTS.md` and `README.md` for the new app. It adds a `scope:<name>` row to `tools/module-boundaries.json`. It appends the app name to `cdk-deploy-order.txt`.

## Layout

An app has `src/functions`, `src/lambdas`, `src/constructs`, and `src/stacks`. Stacks import constructs. Lambdas import functions. Functions import packages, not AWS. Apps do not import other apps. ESLint enforces both rules. Tag rules live in `tools/module-boundaries.json`.

## Gotchas

Use Bun. Do not add a pnpm, npm, or yarn lockfile.

`cdk synth` for `golf-api` bundles the health Lambda with esbuild. It does not need AWS credentials. Do not store account ids in this repo.

`libs/utils` writes `dist` when it builds. App typecheck, synth, deploy, and diff depend on that build. Nx runs the dependency first. `synth` caches `cdk.out` and restores it on a cache hit.

Deploy order is the list in `cdk-deploy-order.txt`. `budgets` is first. `golf-api` is second. Stage throttle defaults are 10 requests per second and a burst of 20. Health Lambda reserved concurrency defaults to 5. Details are in `docs/decisions/0002-cost-limits.md`.

## Cursor Cloud specific instructions

If `bun` is missing or `node_modules` is missing, run `bash .cursor/cloud-install.sh`. The script reads the Bun version from the `packageManager` field in `package.json`.

A Build exists only after Mike points this environment's environment.json location at `.cursor/environment.json` and triggers a Build.

Run `tools/verify.sh`. After branch `cursor/verify-golf-api-skill-ca4b` is merged, use `/verify-golf-api`.

`cdk synth` needs no AWS credentials. Set `AWS_EC2_METADATA_DISABLED=true`. Never deploy.
