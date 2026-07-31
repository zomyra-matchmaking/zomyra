# Contract questions for the backend

**Status:** open, raised by the frontend at the end of Module 2 (2026-07-31).
**Audience:** whoever is building the Zomyra backend from Backend TDD v1.4.

**Updated 2026-07-31 against FE v1.42 / BE v1.4 — item 1 is already answered**
and is kept below only so the thread makes sense. Items 0 and 2–6 are still
open and are what actually needs a reply.

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

## 1. O-16 — `state` in the schema — ✅ **ANSWERED, no action needed**

Raised against BE v1.2; **resolved by BE v1.4**, and resolved better than we
asked. Recorded here so the conversation isn't reopened.

We asked for a `state` column and a `state` field on submit. What landed
instead: the backend's **existing `cities` table** is exposed via
**`GET /v1/locations/cities`** (API-38), onboarding submits **`cityId`**
(FK → `cities.id`, matching the `users.city_id` that already existed), and
`/v1/profile/me` returns `cityId, cityName, state` denormalized via join.

That is the better shape — a closed set with referential integrity, rather than
a second free-text field to keep consistent. `state` is client-side filtering
only and is never sent. It also removed our worry about "Bangalore" vs
"Bengaluru" never matching: with a `cityId` there is exactly one row.

**Still open, and it is yours rather than ours (O-15):** how deep the curated
`cities` list goes, and what a user does when their town isn't in it. FE v1.42
calls this "a backend data-curation gap, not a client one" — we agree, and the
client is unblocked either way.

**One thing we'd like confirmed:** roughly how many rows is the full `cities`
response? API-38 is unpaginated and fetched at every cold start, so its payload
size is a cold-start latency cost on Indian mobile networks. BE §14.2a already
says to revisit pagination or compression "if the dataset's size becomes a real
cold-start latency concern" — a rough row count now tells us whether that is a
today problem or a later one. Gzip alone probably settles it.

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
