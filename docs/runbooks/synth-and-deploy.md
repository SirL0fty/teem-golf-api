# Synth and deploy

Synth writes the CloudFormation template on your machine. Deploy sends that template to AWS.

## Synth

From the repository root:

```bash
bunx nx run golf-api:synth
```

You do not need AWS credentials. The command bundles the health Lambda with esbuild. The template is under `apps/golf-api/cdk.out`. That directory is gitignored.

## Deploy

Read `cdk-deploy-order.txt` from top to bottom. Deploy each app in that order. There is one app.

```bash
bunx nx run golf-api:deploy
```

The AWS credential and region in your environment choose the target. This repository does not store account ids. The stack does not set `env`, so a missing credential fails at deploy time rather than at synth time.
