# 06 — API Design

Two surfaces: **inbound webhooks** (Meta) and the **internal admin API** (consumed only by the ops UI in `apps/web/admin/acquisition`). There is deliberately **no public API** in v1 — hosts interact via WhatsApp and the marketplace, not via HAS endpoints.

## 1. Conventions

- Base: `https://acq.gecele.az` (service domain). JSON everywhere; errors use a single envelope:
  ```json
  { "error": { "code": "REVIEW_TASK_ALREADY_CLAIMED", "message": "…", "traceId": "…" } }
  ```
- IDs are opaque strings. Pagination: cursor-based (`?cursor=&limit=` ≤ 100, response `{items, nextCursor}`). Timestamps ISO-8601 UTC.
- All mutating admin endpoints require an `Idempotency-Key` header (stored 24 h; replay returns the original response).
- Versioning: URL prefix `/v1`; additive changes only within a version.

## 2. Webhooks (Meta → HAS)

### 2.1 WhatsApp Cloud API

```
GET  /v1/webhooks/whatsapp        # Meta verification handshake (hub.challenge echo)
POST /v1/webhooks/whatsapp        # messages + statuses
```

Processing contract (must hold under load):
1. Verify `X-Hub-Signature-256` (HMAC of raw body with app secret). Fail → 401, no processing.
2. Insert into `acq.webhook_event` (PK = provider event id → duplicate deliveries collapse).
3. For messages: upsert `acq.message` keyed by `wamid`; write outbox `wa.message.received`. For statuses: update message status; failed statuses also emit `wa.message.failed`.
4. Return `200` — target p99 < 200 ms. **No LLM, no external calls, no heavy queries in the webhook path.** Meta retries on non-2xx and disables webhooks that are slow/flaky; the queue absorbs everything else.
5. CTWA attribution: the message `referral` object (ad id, source URL) is stored on the contact's first message and copied into `lead.attributes.ctwa`.

### 2.2 Meta Ads / Leadgen (optional, if lead-form ads are used)

```
POST /v1/webhooks/meta-leadgen    # signed the same way; creates lead(source=ctwa)
```

### 2.3 Referral entry

```
GET  /v1/r/:code                  # referral link → 302 to wa.me deep link with prefilled text;
                                  # records referral click (bot-filtered: UA + rate heuristics)
```

## 3. Admin API (ops UI → HAS)

Auth: the ops UI's server-side routes call HAS with a service token (`Authorization: Bearer <service JWT>`, short-lived, minted by the web app backend; ops user id carried in `X-Acting-User`). HAS enforces role scopes: `ops.viewer`, `ops.agent`, `ops.approver`, `ops.admin`. Nothing here is reachable from browsers directly.

### 3.1 CRM

```
GET    /v1/leads?stage=&region=&scoreMin=&source=&q=&cursor=
GET    /v1/leads/:id                        # lead + scores + events timeline
POST   /v1/leads/:id/stage                  # manual stage override {stage, reason} (ops.agent)
GET    /v1/contacts/:id                     # contact + tags + notes + conversations + revenue
POST   /v1/contacts/:id/tags                # {add:[], remove:[]}
POST   /v1/contacts/:id/notes               # {body, pinned}
POST   /v1/contacts/:id/followups           # schedule manual follow-up
DELETE /v1/followups/:id                    # cancel
POST   /v1/contacts/:id/opt-out             # manual suppression (ops.agent)
```

### 3.2 Conversations

```
GET  /v1/conversations?state=&needsAttention=&cursor=
GET  /v1/conversations/:id/messages?cursor=          # full transcript incl. agent_run links
POST /v1/conversations/:id/takeover                  # human_driving: AI paused, ops types
POST /v1/conversations/:id/release                   # back to AI with a context note
POST /v1/conversations/:id/messages                  # ops-authored send (goes through send guard too)
```

### 3.3 Review queue (Phase 9)

```
GET  /v1/review-tasks?status=open&kind=&cursor=      # sorted priority, sla_due_at
POST /v1/review-tasks/:id/claim
POST /v1/review-tasks/:id/approve                    # {note?} → resumes pipeline (e.g. publish)
POST /v1/review-tasks/:id/reject                     # {reason, blacklist?: boolean}
```

Approve/reject are the *only* human write-path into the pipeline; both emit `review.task.resolved` and are recorded in `lead_event` + marketplace-style audit log.

### 3.4 Ops import (Tap.az / Bina.az assisted)

```
POST /v1/ops-import                                  # {url} → fetch single page, extract (A10),
                                                     # return preview {name, phone, region, type}
POST /v1/ops-import/confirm                          # creates lead(source=ops_import) → verification
```

### 3.5 Metrics & config

```
GET  /v1/metrics/summary?from=&to=                   # Phase-10 dashboard payload:
     # dailyLeads, qualifiedLeads, conversionByStage, avgFirstResponseSec,
     # bookingsGenerated, revenueQepik, costPerHost, aiCostUsd, waCostUsd, roi
GET  /v1/metrics/funnel?cohort=week
GET  /v1/metrics/ai?groupBy=agent|model|day          # tokens, cost, cache hit rate, latency
GET  /v1/config                                      # kill-switches & tunables
PUT  /v1/config/:key                                 # ops.admin only; audited
```

## 4. Outbound calls (HAS → external) — client contracts

| Client | Endpoint family | Constraints handled in the adapter |
|---|---|---|
| WhatsApp Cloud API | `POST /{phone_id}/messages`, media download | token bucket ≤ 80 msg/s (config), 24h-window check, template fallback, error-code mapping (131047 re-engagement → template path; 131056 pair rate limit → backoff) |
| Anthropic | Messages API + Batches | retries on 429/529, budget guard (max spend/hour), prompt-cache alignment, usage → `agent_run` |
| Google Places | Text Search / Details | quota budget per run, field masks (cost control), `purge_after` stamping |
| IG Graph | Business Discovery / Hashtag | app-level rate budget, backoff on 4xx |
| Twilio Lookup | v2 lookup | cache results 90 days (numbers don't change often) |
| STT | audio transcribe | 16 MB cap, AZ language hint, confidence out |

## 5. Dashboard read model

The metrics endpoints read only from `acq.metrics_daily` + small targeted queries — never scan raw partitions at request time. Definitions (single source of truth for Phase 10):

| Metric | Definition |
|---|---|
| Daily Leads | `lead` created that day (any source) |
| Qualified Leads | stage reached `qualified` that day |
| Conversion Rate | published / contacted, cohorted by contact week |
| Avg Response Time | mean(first outbound − inbound) per conversation, business-hours normalized |
| Bookings Generated | marketplace bookings on HAS-published listings |
| Revenue | commission on those bookings (ledger join, nightly) |
| Cost Per Host | (WA + AI + ads + attributable infra) / published hosts, monthly |
| AI Cost | Σ `agent_run.cost_microusd` |
| ROI | commission revenue ÷ acquisition cost, cohorted |
