# Monitoring

The monitoring endpoints are implemented in `webserver/index.js`, with shared helpers in `webserver/monitoring.js`.

## Goal

Expose machine-readable HTTP endpoints so monitoring systems can tell:
- whether the webserver is alive
- whether the door access system is ready to operate
- what part of the system is degraded when something goes wrong

## Why the webserver should host this

The existing Express app in `webserver/index.js` is already the only HTTP surface in the repo, and it already talks to PM2 in the `/admin` route to inspect the `access` process. That makes it the safest place to add monitoring endpoints without mixing HTTP concerns into `access.js`.

## Existing health signals we can reuse

- PM2 process state for `access`, `webview`, `updatememberlist`, and `announceEvents`
- PM2 error log files in `logs/error/`
- `members.csv` freshness checks already used by `access.js`
- existing operator-facing error behavior through the LCD, LEDs, and Telegram notifications

The strongest operational signal today is whether `access` is up and whether `members.csv` is present and fresh enough to validate entries.

## Proposed endpoints

### `GET /healthz` ✅ Implemented

Purpose: basic liveness for the webserver itself.

Checks:
- request handler can run
- process is alive

Response:
- `200 OK` when the webserver is answering requests
- `500` only if the endpoint handler itself fails unexpectedly

This endpoint should stay cheap and dependency-light.

### `GET /status` ✅ Implemented

Purpose: combine readiness and detailed status into a single JSON endpoint for dashboards and monitoring.

Checks and output:
- overall status: `ok`, `degraded`, or `fail`
- PM2 state for `access`, `webview`, `updatememberlist`, and `announceEvents`
- member list age and freshness
- error log metadata for each process in `logs/error/`
- app version and process uptime
- enough detail for monitors to decide whether the system is operational without a separate `/readyz`

Response:
- `200 OK` for `ok` and `degraded`
- `503 Service Unavailable` for `fail`
- `500` for unexpected handler failures

## Proposed status rules

- `ok`: `access` is online and `members.csv` is fresh
- `degraded`: the core system still works, but there are warnings such as non-empty error logs
- `fail`: the core system cannot be trusted for normal entry, such as when `access` is offline or the member list is stale/missing

## Suggested implementation order

1. ✅ Add shared monitoring helpers in `webserver/monitoring.js`.
2. ✅ Implement `GET /healthz`.
3. ✅ Implement `GET /status` with both summary and detailed per-process/filesystem health information.
4. Document the endpoint contract in `README.md` once the behavior is finalized.

## Why combine `/readyz` and `/status`

In this app, the checks that determine readiness are almost the same checks an operator would want in a detailed status response:
- PM2 connectivity
- `access` process state
- `members.csv` availability and staleness

Keeping a separate `/readyz` would mostly duplicate logic and response semantics. A single `/status` endpoint can serve both purposes by:
- returning `200` for `ok` and `degraded`
- returning `503` for `fail`
- including a compact top-level summary plus detailed fields for debugging

That leaves `/healthz` as the lightweight liveness endpoint and `/status` as the single operational endpoint.

## Risks and follow-up notes

- Some useful status only exists inside `access.js` memory today, such as the active error map and LCD error type.
- The webserver should not probe GPIO or LCD directly because those are owned by `access.js`.
- A later improvement could have `access.js` publish a small JSON status snapshot for `/status` to read.
- Scheduled jobs like `updatememberlist` and `announceEvents` should not be treated like always-on daemons; their recent run results matter more than whether they are currently `online`.
