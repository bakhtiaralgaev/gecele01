# 11 — Cost Estimation

All figures USD/month unless noted. Two scenarios: **Pilot** (1 region) and **Scale** (national). Vendor prices move — the model matters more than the digits; every unit price below is an assumption to re-verify at implementation time (Meta's WA rate card and Google Places SKUs especially).

## 1. Volume assumptions

| Variable | Pilot | Scale (×10) |
|---|---|---|
| New leads/mo | 1,000 | 10,000 |
| Contacted (score ≥ 70) | 400 | 4,000 |
| Engaged WA conversations | 250 | 2,500 |
| AI turns per engaged conversation (avg) | 12 | 12 |
| Onboardings started | 40 | 400 |
| Listings published | 25 | 250 |

## 2. AI cost (the headline surprise: it's small)

Per-agent token math (standard Sonnet 5 pricing $3/$15 per MTok, cache reads 0.1×; Haiku $1/$5; Opus $5/$25; batch −50%):

| Agent | Unit tokens (in-fresh / in-cached / out) | Unit cost | Pilot volume | Pilot $ |
|---|---|---|---|---|
| A4 conversation turn (Sonnet 5) | 2k / 6k / 400 | ≈ $0.014 | 3,000 turns | 42 |
| A1+A2 verify (Haiku) | 1k / – / 200 | ≈ $0.002 | 1,000 | 2 |
| A3 scoring (Haiku, batch) | 1.5k / – / 150 | ≈ $0.001 | 1,000 | 1 |
| A6 photo QA (Haiku vision) | 1.5k / – / 150 | ≈ $0.002 | 600 photos | 1.5 |
| A5 onboarding extraction (Sonnet) | 3k / 3k / 300 | ≈ $0.018 | 400 items | 7 |
| A7 listing gen (Sonnet) | 6k / – / 1.5k | ≈ $0.04 | 25 | 1 |
| A8 fraud adjudication (Opus) | 8k / – / 1k | ≈ $0.065 | 25 | 2 |
| A9 QA sampling (Opus, batch) | 10k / – / 1k | ≈ $0.038 | 45 convs | 2 |
| Embeddings + STT | — | — | — | 5 |
| Retry/overhead margin (+25%) | | | | 16 |
| **AI total** | | | | **≈ $80** |

**≈ $0.20 of AI per engaged conversation; ≈ $3 of AI per published host.** Scale: ≈ $800/mo. Levers already in the design: prompt caching (>80% of A4 input), Haiku tiering, Batches API, debounced turns.

## 3. Channel & data costs

| Item | Basis (assumed unit prices — verify) | Pilot | Scale |
|---|---|---|---|
| CTWA ad spend | $0.75–1.50 per opened conversation; main growth lever, tunable | 500 | 4,000 |
| WA template messages | marketing ≈ $0.03–0.08, utility ≈ $0.005–0.02 per delivered; in-window replies free | 30 | 300 |
| Google Places API | ~500 detail calls/mo with field masks | 20 | 150 |
| Twilio Lookup | ≈ $0.008/lookup, 90-day cache | 10 | 80 |
| STT minutes | ≈ $0.006/min | 2 | 20 |
| **Channel total** | | **≈ $560** | **≈ $4,550** |

## 4. Infrastructure

| Item | Pilot | Scale |
|---|---|---|
| Railway/Fly (api ×2, workers ×2–6, scheduler) | 60 | 250 |
| Redis (1 GB → 4 GB) | 15 | 60 |
| Neon increment (storage/compute over existing) | 15 | 100 |
| Private blob (R2) + egress | 5 | 30 |
| Observability (Grafana Cloud/Axiom + Sentry paid tiers at scale) | 20 | 150 |
| **Infra total** | **≈ $115** | **≈ $590** |

## 5. Human cost (honest CAC includes it)

Pilot: 0.5 FTE ops (review queue, takeovers, QA spot checks) ≈ $500–800. Scale: 2 FTE ≈ $2,500–3,500. The whole point of the confidence gate + QA flywheel is to keep the ops-to-host ratio *falling* as volume grows (target: 1 FTE per 200 published hosts/mo by month 6 of scale).

## 6. Cost per host & ROI

| | Pilot | Scale |
|---|---|---|
| Total monthly cost (AI+channel+infra+ops mid) | ≈ $1,400 | ≈ $8,900 |
| Published hosts/mo | 25 | 250 |
| **CAC (fully loaded)** | **≈ $56** | **≈ $36** |

Revenue side (assumptions from marketplace data to validate): avg booking ≈ 700 AZN ≈ $412; commission 10% ≈ $41/booking; active host ≈ 1.5–2.5 bookings/mo in season, heavily seasonal → conservatively $45/mo commission averaged over the year per active host, 70% of published hosts activate.

- **Payback**: CAC $56 ÷ ($45 × 0.7) ≈ **1.8 months**.
- **12-month LTV** ≈ $380 per published host → **LTV/CAC ≈ 6.8× (pilot), ≈ 10× (scale)**.
- Referral loop improves this over time (referred hosts have near-zero channel cost).

**Budget breakers** (guarded in 08 §6): AI spend > 2× baseline/hour; CTWA managed by ROAS rule (pause ad sets whose cost/conversation > 2× target for 3 days).

## 7. Build cost (one-time)

Lean v1 scope (15 §4): ~10–14 engineer-weeks (1–2 engineers) + native-speaker content work (~2 weeks part-time) + Meta approval lead times. Full design as documented: ~20–26 engineer-weeks.
