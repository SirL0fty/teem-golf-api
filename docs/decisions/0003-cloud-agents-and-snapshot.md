# Cloud agents instead of worktrees, and the environment snapshot

pstack workers for this repo run as Cursor cloud agents. Each writer gets its own `cursor/` branch. A git worktree is the wrong place for that work. Worktrees spend disk on the laptop, and a laptop runs only a handful at once. A cloud agent has its own machine, so it can install dependencies and run the checks. The first successful Build saves a disk snapshot. The next agent boots with Bun, `node_modules`, `libs/utils/dist`, and the Nx cache already in place.

## Reviewers use a different Grok model

Mike wants reviewers on a different Grok model from the builder, so a check sees the work differently. The builder slug is `grok-4.7-xhigh-fast`. The table is Grok only.

Build roles `feature`, `bug-fix`, and `swarm workers` use `grok-4.7-xhigh-fast`. Judgment, prose, and the hardest tasks use `grok-4.7-xhigh`. Arena runners and architect runners use `grok-4.7-xhigh` and `grok-4.6-xhigh`. The arena cross-judge pool is `grok-4.6-xhigh` and `grok-4.5-high`. Interrogate reviewers use `grok-4.6-xhigh`, `grok-4.5-high`, and `grok-4.7-xhigh`. Why investigators use `grok-4.7-xhigh-fast` and `grok-4.6-xhigh`. Reflect divergent uses `grok-4.6-xhigh`.

The pstack skill looks up `reflect judgment, divergent, synthesizer` as one role name. That line uses `grok-4.6-xhigh`, the same slug as reflect divergent. `why synthesizer` and `how explainer` use `grok-4.7-xhigh`. `perf-issue` and `hillclimb` use `grok-4.7-xhigh-fast`. Those lines are in the rule so a missing role cannot fall back to Claude.

## What install does

`.cursor/environment.json` runs `bash .cursor/cloud-install.sh`. The script reads `packageManager` in `package.json`. The pin is `bun@1.4.3`. It installs that Bun when the command is missing or the reported version differs. It links the binary into `/usr/local/bin`, because a login shell does not load `~/.bashrc`. It then runs `bun install --frozen-lockfile` and `bunx nx run-many -t build`.

## When the snapshot applies

The saved environment for this repository is dashboard-backed. Its environment.json location is empty, so the committed file does not drive a Build until that location is `.cursor/environment.json`. Builds check out the default branch. The install takes effect after this change is on `main` and a Build succeeds.

The environment page is the [Teem Golf API cloud environment](https://cursor.com/dashboard/cloud-agents/environments/e/2da05cec-cd33-11f1-bec7-b2318963e0b6).

## CI

`.github/workflows/ci.yml` runs the check job for a pull request into any base. The workflow names `cursor/**` so a stacked branch stays covered if the catch-all pattern is removed. A push still runs only for `main`.
