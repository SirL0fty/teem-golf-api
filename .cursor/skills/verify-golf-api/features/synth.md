# Synthesised stack

Synth writes the CloudFormation template for `GolfApiStack` on this machine. The template routes `GET /health` to one Lambda and publishes a `HealthUrl` output. It does not create the stack in AWS.

## Sub-features

- `synth-route` records `GET /health` on an HTTP API stage named `$default`.
- `synth-function` records Node.js 24, arm64, 128 MB, a 3 second timeout, and handler `index.handler`.
- `synth-names` leaves the API, function, and log group names for CloudFormation to generate.
- `synth-logs` records two log groups kept for 7 days and deleted with the stack.
- `synth-skips-aws` leaves the bootstrap parameter unresolved and publishes no asset zip.

## How to get to it (user POV)

- From the repository root, run `bunx nx run golf-api:synth`.
- Read `apps/golf-api/cdk.out/GolfApiStack.template.json`.
- `tools/verify.sh` runs that synth after clearing AWS credential variables.

## Driving it with golf-verify

Preconditions:

- `bun install --frozen-lockfile` can succeed from the repository root.
- No other synth or generator command is running in this checkout.
- AWS credential variables may be unset. The drive clears them anyway.

- **Synthesize.** Run `bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive synth`. The command runs `bun install --frozen-lockfile` and `bunx nx run golf-api:synth --skip-nx-cache` with credential variables cleared. Exit code 0. Stdout includes `route=GET /health` and `accountIdLiterals=0`.
- **Confirm the skip.** Run `unshare --net --map-root-user -- bunx nx run golf-api:synth --skip-nx-cache` from the repository root after a successful install. Exit code 0. If `unshare --net --map-root-user true` fails, report that precondition and do not claim the network was checked.
- **Proof.** Open the evidence directory the drive prints. `template-facts.json` includes `"routeKeys": ["GET /health"]`, `"runtime": "nodejs24.x"`, `"accountIdLiterals": 0`, and `"dockerImageCount": 0`. `GolfApiStack.template.json` contains `GET /health` and `BootstrapVersion` default `/cdk-bootstrap/hnb659fds/version`. It does not contain a 12-digit account id.

## Gotchas

- `--skip-nx-cache` is required for this proof. A cached Nx result can skip rewriting `cdk.out`.
- Synth can finish without Docker. `GolfApiStack.assets.json` lists `dockerImages` as an empty object when esbuild bundled the handler locally.
- The template's asset destination still uses `${AWS::AccountId}` and `${AWS::Region}`. Those placeholders are not a published object.
- `HealthUrl` is an `Fn::Join` that starts with `https://` and includes `.execute-api.`. Synth does not print a hostname you can curl.
- A warm offline synth does not prove that a cold `bun install` avoids the network.
- Do not call this a deploy. The deploy feature owns the live stack.
