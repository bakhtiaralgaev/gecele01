# 05 — Folder Structure

## 1. Repo strategy

Evolve the existing repo into a **pnpm workspace monorepo**. One repo = shared types, one CI, atomic changes across marketplace + HAS. The marketplace app moves nominally under `apps/web` (a follow-up chore; until then workspaces can point at the root app).

```
gecele/
├── package.json                 # workspace root (pnpm)
├── pnpm-workspace.yaml
├── turbo.json                   # task graph (build/test/lint per package)
├── apps/
│   └── web/                     # EXISTING Next.js marketplace (unchanged behavior)
│       └── src/app/admin/acquisition/   # NEW: ops UI (review queue, CRM, dashboard)
│                                        # talks only to services/acquisition admin API
├── services/
│   └── acquisition/             # HAS — the system designed in these docs
│       ├── package.json
│       ├── Dockerfile
│       ├── prompts/                     # versioned prompt artifacts (md + frontmatter)
│       │   ├── conversation/
│       │   │   ├── core.md              # L1 hard policy
│       │   │   ├── persona.md           # L2 Ceylan + style guide
│       │   │   └── playbooks/
│       │   │       ├── sales.md
│       │   │       ├── objections/      # O1..On snippets
│       │   │       ├── onboarding.md
│       │   │       └── activation.md
│       │   ├── listing-generator.md
│       │   ├── fraud-adjudicator.md
│       │   ├── photo-qa.md
│       │   └── verifier-classify.md
│       ├── knowledge/                   # curated AZ FAQ / facts (lookup_faq source)
│       │   ├── commission.md
│       │   ├── payouts.md
│       │   ├── verification.md
│       │   └── regions/                 # region guides for listing gen
│       ├── src/
│       │   ├── api/                     # Fastify app (deployable: api)
│       │   │   ├── server.ts
│       │   │   ├── routes/
│       │   │   │   ├── webhooks/whatsapp.ts     # signature verify → persist → enqueue → 200
│       │   │   │   ├── webhooks/meta-ads.ts     # CTWA referral attribution
│       │   │   │   ├── referral.ts              # link click/registration endpoints
│       │   │   │   └── admin/                   # internal API for ops UI (06)
│       │   │   │       ├── leads.ts  contacts.ts  conversations.ts
│       │   │   │       ├── review-tasks.ts  metrics.ts  config.ts
│       │   │   │       └── ops-import.ts
│       │   │   └── plugins/ (auth, idempotency, rate-limit, otel)
│       │   ├── workers/                 # BullMQ consumers (deployable: worker)
│       │   │   ├── index.ts             # worker bootstrap, family selection via env
│       │   │   ├── discovery/  (google-places.ts, instagram.ts, registry.ts, ops-import.ts)
│       │   │   ├── verification/ (verify-lead.ts, dedupe.ts, score-lead.ts)
│       │   │   ├── conversation/ (turn.ts, debounce.ts, send.ts, status-update.ts, stt.ts)
│       │   │   ├── onboarding/  (checklist.ts, photo-qa.ts, identity.ts, bank.ts)
│       │   │   ├── listing/     (generate.ts, publish.ts)
│       │   │   ├── fraud/       (signals.ts, adjudicate.ts)
│       │   │   ├── followup/    (dispatcher.ts)
│       │   │   ├── analytics/   (events.ts, rollup.ts, revenue-sync.ts)
│       │   │   └── system/      (outbox-relay.ts, reconcilers.ts, retention.ts, qa-sampler.ts)
│       │   ├── agents/                  # LLM logic, transport-agnostic (unit-testable)
│       │   │   ├── llm/                 # LlmClient port + Anthropic adapter; prompt loader;
│       │   │   │                        # cache-aligned assembly; cost recorder
│       │   │   ├── conversation/        # A4: turn orchestration, tool defs + handlers
│       │   │   ├── extraction/          # A1, A2, A5, A10 structured extraction
│       │   │   ├── listing/             # A7
│       │   │   ├── fraud/               # A8
│       │   │   ├── photo/               # A6
│       │   │   └── qa/                  # A9
│       │   ├── domain/                  # pure domain logic — NO IO
│       │   │   ├── stages.ts            # lead stage machine + legal transitions
│       │   │   ├── scoring.ts           # lead score weights (versioned)
│       │   │   ├── confidence.ts        # composite publish gate
│       │   │   ├── cadence.ts           # follow-up policy
│       │   │   ├── outreach-policy.ts   # OutreachPolicyGuard rules
│       │   │   └── dedupe.ts            # cluster logic
│       │   ├── infra/
│       │   │   ├── db/                  # prisma client (acq), repositories, outbox writer
│       │   │   ├── queue/               # BullMQ queues, idempotent consumer wrapper, DLQ
│       │   │   ├── wa/                  # WhatsApp Cloud API client + send guard
│       │   │   ├── blob/                # media store (public vs sensitive buckets)
│       │   │   ├── embeddings/  stt/  lookup/   # external adapters
│       │   │   ├── config/              # acq.config hot-reload
│       │   │   └── telemetry/           # otel, pino (PII-redacting serializers), metrics
│       │   └── shared/                  # zod schemas, event types, errors, utils
│       ├── prisma/
│       │   └── acq.prisma               # schema `acq` (02)
│       └── test/
│           ├── unit/                    # domain + agents with fake LlmClient
│           ├── integration/             # testcontainers: PG + Redis, worker flows
│           └── evals/                   # golden set runner, injection suite, rubric grader
├── packages/
│   ├── shared-types/                    # event names, DTOs shared web ↔ acquisition
│   └── az-lang/                         # AZ text utils: normalization, transliteration,
│                                        # banned-claims lists, language detection config
└── docs/
    └── host-acquisition/                # ← these documents
```

## 2. Boundary rules (enforced by lint + review)

| From → To | Allowed? |
|---|---|
| `api`/`workers` → `agents`, `domain`, `infra` | ✅ |
| `agents` → `domain`, `infra/llm-adjacent` only (via ports) | ✅ — agents never import queue/wa directly; effects return as typed commands the worker executes |
| `domain` → anything with IO | ❌ pure functions only |
| `apps/web` → `services/acquisition/src/**` | ❌ — only HTTP via admin API + `packages/shared-types` |
| anything → `prisma` marketplace client | ❌ except the publish repository behind `publish_host/publish_listing` |

Why `agents` returns commands instead of doing IO: it makes every agent deterministic under test (fake LLM in, expected commands out), keeps side-effects in one idempotent place (the worker), and lets the eval harness run the real agent code with zero infrastructure.

## 3. Deployables from one image

Single Docker image; entrypoint switch: `ROLE=api | worker | scheduler`, `WORKER_FAMILIES=conversation,followup` (comma list). This keeps deploys atomic (api and workers can never skew on event schemas) while allowing per-family scaling.
