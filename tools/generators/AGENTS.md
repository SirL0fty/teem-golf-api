# generators

`@teem-labs/generators:app` creates an empty CDK app under `apps/<name>`.

The templates in `src/app/files` are the app shape. A new app gets `AGENTS.md`, `README.md`, `project.json`, `cdk.json`, and `cdk.context.json`. The stack has no resources.

`src/boundaries.ts` adds `scope:<name>` to `tools/module-boundaries.json` so the new app can depend on itself and on `scope:shared`.

The package exports `./package.json` because Nx reads that file through the exports map. Keep the export when you edit `package.json`.

Run `bunx nx run generators:test` after you change the name rule or the boundary helper.
