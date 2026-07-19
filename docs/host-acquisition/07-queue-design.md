# 07 — Queue Design

BullMQ on Redis. Postgres outbox feeds the queues; queues feed workers; workers write Postgres and emit new outbox events. Redis is **transport + coordination only** — it can be flushed and the system recovers from Postgres (reconcilers re-enqueue in-flight work).

## 1. Queue topology

| Queue | Consumes | Concurrency/instance | Rate limit | Attempts / backoff | Notes |
|---|---|---|---|---|---|
| `discovery` | source run jobs | 2 | per-source API budget | 3 / exp 30s→5m | long jobs; heartbeat-extended locks |
| `verify` | `verify.lead.requested` | 10 | Lookup budget 10/s | 5 / exp 5s→2m | cheap, high volume |
| `score` | nightly batch fan-out | 5 | — | 3 / exp | Batches API job poller |
| `conv.turn` | `conv.turn.requested` | 8 | — | 4 / exp 3s→1m | **grouped by conversation_id** (see §6) |
| `wa.send` | `wa.message.send_requested` | 4 | global token bucket 70/s; per-recipient 1/2s | 6 / exp 2s→10m | the only path to WA messages API |
| `stt` | audio media | 4 | provider budget | 3 / exp | |
| `onboard` | checklist/media events | 6 | — | 4 / exp | |
| `photo` | media QA | 6 | — | 3 / exp | vision calls |
| `listing.gen` | generate requests | 4 | — | 3 / exp 10s→5m | |
| `fraud` | signal fan-out + adjudication | 4 | — | 4 / exp | fan-out/fan-in via BullMQ flow (parent job) |
| `publish` | approved drafts | 2 | — | 5 / exp 5s→5m | idempotent DB function; serialized per contact |
| `followup` | due follow-ups | 4 | shares `wa.send` guard | 4 / exp | dispatcher scans DB, enqueues sends |
| `analytics` | analytics events, rollups | 4 | — | 5 / exp | at-least-once into append-only facts |
| `system` | outbox relay, reconcilers, retention, revenue sync | 1–2 | — | ∞ with cap 15m | relay is the heartbeat of the system |

Every queue has a paired DLQ (`<name>.dlq`). Poison rule: after max attempts → DLQ with full job + error chain; DLQ depth > 0 alerts; ops can requeue from admin after fix.

## 2. Job anatomy

```jsonc
{
  "jobId": "evt_01H…",            // = outbox event_id → BullMQ dedupes duplicate relays
  "name": "verify.lead.requested",
  "data": {
    "eventId": "evt_01H…",
    "occurredAt": "…",
    "payload": { "leadId": "…" },
    "traceparent": "00-…"          // OTel context propagation
  }
}
```

`jobId = event_id` gives transport-level dedupe; `acq.consumed_event (consumer, event_id)` gives consumer-level exactly-once effects (insert-first; unique violation → job already done → ACK and exit).

## 3. Outbox relay

- Poll `acq.outbox WHERE relayed_at IS NULL ORDER BY id LIMIT 100` with `FOR UPDATE SKIP LOCKED`, every 250 ms (adaptive: back off to 2 s when idle).
- Add jobs to target queues (topic → queue routing table), then set `relayed_at` in the same transaction as the poll claim. Crash between add and mark → duplicate add → collapsed by `jobId`.
- Lag metric: `now() − min(created_at) WHERE relayed_at IS NULL`; alert > 30 s.

## 4. Retry philosophy

- **Transient** (network, 429/5xx, lock timeout): retry with exponential backoff + full jitter; caps per table above.
- **Permanent** (validation, business-rule rejection): no retry — job succeeds with a *negative outcome event* (e.g. `verify.lead.completed{status:rejected}`). Failures are for infrastructure, outcomes are for business.
- **Compensation over rollback**: cross-system flows (e.g. host user created but listing publish failed) are resumed forward by reconcilers, never rolled back.
- Backoff for `conv.turn` is deliberately short-capped (1 m): a stuck conversation is a customer-visible failure; after 4 attempts → DLQ **and** auto-handoff to human so the host is never stranded.

## 5. Idempotency inventory (the actually-hard part)

| Side effect | Key | Mechanism |
|---|---|---|
| WA send | `turn_id` (or followup id) | `message.idempotency_key` unique index checked before API call; WA send result stored with wamid |
| LLM call | job attempt | safe to repeat (pure); cost recorded per attempt — retries are visible in spend metrics |
| Publish | `draft_id` | `publish_listing()` guard on `marketplace_listing_id IS NULL FOR UPDATE` |
| Host user creation | `contact_id` | upsert by phone via `publish_host()` |
| Stage change | event id | `consumed_event` ledger + state-machine legality check (illegal = no-op) |
| Follow-up scheduling | `(contact, kind, due bucket)` | unique partial index prevents double cadence |
| Analytics | event id | append-only with event id column dedupe on rollup |

## 6. Ordering: per-conversation serialization

Requirement: two turns of one conversation must never interleave; different conversations must run in parallel.

Mechanism: BullMQ **group semantics** (BullMQ Pro groups by `conversation_id`; if staying on OSS BullMQ, equivalent: a per-conversation Redis mutex — `SET conv:{id}:lock NX PX 120000` — with lock-holder re-enqueueing follow-on work, plus the debounce buffer below). The debounce buffer itself is Redis: inbound messages `RPUSH conv:{id}:buf` + `PEXPIRE`; a delayed job fires after 6 s of silence and drains the buffer into one turn.

`publish` is serialized per contact the same way (one host publishing two drafts concurrently must not double-create the marketplace user).

## 7. Scheduled jobs (repeatable)

| Cron (Asia/Baku) | Job | Purpose |
|---|---|---|
| `*/1 * * * *` | followup dispatcher | scan due `followup` rows → enqueue sends (guarded) |
| `*/5 * * * *` | reconciler: sends | `send_requested`>10 min without terminal status → re-check/rescue |
| `*/10 * * * *` | reconciler: stuck stages | onboarding idle 48h → nudge; conversations awaiting AI > 5 min → re-enqueue turn |
| `0 * * * *` | quality guard | WA quality rating + block-rate poll → auto-throttle sends on Medium |
| `0 2 * * *` | nightly scoring | assemble features → Batches API → apply on completion |
| `0 3 * * *` | revenue sync | marketplace bookings/commission → `contact.lifetime_revenue_qepik`, analytics |
| `0 4 * * *` | metrics rollup | refresh `metrics_daily` materialized view |
| `30 4 * * *` | retention | purge `raw_discovery_item` per `purge_after`; identity docs 30d post-decision; partition maintenance (create next month, archive/detach expired) |
| `0 5 * * 1` | QA sampler | weekly conversation sample → Opus batch grading |
| `0 6 1 * *` | registry refresh | tourism registry re-import |

Scheduler is leader-elected (Redis `SET sched:leader NX PX 30000` heartbeat); repeatable-job registration is idempotent by job key.

## 8. Backpressure & load shedding

- Queue depth and **oldest-job age** exported per queue; autoscaling keys on age (depth alone lies when jobs are slow).
- `wa.send` is the deliberate bottleneck (Meta caps + quality protection); upstream `conv.turn` inherits backpressure naturally because turns wait on prior sends per conversation.
- Overload mode (config): when `conv.turn` age > 2 min, non-conversation queues (`score`, `analytics`, `photo`) drop concurrency 50% — protect the customer-visible path first.
- Redis sizing: jobs are pointers (IDs), payloads live in Postgres; even 1M queued jobs ≈ tens of MB.
