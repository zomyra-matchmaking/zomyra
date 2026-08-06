# Contract questions for the backend

**Status:** open, raised by the frontend at the end of Module 2 (2026-07-31).
**Audience:** whoever is building the Zomyra backend from Backend TDD v1.7.

**Updated 2026-08-04 against FE v1.46 / BE v1.7. Items 1, 3 and 4b are
answered** and are kept below only so the thread makes sense. **Items 0, 2, 4,
4a, 5 and 6 are still open** and are what actually needs a reply.

**4b closed well:** the owner took it to the TDDs and **API-40 `POST /consents`**
landed, wired in Module 4. It stores a version rather than a boolean, writes via
its own endpoint rather than API-7, and shares one `user_consents` table with
FR-11a — all three of the things that would have been expensive to retrofit.

**Also new, and not a contract question but a joint one: the Google OAuth client
IDs.** `POST /v1/auth/google` is deployed and validating as of 2026-08-03 (a
bogus token gets `401 invalid_google_token`, where it got `503` the day before),
which means the backend already has a client configured. **The app's
`webClientId` must be that same client**, or every real sign-in fails on
audience mismatch. Tracked as **O-19** in MIGRATION §4 with the full list of
what has to be created.

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

## 3. O-4 — `accountStatus` — ✅ **ANSWERED, no action needed**

Raised against BE v1.5; **resolved by FE v1.45 §8.1 + BE v1.6 §9.9.** Recorded
here so it isn't re-asked.

Both questions we posed came back answered:

1. **What the client does:** `accountStatus` is checked *before* the cold-start
   routing table is evaluated at all. Any non-`active` value routes to one
   static, non-dismissible blocker — no retry, no appeal link, and no
   distinction between the three causes.
2. **Whether other endpoints 403:** yes. Every authenticated endpoint except
   `GET /me` and `POST /auth/refresh` rejects a non-active account with `403`
   (`account_suspended` / `account_banned` / `account_deleted`). The session is
   *not* revoked — tokens stay valid, refresh keeps working; the gate is at the
   usage level. The two exemptions are what let the client find out why it is
   blocked.

We are treating the three codes as **undifferentiated**, per BE §9.9's note that
they exist for support diagnostics only. Nothing in the client branches on which.

**One thing we have taken as given, flag it if wrong:** because enforcement is
request-level rather than session-level, a `403 account_*` can surface on *any*
call mid-session, not only at cold start — e.g. an account suspended while the
user is mid-conversation. We are handling it globally in the base query rather
than per-screen.

## 4. Where exactly does `retryAfterSeconds` live?

The error envelope is `{ error: { code, message, details? } }` (BE §7.1). For
`429 rate_limited` and `429 too_many_attempts`, both documents write
`{ retryAfterSeconds }` without saying whether it sits **inside `details`** or
alongside `code`/`message`.

The client currently accepts either, which is exactly the sort of defensive
guess that should not survive into production. Please pin it — `details` seems
the natural home given the envelope.

*Module 4 update (2026-08-03): both spellings are now **exercised** rather than
merely tolerated — the mock emits `rate_limited` with the field beside `code`
and `too_many_attempts` with it inside `details`, and both were confirmed on
device to produce the same countdown. So the client will not break either way.
It is still a guess, and the question still needs an answer: the moment the real
API-1/API-2 land, one of those two branches becomes dead code that nobody will
notice is dead.*

## 4a. `GET /me`'s cold-start table is missing a row — `profileComplete: true` + `verificationStatus: "unverified"`

*Raised by Module 3 while implementing the table (2026-08-02). Almost certainly
a documentation gap rather than a product one, but it is the state a real user
sits in for the length of the photo step, so it is worth pinning.*

FE §9.1's routing table lists five rows:

| `profileComplete` | `verificationStatus` | `discoveryMode` |
|---|---|---|
| `false` | — | — |
| `true` | `pending` | — |
| `true` | `mismatch` | — |
| `true` | `verified` | not set |
| `true` | `verified` | already set |

**`true` + `unverified` is not among them**, yet it is the normal state of
someone who has just submitted API-7 and has not started photos or the
verification selfie — §3.2 places both at the end of the Onboarding stack, and
the client already routes there itself on submit.

**We have implemented it as "go to the photos/verification step"**, which is
where that user belongs and where the app already sends them. Please confirm
that reading, and specifically:

1. Does `POST /onboarding/submit` set `profileComplete: true` **immediately**,
   before photos and verification, or only once those are done? Our behaviour
   assumes the former (it returns `{ profileComplete: true }` per §9.2).
2. If so, is `unverified` the value `GET /me` returns throughout the photo step,
   or is there another state we should expect?

If the answer is that `profileComplete` only flips after verification, then this
row is genuinely unreachable and the table is complete as written — but then
API-7's documented `{ profileComplete: true }` response is the thing that needs
correcting.

## 4b. Nothing records FR-2a's consent — ✅ **ANSWERED by FE v1.46 / BE v1.7, no action needed**

*Raised by Module 4 while building the consent screen (2026-08-03); **answered
2026-08-04** by **API-40 `POST /consents`** plus a `consents` array on `GET /me`.
Kept below so the thread makes sense.*

**What landed matches the ask closely**, including the two points that were
easy to get wrong: it stores a **version**, not a boolean, and the record is
written by **its own endpoint** rather than folded into API-7 — so a user who
accepts and then abandons onboarding is still recorded. It also holds
**FR-11a's biometric consent** on the same `user_consents` table, which is what
stops Module 6 adding a second one-off column. **What remains open is not this
question but O-20** — who owns and approves the consent *copy* the `version`
refers to.

FR-2a requires an explicit "I understand and agree" before onboarding collects
religion, income and lifestyle data, **once per account, never again**. Neither
TDD has anywhere to put that fact: there is no field on `POST /auth/otp/verify`,
`POST /auth/google`, `GET /me` or `POST /profile`, and no endpoint of its own.

The client therefore records it locally, keyed by `userId`, in a persisted
Redux slice. That is correct MVP behaviour and it fails in the safe direction —
a reinstall re-asks rather than silently assuming consent. Two things it cannot
do, and only the backend can:

1. **Survive a reinstall or a second device.** The user is asked again on each,
   which is annoying rather than harmful, but it is visible.
2. **Be produced later.** A consent record that exists only on one device is not
   evidence of anything. For a product asking Indian users for religion, income
   and lifestyle data, "when did this user consent, and to what version of the
   notice" is a question that may eventually be asked by someone other than us.

**⚠️ The sharpest version of the problem, and the reason this is not cosmetic
(owner, 2026-08-03):** the client only *evaluates* consent while
`profileComplete` is `false`, i.e. during onboarding. The moment onboarding
finishes, nothing reads the local record again — so once the user is through,
**there is no record anywhere, on any system, that consent was ever given.** It
is not that the evidence is weak; after onboarding it does not exist.

**Ask — decided in principle by the owner (2026-08-03), shape still to be
settled between FE and BE:** move the record server-side. Concretely:

1. **Store more than a boolean.** A timestamp **and a notice version**
   (`sensitiveDataConsent: { version, acceptedAt }` or two flat columns). A
   boolean cannot answer "consented to *what*", and it cannot express the one
   case that will eventually happen: the notice changes materially — a category
   is added — and existing users must be re-asked. With a version, re-asking is
   a config change; with a boolean it is a migration.
2. **Return it on `GET /me`.** That is where §9.1's routing table already reads
   `profileComplete` and `verificationStatus`, and the client's consent row sits
   in the same function. Returned there, the client's local slice disappears
   entirely rather than becoming a second source of truth — which matters,
   because two records of who consented can disagree.
3. **Write it via its own small endpoint** (`POST /account/consent`, taking the
   version) rather than as a field on API-7's submit. API-7 fires at the *end*
   of Plot/Anchor/Love; consent is required *before* any of it, so folding it in
   would record the consent after the data it was meant to gate had already been
   collected.
4. **⚠️ Design it to hold FR-11a too.** FE v1.45 keeps biometric consent
   deliberately separate as a *user-facing step*, and Module 6 owns that screen —
   but it will need exactly this record with a different key. One
   `user_consents` table keyed by `(user_id, consent_type, version)` costs
   nothing now and saves a second one-off column later. Deciding this while
   there are no users is the whole reason to raise it now.

**Client-side impact when it lands is small and worth stating**, so the shape is
not chosen around a fear of client churn: `resolveRootDestination` swaps one
context argument for a field it already receives, `useRootRouteContext` and the
`consent` slice are deleted, and `consent` comes off `PERSIST_WHITELIST`. The
consent *screen* does not change at all.

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

> ✅ **CLOSED by Module 5 (2026-08-05).** `CompatibilityDimension` is now an **alias of
> `DiscoveryMode`** in `contract.ts` rather than an independent declaration, and the three mock
> profiles' `scores` keys were renamed with it. The mapping was not guessed: `discover.tsx` already
> rendered `personality` as *"Compatibility"* and `priorities` as *"Marriage Goals"*, so the labels
> were correct and only the keys were wrong. Nothing is owed to Module 7 here beyond retiring the
> alias if it rewrites Discover's call sites.

---

## 8. Who owns `quizVersion`? — ✅ **answered: the backend** (raised and decided 2026-08-05)

> **Decision (owner, 2026-08-05): `quizVersion` is owned by the backend.** The client does not get
> to number the question set. Question 1 below is therefore settled — API-33 issues the version and
> the client echoes back whatever it received. Questions 2 and 3 are still open and are what the
> backend needs to answer.
>
> **What this obliges Module 6 (or whoever builds API-33) to do**, and why it cannot be done now:
> `SCALE_QUESTIONS` is still a client-side constant in `src/lib/onboarding/scales.ts` because API-33
> is not built and returns nothing to echo. `QUIZ_VERSION = 1` in `src/lib/onboarding/submit.ts` is
> a **stopgap standing in for a value that is not ours**, and it is wrong by construction — it is a
> number this client invented. When API-33 lands, the constant is deleted, the questions and their
> version both come from the response, and `buildSubmitBody` echoes the served version.
>
> ⚠️ **Until then every draft submitted carries a `quizVersion` the backend never issued.** If the
> real version of the set in `scales.ts` is not `1`, answers already stored against it are
> mis-versioned — which is question 2, and why it wants answering before real users submit rather
> than after.

### Original question

API-7's `love.quizVersion` is *the version of the FR-14 question set the client displayed* — the
same discipline as API-40's consent `version`, and for the same reason: an answer scored against the
wrong question set is worse than a missing one, because nothing looks wrong.

**The client currently asserts `1`**, defined as `QUIZ_VERSION` beside `SCALE_QUESTIONS` in
`src/lib/onboarding/submit.ts`, with the bump rule written next to it. That is this client's own
numbering and **nobody has agreed to it.**

The conflict is foreseeable rather than hypothetical: **API-33 serves the compatibility quiz** (BE
§14.2), and a served question set will carry its own version. At that point there are two numbering
schemes for one thing.

**What we need:**

1. Is `quizVersion` the backend's to issue via API-33, with the client echoing whatever it received?
   (This is the sane answer, and matches how every other catalogue works under FR-3b.)
2. If so — what is the version of the question set currently in `scales.ts`, so the client's `1` can
   be corrected before any real answer is stored against it?
3. Does the backend reject a `quizVersion` it does not recognise, or accept and record it? The first
   turns a drift into a visible `400`; the second stores answers nobody can score later.

### 8a. Restated in plain language, and one further owner question (2026-08-05)

The owner asked for the outstanding part in relayable terms. It is two questions:

> **The setup.** The compatibility quiz is 12 questions. An answer is only a number per question —
> "7" means nothing unless you know *which* question was number 7. So each submit carries
> `quizVersion`: a label saying which version of the question set the user actually saw, so answers
> can never be scored against a set they weren't given. The app currently sends `1`, **a number the
> frontend made up**, because API-33 (which will serve the quiz) doesn't exist yet and the 12
> questions are still hardcoded in the app.
>
> **Q1 — what number should the app send today?** If the 12 questions now in
> `src/lib/onboarding/scales.ts` already exist on the backend with a version number, tell us it. If
> they don't exist there yet, tell us what number to use and treat it as fixed.
>
> **Q2 — what does the API do with a `quizVersion` it doesn't recognise?** Reject with `400`, so a
> mismatch is found in testing? Or accept and store, so answers get saved against a version nobody
> can score and it surfaces only when matching runs? We'd prefer reject.

**And the owner's own question back to the backend, which is a fair one:**

> **Is `quizVersion` needed at all?** The questions are already backend-driven (FR-3b, and API-33
> once it exists), so the backend knows what it served. Could the **API version** carry that
> information instead — i.e. a question set change is an API version change — rather than a separate
> number travelling in every submit body?

The honest answer from the client side is that these solve different problems, and it is worth the
backend saying which it wants: an API version says *what the server offers now*, while
`quizVersion` says *what this stored row was answered against* — the second is the one you need
years later to rescore an old answer, and it has to be persisted with the answers. If the backend
prefers one number for both, that is fine and the client simply echoes whatever field carries it;
what does not work is neither being persisted alongside the answers. **This needs a decision before
API-33 is designed.**

---

## 9. `fitness` needs a catalogue category and an API-7 field (owner-confirmed, 2026-08-05)

**Confirmed by the owner: "How often do you exercise or stay physically active?" belongs in Plot.**
Module 5 removed the screen because the field exists in neither contract — there is no `fitness`
category in API-39 and no `plot.fitness` in API-7, so the question could be asked but the answer
could not be stored. That was the right call for a client that cannot invent either half, and it is
now a backend ask rather than a product decision.

**What the backend needs to add, and then the screen is ~10 lines:**

1. A `fitness` category in **API-39**, `{ key, label }` like every other, with whatever values
   product wants ("daily", "few_times_a_week", "occasionally", "rarely" — the backend's to name).
2. A `fitness: string` field on **API-7**'s `plot` object, carrying the key.
3. ~~Whether it is required or optional.~~ ✅ **Answered by the owner, 2026-08-05: required.** No
   exception to make — it joins the other Plot fields in `isSubmittable`.

**The client has now built its half against the mock** (`src/api/mock/catalogue.ts` carries a
`fitness` category using the prototype's own six labels; `fitness` is in `OptionCategoryKey`,
`OnboardingState`, `OnboardingPlot`, `REQUIRED_PLOT_KEYS`, `buildSubmitBody` and one screen in
`app/onboarding.tsx`, plus a row in Edit Profile). So items 1 and 2 are the only outstanding work,
and they are the backend's.

⚠️ **Until they land, `plot.fitness` goes out to a server that has no column for it.** Whether that
is silently dropped or a `400 validation_error` depends on how strict API-7's validator is — worth
knowing, because a strict validator makes *every* submit fail the moment `.env` points at staging.
The mock accepts it. The client's keys (`daily`, `3_5_weekly`, `1_2_weekly`, `few_monthly`,
`rarely`, `never`) are invented like every other mock key and will be replaced by whatever API-39
serves; nothing is conditional on their spelling.

**The other ten deleted fields are not this.** `relocation` and the nine `pref*` fields were
declared in the prototype's state and **never rendered on any screen** — dead state, not deleted
questions. Anchor's seven real questions (age range, match location, children, interfaith, smoker
comfort, household, relocation-after-marriage) are all present and all catalogue-driven. No ask is
needed for them.

---

## 10. Where does Edit Profile get the user's **state** from? (raised by Module 5, 2026-08-05)

Edit Profile's city picker has the same shape as onboarding's: **API-38 is scoped by state**, so a
state must be known before there is a city list to show. During onboarding the draft holds it. After
submit the draft is destroyed (NFR-12) and `state` was never sent to the server (O-16, deliberately
— `cityId` implies it via the `cities` table).

So a returning user opening Edit Profile has a `cityId` and no way to look up the list it came from.
Today the picker simply starts at the state step, which is correct but re-asks something the server
already knows.

**Owner's note, 2026-08-05:** during onboarding the state *is* in hand, so the picker works; the
loading gap while API-38 fetches is now covered by a spinner overlay in the sheet rather than an
empty list. That closes the UX half. The contract half below is still open, and only bites the
returning user whose draft is gone.

**Either of these fixes it; the backend's call which:**

1. **API-23 (`GET /profile/me`) returns the city's `state` key** alongside `cityId` — cheapest, and
   it is a join the backend already has.
2. **API-38 accepts a city lookup** (`GET /locations/cities/:id` → `{ id, name, state }`), which
   also gives every other screen a way to render a city name from an id.

Option 1 is preferred unless a city→state lookup is wanted for its own sake.

**Related invariant worth stating explicitly, since the client now depends on it:** does API-39's
`state` category contain *only* states that have at least one city in API-38? The owner's position
is yes. The client keeps a defensive "no cities listed for that state yet" message for the case
where a data edit breaks it, but if the invariant is guaranteed, that message is unreachable and the
backend should treat a state with zero cities as a data bug.

---

## 11. `platform` on API-40, and `X-Client-Info` on every request (agreed with the backend, 2026-08-06)

Both halves came out of the backend's own message of 2026-08-06. Recording them here because the
client side is **built and on `master`'s branch already**, and the backend needs to build to the
same shape.

### 11a. `platform` on `POST /consents` — ✅ **decided: the client sends it**

The backend asked whether it should (a) receive `platform: "ios" | "android"` in the API-40 body or
(b) make the column nullable and drop it. It preferred (a) because a consent record is a legal
artifact and a blank platform column weakens it. **Agreed, and shipped.**

It could not be derived server-side, which is worth stating so nobody re-litigates it: `X-App-Version`
carries a version string and nothing else, and no other request field named a platform.

- The value is `"ios"` or `"android"`, matching `X-Client-Info`'s `p=` field exactly — one source in
  `src/config/device.ts`, so a consent row and a Sentry event can never disagree.
- The client sets it **inside the RTK Query endpoint**, not at the call sites, so neither the FR-2a
  nor the FR-11a screen can omit it.
- `app.json` declares `"platforms": ["ios", "android"]`, so a third value is impossible today. If web
  is ever added as a build target, the enum needs widening **before** the client can send it.

> ⚠️ **Accept it as optional for one deploy, then tighten.** Making it required in the same release
> that introduces it returns `400` to every client already installed — including the dev clients on
> both test devices, which is how this would first be noticed.

### 11b. `X-Client-Info` on every request — ✅ **decided: a header, not a `POST /devices` endpoint**

The client originally proposed registering a device profile once via its own endpoint, to avoid
writing an unchanging blob onto every request row. **The owner's counter-argument won and is worth
preserving:** a backend Sentry event has no client context of its own. A client-side Sentry SDK
annotates *its* events, but it cannot annotate a 500 raised inside the server — and Sentry is not
installed on this client at all yet, so today the backend's is the only one that exists. A header is
the only channel that carries client context into a backend error report.

**Grammar** — compact key-value, not JSON:

```
X-Client-Info: p=android; os=14; m=google_Pixel_7; a=1.0.0; d=1a2b3c4d-5e6f-...
```

| Field | Meaning | Notes |
|---|---|---|
| `p` | platform | `ios` \| `android`. Same value as API-40's `platform`. |
| `os` | OS release | Android's *release* (`14`), not the SDK level (`34`). |
| `m` | brand + model | **Android only** — see below. Absent on iOS; parse defensively. |
| `a` | app version | Same value as `X-App-Version`. |
| `d` | install id | Random UUID-shaped string, see below. |

Values are sanitised client-side to `[A-Za-z0-9._-]` and length-capped, so a model like
`Redmi Note 12 Pro+` arrives as `Redmi_Note_12_Pro_`. No value can contain `;`, `\r` or `\n`.

**Three things the backend should know about what is *not* in there:**

1. **No model on iOS.** The only free iOS signal is `Constants.deviceName`, which is the
   user-assigned device name and therefore very often the owner's real name ("Priya's iPhone").
   Sending it would put a legal name into every backend log line and Sentry event. Real iOS model
   data needs `expo-device` — a native module, so a dev-client rebuild on both devices (C-2). Ask if
   it is actually needed and it can be batched into the next rebuild.
2. **`d` is a random id, not IDFV or `ANDROID_ID`.** A hardware identifier survives uninstall, is
   shared across a vendor's apps, and cannot be reset by the user — a much harder collection to
   defend under the DPDP Act for a matrimony app. This one is generated on first launch, stored in
   secure store, and **survives sign-out on purpose**: regenerating it per session would add a
   `devices` row per login and destroy the correlation it exists for.
3. **It is not a credential.** It authenticates nothing and gates nothing. The backend must never
   treat it as identity — it is a correlation key only.

**What the backend agreed to do with it:** set it on the Sentry scope as tags, and upsert a
`devices` row when the tuple changes so the analytics table stays deduplicated. Request-scoped rows
(consents, submissions) store the device id only, not the blob — a consent row should be readable in
five years without unpacking a JSON shape from 2026.

**One operational flag:** this is a new header on *every* request. If any proxy, WAF or middleware
runs a header allowlist, it needs updating, or the header is silently dropped and the Sentry context
this was built for never appears.
