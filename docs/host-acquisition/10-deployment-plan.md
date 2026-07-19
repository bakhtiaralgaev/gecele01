# 10 — Production Deployment Plan

Autonomy is **earned in stages**, per capability, with explicit go/no-go gates. The rollout dimension is not "deploy the code" (that's a day) — it's "let the AI act unsupervised" (that's weeks of evidence).

## 0. Prerequisites (Week 0–1)

- Meta Business verification complete; WhatsApp Business number provisioned (a **dedicated** number — never the founders' number), display name approved, Cloud API webhook live in staging.
- Templates (04 §6) submitted for approval (lead time: days).
- Legal sign-off: privacy policy update (processors, WA channel), opt-in wording, identity-doc handling, ops-import stance for Tap.az/Bina.az.
- Infra stood up per 09; kill-switches tested (flip each, observe effect ≤ 5 s).
- Golden-set evals green; native-speaker review of all playbooks/templates done.

## 1. WhatsApp number warm-up (Week 1–3, overlaps)

New numbers start with low messaging tiers and no reputation. Plan: weeks 1–2 inbound-only (CTWA small budget + referral links) with AI in **shadow mode**; organic outbound growth ≤ 50 unique recipients/day initially; monitor quality rating daily; scale CTWA budget only while quality = High. Never buy lists, never import cold numbers (that's the ban path).

## 2. Stage A — Shadow mode (Week 2–4)

AI drafts everything; humans send everything.

- Ops sees the AI draft next to every inbound (takeover UI); one click sends, or edits-then-sends (edit distance recorded — the core quality metric).
- Full pipeline runs for real except: `sends.enabled=false` for AI-originated, `autopublish.enabled=false` (all drafts → review queue).
- **Exit gate**: ≥ 200 conversations; ≥ 85% drafts sent unedited or trivially edited; zero policy violations in QA review; injection suite green in prod configuration.

## 3. Stage B — Assisted autonomy (Week 4–8)

AI sends its own replies in-conversation; humans still gate all outbound *initiations* and all publishes.

- `sends.enabled=true` for replies within the 24h service window; templates/follow-ups still human-approved batch-wise.
- Human review of 100% of publishes continues (calibrating the composite-confidence gate against human decisions — we need ≥ 300 labeled publish decisions before trusting 95).
- **Exit gate**: handoff rate < 15%; complaint/block rate < 0.1%; quality rating High for 21 consecutive days; publish-gate agreement (gate says ≥95 ⇄ human approves) ≥ 98% on trailing 200 drafts.

## 4. Stage C — Autonomous with gates (Week 8+, the target state)

- Auto-send: replies + scheduled follow-ups (caps enforced).
- Auto-publish: composite ≥ 95 AND no hard-review flag (hard flags stay human forever by policy: first listing per host, identity, payout changes, fraud ≥ 40).
- Humans handle: review queue (SLA 4 business hours), handoffs, QA reports.
- Weekly ops review: funnel, edit-distance drift, QA rubric, cost per host.

## 5. Scope ramp

Pilot **one region** (e.g. Qəbələ–İsmayıllı corridor: high demand, dense supply, manageable volume) → 3 regions → national. Discovery sources activate in order of cleanliness: referrals + inbound + CTWA (day 1), tourism registry (week 2), Google Places (week 3), IG discovery (week 4), ops-import (after legal sign-off).

## 6. Runbooks (must exist before Stage B)

| Incident | First moves |
|---|---|
| WA quality drops / number restricted | `sends.enabled=false` marketing; audit last 48h sends; appeal via Meta; activate backup number (pre-provisioned, warm) for service traffic only |
| Injection / wrong-promise incident | pull conversation via trace id; `ai.enabled=false` if systemic; customer make-good policy; add eval case + guard rule |
| Spend runaway | breaker already tripped (08 §6); find agent via cost dashboard; fix; backfill queued work |
| PII exposure | rotate affected credentials; scope query via audit log; legal notification path |
| Publish of fraudulent listing | unpublish via marketplace admin; blacklist; post-mortem on which signal missed; re-run adjudicator on lookalikes |
| Redis loss | restart from AOF or fresh; reconcilers rebuild (09 §4); verify follow-up dedupe after |

## 7. Go/no-go summary

| Gate | Metric | Threshold |
|---|---|---|
| Shadow → Assisted | unedited-draft rate | ≥ 85% |
| Assisted → Autonomous sends | complaint rate / quality | < 0.1% / High 21d |
| Autonomous publishes | gate-human agreement | ≥ 98% on 200 drafts |
| Any stage rollback | any guardrail breach | instant via kill-switch, investigate, re-earn |
