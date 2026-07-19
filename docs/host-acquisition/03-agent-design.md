# 03 — Agent Design & Model Selection

## 1. Design stance

"Agent" here means **a worker with an LLM in the loop, a fixed tool belt, and a bounded mandate** — not a free-roaming autonomous system. Every agent:

- is invoked by a queue job (never by another agent directly),
- reads state from Postgres, returns effects as **tool calls / structured output** (never free text parsed by regex),
- writes an `agent_run` row (tokens, cost, latency, trace id, confidence),
- has a per-run budget (max tokens, max tool iterations) and a kill-switch flag,
- can always escalate to a human (`handoff` / `needs_review`) — escalation is success, not failure.

## 2. Agent roster

| # | Agent | Trigger | Mandate | Tools | Model |
|---|-------|---------|---------|-------|-------|
| A1 | **Discovery Enricher** | `discovery.item.received` | Normalize raw source payload → candidate lead fields (name, phone, region, property type, owner kind) | none (pure structured extraction) | Haiku 4.5 |
| A2 | **Verifier** | `verify.lead.requested` | Orchestrates deterministic checks; LLM only for property-type & owner-kind classification and messy-text parsing | `lookup_phone`, `search_dupes`, `geo_validate` | Haiku 4.5 (+ code) |
| A3 | **Lead Scorer** | nightly batch + on verify | Feature assembly deterministic; LLM judges soft features (bio quality, owner-operator likelihood) | none | Haiku 4.5 via **Batches API** (50% off) |
| A4 | **Conversation Agent "Aynur"** | `conv.turn.requested` | The WhatsApp sales/negotiation/onboarding conversationalist. One agent, playbook-switched (sales → onboarding → activation) so the host experiences one continuous relationship | `save_facts`, `set_stage`, `schedule_followup`, `send_reply` (draft), `request_media`, `lookup_faq`, `suggest_price_band`, `handoff_human`, `record_opt_out` | **Sonnet 5** |
| A5 | **Onboarding Extractor** | media/message during onboarding | Turn photos/voice/text into checklist item values; photo → amenities evidence | `update_checklist_item`, vision input | Sonnet 5 (vision) |
| A6 | **Photo QA** | media uploaded | Quality score (blur/exposure/resolution), room-type classification, cover-photo pick, ordering | vision input | Haiku 4.5 (vision); escalate ambiguous to Sonnet |
| A7 | **Listing Generator** | `listing.generate.requested` | AZ title/description/SEO/house-rules/nearby-attractions; price band from comps (comps math is code; prose is model) | `get_comparables`, `get_region_guide` | Sonnet 5 |
| A8 | **Fraud Adjudicator** | `fraud.check.requested` (after signal fan-out) | Read all deterministic fraud signals + draft + history → verdict `pass/flag/fail`, risk score, human-readable rationale | read-only signal access | **Opus 4.8** |
| A9 | **QA Sampler / Supervisor** | cron, 5% sample + all handoffs | Grade conversations for tone, truthfulness, policy compliance, Azerbaijani quality; feeds eval set; detects drift | read-only | Opus 4.8 (weekly batch) |
| A10 | **Ops Import Extractor** | ops pastes URL | Single-page extraction for Tap.az/Bina.az assisted import | none | Haiku 4.5 |

Deterministic components that are **not** agents (no LLM): outbox relay, send guard (rate limits/quiet hours/opt-out), publish gate (composite confidence), dedupe engine (SQL + embeddings), pricing comps math, STT invocation, EXIF stripping, IBAN checksum.

## 3. Model selection — GPT vs Claude vs open-source vs hybrid

**Decision: hybrid within one vendor (Anthropic), tiered by task.** Reasoning:

1. **Tool-use reliability is the product.** A4 lives or dies on disciplined tool calling (never inventing stages, always writing facts through tools). Claude's structured outputs (`output_config.format`) + strict tool use give schema-guaranteed calls, which removes a whole class of parser bugs.
2. **One vendor, three tiers beats two vendors.** Prompt-cache economics, one SDK, one safety/ops model, shared evals. Adding GPT as a second brain doubles eval and prompt maintenance for marginal gain. GPT is a viable alternative — this is a judgment call to be validated by the Azerbaijani eval harness (04 §8) before locking in; the abstraction layer (a thin `LlmClient` port) keeps switching cost to days, not months.
3. **Azerbaijani quality is the real risk, not vendor choice.** All frontier models are decent-but-not-native in AZ; none are trained deeply on it. Mitigation is *our* eval set + few-shot exemplars + native review loop, which works with any frontier model (13 §R6).
4. **Open-source (fine-tuned Qwen/Llama on AZ)**: not now. We lack training data (conversations don't exist yet) and MLOps headcount. Revisit at ≥ 50k conversations when a fine-tune on our own transcripts could cut A4 cost ~10× (14 §5).

| Tier | Model | Price (in/out per MTok) | Used by | Why |
|---|---|---|---|---|
| Conversation & generation | `claude-sonnet-5` | $3 / $15 (intro $2/$10 to 2026-08-31) | A4, A5, A7 | Near-Opus quality on instruction-following and multilingual tone at 40% of Opus price; 1M context is irrelevant here — the win is quality-per-dollar on many mid-size calls |
| Classification & extraction | `claude-haiku-4-5` | $1 / $5 | A1, A2, A3, A6, A10 | High-volume, low-ambiguity, schema-constrained tasks; latency-sensitive (verification throughput) |
| Judgment & audit | `claude-opus-4-8` | $5 / $25 | A8, A9 | Low volume, high blast-radius decisions (fraud, quality audit). Paying 1.7× Sonnet on <2% of calls is the cheapest insurance in the system |
| Batch discounts | Batches API | −50% | A3, A9 | Nothing latency-sensitive about nightly scoring/QA |

Supporting models (non-Anthropic, narrow jobs):
- **Embeddings**: multilingual text-embedding model (Voyage `voyage-3.5` or open `bge-m3` self-hosted later) for lead dedupe + description-copy detection; CLIP-class image embeddings for photo dedupe. Chosen for retrieval quality per dollar; trivially swappable.
- **STT**: Whisper large-v3 (or a managed equivalent) for WA voice notes. Azerbaijani WER is mediocre → confidence-gated with an "ask to type" fallback; flagged as risk R7.
- **Perceptual hashing**: pHash (no ML) does 90% of duplicate-photo work free.

**Prompt caching strategy** (big cost lever, 11 §3): A4's system prompt (core+persona+policy+playbook, ~6k tokens) is byte-stable and cache-marked; conversation state and turns come after the breakpoint. Expected cache-read rate > 80% of A4 input tokens at steady state.

## 4. Conversation Agent (A4) — contract

**Input assembly (per turn):**
```
system:        [core identity + hard policy]        ← stable, cached
               [persona & AZ style guide]           ← stable, cached
               [active playbook: sales|onboarding|activation]  ← stable per playbook, cached
messages:      [facts snapshot (structured JSON)]
               [stage + allowed transitions]
               [last 30 messages (or summary + last 10 if long)]
               [inbound batch (debounced)]
tools:         fixed belt (below), strict schemas
budget:        max 3 tool iterations, max 1,200 output tokens
```

**Tool belt (strict JSON schemas):**

| Tool | Effect | Guardrail |
|---|---|---|
| `save_facts{facts}` | merge into `conversation.facts` | schema-validated keys only |
| `set_stage{stage, reason}` | propose stage transition | worker validates against state machine; illegal transition → rejected + logged |
| `draft_reply{text, template?}` | the outbound message | goes to send guard, never direct to WA; length ≤ 1000 chars; template required outside 24h window |
| `schedule_followup{when, kind}` | insert `followup` | capped by cadence policy |
| `request_media{kind, hint}` | asks host for photos/docs | onboarding playbook only |
| `lookup_faq{question}` | retrieval over curated AZ FAQ/knowledge snippets | the ONLY source for factual claims (commission %, payout timing…) |
| `suggest_price_band{}` | calls comps service | numbers come from code, never model memory |
| `handoff_human{reason}` | pause AI, open review task | always available |
| `record_opt_out{}` | opt-out + suppress all sends | triggered by any stop-intent |

**Non-negotiable behavior rules** (enforced by prompt + post-checks): never invent numbers (commission, payouts, dates) — only `lookup_faq`/`suggest_price_band` outputs may contain them, verified by a post-generation regex+allowlist check that blocks the send and retries with a correction message to the model on violation; never promise features not in the FAQ; never continue after stop-intent; disclose AI status when asked directly ("Mən Gecələ-nin virtual köməkçisiyəm…" per policy).

## 5. Fraud Adjudicator (A8) — contract

Input: draft listing content, photo QA results, all `fraud_signal` rows with evidence, contact history summary, blacklist proximity, account graph facts. Output (structured): `{verdict, risk_score, rationale_az, rationale_en, signals_weighted[]}`. The adjudicator **cannot** publish or reject — it writes `fraud_check`; the deterministic publish gate combines it with hard rules. Prompt-injection note: listing text/photos are attacker-controlled; the adjudicator prompt wraps them in untrusted-content fences and instructs signal-based reasoning only (08 §3).

## 6. QA Sampler (A9) — the quality flywheel

Weekly batch: 5% random conversations + 100% handoffs + 100% lost-after-negotiation. Grades on a rubric (AZ naturalness 1–5, factual accuracy, policy compliance, objection-handling quality, outcome). Output feeds: (a) eval set growth, (b) playbook edits (which objection responses actually convert), (c) drift alarms (rubric average drops > 0.5 vs 4-week baseline → alert + optionally auto-raise handoff sensitivity).

## 7. Composite confidence (Phase 9 gate)

Auto-publish requires **all** of:

```
confidence = 0.30·verification_completeness      (deterministic: checklist items verified)
           + 0.25·(100 − fraud_risk)             (A8 risk inverted)
           + 0.20·content_quality                (A7 self-score cross-checked by rubric checks: length, banned claims, photo count ≥ 5, cover quality ≥ 70)
           + 0.15·identity_strength              (OTP-verified phone + doc verified = 100)
           + 0.10·conversation_consistency       (facts vs listing contradictions detected)
≥ 95  AND  no hard-review flag (01 §5.6)  AND  autopublish.enabled = true
```

Raw LLM self-reported confidence is **never** used alone — models are miscalibrated about themselves. The gate is versioned, logged into `draft_listing.confidence` + `review_task.context`, and every human override becomes a labeled example for tuning the weights.

## 8. Failure & fallback policy

| Failure | Response |
|---|---|
| Model 429/529 | SDK retry (2×) → job backoff; conversation jobs delay-retry so ordering holds |
| Refusal / empty output | one retry with clarified instruction; then handoff (conversation) or `needs_review` (pipeline) |
| Schema validation fail | one repair retry ("your output failed validation: …"); then fallback tier: A4 Sonnet→Opus for that turn; extraction Haiku→Sonnet |
| Repeated low confidence (3 turns) | silent handoff to human with context summary |
| Vendor outage | queue backlog is the buffer (messages persist; hosts see slower replies); ops banner; templates for "gecikmə üçün üzr istəyirik" |
