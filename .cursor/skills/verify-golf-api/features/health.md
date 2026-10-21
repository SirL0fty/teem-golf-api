# GET /health

GET /health is the only caller route on golf-api. A successful call returns status 200 and the JSON body `{"status":"ok","service":"golf-api"}`.

## Sub-features

- `health-get` returns that JSON for `GET /health`.
- `health-query` returns the same JSON when the path includes a query string.
- `health-miss` rejects `GET /missing` and `POST /health`.
- `health-quiet` leaves git status and the bundled handler unchanged.

## How to get to it (user POV)

- Send `GET /health` to the golf-api stage URL. On a deployed stack that URL is the `HealthUrl` output plus `health`.
- On this machine, send `GET /health` to the URL printed by launch. The default is `http://127.0.0.1:4173/health`.

## Driving it with golf-verify

Preconditions:

- `bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts doctor` exits 0.
- Doctor stdout includes `health={"status":"ok","service":"golf-api"}` and a `url=` line.
- The pid in that output is the server this run launched.

- **Request health.** Send `GET /health`. Run `bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive health`. Exit code 0. Stdout includes `status=200`, `body={"status":"ok","service":"golf-api"}`, `gitStatusUnchanged=true`, and `assetUnchanged=true`.
- **Query string.** Send `GET /health?ready=1`. Run `bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive health-query`. Exit code 0. Stdout includes `status=200` and the same body.
- **Miss the route.** Send `GET /missing` and `POST /health`. Run `bun .cursor/skills/verify-golf-api/scripts/golf-verify.ts drive health-miss`. Exit code 0. Stdout includes `GET /missing status=404` and `POST /health status=404`.
- **Proof.** Read the evidence directory printed by `drive health`. `request.txt` contains `GET /health`. `response.status` is `200`. `response.body` is `{"status":"ok","service":"golf-api"}`. `response.headers` includes `200` and `application/json`. `git-status-before.txt` and `git-status-after.txt` match.

## Gotchas

- The current handler does not read the path or the query. The local server selects the bundle only for `GET /health`. A 200 from any other path means the route table was skipped.
- Status 404 uses the server's body `{"message":"Not Found"}`. That body was not compared with a live API Gateway.
- Doctor and the drive both request `/health`. The proof files come from `curl`, which `drive health` runs.
- Launch loads the bundle once. A later synth does not reload the running process. Run cleanup and launch again before proving a bundle you just synthesised.
- The server does not apply the Lambda memory, timeout, or arm64 architecture. Those values are in the template, which the synth feature checks.
- One checkout has one server. A second launch fails and names the existing URL. Set `GOLF_VERIFY_PORT` only for a different worktree.
