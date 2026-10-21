# App generator

The app generator creates an empty CDK app under `apps/<name>`, writes `AGENTS.md` and `README.md`, and records `scope:<name>` in `tools/module-boundaries.json`. The new stack has no Lambda and no HTTP route.

## Sub-features

- `generate-app` writes the app folder, `AGENTS.md`, and `README.md`.
- `generate-scope` adds `scope:<name>` for the app and `scope:shared`.
- `generate-install` records `@teem-labs/<name>` in `bun.lock`.
- `generate-empty-synth` synthesises a template with no Lambda and no route.
- `generate-reject` refuses an existing folder and a name that breaks the schema.

## How to get to it (user POV)

- From the repository root, run `bun run generate:app -- <name>`.
- Run `bun install`.
- Run `bunx nx run <name>:synth`.
- Read `apps/<name>/AGENTS.md` and `apps/<name>/README.md`.

## Driving it with golf-verify

Preconditions:

- The name matches the `name.pattern` in `tools/generators/src/app/schema.json`. `verify-scratch` matches.
- `apps/verify-scratch` does not exist.
- No other synth or generator command is running in this checkout.
- You can restore `tools/module-boundaries.json` and `bun.lock`. The drive copies both before it writes.

- **Generate the app.** Run `bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive generator --name verify-scratch`. Exit code 0. Stdout includes `created=apps/verify-scratch`, `class=VerifyScratchStack`, `scope=scope:verify-scratch`, and `resourceTypes=AWS::CDK::Metadata`.
- **Reject a duplicate.** Run `bun run generate:app -- verify-scratch`. Exit code 1. The error text includes `apps/verify-scratch already exists.`
- **Reject a bad name.** Run `bun run generate:app -- Scratch`. Exit code 1. The error text says the name does not match `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`.
- **Proof.** Open the evidence directory the successful drive prints. `AGENTS.md` starts with `# verify-scratch` and contains `VerifyScratchStack`. `boundaries.diff` contains `scope:verify-scratch`. `bun.lock.diff` contains `@teem-labs/verify-scratch`. `resource-types.txt` is `AWS::CDK::Metadata` and does not contain `AWS::Lambda::Function` or `AWS::ApiGatewayV2::Route`.

## Gotchas

- Run the duplicate check before cleanup. Cleanup deletes `apps/verify-scratch`.
- Nx rewrites all of `tools/module-boundaries.json`, including arrays that were previously on one line. Restoring the file means putting the backup bytes back. Deleting only the new scope object leaves the reformat behind.
- `bun install` after generate changes `bun.lock` even when the package versions are already present. Cleanup restores the previous lockfile and runs `bun install --frozen-lockfile`.
- The CDK assertion test expects `Resources` to be empty. The CLI template still contains `AWS::CDK::Metadata`. Judge the CLI template by the resource types above, not by that unit test's empty object.
- A failed drive restores the app, the boundaries file, and the lockfile. A successful drive leaves them in place until cleanup.
- The generated stack does not serve `GET /health`. Do not point the health drive at it.
- Deploy of the new app is not part of this feature. The app has no resources to call.
