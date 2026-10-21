# Teem Golf API

TypeScript workspace for the Teem Golf API. Nx runs tasks. Bun installs packages. `apps/golf-api` is the AWS CDK app.

```text
apps/golf-api        CDK app, GET /health
libs/utils           shared helpers, including healthBody
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

The new app includes `AGENTS.md` and `README.md`. Its stack is empty until you add resources. `cdk deploy` from that app uses the account and region in your AWS environment.

## Deploy

`cdk-deploy-order.txt` lists apps from top to bottom. Deploy golf-api with:

```bash
bunx nx run golf-api:deploy
```
