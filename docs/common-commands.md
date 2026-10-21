# Common commands

Run these from the repository root after `bun install`. If `bun` or `node_modules` is missing, run `bash .cursor/cloud-install.sh` first. That script reads the Bun version from `packageManager` in `package.json`.

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run synth
bunx nx run budgets:synth
bunx nx run budgets:deploy
bunx nx run golf-api:deploy
bunx nx run golf-api:diff
bun run generate:app -- website
```

`generate:app` is `nx g @teem-labs/generators:app`. It writes the app and appends the name to `cdk-deploy-order.txt`. Run `bun install` after it so the new workspace package is linked.

`tools/verify.sh` runs install, lint, typecheck, test, build, and synth with AWS credential variables cleared. It then deletes `cdk.out` and synths again to confirm the cache restores the template. It also deletes `libs/utils/dist` and runs `golf-api:diff` to confirm utils builds before esbuild bundles the handler.

To check one project, replace the target and the project name:

```bash
bunx nx run utils:test
bunx nx run golf-api:synth
```
