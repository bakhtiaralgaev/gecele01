# 13 — Risk Register

Severity × Likelihood → Priority. Every P1 risk has a kill-switch or pre-built fallback, not just a mitigation paragraph.

| # | Risk | Sev | Lik | Pri | Mitigation (designed-in) | Residual plan |
|---|------|-----|-----|-----|--------------------------|---------------|
| R1 | **WhatsApp number ban / quality collapse** — the channel *is* the product | Critical | Med | **P1** | Opt-in-only marketing, send guard caps, quality guardian auto-throttle, user-initiated-biased funnel, warm backup number, no purchased lists ever | Runbook 10 §6; SMS + voice fallback keeps pipeline alive at reduced conversion |
| R2 | **Meta policy change** (pricing, template rules, CTWA mechanics) | High | High | **P1** | Channel-agnostic conversation core (channel is a column); cost model re-checked monthly; template library small and re-approvable | Budget elasticity in CTWA; Telegram is a real secondary channel in AZ (14 §6) |
| R3 | **Scraping/legal exposure** via Tap.az/Bina.az imports | High | Med | **P1** | No scraping in v1; ops-assisted single-page import behind legal sign-off + kill-switch; partnership track preferred | Drop the source entirely — funnel modeling shows CTWA+referral+Places can carry pilot targets |
| R4 | **AI makes a false promise / legal commitment** | High | Med | **P1** | Tool-only numbers, numeric allowlist, banned claims, lawyer-approved knowledge snippets, QA sampling, make-good policy | Insurance-style budget line for make-goods; incident → eval case |
| R5 | **Fraudulent listing slips through** → guest harmed, brand damage | Critical | Low-Med | **P1** | Multi-signal fraud pipeline, Opus adjudication, hard-review flags (first listing always human), blacklist, payout verification before money moves | Marketplace-side deposit escrow already limits guest loss; rapid unpublish runbook |
| R6 | **Azerbaijani quality below native bar** → robotic feel, low conversion | High | Med | **P1** | Native-authored exemplars/playbooks, eval harness with native rubric, edit-distance metric in shadow mode gates launch | If frontier models underperform: heavier few-shot, human-in-loop longer, revisit vendor choice via LlmClient port |
| R7 | **Azerbaijani STT weak** → voice notes mis-transcribed | Med | High | P2 | Confidence gate + "yaza bilərsiniz?" fallback; voice-heavy contacts routed to human sooner | Evaluate AZ-specialized STT vendors; voice notes are common in AZ — this materially affects UX |
| R8 | **Cold-start supply/demand mismatch** — hosts join, bookings don't come, hosts churn & bad-mouth | High | Med | **P1** | Pilot region chosen for existing demand; expectation-setting in playbook (no guarantees); activation follow-ups; don't scale acquisition ahead of demand marketing | Pace discovery by region occupancy; revive-host campaign later |
| R9 | **Cost runaway** (LLM loops, ad waste) | Med | Low | P2 | Budget breakers, per-run caps, ROAS rules | Monthly finance review of unit economics dashboard |
| R10 | **Single-vendor dependency (Anthropic)** | Med | Low | P2 | LlmClient port, prompts mostly vendor-neutral, eval set is transferable | Tested fallback config against second vendor kept warm (quarterly fire drill) |
| R11 | **PII breach** (docs, phones) | Critical | Low | **P1** | 08 §4 controls: separate sensitive store, encryption, redacting logger, access audit, retention limits | Breach runbook + legal notification path |
| R12 | **Ops team is the bottleneck / burns out** | Med | Med | P2 | Confidence gate tuned to precision, batch review UI, SLA dashboards, staffing model in 11 §5 | Temporarily raise threshold to 98 (more automation) *only* if precision evidence supports it, else hire |
| R13 | **Duplicate/conflicting hosts across sources** pollute CRM | Med | Med | P2 | Layered dedupe (exact → trigram → embedding), dedupe clusters, merge tooling in admin | Weekly dedupe-quality report; manual merge workflow |
| R14 | **Neon/Vercel/Railway outage** | Med | Low | P3 | Queue-buffered design degrades gracefully; DR per 09 §4 | Accepted — same SPOF as marketplace |
| R15 | **Prompt injection causes tool misuse** | High | Low | P2 | Least-privilege tools, scoped data access, output gates, red-team CI | Bug-bounty style internal testing each quarter |
| R16 | **Referral fraud** (self-referrals, farms) | Low | Med | P3 | Reward only on first *completed booking*; velocity + device heuristics; manual review of reward payouts | Cap rewards/mo per referrer |

## Kill-switch map (single glance)

| Switch | Stops | Safe default under incident |
|---|---|---|
| `sends.enabled` | all outbound WA | inbound still answered by "human will reply" template |
| `ai.enabled` | all LLM turns | conversations route to ops |
| `autopublish.enabled` | publish gate | everything → review queue |
| `discovery.<source>.enabled` | that source | funnel continues on others |
| `followups.enabled` | scheduled touches | no data loss — followups stay `scheduled` |
