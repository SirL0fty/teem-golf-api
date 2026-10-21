# golf-api

HTTP API for Teem Golf. `GET /health` returns JSON:

```json
{ "status": "ok", "service": "golf-api" }
```

The stack is `GolfApiStack` in `src/stacks/golf-api-stack.ts`.

```bash
bunx nx run golf-api:test
bunx nx run golf-api:synth
bunx nx run golf-api:deploy
```

Synth runs on your machine and does not need AWS credentials. Deploy uses the AWS account and region in your environment.
