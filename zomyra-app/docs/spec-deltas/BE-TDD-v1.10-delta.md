# Backend TDD — delta v1.9 → **v1.10**

**Date:** 2026-08-06
**Base document:** `ZOMYRA_Backend_TDD_v1.9.docx`
**Origin:** the backend session's four points of 2026-08-06, plus the owner's decision on points 2
and on transport for client/device metadata.

This is an addendum for the backend to build to. The **client side is already implemented** on
branch `module/5-onboarding` and sends both fields described below, so the shapes here are
descriptive of live client behaviour, not proposals.

---

## §14.2b — API-40 `POST /consents` gains `platform`

### Request body

```jsonc
{
  "consentType": "sensitive_data" | "biometric",   // unchanged
  "version": 1,                                     // unchanged
  "platform": "ios" | "android"                     // NEW in v1.10
}
```

**Decision (owner, 2026-08-06):** option (a) from the backend's point 2 — the client sends
`platform` — rather than (b), a nullable column. A consent record is a legal artifact and a blank
platform field weakens it.

**The client cannot be second-guessed on this and the server cannot derive it.** `X-App-Version`
carries a version string only; no other field on the request named a platform. That was the correct
reading in the backend's message.

### Validation

- Enum is exactly `ios` | `android`. The client's `app.json` declares `"platforms": ["ios",
  "android"]`, so no third value is reachable. If web is ever added, **the backend enum widens
  first**, then the client.
- `400 validation_error` on an unknown value, consistent with the existing `consentType` handling.

> ### ⚠️ Deployment order — accept it as optional for one release
>
> Making `platform` **required** in the same deploy that introduces it returns `400` to every
> already-installed client, including the dev clients on both test devices. Ship it optional,
> confirm the field is arriving, then tighten. This is the single most likely way this change breaks
> something.

### Storage

Column on the append-only `user_consents` row (BE §6.1). Denormalised deliberately — a consent row
should be readable on its own in five years without reconstructing what a JSON shape meant in 2026.
Same reasoning applies to `appVersion`, which the backend already has from `X-App-Version` and
should consider persisting on the same row.

---

## §7.1 — New request header `X-Client-Info`

### What arrives

Sent by the client on **every** HTTP request, alongside the existing `X-App-Version` and
`X-Bundle-Update-Id`.

```
X-Client-Info: p=android; os=14; m=google_Pixel_7; a=1.0.0; d=1a2b3c4d-5e6f-7a8b-9c0d
```

| Field | Meaning | Always present? |
|---|---|---|
| `p` | platform — `ios` \| `android` | yes; identical to API-40's `platform` |
| `os` | OS release, e.g. `14` on Android, `17.2` on iOS | yes |
| `m` | brand + model, e.g. `google_Pixel_7` | **no — Android only** |
| `a` | app version | yes; identical to `X-App-Version` |
| `d` | install id | yes |

### Parsing

- Split on `;`, trim, split each on the first `=`.
- **Treat every field as optional and unknown fields as ignorable.** `m` is genuinely absent on iOS;
  new fields may be added without a version bump.
- Values are sanitised client-side to `[A-Za-z0-9._-]` and length-capped, so no value contains `;`,
  `\r` or `\n`. Header injection is not reachable from device strings — but validate anyway rather
  than trusting a client.
- The whole header is client-supplied and therefore **untrusted input**. It must never influence
  authorisation, pricing, feature gating, or any decision beyond observability.

### What to do with it

1. **Sentry scope** — set as tags on every request. This is the reason the header exists: a 500
   raised inside the server currently carries no client context at all, and the client has no Sentry
   SDK installed to supply it from the other side.
2. **`devices` table — upsert only when the tuple changes**, keyed on `d`. This keeps the analytics
   table deduplicated without a separate client call: writing the blob onto every request row would
   store one unchanging value a few million times.
3. **Request-scoped rows store `d` only** — a foreign key, not the blob.

JSONB is a good fit for the `devices` row. It is the wrong fit for per-request storage.

### `d` — the install identifier

- **Random, generated on first launch, stored in the client's secure store.** Not IDFV, not
  `ANDROID_ID`. A hardware identifier survives uninstall, is shared across a vendor's apps, and
  cannot be reset by the user — materially harder to defend under the DPDP Act for an application
  handling sensitive personal data.
- **Survives the user's sign-out** and changes on reinstall. A single device that logs into two
  accounts presents the same `d` — which is useful for abuse detection, and is also precisely why it
  must appear in the privacy notice.
- **Not a credential.** It authenticates nothing and must never be accepted as identity.

### Operational note

This is a new header on every request. **If any proxy, WAF, load balancer or middleware runs a
header allowlist, it needs updating** — otherwise the header is silently stripped and the Sentry
context this was built for never appears, with no error anywhere to explain why.

---

## Not in this delta, but raised alongside it

Answers to the backend's other three points, recorded so they are not lost:

- **Point 1 (API-40 not deployed) and point 3 (API-39 not built)** — contradicted by a direct probe
  of `https://zomyra-staging.duckdns.org` on 2026-08-06: `POST /v1/consents`, `GET
  /v1/onboarding/options`, `GET /v1/locations/cities` and `GET /v1/locations/states` all return
  **401**, while genuinely unregistered routes on the same host (`/v1/auth/otp/request`,
  `/v1/profile`, `/v1/photos`, `/v1/discover`) return **404** with `{"code":"not_found"}`. A 401
  means the route is registered. Either something shipped after that session's information, or those
  routes are registered but unfinished — worth resolving before planning around "not built".
- **Point 4 (`languagesOther`)** — the contract is confirmed exactly as the backend stated it.
  The client cannot send `"other"` without text (the submit gate blocks it) and cannot send text
  without `"other"` (the key is omitted from the body entirely, never sent as `""`). Whitespace-only
  text is treated as absent. Validate as a `400` in both directions; nothing the client legitimately
  produces will be rejected.
- **Still open:** whether `state` comes from an API-39 category or the newly-observed `GET
  /v1/locations/states` — the client currently assumes the former, with invented keys. See
  `docs/CONTRACT-QUESTIONS.md` §10.

---

## Frontend counterpart

`docs/spec-deltas/FE-TDD-v1.49-delta.md`. Full reasoning in `docs/CONTRACT-QUESTIONS.md` §11.
