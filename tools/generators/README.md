# @teem-labs/generators

Nx generator for a new CDK app.

```bash
bun run generate:app -- website
bun install
```

The command writes `apps/website` with `AGENTS.md`, `README.md`, an empty stack, and a passing synth test. Then it records `scope:website` in `tools/module-boundaries.json`.

The app name is lowercase words separated by single hyphens.
