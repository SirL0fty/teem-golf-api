#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export AWS_EC2_METADATA_DISABLED=true
export CDK_DISABLE_CLI_TELEMETRY=1
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN AWS_PROFILE || true

bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test
bun run build
bun run synth
bunx tsc --noEmit -p .cursor/skills/verify-golf-api/scripts/tsconfig.json
bun test ./.cursor/skills/verify-golf-api/scripts/golf-verify.test.ts
