# budgets

Monthly cost budget for Teem Golf. The stack is `TeemGolfBudgets`. The default limit is 10 USD. The template stores no email address.

```bash
bunx nx run budgets:test
bunx nx run budgets:synth
bunx nx run budgets:deploy
```

Synth runs on your machine and does not need AWS credentials. To send mail at 80 percent and 100 percent of the budget, pass the address at deploy time.

```bash
bunx nx run budgets:deploy -- -c budgetEmail=you@example.com
```

`budgetLimitUsd` changes the amount. Deploy uses the AWS account and region in your environment.
