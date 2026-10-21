# generators

`@teem-labs/generators:app` creates an empty CDK app under `apps/<name>`.

The templates in `src/app/files` are the app shape. A new app gets `AGENTS.md`, `README.md`, `project.json`, `cdk.json`, and `cdk.context.json`. The stack has no resources. The test checks that, and it checks `runtimeLimitsFrom` defaults of 10, 20, and 5.

`src/boundaries.ts` adds `scope:<name>` to `tools/module-boundaries.json` so the new app can depend on itself and on `scope:shared`. The generator also appends the app name to `cdk-deploy-order.txt` once.

`package.json` exports `./package.json`. `nx g` resolves that subpath. Exporting only `.` makes the documented command fail.

Run `bunx nx run generators:test` after you change the name rule or the boundary helper.
