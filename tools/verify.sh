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

rm -rf apps/golf-api/cdk.out apps/budgets/cdk.out
bunx nx run-many -t synth --output-style=static
test -f apps/golf-api/cdk.out/GolfApiStack.template.json
test -f apps/budgets/cdk.out/TeemGolfBudgets.template.json

rm -rf libs/utils/dist
diff_log="$(mktemp)"
set +e
bunx nx run golf-api:diff --output-style=static >"$diff_log" 2>&1
diff_exit=$?
set -e
cat "$diff_log"
if ! grep -q 'utils:build' "$diff_log"; then
  printf 'diff did not build utils\n' >&2
  exit 1
fi
if grep -q 'Could not resolve "@teem-labs/utils"' "$diff_log"; then
  printf 'diff failed to bundle @teem-labs/utils\n' >&2
  exit 1
fi
if ! grep -q 'Done in' "$diff_log"; then
  printf 'diff did not finish the esbuild bundle\n' >&2
  exit 1
fi
printf 'DIFF_EXIT:%s\n' "$diff_exit"
