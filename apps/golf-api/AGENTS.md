# golf-api

`golf-api` is the Teem Golf API CDK app. `GolfApiStack` publishes `GET /health` on an HTTP API. The handler is a Node.js 24 Lambda on arm64 with 128 MB and a 3 second timeout.

## Commands

From the repository root:

```bash
bunx nx run golf-api:lint
bunx nx run golf-api:typecheck
bunx nx run golf-api:test
bunx nx run golf-api:build
bunx nx run golf-api:synth
bunx nx run golf-api:deploy
```

`deploy` uses the AWS account and region in your environment. This repo does not store account ids.

To call `GET /health` without deploying, follow `.cursor/skills/verify-golf-api/SKILL.md`.

## Layout

`src/functions` is pure logic and calls `@teem-labs/utils`. `src/lambdas` is the HTTP handler. `src/constructs` holds the Lambda, the HTTP API, and the log policy. `src/stacks` composes those constructs. Imports go in that direction only.

## Gotchas

`cdk synth` bundles the Lambda with esbuild and reads `bun.lock`. It does not need AWS credentials. Build `utils` first. The Nx targets depend on `utils:build`.

The HTTP API and the Lambda do not set physical names. CloudFormation generates them.

Log groups keep one week of logs and are deleted with the stack.
