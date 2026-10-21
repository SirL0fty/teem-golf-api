# Standards

TypeScript is strict. The shared compiler options are in `tsconfig.base.json`.

ESLint is the check for imports.

- A project tagged `type:app` depends only on projects tagged `type:package`.
- A project tagged `type:package` depends only on `type:package`.
- A project tagged `type:tool` depends only on `type:tool` and `type:package`.
- `scope:golf-api` depends only on `scope:golf-api` and `scope:shared`.
- `scope:shared` depends only on `scope:shared`.

Those tag rules are `tools/module-boundaries.json`. Layer rules, such as "stacks do not import functions", are `eslint.config.mjs`.

Package installs use Bun. Lockfiles from pnpm, npm, and yarn do not belong in this repo.

Do not commit AWS account ids, secret keys, or private URLs.
