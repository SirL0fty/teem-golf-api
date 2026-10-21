# budgets

`budgets` is the AWS Budgets CDK app. `TeemGolfBudgets` tracks a monthly cost budget named `teem-golf-monthly`. The default limit is 10 USD.

## Commands

From the repository root:

```bash
bunx nx run budgets:lint
bunx nx run budgets:typecheck
bunx nx run budgets:test
bunx nx run budgets:build
bunx nx run budgets:synth
bunx nx run budgets:deploy
```

`deploy` uses the AWS account and region in your environment. This repo does not store account ids or email addresses.

## Layout

`src/stacks` defines the budget. `bin/budgets.ts` reads CDK context and constructs the app. There is no Lambda in this app.

## Gotchas

`cdk synth` does not need AWS credentials. Without `budgetEmail`, the template has the budget and no subscribers. Set `budgetEmail` in context when you want mail at 80 percent and 100 percent of the limit. Set `budgetLimitUsd` to change the 10 USD default.

Deploy this app before `golf-api`. The order is `cdk-deploy-order.txt`.
