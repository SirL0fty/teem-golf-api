# GET /health

`GET /health` is the only route on `GolfApiStack`. The HealthUrl output is that route, not the stage root.

The handler returns status 200 and this JSON body:

```json
{ "status": "ok", "service": "golf-api" }
```

`healthBody` in `libs/utils` builds that object and rejects a blank service name. `apps/golf-api/src/functions/health.ts` calls it with `golf-api`. `apps/golf-api/src/lambdas/health.ts` wraps the result for API Gateway. The HTTP API and the Lambda are constructs under `apps/golf-api/src/constructs`.

The stage allows 10 requests per second and a burst of 20. Further calls get 429 and do not invoke the Lambda. The Lambda reserves 5 concurrent executions. Override the numbers with CDK context. See [cost limits](../decisions/0002-cost-limits.md). Access logs store the request id, the method, and the status for one week.
