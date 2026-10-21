# Common commands

Run these from the repository root after `bun install`.

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run synth
bunx nx run golf-api:deploy
bun run generate:app -- website
```

`tools/verify.sh` runs install, lint, typecheck, test, build, and synth with AWS credential variables cleared. It also checks the local verification scripts.

Call `GET /health` without AWS by following `docs/runbooks/verify-locally.md`.

To check one project, replace the target and the project name:

```bash
bunx nx run utils:test
bunx nx run golf-api:synth
```
