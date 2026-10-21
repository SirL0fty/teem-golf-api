# Cloud agents instead of worktrees

pstack workers for this repo run as Cursor cloud agents. Each writer gets its own `cursor/` branch. A git worktree is the wrong place for that work. A cloud agent has its own machine, so it can install dependencies and run the checks.

## Model table

`.cursor/rules/pstack-cloud.mdc` is the model table. `alwaysApply` is true. Cloud VMs do not have `~/.cursor/rules/pstack-models.mdc`. This file overrides that missing file and any pstack skill default slug that is not listed in it. Each model field holds one slug.

The builder slug is `grok-4.7-xhigh-fast`. Removing `-fast` leaves `grok-4.7-xhigh`, the same model. Reviewer seats do not use that slug, and the table does not list it. `grok-4.5-high` is not a Task slug. The seat that named it uses `cursor-grok-4.6-high`.

Mike wants reviewers on a different Grok model from the builder, so a check sees the work differently.

## Arena and architect

The parent sets each runner's `environment` to `cloud`. Each runner pushes its candidate to its own `cursor/` branch. The parent fetches those branches before judging or grafting.

Orchestrate's sub-coordinator stays local. It needs the coordinator's store. A cloud agent cannot read that store. Workers that the sub-coordinator spawns still use `environment` `cloud`, unless the task needs this machine.

## What install does

`.cursor/environment.json` runs `bash .cursor/cloud-install.sh`. The script reads the Bun version from `packageManager` in `package.json`. It installs that Bun when the command is missing or the reported version differs. It links the binary whose version matches `packageManager` onto `/usr/local/bin`, because a login shell does not load `~/.bashrc`. An older copy under `~/.bun/bin` does not replace a matching Bun already on `PATH`. The script then runs `bun install --frozen-lockfile` and `bunx nx run-many -t build`.

A second run prints `cloud-install: no-op` and exits. It does not install or build again.

If `bun` is missing or `node_modules` is missing, run `bash .cursor/cloud-install.sh`.

## When a Build exists

A Build exists only after Mike points this environment's environment.json location at `.cursor/environment.json` and triggers a Build. Builds check out the default branch. The install takes effect after this change is on `main` and that Build succeeds. Until then, Bun, `node_modules`, and the Nx cache are not already on the machine.

The environment page is the [Teem Golf API cloud environment](https://cursor.com/dashboard/cloud-agents/environments/e/2da05cec-cd33-11f1-bec7-b2318963e0b6).

## Checks

`tools/verify.sh` is the check. After branch `cursor/verify-golf-api-skill-ca4b` is merged, agents use `/verify-golf-api`.

## CI

`.github/workflows/ci.yml` runs the check job for every pull request. A push runs only for `main`. The `cloud-install` job checks `.cursor/environment.json`, runs the install script, and runs it again. The second run must be a no-op.
