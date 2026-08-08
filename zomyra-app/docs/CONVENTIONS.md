# Frontend conventions

Durable client-architecture rules that outlive any single module. Added
2026-08-08 out of the Module 5.5 review. Where a rule reverses an earlier
design-doc decision, that reversal is called out inline **and** here — a silent
disagreement between the code and MIGRATION.md is worse than either position.

---

## C-NAV-1 — Navigate on the write's own response, never on a follow-up read

**Rule.** When a screen performs a write (a mutation: submit, consent, and every
future POST/PUT/PATCH/DELETE), it must:

1. Show a busy state (greyed control + spinner) and **wait** for that write's
   own response.
2. On **success**, move forward — driven by the *write's* result.
3. On **failure**, stay put and show an error. The message is the backend's
   `error.message` verbatim; only fall back to a generic "something went wrong"
   when the backend sends a code the user could not act on (see
   `src/api/errors.ts`).

**Never advance the user on the strength of a *different* API call** — most
often a follow-up `GET /me` re-read through the root gate. A successful write
that then depends on a second, unrelated request inherits that request's failure
modes: the second call can fail, lag, or come back stale, and a user whose write
genuinely succeeded is stranded or silently bounced backward. Worse, a backend
that answers a write `200` **without persisting** is invisible to the write's
own success path but bounces the user back when the follow-up read disagrees —
so the anti-pattern also *hides* a backend bug instead of surfacing it.

### Why the destination is knowable without the re-read

You only reach for a follow-up `/me` when you think the next screen isn't
determinable locally. For a write, it usually is: the write's own response plus
what you already knew about the user pins exactly one destination.

- **Onboarding submit → `/verify?entry=photos`.** A just-submitted profile is
  always `unverified`; the next step is deterministically Photos.
- **Consent → `/onboarding`.** The consent screen is only reachable when
  `!profileComplete`; an account that has just recorded consent has exactly one
  §9.1 destination — Onboarding.

Invalidate `Me` (or `Profile`) on these mutations still — it keeps the cache
honest for the *next* screen to read it — but that invalidation must not be the
thing that decides where the user goes.

### The sanctioned exceptions (must be highlighted where they occur)

Relying on a follow-up read is correct in exactly two situations, and each one
must carry a comment at the call site saying so:

1. **Optimistic updates.** The UI moves first and reconciles against the server
   response; this is a deliberate, spec-called-out pattern, not the default.
   None exist in modules 1–5 (onboarding submit explicitly has none — one call
   at the end, nothing partial to reconcile).

2. **A genuinely unknown destination that only the server can resolve** — and
   only when the design doc calls for it. The **auth screens** are the live
   example: after Google sign-in (API-3) or OTP verify (API-2), a *returning*
   user could belong anywhere in the funnel — onboarding, consent, verify,
   discover — and the write's response (`isNewAccount`, `profileComplete`) does
   **not** carry `verificationStatus` or `discoveryMode`. So `app/login.tsx` and
   `app/otp.tsx` `replace("/")` on purpose and let `resolveRootDestination` read
   the full `GET /me`. This is not "confirming a write via another API"; the
   write established a session and the destination is legitimately unknown.
   MIGRATION.md §"FR-1a fixed" documents this and it stands.

> The difference between exception (2) and the anti-pattern is **whether the
> destination is already determined.** Auth: unknown, must resolve → gate.
> Consent/submit: exactly one possible next screen → navigate directly.

### Audit status at time of writing (modules 1–5)

| Write | Screen | Post-write nav | Status |
| --- | --- | --- | --- |
| API-3 `googleSignIn` | `app/login.tsx` | `replace("/")` → gate | ✅ sanctioned exception (unknown returning-user destination) |
| API-2 `verifyOtp` | `app/otp.tsx` | `replace("/")` → gate | ✅ sanctioned exception (same) |
| API-40 `recordConsent` | `app/consent.tsx` | `replace("/onboarding")` | ✅ fixed 2026-08-08 — was `replace("/")` |
| API-7 `submitOnboarding` | `app/onboarding.tsx` | `replace("/verify?entry=photos")` | ✅ fixed in 5.5 — was gate-driven via `/me` |
| `signOut` (local) | consent/profile | `replace("/login")` | ✅ local action, no server dependency |

No module-1–5 write advances the user on API failure — every failure path
`return`s with an inline error. Re-audited 2026-08-08.

### Reversed decisions (highlighted per the rule above)

- **MIGRATION.md §Module-4 addendum — "Consent is a row in §9.1's table, not a
  screen the auth flow pushes."** Superseded for the *navigation* concern:
  consent still is a §9.1 row for the **gate/tabs-guard/deep-link** enforcement
  (a cold start or deep link to `/` still routes through `resolveRootDestination`
  and cannot skip consent), but the *screen itself* now navigates directly on
  its write's success rather than bouncing through the gate. The enforcement
  guarantee is unchanged; only the happy-path hop is removed.
- **TEST-CASES.md M5-015** ("Success routes through §9.1, not to a hardcoded
  screen") is updated to the direct-nav expectation.
