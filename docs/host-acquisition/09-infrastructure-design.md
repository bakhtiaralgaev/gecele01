# 09 — Infrastructure Design

## 1. Placement

| Component | Where | Why |
|---|---|---|
| Marketplace web + ops UI | Vercel (existing) | unchanged |
| HAS `api` | Railway (or Fly.io) — 2× shared-cpu instances, EU region (close to Neon eu-central-1) | long-lived Node processes, websocket-free, cheap |
| HAS `worker` | Railway — 2+ instances, `WORKER_FAMILIES` split: `realtime` (conv, send, stt) and `pipeline` (rest) | independent scaling of customer-visible vs batch work |
| HAS `scheduler` | Railway — 1 instance | leader lock makes a second instance safe |
| Postgres | Neon (existing cluster), `acq` schema; pgvector + pg_trgm extensions | one data platform; PgBouncer for workers, direct for migrations/relay |
| Redis | Managed Redis (Railway addon or Redis Cloud, 1 GB, AOF persistence) | BullMQ requires real Redis protocol + persistence for delayed jobs |
| Media | Vercel Blob (public listing photos, existing) + **separate private bucket** (Cloudflare R2 or S3, EU) for identity docs with signed-URL access | sensitive media must not share the public store |
| Anthropic / Places / Graph / Lookup / STT | SaaS | — |

Environments: `dev` (local docker-compose: PG+Redis+mock WA), `staging` (own WA test number, Meta test app, separate Neon branch — Neon branching makes staging data cheap), `prod`. Config via env + `acq.config` table for runtime tunables.

## 2. Networking & exposure

- Public: only `api` (webhooks + admin API). Workers/scheduler have **no inbound ports**.
- TLS everywhere; HSTS; webhook path exempt from auth but HMAC-verified.
- Egress allowlist (platform-level where supported): Meta, Anthropic, Google, Twilio, STT, Neon, Redis, blob.

## 3. Observability

| Layer | Tool | Detail |
|---|---|---|
| Traces | OpenTelemetry SDK → Grafana Cloud Tempo (or Axiom) | webhook→outbox→queue→worker→LLM spans; `traceparent` rides in job payloads; agent_run stores trace id |
| Metrics | OTel metrics → Grafana Cloud | queue depth/age, WA send outcomes, quality rating, LLM tokens/cost/latency per agent, funnel counters, DLQ depth, outbox lag, review SLA |
| Logs | pino JSON → Grafana Loki | PII-redacted (08 §4); request/job correlation ids |
| Errors | Sentry | api + workers, release-tagged |
| Uptime | external probe on `/healthz` (api) + heartbeat metric per worker family | scheduler emits liveness beacon; missing 3 beats → page |
| LLM QA | agent_run dashboards + A9 weekly report | drift, cost, confidence distributions |

**Alert policy (page vs ticket):** page on — webhook 5xx > 1% (5 min), outbox lag > 60 s, `conv.turn` oldest age > 3 min, DLQ growth, WA quality = Low, spend breaker tripped, Redis/PG down. Ticket on — review-queue SLA breach, nightly job failure, STT error spikes.

## 4. Resilience & DR

- **State lives in Postgres** (Neon PITR restore, plus nightly logical dump of `acq` to blob). Redis AOF persistence; total Redis loss ⇒ reconcilers rebuild queue state from DB (delayed follow-ups re-derived from `followup` table — this is why cadence lives in DB, not only as delayed jobs).
- Blob: R2/S3 versioning on the sensitive bucket.
- RTO targets: api 15 min (redeploy), workers 15 min, Redis 30 min (new instance + reconcile), Postgres per Neon PITR. RPO: ≤ 5 min (WAL), media ≈ 0 (object store).
- Vendor outage playbooks: Anthropic down → 08 §6 fallback template mode; Meta webhook outage → Meta redelivers + reconciler pulls message status; Neon down → full stop (accepted; it's already the marketplace's SPOF).

## 5. CI/CD

GitHub Actions: lint + typecheck + unit + integration (testcontainers PG/Redis) + **eval gate** (golden set must not regress) → build single image → deploy staging → smoke (webhook echo, queue round-trip, canary conversation against mock WA) → manual promote to prod. DB migrations run pre-deploy with `directUrl`; expand-migrate-contract discipline for schema changes. Prompts deploy with the same pipeline (they're in the image); prompt-only changes still pass the eval gate.
