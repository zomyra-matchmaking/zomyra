# Frontend TDD — delta v1.48 → **v1.49**

**Date:** 2026-08-06
**Base document:** `zomyra_frontend_requirements_v1_48.docx`
**Status:** implemented in `zomyra-app` on branch `module/5-onboarding`; lint and typecheck green.

This is an addendum, not a rewrite. Fold it into §9 of the base document when convenient; nothing
outside the sections named below changes.

---

## §9 — Request headers (amends "the two headers sent on every request")

§9 previously specified two observational headers, `X-App-Version` and `X-Bundle-Update-Id`, and
noted that nothing consumed them. **A third is added, and unlike the other two it has a consumer.**

### §9.x `X-Client-Info`

Sent on every HTTP request, alongside the existing two.

```
X-Client-Info: p=android; os=14; m=google_Pixel_7; a=1.0.0; d=1a2b3c4d-5e6f-7a8b-9c0d
```

| Field | Source | Present |
|---|---|---|
| `p` | `Platform.OS`, narrowed to `ios` \| `android` | always |
| `os` | `Platform.constants.Release` on Android; `Platform.Version` on iOS | always |
| `m` | `Platform.constants.Brand` + `Model` | **Android only** |
| `a` | `Constants.expoConfig.version` | always |
| `d` | install id, see §9.y | always |

**Rationale.** The backend's Sentry events carry no client context; a client-side Sentry SDK cannot
annotate an error raised inside the server. Since Sentry is not yet installed on this client, the
backend's is the only error reporting that exists, and a header is the only channel that reaches it.

**Format constraints.**

- Key-value, **not** JSON. JSON in a header requires quoting and escaping that every consumer must
  get right, and multiplies the size of every log line. This form is ~60 bytes.
- Values are sanitised to `[A-Za-z0-9._-]` and length-capped client-side, so no value can contain
  `;`, `\r` or `\n`. Header injection is not reachable from device strings.
- The value is constant within a session, so HTTP/2 header compression makes repeats near-free.
- The static fields are resolved once at module load, not per request.

**Deliberate omissions**, each of which is a decision rather than an oversight:

- **No model on iOS.** The only zero-dependency iOS signal is `Constants.deviceName`, which returns
  the user-assigned device name and is frequently the owner's real name. Sending it would place a
  legal name in every backend log line. Real iOS model data requires `expo-device`, a native module,
  and therefore a dev-client rebuild under C-2.
- **No manufacturer or OS build number.** Same dependency, same rebuild cost. Deferred until a
  concrete need exists.
- **No IDFV or `ANDROID_ID`.** See §9.y.

### §9.y Install identifier

A random, UUID-shaped string generated on first launch and persisted in `expo-secure-store`.

- **Not a hardware identifier.** IDFV and `ANDROID_ID` survive uninstall, are shared across a
  vendor's apps, and cannot be reset by the user — materially harder to justify under the DPDP Act
  for an application handling sensitive personal data. A random id is resettable by reinstalling and
  is meaningless outside our own logs.
- **Not cryptographically random, by design.** The value is never a credential, authenticates
  nothing, and gates nothing; it only has to be unique. The declared `uuid` dependency is imported
  nowhere and would require `crypto.getRandomValues`, which this runtime does not polyfill —
  adopting it would trade a correlation id for a crash on every request.
- **Survives sign-out.** It is stored beside the auth tokens but is explicitly *not* cleared by the
  sign-out path: the device is the same device after a logout, and regenerating per session would
  add a `devices` row per login and destroy the correlation the id exists for.
- **Never treated as identity.** It is a correlation key. Authentication remains NFR-2's tokens.

Implementation: `src/config/device.ts`; wired in `src/api/base-query.ts`'s `prepareHeaders`.

> **Scope note.** `prepareHeaders` belongs to the HTTP transport, so the header is absent in
> `APP_ENV=mock`. This is correct — there is no server to receive it — but it means the header can
> only be observed against a real host. It does **not** have to be *staging*: verified 2026-08-06 by
> pointing `EXPO_PUBLIC_API_URL` at a local header-logging server under `APP_ENV=staging`, which
> needs no token because `/app/version-check` fires before authentication. See M5-055.

---

## §9.2 — API-40 `POST /consents` body (amends the field list)

The body gains a third field:

```jsonc
{
  "consentType": "sensitive_data" | "biometric",
  "version": 1,
  "platform": "ios" | "android"   // NEW in v1.49
}
```

- `platform` mirrors `X-Client-Info`'s `p=` field and is read from the same constant, so a consent
  row and a Sentry event cannot disagree about what the client was.
- It is set **inside the RTK Query endpoint**, not passed by callers. A value derived from the
  runtime is not a screen's decision, and this makes omission unreachable from either the FR-2a or
  the FR-11a call site.
- The caller-facing type (`RecordConsentBody`) is unchanged: `{ consentType, version }`.

**Why the client sends it rather than the server deriving it:** the server cannot. `X-App-Version`
carries only a version string, and no other field on the request named a platform. The backend
proposed either this or a nullable column, and preferred this — a consent record is a legal artifact
and a blank platform field weakens it.

**Constraint on the enum:** `app.json` declares `"platforms": ["ios", "android"]`, so a third value
is unreachable today. Adding web as a build target requires widening the backend enum *first*.

---

## Test coverage

`docs/TEST-CASES.md` — M5-051 … M5-056, all passing. M5-055 verifies the header on the wire.

## Backend counterpart

`docs/spec-deltas/BE-TDD-v1.10-delta.md`. The contract discussion and the reasoning behind each
decision are in `docs/CONTRACT-QUESTIONS.md` §11.
