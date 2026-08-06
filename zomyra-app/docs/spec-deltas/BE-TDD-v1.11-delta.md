# Backend TDD — delta v1.10 → **v1.11**

**Date:** 2026-08-06
**Base document:** `ZOMYRA_Backend_TDD_v1.9.docx` + `BE-TDD-v1.10-delta.md`
**Origin:** the first live Android test pass against `https://zomyra-staging.duckdns.org`,
2026-08-06. Google sign-in, API-40 and the token-refresh path all **passed**; onboarding then hit a
hard stop, and this delta is the fix for it.

This closes `docs/CONTRACT-QUESTIONS.md` §9, which has been open since 2026-08-05.

---

## The problem, stated precisely

**API-39 is not failing.** `GET /v1/onboarding/options` returns:

```
200 OK   9326 bytes   { "categories": [ … 19 entries … ] }
```

Well-formed, no error field, no empty array, no null. It simply does **not contain a category whose
key is `fitness`**. The only occurrence of the string in the entire payload is a profession value,
`{"key":"fitness_trainer","label":"Fitness Trainer"}`.

The client declares 20 categories and staging serves 19. Every other category matches by name.

### What that does to the app

The Plot step "How often do you exercise or stay physically active?" renders its title and **zero
options** — no Continue, no Skip, only Back. **Onboarding cannot be completed on staging by anyone.**

This is not a client bug to be worked around. `fitness` is a **required** Plot question (owner's
decision, 2026-08-05); the client asks it, blocks submit on it, and sends it in API-7. Making the
step skippable would only move the wall to the submit gate. **One category added to API-39 unblocks
the entire flow with no client change.**

---

## §14.1c — API-39 gains a `fitness` category

### Response addition

```jsonc
{
  "key": "fitness",
  "values": [
    { "key": "daily",       "label": "Daily" },
    { "key": "3_5_weekly",  "label": "3–5 times a week" },
    { "key": "1_2_weekly",  "label": "1–2 times a week" },
    { "key": "few_monthly", "label": "A few times a month" },
    { "key": "rarely",      "label": "Rarely" },
    { "key": "never",       "label": "Never" }
  ]
}
```

These six are the prototype's own values, carried verbatim, and are what the client's mock has served
throughout Module 5. **Adopting them exactly means no client change is needed anywhere.** If the
backend prefers different keys, that is fine — the client stores whatever keys the catalogue gives
and never hardcodes these — but please confirm the final list so the mock can be brought into line.

Note the en-dashes in two labels (`3–5`, `1–2`), matching the existing style. Labels are display-only;
nothing compares against them.

### Ordering

Serve it between `smoking` and `familyType`, matching the client's question order. Category order in
the array is not load-bearing — the client indexes by key — but keeping it aligned makes the payload
readable next to the flow.

---

## §14.1d — API-7 `POST /onboarding` accepts `plot.fitness`

The client **already sends this field on every submit** and has since Module 5:

```jsonc
{
  "plot": {
    "…": "…",
    "smoking":  "no",
    "fitness":  "3_5_weekly",   // ← catalogue key from the category above
    "familyType": "nuclear",
    "…": "…"
  }
}
```

- Type: string, a `fitness` catalogue key. Same handling as `diet`, `drinking`, `smoking` — those
  three are the exact precedent to copy.
- **Required**, consistent with the other Plot choice fields. The client's submit gate blocks on it,
  so a request that reaches you without it is a client bug, not a user path.
- `400 validation_error` on a key outside the enum.

> ### ⚠️ Deployment order
>
> Ship the **API-39 category first**, or in the same deploy as the API-7 column — never API-7's
> validation first. If API-7 starts requiring `fitness` while API-39 still omits the category, every
> client is blocked at the question *and* would fail submit even if it got past. The safe order is:
> add the category → confirm it is arriving → add the column → then tighten validation.
>
> Note also that until the column exists, the field the client is already sending is either being
> ignored or silently dropped. Worth checking which, since it determines whether any existing staging
> profile rows are missing data that was actually submitted.

---

## §14.1e — API-7 `POST /v1/onboarding/submit` rejects the client's body outright

With `fitness` demoted locally, the pass reached the end of the flow and submitted. **API-7 returned
`400 validation_error` with 20 errors.** This is the first time the client's API-7 body has ever been
seen by the real validator, and it disagrees with the client in three separate places.

The validator is clearly whitelist-based (`forbidNonWhitelisted`), which is good — it is why these
surfaced at all rather than being silently dropped.

### (1) `plot.fitness` — "should not exist"

```
{ "field": "plot.property", "message": "plot.property fitness should not exist" }
```

This confirms the §14.1d section above is **required, not optional**. The field is not being ignored
today — it is actively rejecting the request. **Until the column is added, no client can complete
onboarding even with the category served.** Both halves of this delta must ship.

### (2) `anchor.partnerAgeRange` — wrong shape. **Client is wrong; backend is right.**

```
{ "field": "anchor.property",     "message": "anchor.property partnerAgeRange should not exist" }
{ "field": "anchor.partnerAgeMin", "message": "must be an integer number" }
{ "field": "anchor.partnerAgeMax", "message": "must be an integer number" }
```

The client sends a nested object; the backend expects two flat integers:

```jsonc
// client sends (WRONG)              // backend expects (CORRECT)
"partnerAgeRange": { "min": 25,      "partnerAgeMin": 25,
                     "max": 32 }     "partnerAgeMax": 32
```

Constraints read off the error messages: **integer, 21 ≤ n ≤ 100**, both fields.

**No backend change requested — the client will be fixed to match.** Recorded here only so the
backend knows the flat shape is confirmed as the contract, and so the age bounds are written down
somewhere. Please confirm 21/100 are the intended bounds, and whether `partnerAgeMin <= partnerAgeMax`
is enforced server-side (the client enforces it in the slider).

### (3) `love.quizAnswers[].questionId` must be a UUID — **an unresolved contract gap**

All twelve answers failed identically:

```
{ "field": "love.quizAnswers.0.questionId", "message": "love.quizAnswers.0.questionId must be a UUID" }
```

The client sends stable slugs it defines itself — `household_vision`, `decision_making`, `finances`,
`career_priorities`, `parenting`, `conflict_resolution`, `emotional_support`, `weekend_lifestyle`,
`friendships`, `personal_growth`, `traditions`, `social_expectations` — because the twelve questions
and their slider copy are **hardcoded in the client today**. The backend expects UUIDs, which means
it expects the questions to be *server-issued rows* the client has fetched.

**No such endpoint is deployed.** Probed on 2026-08-06, all `404`:
`/v1/onboarding/quiz`, `/v1/onboarding/questions`, `/v1/love/questions`, `/v1/quiz/questions`,
`/v1/quiz`, `/v1/onboarding/love-quiz`. (If API-33 exists on a path not in that list, say so and the
client will wire to it — the probe was a guess at the route, not an authority on it.)

**This is not a new gap — it is API-33.** BE §14.2 already specifies an endpoint that serves the
quiz *and* its version, and the client's own code says so
(`src/lib/onboarding/submit.ts`, the `QUIZ_VERSION` doc block). The UUID validator on API-7 was
evidently written against that design. What has happened is simply that **API-7's validator shipped
before API-33 did**, so the client is still sending its stopgap slugs from a hardcoded list
(`src/lib/onboarding/scales.ts`) because there is nothing to echo back yet.

So the resolution is already decided; it just needs building. Two paths:

- **(a) Build API-33** — the specified fix. Serve `{ id (uuid), key, category, prompt, leftLabel,
  rightLabel, order }` plus `quizVersion`; the client renders from it and echoes both back. Consistent
  with how FR-3b already works for API-39, and it lets the question set change without an app release.
- **(b) Temporarily relax `questionId`** from UUID to a slug enum matching the twelve above, purely to
  unblock end-to-end submits while API-33 is built.

**Recommendation: (a), with (b) as a stopgap only if Module 6 is waiting on a working submit.** If (b)
is taken, please treat it as explicitly temporary — the client's `QUIZ_VERSION = 1` constant is
already documented as "very likely wrong" and slated for deletion the moment API-33 lands, so leaving
the slug path in place indefinitely would entrench a number neither side believes in.

### (4) `love.quizVersion: 1` — accepted

No error was raised against it, so **CONTRACT-QUESTIONS §8a is answered**: `quizVersion: 1` is
correct and the field is wanted. Still open: what the backend does with an *unknown* future version.

---

## Verified working on staging in the same pass

Recorded here so the backend has the positive results too, not only the blocker:

- **API-3 `POST /v1/auth/google`** — sign-in succeeds end to end on a real Android device profile.
  The Android OAuth client (package + SHA-1) is correctly registered; an earlier prediction that this
  would fail with `DEVELOPER_ERROR` was wrong.
- **API-40 `POST /v1/consents`** — accepted with the new `platform` field from v1.10. No 400.
- **Token refresh** — `401 /v1/me` → `POST /v1/auth/refresh` → `200` → retry. Works.
- **API-38 `GET /v1/locations/cities?state=GJ`** — returns correctly scoped cities. Combined with
  API-39's `state` category (36 entries, `GJ`-style two-letter codes), this **closes
  CONTRACT-QUESTIONS §10**: `state` comes from API-39, not from `GET /v1/locations/states`, and the
  client's assumption was right.
- **ETag / `304` handling** — conditional requests round-trip correctly.

### Two smaller things seen on the wire, for the backend's awareness

1. **Requests are firing twice.** `POST /v1/auth/google` was sent twice on a single sign-in, and the
   submit sequence was `401 submit → 200 refresh → 400 submit → 400 submit` — one more submit than
   the 401-refresh-retry path accounts for. Being investigated on the client side first, but flagged
   because **API-7 and API-3 are both state-creating POSTs**: please make sure they are idempotent, or
   at least that a duplicate does not create two profiles or two device rows. This was only visible
   because a proxy was in the path; it would not show up in normal client testing.
2. A hard process kill immediately after a token refresh left the client presenting a **stale refresh
   token**, which returned `401` and signed the user out. Client-side persistence ordering is the
   likely cause and is being looked at here; mentioned only so it is not mistaken for a server fault
   if it appears in logs.

---

## Frontend counterpart

No frontend change is required for this delta — that is the point of adopting the six keys above.

Once the category is live, the client will add `fitness` to `REQUIRED_CATEGORIES` in
`src/hooks/use-onboarding-options.ts`, so that a future regression surfaces as an explicit
"options unavailable" screen rather than a dead-end question. It is deliberately excluded today,
because listing it while the category is genuinely missing would block onboarding at step 0 for
everyone instead of at step 15.
