# Gecələ — AI Host Acquisition System (HAS)

**Status:** Design complete — no code yet (by design)
**Owner:** Growth / Platform Engineering
**Scope:** End-to-end automated supply acquisition: discover property owners → verify → engage on WhatsApp in natural Azerbaijani → negotiate → onboard → generate listings → fraud-check → publish → follow up. 24/7, event-driven, with humans only where confidence is below threshold.

---

## Why this exists

Gecələ's growth is supply-constrained. Every new qualified host adds inventory that compounds: more listings → more search coverage → more bookings → more referral hosts. Today host acquisition is manual (calls, DMs, spreadsheets). This system industrializes it the way Uber industrialized driver acquisition and Airbnb industrialized supply ops — but with 2026 tooling: LLM agents doing the conversation work, deterministic pipelines doing the trust work, and humans doing only the judgment work.

**North-star metric:** published, bookable listings per week from AI-originated conversations.
**Guardrail metrics:** WhatsApp quality rating (must stay High), spam complaint rate < 0.1%, fraud slip-through = 0.

## Non-negotiable design principles

1. **Compliance-first acquisition.** No scraping that violates platform ToS, no cold WhatsApp marketing without opt-in (Meta policy), no storage of Google Places data beyond allowed caching windows. Growth built on policy violations dies at the worst possible moment (number ban mid-campaign). Every source has a documented legal basis — see `01-system-architecture.md §3` and `13-risks.md`.
2. **Event-driven, queue-mediated, idempotent.** No agent calls another agent directly. Everything flows through Postgres (source of truth) → outbox → BullMQ. Every consumer is safe to re-run.
3. **Deterministic where possible, LLM where necessary.** Phone validation, dedupe, IBAN checks, rate limits, publish gates are code. Conversation, extraction, copywriting, judgment calls are models. The LLM never holds authority over money, identity, or publishing — it proposes; code and (below threshold) humans dispose.
4. **Confidence-gated autonomy.** Composite confidence ≥ 95 → auto-publish. Below → human review queue. Certain actions are *always* human-reviewed regardless of confidence (first listing of a new host, identity documents, payout details changes, blacklist overrides).
5. **The conversation is the product.** The WhatsApp agent must read as a competent, warm Gecələ təmsilçisi (representative) writing natural Azerbaijani — never a template robot. Prompt design, eval harness, and native-speaker review loops are first-class (see `04-prompt-design.md`).

## Document map

| # | Document | Contents |
|---|----------|----------|
| 01 | [System Architecture](01-system-architecture.md) | Components, event flow, all workflows (mermaid), state machines, source compliance matrix |
| 02 | [Database Design](02-database-design.md) | Every table (DDL), relationships, indexes, partitioning, retention, ERD |
| 03 | [Agent Design](03-agent-design.md) | Agent roster, responsibilities, tools, model selection (Claude/hybrid) with pricing rationale |
| 04 | [Prompt Design](04-prompt-design.md) | Layered prompt architecture, full Azerbaijani prompts, objection playbook, injection defense, evals |
| 05 | [Folder Structure](05-folder-structure.md) | Monorepo layout, module boundaries, shared packages |
| 06 | [API Design](06-api-design.md) | Webhooks (WhatsApp, Meta ads, referrals), internal admin API, auth, idempotency |
| 07 | [Queue Design](07-queue-design.md) | Queue topology, retry/backoff/DLQ, outbox, per-lead ordering, cron schedule |
| 08 | [Security Design](08-security-design.md) | Threat model: spam, prompt injection, data leakage, abuse, rate limits, PII handling |
| 09 | [Infrastructure Design](09-infrastructure-design.md) | Runtime placement, Redis/Postgres/Blob, observability, backups |
| 10 | [Production Deployment Plan](10-deployment-plan.md) | Shadow → assisted → autonomous rollout, WA number warm-up, go/no-go gates, runbooks |
| 11 | [Cost Estimation](11-cost-estimation.md) | AI cost per conversation, WhatsApp fees, infra, CAC, ROI model |
| 12 | [Scaling Strategy](12-scaling-strategy.md) | Bottleneck order, WA tier limits, worker scaling, data partitioning, geo expansion |
| 13 | [Risks](13-risks.md) | Risk register with severity, likelihood, mitigations, kill-switches |
| 14 | [Improvements](14-improvements.md) | Post-v1 roadmap |
| 15 | [Final CTO Review](15-cto-review.md) | Self-criticism, alternatives considered, the leaner v1 I actually recommend shipping first |

## Executive summary of key decisions

| Decision | Choice | Alternatives considered (see 15) |
|---|---|---|
| Runtime | Separate Node.js/TypeScript service (`services/acquisition`) on Railway/Fly.io; marketplace app stays on Vercel | In-app Next.js API routes (rejected: no long-running workers), Python service (rejected: team stack) |
| Database | Same Neon Postgres cluster, dedicated `acq` schema, own Prisma client | Separate DB (deferred until scale), MongoDB (rejected) |
| Queue | BullMQ on managed Redis; Postgres outbox for exactly-once handoff | pg-boss (leaner, weaker rate-limiting), Temporal (better, heavier — revisit at scale), SQS |
| Messaging | Meta WhatsApp Business Cloud API, direct | Twilio WA (simpler, +$ markup), 360dialog |
| LLM vendor | Anthropic Claude, hybrid tiering: Sonnet 5 (conversation/generation), Haiku 4.5 (classification/extraction), Opus 4.8 (fraud adjudication, QA sampling) | GPT (viable; chosen against for tool-use reliability + our eval results needed), open-source AZ fine-tune (not yet — data first) |
| Embeddings | Multilingual text embeddings for dedupe/similarity + pHash for image dedupe | — |
| Top of funnel | Google Places API, Instagram Graph Business Discovery, Click-to-WhatsApp ads, referral program, tourism registry open data, ops-assisted import for Tap.az/Bina.az (no scraping) | Scraping (rejected: ToS + legal risk) |
| Human-in-loop | Review queue in existing admin panel; composite confidence gate at 95 | Fully autonomous (rejected for trust reasons) |

## Glossary

- **Lead** — a candidate property owner not yet in a conversation.
- **Contact** — a lead with a verified reachable channel (usually WhatsApp).
- **Stage** — funnel position: `discovered → verified → contacted → engaged → qualified → negotiating → onboarding → listing_ready → published → active_host` (+ terminal `lost`, `blacklisted`, `opted_out`).
- **HAS** — this system (Host Acquisition System).
- **CTWA** — Click-to-WhatsApp ads (Meta ad unit whose CTA opens a WA conversation — the compliant way to *start* WA threads at scale).
- **Composite confidence** — weighted score from deterministic checks + model scores that gates auto-publish (defined in `03-agent-design.md §7`).
