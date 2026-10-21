# golf-api verification map

This directory is the maintained source for verifying the user-facing behavior of teem-golf-api. Read this index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Use the repository root of teem-golf-api. The root `package.json` name is `teem-golf-api`.
- Use Bun 1.4.3. The root `packageManager` field records that version.
- `bun install --frozen-lockfile` has succeeded. `tools/verify.sh` is the full checkout check when install, lint, typecheck, test, build, or synth fails.
- Launch the local server with `bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts launch` before any HTTP drive.
- The default URL is `http://127.0.0.1:4173`. Set `GOLF_VERIFY_PORT` before launch when that port is taken.
- State and evidence default to `/tmp/verify-golf-api`. Set `GOLF_VERIFY_HOME` to move both.
- There is no database and no seed data.
- Do not deploy. This map's HTTP, synth, and generator drives clear AWS credential variables and do not call `cdk deploy`.
- One checkout runs one launch, one synth, and one generator at a time. A second launch must wait for cleanup. Two worktrees need different ports.
- Never drive a server that this verification run did not start.

## Driving conventions

- Start every HTTP recipe from a healthy server. Synth and generator recipes do not need the server.
- Treat every command as literal. Keep the flags and the app name unchanged.
- Run HTTP actions through `golf-verify.ts`. It shells out to `curl`.
- Run synth and generator actions through `golf-verify.ts` as well, except the duplicate-name and bad-name commands in the generator feature. Those commands are the raw `bun run generate:app` lines.
- Run cleanup after a generator proof. Cleanup restores `tools/module-boundaries.json` and `bun.lock`.
- Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final status code.
- HTTP proof includes the request line, response headers, response body, and status. It also includes git status before and after the request. Those snapshots must match.
- Synth proof includes the synth log and `GolfApiStack.template.json`. Confirm the route, the unresolved bootstrap parameter, and the absence of a 12-digit account id.
- Generator proof includes the command logs, `boundaries.diff`, `bun.lock.diff`, and the copied `AGENTS.md`.
- Record the feature id and the entry point with the evidence path the command prints.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.
- The Lambda bundle and `healthBody` stay real. The local process replaces API Gateway, CloudWatch, and the public hostname.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with golf-verify` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name user paths, stable handles, required state, commands, and observable proof.

## Features

- [GET /health](./health.md) covers the health response, a query string, unknown routes, and the lack of repo writes.
- [Synthesised stack](./synth.md) covers the GolfApiStack template, the bundle, and the AWS calls synth does not make.
- [App generator](./generator.md) covers `bun run generate:app`, the scope row, the empty stack, and rejected names.
- [Deploy golf-api](./deploy.md) covers `cdk deploy` and the public `GET /health`. It stays unverified without AWS credentials.
