# 12 — Scaling Strategy

## 1. What actually breaks first (in order)

Scaling this system is **not** a compute problem for a very long time. The real ceilings, in the order they arrive:

1. **WhatsApp messaging tier & quality.** Meta caps business-initiated conversations per rolling 24h (1k → 10k → 100k tiers, raised on volume+quality). Mitigations: keep the funnel biased to *user-initiated* conversations (CTWA, referral — uncapped service traffic); maintain High quality (08 §2); pre-warm a second number per use-case (marketing vs utility split) before hitting 80% tier utilization. Multi-number is an architectural day-1 affordance: `phone_number_id` is a column on sends, not a constant.
2. **Human review throughput.** At 250 publishes/mo with hard-review flags, the queue is the bottleneck long before servers. Mitigations: keep raising gate precision (every override is training signal), batch-review UI (side-by-side diffs), delegate identity checks to a KYC vendor at volume (14 §3).
3. **LLM rate limits & spend.** Anthropic tier limits (RPM/TPM) hit around thousands of concurrent conversations. Mitigations: usage-tier increases, Batches for all non-realtime work, per-family token budgets, prompt-cache discipline, and (later) a fine-tuned small model for A4's routine turns (14 §5).
4. **Postgres.** Partitioned hot tables + HNSW indexes are fine to ~10M leads / ~100M messages on Neon. Next steps in order: read replica for analytics/admin queries → move `analytics_event` to ClickHouse/Tinybird → only then consider splitting HAS into its own cluster (the schema boundary makes this a lift-and-shift).
5. **Redis.** Job pointers only; a 4 GB instance carries millions of queued jobs. Cluster mode is a config change with BullMQ prefix sharding if ever needed.

## 2. Horizontal scaling mechanics

- **api**: stateless → replicas behind the platform LB; webhook path is O(1) DB writes.
- **workers**: scale per family on queue *age* (07 §8). Conversation family scales on `conv.turn` p95 age > 30 s; pipeline family on backlog hours. Every consumer is idempotent, so scale-out is safe by construction.
- **scheduler**: never needs scaling (leader-elected).
- **Per-conversation ordering** shards naturally: group key = conversation id → adding workers adds parallel conversations, never parallel turns of one conversation.

## 3. Data scaling

- Monthly partitions (already designed) + automated partition lifecycle: create ahead, archive to parquet-on-blob at 24 months, detach+drop.
- `metrics_daily` and dashboard read-models are the only cross-partition scans, and they run nightly, not per request.
- Embedding search: HNSW rebuild windows scheduled off-peak; if lead corpus > 5M, move vectors to a dedicated store (pgvector on replica or Qdrant) behind the existing `dedupe` port.

## 4. Organizational scaling

- Playbook editing moves from engineers to growth ops (prompt registry + eval gate makes this safe: non-engineers edit playbooks/knowledge, CI evals + canary protect quality).
- Review specialization: fraud reviewers vs onboarding reviewers vs conversation QA — the `review_task.kind` field already routes this.
- On-call: one rotation owns HAS (api+workers+queues); WA quality guardian alerts route to growth ops, infra alerts to engineering.

## 5. Geographic expansion (Georgia, then beyond)

The design is AZ-first but parameterized where it matters: language packs (persona/playbooks/knowledge per locale), phone/geo validation per country, region polygons, WA numbers per market, per-market config namespaces, and per-market kill-switches. Costs scale linearly per market; the agent architecture, queues, and schema don't change. The one genuinely new per-market cost: native-speaker content + eval sets — budget it, don't skip it (that's the moat).

## 6. "Millions of users" sanity check

The brief says design as if for millions. For honesty's sake: **hosts** in Azerbaijan are a market of tens of thousands — HAS at national saturation is ~10⁴ contacts, ~10⁶ messages/yr. The architecture above absorbs 100× that (queue-sharded workers, partitioned storage, stateless api) without redesign; the *guest-side* millions live in the marketplace app, which is out of HAS scope. Designing HAS itself "for millions of hosts" would be over-engineering — see the CTO review (15 §2) for what I deliberately did *not* build because of this.
