# Synth and deploy

Synth writes the CloudFormation template on your machine. Deploy sends that template to AWS.

## Synth

From the repository root:

```bash
bunx nx run golf-api:synth
```

You do not need AWS credentials. The command bundles the health Lambda with esbuild. The template is under `apps/golf-api/cdk.out`. That directory is gitignored. Nx caches `{projectRoot}/cdk.out` for `synth`. A later run can restore the directory after it was deleted.

## Deploy

Read `cdk-deploy-order.txt` from top to bottom. Deploy each app in that order. `budgets` comes before `golf-api`.

```bash
bunx nx run budgets:deploy
bunx nx run golf-api:deploy
```

`deploy` and `diff` build `libs/utils` first. Pass `budgetEmail` only on the budgets deploy when you want notifications. Do not commit the address.

The AWS credential and region in your environment choose the target. This repository does not store account ids. The stack does not set `env`, so a missing credential fails at deploy time rather than at synth time.
