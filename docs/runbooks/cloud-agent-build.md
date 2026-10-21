# Trigger a Cloud Agent Build

Builds read the default branch. Do this after `.cursor/environment.json` is on `main`.

1. Open the [Teem Golf API cloud environment](https://cursor.com/dashboard/cloud-agents/environments/e/2da05cec-cd33-11f1-bec7-b2318963e0b6) in the Cursor dashboard.
2. Set **environment.json location** to `.cursor/environment.json`.
3. Open **Builds**.
4. Select **Trigger build**.

A successful Build runs `install` and saves a disk snapshot. The next agent boots from that snapshot. `libs/utils/dist` and the Nx cache are already present.

The decision is [Cloud agents instead of worktrees, and the environment snapshot](../decisions/0002-cloud-agents-and-snapshot.md).
