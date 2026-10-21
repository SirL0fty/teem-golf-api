# @teem-labs/generators

Nx generator for a new CDK app.

```bash
bun run generate:app -- website
bun install
```

The command writes `apps/website` with `AGENTS.md`, `README.md`, an empty stack, and a test that expects no Lambda yet. Then it records `scope:website` in `tools/module-boundaries.json` and appends `website` to `cdk-deploy-order.txt`. The new app depends on `@teem-labs/utils` for the throttle and concurrency defaults.

The app name is lowercase words separated by single hyphens.
