# Verify golf-api locally

Call `GET /health` on this machine without an AWS account. The server runs the Lambda bundle that `cdk synth` writes.

## Start the server

From the repository root, run:

```bash
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts launch
```

Wait until the output starts with `ready`. Then run:

```bash
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts doctor
```

Doctor exits 0 and prints `health={"status":"ok","service":"golf-api"}`.

## Call the route

```bash
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive health
```

The output includes `status=200` and `body={"status":"ok","service":"golf-api"}`.

## Stop the server

```bash
bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts cleanup
```

Cleanup stops the process this run started. It leaves evidence under `/tmp/verify-golf-api/evidence/`.

The synth, generator, and deploy checks live in `.cursor/skills/verify-golf-api/SKILL.md`. When those notes drift, run `/maintain-verification-skill`.
