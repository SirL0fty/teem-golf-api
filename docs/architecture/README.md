# Architecture

`apps/` holds deployable CDK apps. `libs/` holds shared code. `tools/` holds generators and `tools/verify.sh`. Nx is the task runner. Bun installs the workspace.

## Layers inside an app

`src/functions` is pure logic. `src/lambdas` turns that logic into a handler. `src/constructs` is CDK. `src/stacks` composes constructs. `bin/` starts the CDK app.

Imports move from stacks to constructs, and from lambdas to functions. Functions may import a package such as `@teem-labs/utils`. They do not import AWS. Apps do not import other apps.

## Several CDK apps

AWS CDK guidance often starts from one application in one repository, because a shared pipeline increases blast radius. This repository still holds more than one CDK app when we add them. Nx runs the projects a change affects. Each app synths and deploys on its own, so a deploy of `golf-api` does not deploy a sibling app. The Lambda handler and the constructs that ship it stay in that same app.

`budgets` and `golf-api` are the apps today. `budgets` is a monthly cost budget with no Lambda. `golf-api` is the HTTP API. Deploy `budgets` first. The list is `cdk-deploy-order.txt`.
