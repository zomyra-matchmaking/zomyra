# Contract questions for the backend

**Status:** open, raised by the frontend at the end of Module 2 (2026-07-31).
**Audience:** whoever is building the Zomyra backend from Backend TDD v1.2.

C-1 makes this repository frontend-only, so nothing here is a change we can
make — each item is a **message to send**. Written to be forwarded as-is.

Every item is small *now* and expensive later: each is a one-line change while
the backend is being written, and a migration plus a client release once there
is data behind it.

---

## 0. The one that makes the rest unnecessary — serve the OpenAPI schema

**Ask:** expose the generated OpenAPI document at a reachable URL. With NestJS
that is `@nestjs/swagger` → `/v1/docs-json`, which is roughly four lines in
`main.ts` and needs no deployment beyond the dev environment.

**Why it is first:** both sides of this project are being built in parallel from
TDDs that describe their own field names as *"illustrative, not finalized"*.
Every item below was found by diffing Word documents by hand. That method does
not scale and does not catch anything nobody thought to look for.

The frontend is already set up for this: `yarn api:generate` (config in
`openapi-config.ts`) generates typed RTK Query endpoints from the served
schema, and from then on a renamed field is a **compile error on our side
before the request is ever sent**, instead of a 400 during integration.

Also needed alongside it (MIGRATION §2.3): a reachable dev/staging base URL
including the `/v1` prefix. Until one exists the app runs against in-process
mocks, so this does not block us — it blocks *verification*.

---

## 1. O-16 — `state` is missing from the backend schema

**Frontend TDD v1.40** adds a `state` field (India's 28 states + 8 UTs) ahead of
`city` in onboarding. **Backend TDD v1.2 does not have it anywhere**: §14.2's
`plot` object and §14.10's `/profile/me` response both still read
`…gender, city, heightCm…`.

**Needed backend-side:**

- the column on the profile table,
- `state` accepted in `POST /v1/onboarding/submit`'s `plot` object,
- `state` returned by `GET /v1/profile/me`,
- FR-5's "same state" match preference resolved against this field directly,
  rather than via a city → state lookup.

**Impact if it does not land:** Module 5 cannot submit onboarding at all — the
submit 400s on an unrecognised field, or silently drops it and FR-5 has nothing
to match on.

**Related product question (O-15), which the frontend TDD itself flags as
undecided and which the backend has a stake in:** what happens when a user's
town is not in the curated list? It decides whether `city` is a closed enum or
an open string — which in turn decides the shape of the matching query, and
whether two users typing "Bangalore" and "Bengaluru" ever match.

## 2. O-3 — `pushEnabled` vs `notificationsEnabled`

API-32 (`PATCH /v1/push/preferences`): FE TDD §9.12 sends and expects
`{ pushEnabled: boolean }`; BE TDD §14.13 uses `{ notificationsEnabled }`.

Same field, two names — a real conflict, not a documentation paraphrase.
Needed by Module 11. **Either name is fine; we need one.**

## 3. O-4 — `accountStatus: suspended | banned` has no defined client behaviour

`GET /v1/me` returns `accountStatus: active | suspended | banned` (BE §14.1),
but FE TDD §9.1's cold-start routing table defines a destination only for
`active`. Two questions:

1. **What should the client do** for `suspended` and `banned` — a blocking
   screen, a sign-out, an appeals contact?
2. **Do other endpoints 403 for those accounts**, or does the client hold them
   at the gate? If the backend enforces it, we need the error code.

Needed by Module 3 (the root navigation gate).

## 4. Where exactly does `retryAfterSeconds` live?

The error envelope is `{ error: { code, message, details? } }` (BE §7.1). For
`429 rate_limited` and `429 too_many_attempts`, both documents write
`{ retryAfterSeconds }` without saying whether it sits **inside `details`** or
alongside `code`/`message`.

The client currently accepts either, which is exactly the sort of defensive
guess that should not survive into production. Please pin it — `details` seems
the natural home given the envelope.

## 5. Is `nextCursor` opaque?

Pagination is `{ cursor, limit }` in, `{ nextCursor, hasMore }` out (BE §7.1).
Confirm that `nextCursor` is an **opaque token to be echoed back verbatim**, and
not something the client may construct, parse, or reason about (an offset, an
id, a timestamp). We are treating it as opaque; if it is ever an offset, please
say so rather than letting us assume.

## 6. Confirmations, not conflicts

Quick yes/no on assumptions the client already encodes:

- **`/v1` on everything**, including the unauthenticated routes
  (`/v1/auth/otp/request`, `/v1/auth/otp/verify`, `/v1/auth/refresh`,
  `/v1/app/version-check`).
- **`X-Request-Id`** is issued by the backend and echoed on responses,
  including error responses. We capture it onto every client-side error for
  Sentry correlation (FE §10.2), so it is most useful precisely when something
  has failed.
- **Refresh rotation** — every `POST /v1/auth/refresh` returns a new pair and
  revokes the presented token. The client de-duplicates concurrent refreshes
  behind a single in-flight promise (BE §9.2's concurrent-request note), so a
  replayed refresh token should be treated as genuinely suspicious, not as a
  normal client race.
- **Staging conveniences** (MIGRATION §2.3), which save days rather than hours:
  an OTP bypass or fixed test code, seeded profiles for pagination testing, and
  deterministic stubs for photo moderation and selfie face-match.

---

## Frontend-internal drift — listed here only so it is not mistaken for a
## backend question

`src/lib/discover/mock.ts` declares `CompatibilityDimension` as
`all | lifestyle | personality | priorities`, while **both** TDDs specify
`all | compatibility | lifestyle | marriage_goals` for `discoveryMode` (API-25,
API-12, `GET /me`). The prototype's spelling is wrong on both sides of the
contract. Ours to fix — Modules 5 and 7 — with no backend action needed.
