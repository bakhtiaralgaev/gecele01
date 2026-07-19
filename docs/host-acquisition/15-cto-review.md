# 15 — Final CTO Review

The uncomfortable questions, asked before someone else asks them.

## 1. Where this design is right

- **Compliance-first funnel.** The single most common failure of "AI WhatsApp growth" systems is building on cold outreach and losing the number. Structuring the funnel around user-initiated + opted-in conversations is slower for the first month and dominant every month after.
- **Deterministic core, LLM edges.** Money, identity, publishing, and rate limits never depend on model behavior. Every scary failure mode has a code-level gate in front of it.
- **Outbox + DB state machines.** Boring, proven, debuggable. Redis can die; the business state can't.
- **Confidence gate calibrated against humans, not vibes.** The 95-threshold is earned from labeled agreement data in Stage B, not asserted.
- **The eval harness is the moat.** Azerbaijani conversational quality is the differentiator no competitor copies by switching API keys.

## 2. Where this design is vulnerable (honest self-criticism)

1. **It's a lot of system for a pilot.** ~30 tables, 14 queues, 10 agents. A two-person team can drown in their own architecture. → Answered by the lean v1 cut in §4; the docs deliberately separate *design completeness* from *build order*.
2. **BullMQ + hand-rolled sagas vs Temporal.** Long-lived, multi-step, human-interleaved workflows (onboarding especially) are exactly what durable-execution engines are for. I chose BullMQ + DB state machines + reconcilers for operational simplicity on a small team, at the price of writing reconcilers by hand. **Trigger to revisit:** when reconciler bugs cause >1 incident/quarter or workflow count > ~20, adopt Temporal Cloud and migrate onboarding first.
3. **The 6-second debounce and per-conversation locks are subtle.** Distributed debounce + group serialization is the most bug-prone code in the system (double replies, stuck locks). Mitigation is heavy integration tests, but complexity is real. Alternative considered: turn-taking via single-partition-per-conversation consumers (Kafka-style) — heavier infra, cleaner semantics; rejected for v1.
4. **One conversation agent with playbook switching vs specialist agents.** One agent keeps relationship continuity and one prompt to master; the risk is prompt bloat as playbooks accumulate. If L1–L3 exceeds ~10k tokens or eval scores diverge by playbook, split into sales/onboarding agents sharing persona + memory.
5. **Composite confidence formula is invented, not learned.** The weights in 03 §7 are priors. They *must* be re-fit on Stage-B labeled data (simple logistic regression on human approve/reject beats hand weights). The design anticipates this but v1 ships with priors — a known softness.
6. **Marketplace coupling via shared cluster.** Cheap joins now, migration debt later. The no-cross-FK rule and publish-function doorway keep the exit clean, but analytics queries will quietly grow cross-schema joins unless reviewed. Lint rule + quarterly audit.
7. **CAC math is assumption-stacked.** Booking frequency, activation rate, CTWA conversion are guesses until pilot data exists. The 11 §6 ROI could be off 3× either way; that's why Stage gates are evidence-based, not calendar-based.
8. **I designed for Azerbaijan-scale and said so.** If the true ambition is multi-country at Airbnb pace, the right calls change: Temporal from day 1, dedicated data warehouse, KYC vendor immediately, and a bigger team. Stated in 12 §6 rather than silently over-building.

## 3. Alternatives considered and rejected (with reversal triggers)

| Decision | Rejected alternative | Why rejected | Reverse if |
|---|---|---|---|
| Custom CRM in `acq` schema | Buy (HubSpot/Chatwoot/respond.io) | Off-the-shelf can't hold our funnel semantics, confidence gates, or agent tool-writes; per-seat pricing fights an agent-first model | If build stalls pre-pilot, respond.io + spreadsheets is an acceptable 6-week stopgap |
| Meta Cloud API direct | Twilio/360dialog BSP | Direct is cheaper, first-party, feature-complete | If Meta business verification blocks > 4 weeks, BSP unblocks faster |
| BullMQ | Temporal / pg-boss / SQS | See §2.2; pg-boss lacks rate-limiter/groups; SQS pulls us into AWS ops | Temporal per trigger above |
| Anthropic hybrid | OpenAI / dual-vendor / open-source | Tool-use discipline + one eval surface; dual-vendor doubles maintenance | AZ eval verdict decides; port keeps switch cheap |
| Monorepo sibling service | Separate repo / microservices | Atomic type sharing, one CI, team of 1–2 | Team > ~8 or independent release cadences |
| pgvector | Dedicated vector DB | Corpus is small; one database to operate | Corpus > 5M vectors or recall issues |
| Ops-assisted import for Tap/Bina | Scraping pipeline | ToS/legal risk concentrated exactly where volume tempts you | Only via partnership/licensing |

## 4. What I would actually build first (the lean v1 — 6 weeks)

The full design is the destination. The first shippable slice is:

**Weeks 1–2:** WA webhook + send guard + conversation/message tables + ops takeover UI (shadow mode from day one) + referral links + CTWA campaign live. *Humans converse, system records.*
**Weeks 3–4:** Conversation agent A4 (sales playbook only) drafting in shadow; golden-set evals; opt-out + caps; follow-up scheduler.
**Weeks 5–6:** Onboarding checklist (photos, location, pricing, rules) with human identity/bank verification; listing draft via A7; **all publishes human-approved**; minimal dashboard (leads, conversations, published, cost).

Deferred from v1: Google Places + IG discovery (weeks 7–8), automated fraud pipeline (rules-only checklist first), auto-publish gate (needs Stage-B data anyway), QA sampler automation (manual weekly review first), analytics rollups beyond the minimal dashboard. Nothing in the deferral list blocks revenue; everything in v1 does.

This ordering front-loads the two irreplaceable assets: **a warmed, high-quality WA number** and **a corpus of graded Azerbaijani conversations**. Both take calendar time no amount of engineering can compress — so they start in week 1.

## 5. Final verdict

| Dimension | Grade | Note |
|---|---|---|
| Compliance & channel durability | A | The funnel survives audits and policy shifts |
| Fault tolerance & idempotency | A− | Outbox/state machines solid; debounce/locking is the watch-item |
| AI architecture | A− | Right tiering and guardrails; confidence weights need data |
| Cost realism | B+ | AI cost is honestly small; ad/ops assumptions need pilot validation |
| Complexity vs team size | B | Full design over-serves a pilot; §4 cut is the real plan |
| Security & privacy | A− | Strong by design; execution discipline (log redaction, doc retention) must be verified in review |

**Ship the §4 lean v1 against this design.** The architecture documents are the map; the lean v1 is the first road. Approved to proceed to implementation planning.
