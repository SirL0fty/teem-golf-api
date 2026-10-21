# Teem Golf API

This repository is the Teem Golf API. The deployable unit is the CDK app `golf-api`.

The running API has one route, `GET /health`. The body is JSON with `status` set to `ok` and `service` set to `golf-api`. Course catalogs, players, and accounts are not in this scaffold.
