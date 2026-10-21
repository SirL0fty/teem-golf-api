---
name: verify-golf-api
description: Drive teem-golf-api's golf-api HTTP API on this machine. Use when proving GET /health, the synthesised GolfApiStack template, or the app generator without an AWS deploy.
---

# Verify golf-api

`golf-api` is an HTTP API. Callers use `GET /health`. AWS API Gateway would invoke a Node.js 24 arm64 Lambda. This checkout has no AWS credentials, so do not deploy. The local server loads the synth bundle and answers HTTP on `127.0.0.1`.

Read `features/README.md` before a drive. Use the matching feature file as the recipe. One checkout can run one launch, one synth, and one generator at a time. Two git worktrees can run together when each sets its own `GOLF_VERIFY_PORT`. Instance state is keyed by the checkout path, so they can share `GOLF_VERIFY_HOME`.

There is no database and no seed data. A usable server is one whose `GET /health` body is `{"status":"ok","service":"golf-api"}`.

## Launch

From the repository root:

```bash
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts launch
```

Launch clears `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, and `AWS_PROFILE`. It sets `AWS_EC2_METADATA_DISABLED=true` and `CDK_DISABLE_CLI_TELEMETRY=1`, the same way `tools/verify.sh` does. It then runs `bun install --frozen-lockfile` and `bunx nx run golf-api:synth --skip-nx-cache`, and starts a Bun process that loads `apps/golf-api/cdk.out/asset.<hash>/index.js`.

Ready means stdout begins with `ready` and a following `doctor` command prints `ok` plus `health={"status":"ok","service":"golf-api"}`. A listening port is not enough.

The default URL is `http://127.0.0.1:4173`. Set `GOLF_VERIFY_PORT` to another free port before launch. Set `GOLF_VERIFY_HOME` to move state and evidence. The default home is `/tmp/verify-golf-api`.

If launch fails because the checkout does not install or synth, run `tools/verify.sh` and fix that failure before retrying. A second launch while the server is still alive exits with an error that includes the current URL. Run cleanup first.

Teardown is the cleanup command below.

## Doctor

```bash
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts doctor
```

Doctor is read-only. It checks that the recorded pid is this run's `golf-verify.ts serve` process, that the process owns the recorded port, that the bundled `index.js` from launch still exists, and that `GET /health` returns status 200 and `{"status":"ok","service":"golf-api"}`. Run it before the first HTTP drive, and again after any failed HTTP drive. Synth and generator drives do not start this server. Doctor fails when no server is running.

## Drive

Run these from the repository root. HTTP paths are `GET /health`, `GET /health?ready=1`, `GET /missing`, and `POST /health`.

```bash
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts url
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive health
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive health-query
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive health-miss
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive synth
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive generator --name verify-scratch
```

`drive health` shells out to `curl` for `GET /health`. `drive synth` runs the frozen install and `bunx nx run golf-api:synth --skip-nx-cache`. `drive generator` runs `bun run generate:app -- <name>`, then `bun install`, then `bunx nx run <name>:test` and `bunx nx run <name>:synth --skip-nx-cache`. There is no drive command for deploy.

Feature files own the expected stdout and the extra commands for a rejected app name.

## Evidence

Evidence lives at `/tmp/verify-golf-api/evidence/<runId>/` unless `GOLF_VERIFY_HOME` is set. Each drive prints `evidence=<path>`. The latest path is also stored at `/tmp/verify-golf-api/work/<repoHash>/last-evidence-path`.

```bash
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts evidence
```

That command prints `exists=true` when the directory is still on disk. Use it after cleanup.

Capture the request and the response, not only the final status. For `GET /health`, keep `request.txt`, `response.headers`, `response.body`, and `response.status`. Also keep `git-status-before.txt` and `git-status-after.txt`. Those two files must match. The bundle file size and mtime must match too. The handler writes no rows and no repo files.

For synth, keep `synth.log`, `template-facts.json`, and `GolfApiStack.template.json`. The template must contain `RouteKey` `GET /health`, an unresolved `BootstrapVersion` of `/cdk-bootstrap/hnb659fds/version`, and no 12-digit account id. `GolfApiStack.assets.json` must list no Docker images. A synth with dependencies already installed completed inside `unshare --net --map-root-user` with exit 0. That observed run did not publish the asset zip and did not resolve the bootstrap parameter. A cold `bun install` can still contact the Bun registry. Do not treat a warm synth as proof that install is offline.

For the generator, keep `generate.log`, `boundaries.diff`, `bun.lock.diff`, the copied `AGENTS.md`, and `resource-types.txt`. The diff is the side effect. Cleanup restores the previous `tools/module-boundaries.json` and `bun.lock` from the scratch copies, then the evidence copies remain.

Do not mock `healthBody` or the Lambda bundle. The local server performs API Gateway's route choice, then calls the real `handler` export from the synth bundle. Unmatched routes get the server's own `{"message":"Not Found"}` and status 404. That body was not fetched from AWS.

## Cleanup

```bash
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts cleanup
```

Cleanup reads the recorded pid and signals it only when `/proc/<pid>/cmdline` is `golf-verify.ts serve` for that run id. It does not kill by process name. It deletes the instance directory and the generator scratch directory for the current run. If a generator drive succeeded, cleanup removes `apps/<name>`, restores `tools/module-boundaries.json` and `bun.lock`, and runs `bun install --frozen-lockfile`.

Cleanup does not delete `/tmp/verify-golf-api/evidence` or the last-evidence pointer. After it exits, `evidence` must still print `exists=true`. Run cleanup after a failed launch too, so a leftover pid does not block the next port.

A second cleanup with no current run prints `idle` and leaves evidence in place.

## Helpers

`golf-verify.ts` is executable. From the repository root:

```bash
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts launch
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts doctor
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts url
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive health
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive health-query
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive health-miss
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive synth
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive generator --name verify-scratch
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts evidence
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts cleanup
```

`tools/verify.sh` remains the full install, lint, typecheck, test, build, and synth check. It also typechecks these scripts and runs `golf-verify.test.ts`. It does not start the HTTP server.

Parser checks:

```bash
bunx tsc --noEmit -p .cursor/skills/verify-golf-api/scripts/tsconfig.json
bun test ./.cursor/skills/verify-golf-api/scripts/golf-verify.test.ts
```

## What a local run does not prove

The local server loads the bundle in Bun on this machine, builds an API Gateway v2 event in-process, and speaks plain HTTP on `127.0.0.1`. A deploy does not do those steps.

These deploy steps stay unverified until someone with an account runs them:

- `cdk bootstrap`, and the SSM read of `/cdk-bootstrap/hnb659fds/version`.
- Publishing the Lambda zip to the CDK bootstrap bucket.
- `bunx nx run golf-api:deploy` and the CloudFormation create.
- The IAM role, the API Gateway invoke permission, the HTTP API, the `$default` stage, and both log groups existing in the account.
- CloudFormation-generated names for the API, the function, and the log groups.
- `HealthUrl` becoming `https://<apiId>.execute-api.<region>.amazonaws.com/`.
- TLS and a public `GET /health` through API Gateway.
- Lambda on arm64 with Node.js 24, 128 MB, and a 3 second timeout.
- Function logs and the access-log line in CloudWatch.
- Log group deletion when the stack is deleted.
- `cdk diff` against a live stack.

`features/deploy.md` is that journey. Stop before `cdk deploy` when credentials are missing. Do not describe synth as a deploy.

## Maintenance

When the routes, the template, or the generator change, run `/maintain-verification-skill` and correct this map from a live drive.
