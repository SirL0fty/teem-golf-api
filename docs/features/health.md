# GET /health

`GET /health` is the only route on `GolfApiStack`.

The handler returns status 200 and this JSON body:

```json
{ "status": "ok", "service": "golf-api" }
```

`healthBody` in `libs/utils` builds that object and rejects a blank service name. `apps/golf-api/src/functions/health.ts` calls it with `golf-api`. `apps/golf-api/src/lambdas/health.ts` wraps the result for API Gateway. The HTTP API and the Lambda are constructs under `apps/golf-api/src/constructs`.
