# Troubleshooting

## `bun: command not found`

Install Bun 1.4.3, the version in the root `packageManager` field. Then run `bun install` from the repository root.

## ESLint reports a module boundary error

The import crosses a tag in `tools/module-boundaries.json` or a layer in `eslint.config.mjs`. Depend on `@teem-labs/utils` from an app. Do not import one app from another. Do not import `aws-cdk-lib` from `src/functions`.

## `cdk synth` asks for Docker

The health Lambda bundles with esbuild. `esbuild` is a dev dependency of `golf-api`. Run `bun install` so the local esbuild binary is present. Synth does not need a container when that binary is on the module path.

## `cdk synth` fails looking for AWS credentials

`GolfApiStack` does not set an account or a region. Clear `AWS_PROFILE` and related credential variables, then synth again. A lookup that needs an account is a bug in this scaffold.

## Typecheck cannot find `@teem-labs/utils`

Build the library first. `bunx nx run utils:build` writes `libs/utils/dist`. The app targets depend on that build.
