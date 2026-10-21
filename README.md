# Teem Golf API

TypeScript workspace for the Teem Golf API. Nx runs tasks. Bun installs packages. `apps/golf-api` is the HTTP API. `apps/budgets` is the monthly cost budget.

```text
apps/budgets         CDK app, TeemGolfBudgets
apps/golf-api        CDK app, GET /health
libs/utils           shared helpers, including healthBody and runtime limits
tools/generators     nx g @teem-labs/generators:app <name>
docs/                product notes, standards, and runbooks
```

## Install and check

```bash
bun install
bun run lint
bun run typecheck
bun run test
bun run build
bun run synth
```

`tools/verify.sh` runs those commands with AWS credential variables cleared. `cdk synth` does not need AWS credentials.

## Add an app

```bash
bun run generate:app -- website
bun install
bunx nx run website:synth
```

The new app includes `AGENTS.md` and `README.md`. Its stack is empty until you add resources. The command appends the app to `cdk-deploy-order.txt`. `cdk deploy` from that app uses the account and region in your AWS environment.

## Deploy

`cdk-deploy-order.txt` lists apps from top to bottom. Deploy budgets, then golf-api.

```bash
bunx nx run budgets:deploy
bunx nx run golf-api:deploy
```

Pass `budgetEmail` on the budgets deploy when you want notifications. Do not commit the address.

## Cloud agents

pstack writers run as cloud agents. The model table is `.cursor/rules/pstack-cloud.mdc`. If `bun` or `node_modules` is missing, run `bash .cursor/cloud-install.sh`. The Bun version is the `packageManager` field in `package.json`.

A Build exists only after Mike points the environment.json location at `.cursor/environment.json` and triggers it. The steps are in [Trigger a Cloud Agent Build](docs/runbooks/cloud-agent-build.md).

Until `/verify-golf-api` is merged from `cursor/verify-golf-api-skill-ca4b`, the check is `tools/verify.sh`.
