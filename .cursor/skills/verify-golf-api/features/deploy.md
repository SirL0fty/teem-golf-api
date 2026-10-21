# Deploy golf-api

Deploy sends `GolfApiStack` to AWS and prints `HealthUrl`. A caller then sends `GET /health` to that host and receives `{"status":"ok","service":"golf-api"}`.

## Sub-features

- `deploy-stack` creates the stack in the caller's account and region.
- `deploy-url` returns an `https` execute-api host from `HealthUrl`.
- `deploy-health` serves `GET /health` on that host.
- `deploy-logs` writes the function log and the access log in CloudWatch.

## How to get to it (user POV)

- Read `cdk-deploy-order.txt` from top to bottom. The only line is `golf-api`.
- From the repository root, run `bunx nx run golf-api:deploy`.
- Read the `HealthUrl` output.
- Send `GET /health` to that URL plus `health`.

## Driving it with golf-verify

Preconditions:

- AWS credentials and a region are available in the environment you intend to use.
- The account is bootstrapped with CDK. The template reads `/cdk-bootstrap/hnb659fds/version` from SSM, and the rule requires bootstrap version 6 or newer.
- You intend to create real resources. `golf-verify.ts` has no deploy command and will not create them for you.
- If any precondition is missing, stop. Record the command you did not run and the missing precondition. A local synth is not a substitute.

- **Deploy.** Run `bunx nx run golf-api:deploy` from the repository root. CloudFormation finishes and the output includes `HealthUrl` with an `https` execute-api host.
- **Call the deployed route.** Send `GET /health` to that host. Run `curl --silent --show-error --http1.1 --dump-header /tmp/verify-golf-api/evidence/deploy/response.headers --output /tmp/verify-golf-api/evidence/deploy/response.body --write-out '%{http_code}\n' "${HEALTH_URL}health"`. Status 200 and the body is `{"status":"ok","service":"golf-api"}`.
- **Proof.** Save the deploy log, the `HealthUrl` value, `response.headers`, and `response.body` under `/tmp/verify-golf-api/evidence/deploy/`. The host contains `.execute-api.` and the scheme is `https`.

## Gotchas

- This repository does not store an account id or a region. The caller environment chooses both. The stack does not set `env`.
- Missing credentials fail at deploy time. Synth still succeeds.
- Do not run the deploy command from a verification pass that was told not to deploy. Report the unmet credential precondition instead.
- Local `GET /health` does not prove TLS, API Gateway, arm64 Lambda, CloudWatch logs, or stack deletion.
- `HealthUrl` has no stage segment because the stage name is `$default`. The health path is `health` on that origin.
