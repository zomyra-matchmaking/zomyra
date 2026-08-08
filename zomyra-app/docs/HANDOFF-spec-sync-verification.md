# Handoff — spec-sync verification (fitness / questionId / platform-transport)

Scratch handoff doc (untracked). Written 2026-08-07. Delete once the decisions below are folded into
CONTRACT-QUESTIONS.md and the backend session has consumed them.

## Context

Branch `docs/spec-sync-fe149-be110` (docs-only: MIGRATION.md §12.9 + O-22, CONTRACT-QUESTIONS §11c —
additions only, no code) reconciles the owner's consolidated docx **FE v1.49 + BE v1.10** against the
repo's delta-tracked state. Task was to verify its claims against the **shipped client source** before
the cofounder builds the backend in a separate session. All three claims verified accurate. Standing
constraint **C-1 = frontend-only** (never edit `zomyra/backend/`, only surface divergence).

## Verified findings (all confirmed against live source)

### 1. Fitness — ✅ correct on all three surfaces
`fitness` = a single string enum key (one value from API-39's `fitness` category). Consistent across:
- **API-39** `GET /onboarding/options` — client expects a `fitness` category. `edit-profile.tsx:450`
  `openChoice("Fitness","fitness","fitness")`; `src/lib/onboarding/types.ts:44`.
- **API-7** `POST /onboarding/submit` — client sends `plot.fitness`. `src/lib/onboarding/submit.ts:160`;
  `src/api/contract.ts:345`. (Currently whitelist-400s until backend adds the column.)
- **Edit profile** — `API-23 GET /profile/me` + `PATCH /profile` must return AND accept `fitness`.
  `app/(tabs)/(profile)/edit-profile.tsx:445` `testID="edit-fitness"`.
- Backend action: add the `fitness` column/category on all three. No naming ambiguity. Only the
  version *label* differs (owner docx says BE v1.10; repo deltas say v1.11) — not a design conflict.

### 2. questionId (compatibility quiz) — ✅ defect real; backend contract already correct
- Contract (both sides): `love.quizAnswers[].questionId` = server UUID from **API-33**
  (`GET /compatibility-quiz/questions`), echoed verbatim.
- Client reality: **API-33 not wired** (only referenced in comments — no endpoint). `submit.ts:184`
  sends `questionId: q.id`, a client slug from `SCALE_QUESTIONS` (`src/lib/onboarding/scales.ts`).
  → guaranteed API-7 `400`. Tracked as **O-22** (MIGRATION.md).
- **Backend action = NONE.** This is a client-side bug. Do NOT make the validator accept slugs — the
  UUID contract stays. Backend only needs to serve API-33 (with `quizVersion`).
- `quizVersion`: client sends an invented `1` (stopgap constant, submit.ts) until API-33 lands;
  **backend owns the real number** and echoes it in API-33; client then deletes its constant.

### 3. platform transport — the open decision (see below)
- Everything "app info on every request" is ALREADY headers, sent on every request
  (`src/api/base-query.ts:65`): `X-App-Version` (app version), `X-Bundle-Update-Id` (bundle/OTA id,
  `"embedded"` today), `X-Client-Info` (`p=<platform>; os=; m=; a=; d=<installid>`).
- `X-Client-Info` `p=` already carries platform on every request. Backend consumes it (Sentry scope
  + `devices` upsert) — CONTRACT-QUESTIONS §11b, agreed 2026-08-06.
- SEPARATELY, `POST /consents` sends `platform` as a **body field** (`src/api/endpoints/consent.ts:60`,
  `{ ...body, platform: CLIENT_PLATFORM }`) — CONTRACT-QUESTIONS §11a, agreed 2026-08-06, shipped.
- A body field is per-endpoint, NEVER "every request." `/consents` is the ONLY endpoint with body
  `platform`; it adds zero bytes elsewhere. Both header `p=` and body field come from the SAME client
  constant `CLIENT_PLATFORM` (`src/config/device.ts`) — cannot drift.

## OPEN DECISION (owner + cofounder) — how the /consents legal column gets its platform

The consent record is a legal artifact with a real `platform` DB column. Two ways to populate it:

- **(A) body field — CURRENT, shipped.** Client sends `platform` in `/consents` body; backend
  validates payload → writes column. Robust (a header allowlist/proxy can't strip it), no coupling of
  a legal write to the observability-header parser. Cost: one field on one endpoint.
- **(B) header-only.** Client drops it from body; backend parses `p=` out of `X-Client-Info` at write
  time and persists it. Simpler wire, but the legal column now depends on a best-effort header that a
  proxy can silently drop (→ null platform on that row), and couples the legal write to the header
  parser.

Assistant recommendation: **keep A.** It is not per-request overhead, it is robust for a legal
artifact, and the value is single-sourced so there is no duplication risk. But it is the owner's call
with the cofounder. **The client currently ships A — if the backend builds anything other than A,
the client needs a matching change.**

Owner (this session) is leaning toward header-only because "we agreed to pass platform + user-agent in
headers" — which is TRUE and already done for observability (X-Client-Info). The nuance they were
resolving: that header decision does not by itself settle whether the *legal consent column* is
sourced from body or header. Decision still pending at handoff.

## Stale-docx warning to send the cofounder (CONTRACT-QUESTIONS §11c)
The consolidated `ZOMYRA_Backend_TDD_v1_10.docx` predates/dropped two decisions already live on the
client:
1. `platform` on `/consents` is a **body field** (§11a) — the docx still says it's read server-side
   from `X-App-Version` and NOT a body field (superseded). A strict validator built to the docx would
   drop/400 the field the client sends. (Resolve the A/B decision above first.)
2. `X-Client-Info` header (§11b) — docx §7.1 lists only `X-App-Version` + `X-Bundle-Update-Id`; the
   header has no consumer doc, though the client already sends it every request.
Also: version-number collision — docx labels fitness `v1.10`; repo deltas spent `v1.10` on platform,
`v1.11` on fitness (MIGRATION §12.9). Doc hygiene, not a design dispute. C-1: surface, don't edit BE.

## Repo state at handoff
- On branch `fix/module-5.5-findings`. `docs/spec-sync-fe149-be110` is a separate local docs-only
  branch (1 commit `982620e` ahead of master).
- Working tree clean except untracked `scripts/probe-fitness.sh` and this handoff file.
- `.env` = `mock`; `tokens.ts` clean (no debug logs). Nothing pushed this session (C-6: owner pushes).
