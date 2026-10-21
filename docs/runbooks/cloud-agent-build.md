# Trigger a Cloud Agent Build

A Build exists only after the environment.json location is `.cursor/environment.json` and you trigger it. Builds read the default branch. Do this after `.cursor/environment.json` is on `main`.

1. Open the [Teem Golf API cloud environment](https://cursor.com/dashboard/cloud-agents/environments/e/2da05cec-cd33-11f1-bec7-b2318963e0b6) in the Cursor dashboard.
2. Set **environment.json location** to `.cursor/environment.json`.
3. Open **Builds**.
4. Select **Trigger build**.

A successful Build runs `install` from `.cursor/environment.json` and saves a disk snapshot. The next agent boots from that snapshot. `libs/utils/dist` and the Nx cache are on that snapshot. They are not on a machine that booted before the Build.

If `bun` is missing or `node_modules` is missing, run `bash .cursor/cloud-install.sh`. The script reads the Bun version from `packageManager` in `package.json`.

The decision is [Cloud agents instead of worktrees](../decisions/0003-cloud-agents-and-snapshot.md).
