# @teem-labs/utils

Shared helpers for Teem CDK apps. The first export is `healthBody`, which builds the JSON body for `GET /health`.

Build the package before an app typechecks against it.

```bash
bunx nx run utils:build
bunx nx run utils:test
```

Apps depend on this package by the name `@teem-labs/utils` and the `workspace:*` protocol.
