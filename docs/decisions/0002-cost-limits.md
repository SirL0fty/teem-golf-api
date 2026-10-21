# Cost limits

`GET /health` stays on a Lambda. The HTTP API stage throttles callers before that Lambda runs. A separate budget stack watches account spend. CloudFront and a WAF rate-based rule are the pre-launch follow-up, not part of this stack.

## Why the health route still uses a Lambda

API Gateway HTTP APIs integrate with an HTTP endpoint or an AWS service. In aws-cdk-lib 2.274.0, `HttpIntegrationType` is `HTTP_PROXY` or `AWS_PROXY`. There is no mock integration, so a route cannot return a fixed body with no backend. The handler stays the small JSON response it already was. It does not call AWS. Stage throttle and reserved concurrency are what cap the cost.

## Throttle, concurrency, and logs

The `$default` stage allows 10 requests per second and a burst of 20. API Gateway returns 429 after that, and the Lambda is not invoked. The health Lambda reserves 5 concurrent executions. `runtimeLimitsFrom` in `@teem-labs/utils` holds those defaults. Context keys `throttleRate`, `throttleBurst`, and `reservedConcurrentExecutions` override them. A generated app depends on the same helper, and its test checks the same numbers.

Access logs record the request id, the HTTP method, and the status. Log groups still keep one week of logs and are deleted with the stack.

## Budget

`apps/budgets` defines `TeemGolfBudgets`. The budget is monthly, type COST, name `teem-golf-monthly`, default 10 USD. `cdk-deploy-order.txt` lists `budgets` before `golf-api`, so the budget exists before the API is deployed. Set `budgetEmail` in CDK context at deploy time to send mail at 80 percent and 100 percent of actual spend. This repository does not store an address. Synth without that key writes the budget and omits subscribers. `budgetLimitUsd` changes the amount.

## Left as open questions

The Lambda invoke permission source ARN still ends in `/*/*/health`. The function role still attaches the managed policy `AWSLambdaBasicExecutionRole`. This change does not narrow either one.

## Nx fixes that sit with this change

`nx g @teem-labs/generators:app` resolves the generator package by importing `./package.json`. The package export map now includes that path. `deploy` and `diff` depend on `^build`, so esbuild can see `libs/utils/dist`. `synth` records `{projectRoot}/cdk.out`, so a cache hit puts the template back. The generator appends the new app to `cdk-deploy-order.txt`. Bin files have no node shebang. `cdk.json` starts them with Bun.
