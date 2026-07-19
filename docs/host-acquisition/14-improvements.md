# 14 — Improvements (Post-v1 Roadmap)

Ordered by expected impact ÷ effort, gated on v1 evidence (don't build any of these before Stage C is stable).

1. **Referral engine v2** (M2–M3). Tiered rewards, host leaderboards per region, WA share cards, automatic "qonşunuz da ev sahibidir?" asks after positive moments (first booking, good review). Referrals are the cheapest and most ban-proof channel — this deserves product investment before more ad spend.
2. **Dynamic pricing advisor** (M3–M4). Extend `suggest_price_band` into a seasonal pricing model (occupancy, events, weather, lead time) with weekly WA nudges: "Novruz həftəsi üçün qiymətinizi 20% artırmağı düşünün". Drives host revenue → retention → referral loop.
3. **KYC vendor integration** (M3). Replace human identity review with a document-verification provider (Sumsub-class) once volume justifies the per-check fee; humans keep only the appeals path. Unblocks review-queue scaling (12 §1.2).
4. **Guest-side conversion agent** (M4+). Same architecture, opposite direction: WA agent answering guest questions on listings, nudging abandoned bookings (`recoveryNotifiedAt` already exists in the marketplace schema — there's a hook waiting). Reuses conversation infra wholesale.
5. **Fine-tuned small model for A4 routine turns** (M6+, data-gated). At ≥ 50k graded conversation turns, fine-tune a small open model (or use vendor fine-tuning) for the 70% of turns that are routine; keep Sonnet/Opus for negotiation and edge cases via a router. Expected ~5–10× cost cut on the largest AI line — but only worth engineering time at ≥ 10× current volume.
6. **Telegram channel** (M4). Significant AZ user base; same conversation core, new channel adapter (`conversation.channel` already models this). Also the hedge against R2/R1.
7. **Host mobile mini-app / WA Flows** (M5). Meta WA Flows for structured onboarding steps (calendar, pricing) inside WhatsApp — cuts onboarding friction without forcing an app install.
8. **Seasonal campaign automata** (M4). Playbooked campaigns (Novruz, summer season, Formula 1 week) targeting nurture-pool leads with fresh, consented touches; campaign entity already sketched in CRM.
9. **Computer-use agent for ops-import** (M5, legal-gated). If partnerships with Tap.az/Bina.az land, replace manual paste with sanctioned feed ingestion; if not, keep human-paced import.
10. **Review-signal re-scoring** (M6). Feed marketplace review sentiment back into host risk/quality scores; flag declining hosts for support outreach before churn.
11. **Analytics warehouse** (M6+). `analytics_event` → ClickHouse/Tinybird when product questions outgrow materialized views; brings self-serve cohort analysis to growth ops.
12. **Multi-market packs** (M6+). Georgia expansion per 12 §5 once AZ playbook conversion is proven and documented.
