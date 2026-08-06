# Zomyra — cross-module regression sheet

**Purpose.** One accumulating list of everything each module claims to have made work, so a later
module that breaks an earlier one is caught by name. A failure here should read as *"M2-004 failed"*
— identifying both the behaviour and the module that owns it, without anyone re-deriving context.

> **This file is tracked** (MIGRATION.md C-7). It ships in the repo and appears in PRs, so a
> reviewer can see what a module claims to have made work alongside the code that claims it — and it
> survives a fresh clone. It is **never bundled**: nothing imports it, and Metro only bundles what is
> reachable from the entry point (FE TDD §13.3), so tracking it costs nothing at runtime.

---

## For a session running this sheet

You are running a regression pass, not writing features. Read `MIGRATION.md` §1 first for the
standing constraints, then:

1. Work top to bottom. Cases are ordered by module, and later modules assume earlier ones hold.
2. For each case, perform the **Verify** column and compare against **Expect**.
3. Record `PASS` / `FAIL` / `BLOCKED` / `SKIP` in **Last result**, with the date.
4. **Do not fix anything.** Report `<ID> — <module> — <one-line symptom>` for every failure and stop.
   A fix belongs in its own session with its own branch, because the owning module may not be the
   one that broke it.
5. `BLOCKED` is for a case that cannot run yet (needs a live backend, a store account, a device).
   It is not a failure — say what it is waiting on.

**Case types**, which decide how you verify:

| Type | How it is verified |
|---|---|
| `static` | Read the code / config. No app run needed |
| `build` | Runs a command — `yarn lint`, `npx tsc --noEmit`, an EAS build |
| `runtime` | Requires the app running on a simulator or device |
| `manual` | Needs a human — a store account, a real purchase, a physical device |

---

## For a module finishing its work

Append your cases before you close the module (MIGRATION.md C-7). Rules that keep this sheet usable:

- **ID is `M<module>-<3 digits>`**, sequential within the module, **never reused** — a stable ID is
  the whole point, so a failure names the same thing months later.
- **Test behaviour, not implementation.** "Tokens survive a cold start" ages well; "`PERSIST_WHITELIST`
  contains three strings" breaks the moment someone adds a fourth for a good reason.
- **One assertion per case.** A case that checks three things reports one ambiguous failure.
- **Write `Verify` so someone with no context can run it** — exact command, exact file, exact taps.
- Prefer `static` and `build` over `runtime`: they are faster, and they still run when no device or
  backend is available.

---

## Status

| Module | Cases | Backfill owed |
|---|---|---|
| 0 · Build foundation | 4 | Yes — seeded only |
| 1 · Design system | 4 | Yes — seeded only |
| 2 · State & data layer | 6 | Yes — seeded only |
| 3 · Navigation | 31 | No — authored by the module (incl. the 2026-08-05 follow-up) |
| 4 · Auth & session | 30 | No — authored by the module (incl. the 2026-08-04 permutation pass) |
| 5 · Onboarding + verification entry | 57 | No — authored by the module (incl. the 2026-08-05 Edit Profile, `fitness` and end-to-end walk follow-ups) |
| 5.5 · Test harness | 12 | No — authored by the module (2026-08-06). Adds no product behaviour: its job was to move six Module 2/3 rows from `static`/`runtime` to `build` (all green) and to stand up Maestro. **M55-007/008 are UNRUN** — awaiting a `preview-mock` build |
| 6–12 | — | Not started |

**The seeded cases below are a starting set, not a complete one.** They were written after those
modules had already closed, from their MIGRATION.md log entries rather than from the work itself.
Each module from 3 onward should produce a fuller set as it goes, and Modules 0–2 are owed a
backfill by whoever next has that code open.

---

## Module 0 — Build & project foundation

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M0-001 | App identity | Read `app.json` | `name` is `Zomyra`, `slug` `zomyra`, `scheme` `zomyra` — never `frontend` | static | — |
| M0-002 | Bundle ID | Read `app.json` | `ios.bundleIdentifier` and `android.package` are both `com.zomyra.app`, and identical to each other (O-1, §9) | static | — |
| M0-003 | Light mode only | Read `app.json` | `userInterfaceStyle` is `"light"` — C-3. `"automatic"` is a regression: it gives dark system chrome against light screens | static | — |
| M0-004 | Web is out of scope | `yarn expo export --platform web` | Refuses. `platforms` in `app.json` lists only `ios` and `android` (O-12) | build | — |

## Module 1 — Design system & theming

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M1-001 | No raw colours | `yarn lint` | Zero errors. The C-4 rule rejects raw hex in style objects; the palette stays private | build | — |
| M1-002 | No raw spacing | Add `padding: 13` to any screen's stylesheet, run `yarn lint`, then revert | Lint **errors** on it. A pass means the spacing rule has regressed | build | — |
| M1-003 | Press handling | `grep -rn "TouchableOpacity\|Pressable" app/ src/components/` | No direct use outside `src/components/ui/Touchable.tsx` — everything routes through the primitive | static | — |
| M1-004 | Semantic token names | Read `src/theme/` | Tokens are named by role (`text.primary`, `border.subtle`), never by value (`purple700`) — C-4. Value-named tokens defeat the one-file theme change | static | — |

## Module 2 — State & data layer

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M2-001 | Tokens never touch disk | `yarn test src/store/__tests__/persist-whitelist.test.ts` | The persisted root written to AsyncStorage carries no `session` slice and no token-shaped key — NFR-2. **A failure here is a security regression, not a bug** | build | PASS 2026-08-06 (5.5a) |
| M2-002 | Onboarding draft survives a kill | Fill part of onboarding, force-quit the app, reopen | The draft is still there at the same step — NFR-1. Distinct from M2-003: the *draft* persists, the *catalogues* must not | runtime | — |
| M2-003 | Reference data is not persisted | `yarn test src/store/__tests__/persist-whitelist.test.ts` | The persisted root carries no `api` slice — RTK Query's cache stays in memory (FE §4.3, NFR-11). Persisting a full cities table to disk is the failure this prevents | build | PASS 2026-08-06 (5.5a) |
| M2-004 | Concurrent 401s share one refresh | `yarn test src/api/__tests__/base-query-refresh.test.ts` | Two `baseQuery` calls that 401 at once trigger **exactly one** `POST /auth/refresh`. Parallel refreshes replay a single-use token and force-logout a healthy session (BE §9.2) | build | PASS 2026-08-06 (5.5a) |
| M2-005 | Environment fails loud | `yarn test src/config/__tests__/env.test.ts` | `parseAppEnvironment("nonsense")` throws naming the valid values; an empty value resolves to `mock`, never `production`. Silently defaulting to `production` is the failure mode this guards | build | PASS 2026-08-06 (5.5a) |
| M2-006 | A returning user keeps their draft | `yarn test src/store/__tests__/onboarding-rehydrate.test.ts` | A same-version persisted draft rehydrates intact across a cold start (NFR-1). ⚠️ **Retargeted 5.5a:** originally asserted `legacy-migration.ts` imports Zustand-era state — that file was removed by design 2026-08-02 (MIGRATION §6, "Module 2 addendum"), superseded by M5-023's discard-on-migrate, so the old assertion was a *wrong test* and was replaced with the mechanism that now carries NFR-1 | build | PASS 2026-08-06 (5.5a) |

## Module 3 — Navigation

Authored by the module (2026-08-02) and extended by its follow-up (2026-08-05: keyboard re-measure +
NFR-16). `Last result` records verification that actually happened during those passes; `—` marks a
case authored for future regression runs but not formally re-run.

### Root gate, version check & the §9.1 routing table

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M3-001 | Gate ordering | Read `app/index.tsx` / `src/components/nav/use-launch-gate.ts` | `useGetMeQuery` (API-6) carries `skip` until the version gate (API-5) resolves and the session is authenticated — an anonymous launch never fires an authenticated call it knows will 401 | static | — |
| M3-002 | Routing is a pure function | `yarn test src/lib/__tests__/root-route.test.ts` | `resolveRootDestination` is pure (equal inputs → equal outputs, no mutation), and `accountStatus` short-circuits: a suspended user with `profileComplete: false` reaches the blocker, not Onboarding | build | PASS 2026-08-06 (5.5a) |
| M3-003 | The unlisted `verified/unverified` row | Read `src/lib/root-route.ts` | `true` + `unverified` (submitted API-7, photos not started) routes to `/verify?entry=photos`. §9.1 omits this row; it must not fall through to Discover | static | — |
| M3-004 | Version below minimum blocks | Set the mock `minSupportedVersion` above the app version (or `forceUpdate: true`) in `src/api/mock/handlers.ts`, cold start | Full-screen, non-dismissible `UpdateRequired`. Below-latest → dismissible prompt then proceed; current → silent. All three walked on-device 2026-08-02 | runtime | PASS 2026-08-02 (M3 on-device) |
| M3-005 | Version compare never disables the gate | Read `src/lib/app-update.ts` (`compareVersions`) | A non-numeric segment degrades to `0`, never `NaN` — `NaN` comparisons are all-false and would silently disable the gate | static | — |
| M3-006 | API-5 fails open | Read the version-gate consumer for `UPDATE_REQUIREMENT_ON_ERROR` | On version-check failure the gate proceeds (does not block). A flaky network must not produce an inescapable "Update required" for an update that doesn't exist | static | — |
| M3-007 | `forceUpdate` can't brick a current user | Read `resolveUpdateRequirement` in `src/lib/app-update.ts` | Both blocking paths are gated on a newer version actually existing; `forceUpdate` on someone already at `latestVersion`, and `minSupportedVersion > latestVersion`, do **not** block | static | — |
| M3-008 | Optional prompt capped per version | Read `src/store/slices/app-update-slice.ts` + `PERSIST_WHITELIST` in `src/store/index.ts` | The optional-update cooldown is keyed on `latestVersion` **and** time (once per version, then quiet ~1 week), and the slice is persisted — an in-memory cooldown would reset on the very cold start it suppresses | static | — |
| M3-009 | No optional prompt without a store URL | Read the optional-prompt gate | A dismissible "Update available" is suppressed when `updateUrl` is empty; the **blocking** screen still renders (button hidden) because that client really is below minimum | static | — |
| M3-010 | `/me` failure doesn't log the user out | Force API-6 to error, cold start while authenticated | "Something went wrong" with **Try again** that refetches — never a redirect to `/login`. Tokens are still valid; a bad five minutes must not look like an expired session | runtime | — |

### The account-status blocker & session events

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M3-011 | Blocker is non-dismissible | Read `app/blocked.tsx` + `src/hooks/use-non-dismissible.ts` | Reached by `replace` (no back-stack entry), `gestureEnabled: false`, and `useNonDismissible()` swallows Android hardware back. One screen for all three causes — no link, retry, or sign-out | static | — |
| M3-012 | `403 account_*` bypasses refresh | Read `src/api/base-query.ts` | `403 account_*` is handled **beside** the 401 branch, not inside it — it routes to the blocker and never enters token refresh (a 403 means the credential is fine, so refreshing burns a rotating token for nothing) | static | — |
| M3-013 | Mid-session forced logout / 403 navigates | Read `SessionRouter` wiring | A single place turns a session event (NFR-15 forced logout, BE §9.9 mid-session 403) into a navigation — not eleven per-screen copies | static | — |

### Tab navigation (FR-20, §3.3/§3.4)

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M3-014 | Tab state & scroll survive switching | Push Filters in Discover → switch to Profile → return to Discover | Filters is still there and scroll is preserved — each tab is its own stack. The prototype's `router.push` nav failed exactly this | runtime | PASS 2026-08-02 (M3 on-device) |
| M3-015 | Tabs are route groups, URLs unchanged | Read `app/(tabs)/` layout; confirm group names in parentheses | `(discover)`/`(requests)`/`(chats)`/`(profile)` are groups: `app/(tabs)/(discover)/filters.tsx` is still `/filters`. Every existing `href`, typed route, and `zomyra://` deep link is unchanged | static | — |
| M3-016 | §3.4 placement by file location | Read `app/(tabs)/_layout.tsx` header + tree | Premium on the **root** stack (reachable from any tab), Filters in the Discover stack, Delete account a dialog inside Profile. Misplacement is a structural bug, not styling | static | — |
| M3-017 | Tab bar hides on a pushed screen | Open a chat conversation (a pushed screen in the Chats stack) | `FloatingTabBar` returns `null` — the bar does not draw over the chat composer. A real `<Tabs>` bar would otherwise cover every detail screen | runtime | PASS 2026-08-02 (M3 on-device) |
| M3-018 | Badges come from API-34 | Read the tab-bar badge source | Counts come from `GET /counts` (API-34), not `state.requests…length`, and both Requests and unread messages are badged (§9.13). A request arriving while on Discover must still badge | static | — |
| M3-019 | The tabs are guarded by the same gate | Deep-link `zomyra:///chats/<id>` cold: as a `pending` user, a `suspended` user, and a valid user | `pending` → Held screen; `suspended` → blocker; valid → **lands on the conversation** (guard doesn't over-block). `app/(tabs)/_layout.tsx` runs `useLaunchGate`, so deep links can't skip the gate | runtime | PASS 2026-08-02 (M3 on-device) |
| M3-020 | Held screen offers no forward path | Read `src/components/verification/HeldVerification.tsx` | No forward CTA; a "Check again" that only re-reads `GET /me`. Re-checking is not re-submitting — FR-11 forbids a second verification attempt | static | — |

### Loading primitive & reduce-motion (§13, NFR-6a)

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M3-021 | Loading respects reduce-motion | Set Android `transition_animation_scale = 0`, render a loading state | The shared `Loading` renders the **still** ring, no animation — `useReduceMotion` (`src/hooks/use-reduce-motion.ts`) is honoured. Proven by pixels 2026-08-02 | runtime | PASS 2026-08-02 (M3 on-device) |
| M3-022 | `ActivityIndicator` is centralised | `grep -rn "ActivityIndicator" src/ app/` | Appears in exactly one file. Every other spinner routes through the shared `Loading` primitive so a treatment swap touches one place | static | — |

### Keyboard handling — the KAV/inset split (2026-08-05 follow-up)

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M3-023 | KAV kept on the five verified screens | Open the keyboard on `app/phone.tsx`, the chat composer, `edit-profile`, `profile`, and `OnboardingShell` | The CTA / last field stays clear of the keypad on every one — KAV is retained (not broadened to `useKeyboardInset`). Re-measured on Android 2026-08-05 | runtime | PASS 2026-08-05 (follow-up) |
| M3-024 | KAV and inset never coexist | `grep -rln "KeyboardAvoidingView" app/ src/` then check each also uses `useKeyboardInset` | No screen uses both on one subtree — both apply an offset, so content would jump twice. `otp.tsx` (inset) and the five above (KAV) are mutually exclusive | static | — |

### NFR-16 — screen-capture blocking (FE v1.46 §12.5, 2026-08-05 follow-up)

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M3-025 | Blocked in prod, off in dev/staging | Read `src/hooks/use-screen-capture-block.ts` | The effect is gated on `IS_PRODUCTION && isAndroid` before calling `preventScreenCaptureAsync()`. A pass in dev/staging would black out `adb screencap` and destroy QA/store-screenshot evidence | static | — |
| M3-026 | Android genuinely blocks capture | Production Android build, reach `/discover`, run `adb shell dumpsys window` and `adb exec-out screencap` | Window flags include `SECURE`; `screencap` returns a **black** frame while the a11y tree still shows real content (black = blocked, not crashed). Verified 2026-08-05 with the gate temporarily forced on | manual | PASS 2026-08-05 (follow-up) |
| M3-027 | iOS is a deliberate no-op | Read `src/hooks/use-screen-capture-block.ts` | On iOS the hook returns early and attaches **no** listener — iOS cannot prevent capture and MVP pairs detection with no behaviour, so a firing-nothing listener would be a hook pretending to be a feature | static | — |
| M3-028 | Native import is lazy | Read `src/hooks/use-screen-capture-block.ts` | `expo-screen-capture` is loaded via dynamic `import()` inside `try/catch` (C-2): a stale dev client predating the dependency degrades to the feature being absent, not a crash | static | — |
| M3-029 | Coverage gap is documented | Read the header of `app/(tabs)/_layout.tsx` | The block covers the tabs and root-stack pushes (`/premium`, Match) but **not** `/verify` or `/onboarding` (the gate replaces the tabs to reach them). The gap is called out for Module 6 / Module 5 | static | — |

### Follow-up: previously-unexercised routes (2026-08-05)

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M3-030 | Delete-dialog step 2 clears the keypad | Open FR-28 delete flow, reach step 2 ("type DELETE"), raise the keyboard | The `TextInput`, the "Delete my account" button, and Back all lift above the keypad — nothing pinned behind a spacer (O-18(b), no defect) | runtime | PASS 2026-08-05 (follow-up) |
| M3-031 | `personality-test` route renders | Navigate to `personality-test` in the Profile stack | Renders (quiz 1/12), the tab bar is hidden on the pushed screen, and Back restores it (O-18(c), no defect) | runtime | PASS 2026-08-05 (follow-up) |

> **Module 3 test debt still open** (from MIGRATION.md O-18, not yet cases with results): **O-18(d)** —
> `?entry=mismatch` and `?entry=photos` were never walked end-to-end (only `?entry=pending`); owned by
> **Module 6**. **O-18(e)** — `app/otp.tsx` keypad-up is unverified on **iOS** (the simulator suppresses
> the software keypad for `oneTimeCode` fields); needs a real iPhone or a manual simulator run.

---

## Module 4 — Auth & session

Authored by the module (2026-08-03), revised for FE v1.46 / BE v1.7's API-40 (2026-08-04) and extended
by its permutation-matrix pass (2026-08-04). `Last result` records verification that actually happened;
`—` marks a case authored for future regression runs but not formally re-run.

⚠️ **Phone/OTP cases run against the mocks by design.** API-1/API-2 are undeployed (blocked on LLP →
DLT registration), so a `staging` run of M4-012…M4-018 is `BLOCKED`, not `FAIL`.

### Google Sign-In (FR-1, API-3, §6.12)

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M4-001 | Native import is lazy | Read `src/auth/google.ts` | The SDK is reached only through dynamic `import()`. A static import would call `NativeModule.getConstants()` at module-evaluation time and **crash any binary without the native module at launch**, not at first use (C-2) | static | — |
| M4-002 | One file owns the SDK | `grep -rn "@react-native-google-signin" app/ src/` | Only `src/auth/google.ts` (plus `app.config.js` for the plugin). Screens see `signInWithGoogle()` returning `success` / `cancelled` / `unavailable`, never SDK error codes | static | — |
| M4-003 | Cancel is not an error | Cold app, tap Continue with Google, dismiss the account sheet | Returns silently to Welcome with **no** error banner — a user backing out is not a failure. `statusCodes.SIGN_IN_CANCELLED` maps to `cancelled` | runtime | PASS 2026-08-03 (dev client, both platforms) |
| M4-004 | Config plugin uses the standalone path | Read `app.config.js` | The plugin is added with `{ iosUrlScheme }`. The **option-less** form takes the plugin's Firebase path, which demands a `google-services.json` the project does not have (O-2) and fails prebuild | static | — |
| M4-005 | iOS URL scheme is derived, not typed | Read `iosUrlSchemeFrom` in `app.config.js` | Built by reversing `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and **throws a named error** if the value lacks the `.apps.googleusercontent.com` suffix. A hand-typed scheme that drifts from the client ID fails only at the sign-in callback | static | — |
| M4-006 | No secrets in the bundle | `grep -rn "EXPO_PUBLIC_GOOGLE" eas.json .env.example src/config/google.ts` | Only **client IDs**, which are public by design. `EXPO_PUBLIC_*` is inlined into the shipped bundle — a client secret here would ship to every user | static | — |
| M4-007 | Staging IDs can't leak into production | Read `eas.json` | `development` and `preview` carry the Google client IDs; **`production` deliberately does not**, so a store build cannot inherit staging's by accident | static | — |
| M4-008 | Sign-out forgets the Google account | Read `src/auth/sign-out.ts` | It calls `forgetGoogleAccount()`. Without it the SDK silently re-uses the last account and "sign out" doesn't let a second user sign in on the same device | static | — |

### The root gate & FR-1a (§9.1)

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M4-009 | Auth screens never route by hand | `grep -n "router.replace" app/otp.tsx app/login.tsx` | Both land on **`/`** and let §9.1 decide. The FR-1a bug was `app/otp.tsx` sending every existing account to `/onboarding` unconditionally — a second, disagreeing copy of the routing table | static | PASS 2026-08-03 |
| M4-010 | Routing is a pure function of `GET /me` | Read `src/lib/root-route.ts` | `resolveRootDestination(me)` reads only `me` — no client-side slice, no `isNewAccount`. API-40 removed the persisted consent slice precisely so nothing local can disagree with the server | static | — |
| M4-011 | Every §9.1 row is reachable by signing in | Sign in on a `preview-mock` build as `9000000000`–`9000000008` (README table) | Each lands on its documented destination. `…006` (suspended **and** incomplete **and** unconsented) and `…007` (perfect Discover account, banned) both reach `/blocked` — contradicting the table from opposite ends, so only `accountStatus` winning can explain it (O-4) | runtime | PASS 2026-08-04 (both platforms, release `preview-mock`) |

### OTP error handling (FR-1, §6.11, API-2)

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M4-012 | Wrong OTP has no client lockout | Enter an incorrect code repeatedly on `app/otp.tsx` | Inline error, field stays editable, **unlimited retries**. §6.11 specifies no lockout — a client-invented one would lock users out of an account the server would have let them into | runtime | PASS 2026-08-03 |
| M4-013 | `otp_expired` clears the cooldown | Use the reserved `otp_expired` code (`src/api/mock/accounts.ts`) | Inline error **and Resend becomes available immediately** — the fix for an expired code is a new code, so making the user wait out a cooldown is the wrong remedy | runtime | PASS 2026-08-03 |
| M4-014 | `too_many_attempts` disables Verify | Use the reserved `too_many_attempts` code | Verify is disabled and `retryAfterSeconds` counts down visibly. Distinct from M4-013: here waiting **is** the remedy | runtime | PASS 2026-08-03 |
| M4-015 | `rate_limited` on resend is honoured | Trigger `rate_limited` on Resend | The resend countdown starts from the server's `retryAfterSeconds`, not the local 30s default — the server's number wins whenever it sends one | runtime | PASS 2026-08-03 |
| M4-016 | `retryAfterSeconds` read in both shapes | Read `normalizeError` in `src/api/contract.ts` | Accepted **beside** `code` *and* nested in `details`. Both TDDs are ambiguous (CONTRACT-QUESTIONS item 5) and the mocks emit both shapes, so each must reach the same `ApiError.retryAfterSeconds` | static | — |
| M4-017 | Resend cooldown defaults to 30s | Send an OTP, then watch Resend | Disabled for 30s when the server supplies no `resendCooldownSeconds`; a server value overrides it | runtime | PASS 2026-08-03 |
| M4-018 | OTP CTA clears the Android keypad | Android, `app/otp.tsx`, keyboard up | Verify is fully visible and tappable. It uses `useKeyboardInset`, **not** `KeyboardAvoidingView` — KAV under-reclaims ~455px of a 1055px keypad on this edge-to-edge config, and the CTA sat entirely behind the keys. See M3-024: the two mechanisms must never coexist | runtime | PASS 2026-08-03 (Android; iOS keypad-up is O-18(e)) |

### FR-2a — sensitive-data consent (API-40)

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M4-019 | Consent gates Onboarding | Sign in as a new account on a `preview-mock` build | `/consent` **before** `/onboarding`, and after `accountStatus` — there is no point consenting to data collection on a banned account | runtime | PASS 2026-08-04 |
| M4-020 | Consent is recorded server-side | Read `src/api/endpoints/consent.ts` | Accepting `POST`s to `/consents` (API-40) and `invalidatesTags: ["Me"]`. The pre-v1.7 client-side slice meant that once `profileComplete` flipped, **no system anywhere** held proof consent was given | static | — |
| M4-021 | A failed record does not proceed | Force `POST /consents` to error, tap Agree | Stays on `/consent` with a visible error and a retry — **never** advances. Proceeding would put the user into Onboarding handing over religion and income with no record, which is the exact gap v1.7 closed | runtime | PASS 2026-08-04 |
| M4-022 | Accepting returns to the gate | Read the accept handler in `app/consent.tsx` | `router.replace("/")` — not `/onboarding`. The invalidated `Me` refetch makes §9.1 say Onboarding by itself; hardcoding it would be a second copy of the row that could disagree with the server | static | — |
| M4-023 | Declining signs out | Tap Decline | Signs out and returns to Welcome. Consent is a precondition, not a preference — there is no signed-in state where it is absent and unasked | runtime | PASS 2026-08-04 |
| M4-024 | The screen names the categories | Read `app/consent.tsx` | Religion, income and lifestyle are named explicitly, with a link to the privacy policy. A generic "we collect some data" is not informed consent for special-category data | static | — |
| M4-025 | Consent version is a named constant | Read `src/lib/consent.ts` | `SENSITIVE_DATA_CONSENT_VERSION` sits beside a description of what that version says, with the bump rule. The version is *the version of the copy displayed* — if the copy changes and the number doesn't, the consent log is evidentially worthless (O-20) | static | — |
| M4-026 | Consent skipped when already on file | Sign in as `9000000001` (incomplete, `sensitive_data` on file) on `preview-mock` | Straight to `/onboarding`, no consent screen — proven **across a cold start**, not just within a session | runtime | PASS 2026-08-04 |

### Session lifecycle (NFR-15 / §6.13)

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M4-027 | Deliberate sign-out is not "expired" | Sign out from Profile, land on Welcome | **No** "your session expired" banner. Sign-out tears down the API cache, mounted `useGetMeQuery` refetches, and the resulting 401 must not be mistaken for a server-terminated session | runtime | PASS 2026-08-03 |
| M4-028 | `sessionExpired` needs a live session | Read `hasLiveSession` in `src/api/base-query.ts` | `sessionExpired()` is dispatched only when a session actually existed. `sessionExpired` means *the server terminated a live session* — a 401 with no session is just being signed out | static | — |
| M4-029 | The expiry flag is consumed and cleared | Force a forced logout, reach Welcome, then navigate away and back | The banner shows once; acknowledging clears `session.expired`, so it does not reappear. Module 2 added the flag and Module 3 routed on it, but **nothing read it** until Module 4 | runtime | PASS 2026-08-03 |
| M4-030 | Mock latency does not leak Discover | Cold-start deep link with mock latency raised to 4s | No Discover frame at any point for a non-`verified` user. Verified three ways 2026-08-04: `TabsGuard`'s pending branch is unreachable from `/`; 86 captured frames across both platforms show none; all 128 field combinations through `resolveRootDestination` yield `/discover` for exactly 2, both requiring `verified` + a mode | runtime | PASS 2026-08-04 |

> **Module 4 test debt still open:** **Google sign-in has never completed end to end** — it reaches
> Google's own page on both platforms, but finishing needs real credentials, the Android console client
> (package `com.zomyra.app` + the **EAS** keystore SHA-1), and confirmation the backend validates the
> same Web client (O-19). A mismatch in either surfaces only as `invalid_google_token`. **O-18(e)** —
> `app/otp.tsx` keypad-up on iOS. **Known mock limitation, not a client bug:** a consent recorded in
> mock mode does not survive a cold start (the account directory is rebuilt per JS context while the
> token persists in the keychain); fixture `9000000001` exists so M4-026 is testable anyway.

---

## Module 5 — Onboarding (Plot / Anchor / Love) + API-7

> **Read this before running any `runtime` case below.** API-38 and API-39 are **not deployed** —
> re-probed 2026-08-05 and both still `404 not_found` on staging, alongside `/v1/docs-json`
> (`GET /v1/me` returns `401` on the same host, which is what makes "not routed" a distinct claim
> from "not authorised"). Every runtime result here was therefore obtained on **`preview-mock` /
> `.env` on `mock`**, against `src/api/mock/catalogue.ts`. **Whoever finds either endpoint live must
> re-run M5-001 through M5-006 before trusting the catalogue shapes** — the mock's *keys* are
> invented (`swe`, `mh`, `lt_5`) and are certain to differ from the backend's.

### FR-3b — the catalogue (API-39)

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M5-001 | The client hardcodes no choice list | `grep` `src/` and `app/` for the prototype's arrays — `INDIAN_CITIES`, `PROFESSIONS`, `LANGUAGES` | All three are **gone** from `src/lib/onboarding/data.ts`; only `cmToImperial` and the height bounds remain, which are a unit conversion and a slider's range, not catalogues. The only list left in-tree is `src/api/mock/catalogue.ts`, which is the mock **server's** data and is imported by nothing outside `src/api/mock/` | static | PASS 2026-08-05 |
| M5-002 | Options come over the wire | Sign in as `9000000001` on `preview-mock`, reach "I am" | Female / Male / Non-binary / Prefer not to say render from API-39's `gender` category, not from a literal in `app/onboarding.tsx` | runtime | PASS 2026-08-05 |
| M5-003 | Keys are stored, labels are shown | Read `OptionGrid` / `SearchableSelect` in `Primitives.tsx` | `onChange` is fed from `option.key` and the rendered `Text` from `option.label`; there is **no path** from displayed text back to the caller. `testID`s are keyed on `key` (`option-male`), which is why a backend reword cannot break a test | static | — |
| M5-004 | The catalogue is fetched once per session | Walk Plot → Anchor → Love, watch the network | One `GET /onboarding/options`. `keepUnusedDataFor: Infinity` overrides RTK Query's 60-second eviction, which a careful user spends longer than on Plot alone | runtime | PASS 2026-08-05 |
| M5-005 | Loading blocks the stack, it does not degrade | Raise mock latency, enter onboarding | The shared `LoadingScreen` (FR-3b's *shared default*, not Chat/Requests' spinner) holds the **whole** stack. No question renders an empty option grid — which matters because `stepIdx` is persisted, so advancing past a silently-empty question would restore that skip on the next launch | runtime | PASS 2026-08-05 |
| M5-006 | A short catalogue says so | Delete a category from `CATALOGUE`, enter onboarding | The error shell names the missing categories rather than rendering an empty grid. A 200 that is short a category is a backend bug and a network failure is not; the copy distinguishes them because whoever gets the report needs to know which | runtime | PASS 2026-08-05 |
| M5-007 | A stale stored key is visible, not silent | Read `label()` in `use-onboarding-options.ts` | Falls back to the **raw key** when the catalogue has no entry. A resumed draft (NFR-1) can outlive a retired value; showing the key is ugly and honest, dropping the field would submit a different profile than the user filled in | static | — |

### FR-3a — state, then city (API-38)

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M5-008 | City is two screens, not one | Reach the location step | **State first, then city.** Not a UX preference — API-38 is `?state=<key>`-scoped, so there is no way to ask for a city without a state | runtime | PASS 2026-08-05 |
| M5-009 | The city list is state-scoped | Pick Karnataka, search the city field | Karnataka cities only (Bengaluru, Mysuru, …) — the response to `?state=ka`, not a client-side filter over every city in India | runtime | PASS 2026-08-05 |
| M5-010 | Changing state clears the city | Pick a state and a city, go back, pick a different state | `cityId` is **cleared**. A Maharashtra city id under "I live in Karnataka" is a wrong profile that validates cleanly, which is the worst kind | runtime | — |
| M5-011 | A state is fetched at most once | Select a state, go back, re-select the same one | No second request. The `state` string **is** the RTK Query cache key, so this comes from the argument shape rather than from any caching code | runtime | PASS 2026-08-05 |
| M5-012 | `state` is never submitted | Read `buildSubmitBody` in `src/lib/onboarding/submit.ts` | No `state` in `plot` (O-16). `cityId` implies it via the backend's `cities` table; `state` exists in the draft only to scope API-38 | static | — |
| M5-013 | Free-text city is impossible | Type an exact city name into the picker and walk away without tapping a suggestion | Nothing is selected and Continue stays disabled. `cityId` is a **closed set** (O-15) — a value the user never picked from the list must not be submittable | runtime | — |

### API-7 — the submit

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M5-014 | One call, at the end | Read `handleSubmit` in `app/onboarding.tsx` | A single `POST /onboarding/submit` with `{ plot, anchor, love }`. Not per-section — FE §9.2's "no partial-submission risk" is a consequence of that, not an independent claim | static | — |
| M5-015 | Success routes through §9.1, not to a hardcoded screen | Complete onboarding on `preview-mock` | `router.replace("/")`, **not** `/verify`. The mutation invalidates `Me`, the account flips to `profileComplete: true` + `unverified`, and `resolveRootDestination` returns the photos step itself. Hardcoding `/verify` would be a second copy of a §9.1 row that could disagree with the server | runtime | — |
| M5-016 | The draft is destroyed on success (NFR-12) | Complete onboarding, then cold-start | `draftSubmitted` resets the slice. A draft that outlived its submit is what produces a `409` on the next launch | runtime | — |
| M5-017 | **`409 already_submitted` is not an error** | Submit twice (the mock returns 409 on the second) | The client **clears the draft and routes on**, exactly as on success. This is a stale local draft resubmitted after finishing elsewhere; the server's state is the correct one, and showing an error would strand the user on a flow they have already completed | runtime | — |
| M5-018 | A failed submit loses nothing | Force a 500 on submit | Stays on the last screen with an inline error; the draft survives in the persisted slice and retrying rebuilds the identical payload | runtime | — |
| M5-019 | `languagesOther` is coupled in **both** directions | Select "Other", type text, then deselect "Other" | The free text is cleared. API-7 rejects `languagesOther` sent **without** the `other` key just as firmly as the reverse, so a leftover string is a `400`, not dead weight. `buildSubmitBody` omits the field rather than sending `""` — `undefined` vanishes in JSON, `""` does not | runtime | — |
| M5-020 | The quiz drives the answers, not the draft | Read `buildSubmitBody`'s `quizAnswers` | Built from `SCALE_QUESTIONS`, **not** `Object.entries(draft.scales)`. Iterating the draft would submit answers to questions this client version no longer asks — reachable via a resumed draft | static | — |
| M5-021 | `quizVersion` is flagged as the backend's, not the client's | Read `QUIZ_VERSION` in `src/lib/onboarding/submit.ts` | Documented as a **stopgap**: the owner ruled on 2026-08-05 that the backend issues this via API-33 and the client echoes it (CONTRACT-QUESTIONS §8). The comment forbids bumping it locally and says to delete rather than reassign it when API-33 lands. Until then every submit carries a version the backend never issued — a known, recorded defect, not a passing behaviour | static | — |
| M5-022 | Finish checks the whole draft | Answer everything, go back, change state (clearing `cityId`), return to Finish | Finish is **disabled**. A per-screen `canNext` cannot see a question invalidated by a later edit, so the last screen additionally gates on `isSubmittable` | runtime | — |

### NFR-1 / the persisted draft

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M5-023 | **A pre-Module-5 draft is discarded, not rehydrated** | Install a build with a v1 draft on disk, then this one | The draft is dropped and onboarding starts clean. ⚠️ The failure this prevents is *silent*: redux-persist's default on a version mismatch is a **pass-through**, so a v1 draft would look perfectly restored, render labels as though they were keys, and fail at API-7 with a `400` twenty screens later. `createMigrate({ 2: () => undefined })` is what turns that into a visible fresh start | runtime | — |
| M5-024 | The migration's blast radius is stated | Read `migrations` in `src/store/index.ts` | Returning `undefined` drops **all four** whitelisted slices, not just `onboarding` — redux-persist migrates the whole persisted root. Accepted and documented: the other three are a re-askable choice, a re-settable preference, and a prompt cooldown. None is user work | static | — |
| M5-025 | An out-of-range `stepIdx` is survivable | Persist a `stepIdx` past the end, relaunch | Clamped to the last screen. Not hypothetical since Module 5 — `SCREENS` both shrank and grew (see M5-044) | runtime | — |

### NFR-16 — screen-capture block on the Onboarding stack

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M5-026 | `/onboarding` is covered | Read `app/onboarding.tsx` | Calls `useScreenCaptureBlock()`. §12.7 recorded `/onboarding` and `/verify` as the two authenticated surfaces the tab shell's call cannot reach, because the root gate **replaces** the tabs to get there. Module 5 closes the first; **`/verify` is still Module 6's** and NFR-16 is not met until it lands | static | — |
| M5-027 | It stays off outside production | Read the hook | Unchanged from the Module 3 follow-up: gated on `IS_PRODUCTION` and Android-only. `FLAG_SECURE` blacks out `adb screencap` too, which would break QA evidence and the store-screenshot workflow | static | — |

### Contract drift closed by Module 5

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M5-028 | `CompatibilityDimension` has one declaration | Read `src/lib/discover/mock.ts` | An **alias of `DiscoveryMode`**, not a second copy. It previously read `all \| lifestyle \| personality \| priorities` — neither TDD's spelling — and had already propagated into `discovery-mode-slice`, the FR-15a picker and Discover's labels | static | PASS 2026-08-05 |
| M5-029 | The mapping was evidence-based | `git show` the rename against `discover.tsx`'s old `DIM_LABEL` | `personality` → `compatibility` and `priorities` → `marriage_goals`, which is what the screen was **already rendering** (`personality: "Compatibility"`). The labels were right; only the keys were wrong. It matters because these keys are sent to the backend on API-12 and returned by `GET /me` | static | PASS 2026-08-05 |

> **Module 5 test debt — mostly cleared 2026-08-05.** This note previously said everything from the
> height slider onward was code-review only. **The full flow has since been walked on the Android
> emulator** — every Plot and Anchor screen, the 12-slider FR-14 quiz, Photos, the API-7 submit and
> the routing into `/verify`. See "The Module 5 walk, end to end" below for what that added.
>
> **Still genuinely unrun**, because each needs a failure the mock will not produce on demand: the
> API-7 **error** outcomes (M5-018 `409 already_submitted`, the `400` paths) and the offline/retry
> cases. Those want a scripted flow with a controllable transport (FE §13's Maestro, still
> uninstalled). **Do not read a blank "Last result" here as a pass.**

### Edit Profile — FR-3b closed (added 2026-08-05, after the owner's review)

*Module 5 originally left this screen's hardcoded option lists in place as Module 6's problem. The
owner ruled that they must be backend-driven now, so the FR-3b half was done here; the API-23
pre-fill / `PATCH /profile` save half is still Module 6's.*

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M5-030 | No client-side catalogue survives | `grep` `app/(tabs)/(profile)/edit-profile.tsx` for `_OPTS` | Nothing. `BUILD_OPTS`, `EDUCATION_OPTS`, `INCOME_OPTS`, `DIET_OPTS`, `DRINK_OPTS`, `SMOKE_OPTS` are deleted; every list comes from `useOnboardingOptions()` (API-39) | static | PASS 2026-08-05 |
| M5-031 | The sheet stores keys and shows labels | Read `PickerSheet` | Renders `opt.label`, calls `onPick(opt.key)`, and `testID` is keyed on `opt.key`. Previously it wrote the **display label** straight into the draft — the bug that made every value on this screen un-submittable | static | PASS 2026-08-05 |
| M5-032 | Profession is a picker, not a text box | Read the Profession row | `PickField` over API-39's `profession` category. Free text here could never match a catalogue key | static | PASS 2026-08-05 |
| M5-033 | Languages is multi-select over the catalogue | Read the Languages row | `multi: true`, toggling on/off. Was a comma-separated `TextInput` that split on `,` and stored whatever was typed | static | PASS 2026-08-05 |
| M5-034 | The multi-select sheet does not go stale | Open Languages, tap three options **without closing**, then tap the first again | All three tick in turn and the fourth tap un-ticks Hindi. Nothing in `PickerState` is a snapshot: `selected` and `onPick` both take the **current** draft as an argument and `options`/`loading` are resolved by the parent each render. A captured array would freeze after the first tap — the classic multi-select bug, and the `onPick` half of it was real in the first draft of this change | runtime | PASS 2026-08-05 |
| M5-035 | City is a state→city pair, not free text | Read the LOCATION card | State from API-39's `state` category, city from `useGetCitiesQuery(state.state)` skipped while no state is set. Prototype wrote free text into a field that now holds a `cityId` | static | PASS 2026-08-05 |
| M5-036 | Changing state clears `cityId` | Pick Maharashtra → Pune, then change the state to Karnataka | City falls back to its "Pick your city" placeholder. Cleared **only when the key differs**, matching `app/onboarding.tsx:242`. A Pune id under Karnataka is a submit the backend rejects; re-picking the same state must not wipe a good answer | runtime | PASS 2026-08-05 |
| M5-037 | The city name is never stored | `grep` the draft type for `cityName` | Absent. The label is read off API-38's live response each render; a stored name is a second copy that goes stale on a backend rename | static | PASS 2026-08-05 |
| M5-038 | An empty list says why | Open the City sheet with no state chosen | The sheet says **"Pick your state first."** rather than opening blank, which reads as a broken screen. `picker.empty` also distinguishes that from "no cities listed for that state yet" (O-15) | runtime | PASS 2026-08-05 |
| M5-038a | A list still loading shows a spinner, not emptiness | Open the City sheet while API-38 is in flight | A centred `ActivityIndicator` at list height, so the sheet does not open empty and then jump. The owner asked for this after the FR-3b pass. **Not observed at runtime** — the mock answers within a frame, so the branch is only reachable against a slow server; verified by reading `pickerLoading` and the `sheetLoading` style | static | PASS (code) 2026-08-05 |
| M5-039 | The remaining debt is written down, not hidden | Read the file header | Names all three of Module 6's: API-23 pre-fill (the draft is destroyed on submit, so a returning user sees an empty form), the missing `state` for the city picker (CONTRACT-QUESTIONS §10), and FR-4's immutability rules on name/DOB/height | static | PASS 2026-08-05 |

> **Edit Profile test debt — cleared 2026-08-05.** M5-034, M5-036 and M5-038 were the three most
> likely places for a defect in this change and were left unrun in the first pass. All three have
> now been **driven on the Android emulator** (mock account `9000000000`, which is verified and so
> reaches the Profile tab). Only **M5-038a's spinner** remains code-verified only, because the mock
> answers too fast to see it.
>
> Driving them found a real bug the static reading had missed: `onPick` closed over the draft
> captured when the sheet opened, so a *second* toggle in the same open sheet computed from a stale
> array. The tick marks were right and the stored value was wrong — the worst shape of the bug.
> `PickerState` now passes the current draft into `selected` **and** `onPick`, and resolves
> `options`/`loading` in the parent's render.

### `fitness` restored as a required Plot question (added 2026-08-05, owner's decision)

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M5-040 | The question is asked again, from the catalogue | Walk Onboarding past "Do you smoke?" | "How often do you exercise or stay physically active?" with six options served by API-39's `fitness` category — not a hardcoded array. Confirmed on the emulator | runtime | PASS 2026-08-05 |
| M5-041 | It is required, not optional | Read `missingFields` and `REQUIRED_PLOT_KEYS` | `fitness` is in both, per the owner's ruling of 2026-08-05. The screen also cannot be passed without an answer (`choice` sets `canNext: !!s.fitness`) | static | PASS 2026-08-05 |
| M5-042 | It reaches API-7 | Read `buildSubmitBody` | `plot.fitness` carries the catalogue key. ⚠️ The real backend has no such field yet (CONTRACT-QUESTIONS §9) — whether it drops the key or `400`s is the open question | static | PASS 2026-08-05 |
| M5-043 | Edit Profile can change it | Open Edit Profile → LIFESTYLE | A **Fitness** row beneath Smoking, fed by the same category | runtime | PASS 2026-08-05 |
| M5-044 | A stale `stepIdx` from the no-fitness builds is survivable | Read the clamp in `app/onboarding.tsx` | `Math.min(...)` against `SCREENS.length - 1`. `SCREENS` both shrank and grew during Module 5, so a persisted index from either build must not crash | static | PASS 2026-08-05 |

### The Module 5 walk, end to end (2026-08-05)

The flow was driven on the Android emulator from a resumed draft through API-7 to `/verify`. What
that confirmed beyond the individual rows above:

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M5-045 | NFR-1 survives a **logout**, not just a relaunch | Get logged out mid-flow, sign back in | Onboarding resumed on the exact screen last answered, with "Software Engineer" still selected. Stronger than M5-024's relaunch case: the token went and the draft did not | runtime | PASS 2026-08-05 |
| M5-046 | Resume lands on the first *unanswered* question | Relaunch after adding `fitness` to `SCREENS` | Opened directly on the new fitness screen rather than at the start or past it | runtime | PASS 2026-08-05 |
| M5-047 | All seven Anchor questions are present and catalogue-driven | Walk section 2 | Age range, match location, children, interfaith, smoker comfort, household, relocate-after-marriage — the owner's list of seven, in order, options from API-39 | runtime | PASS 2026-08-05 |
| M5-048 | The 12 quiz answers submit as one call | Walk section 3, then read the request | One `POST /onboarding/submit` carrying `love.quizAnswers` with all twelve. **No per-question call** — this is what the owner asked to have confirmed against the design doc; there is no mismatch | runtime | PASS 2026-08-05 |
| M5-049 | Submit routes into Verification (§9.1) | Finish Photos → "Continue to Verification" | API-7 succeeds with `plot.fitness` in the body and the app lands on `/verify` at "Verify your identity" | runtime | PASS 2026-08-05 |
| M5-050 | Journey-graphic node labels do not wrap | Read `TreasureMap.tsx` after the fix | `nodeLabel` is 80pt wide with `marginHorizontal: -20` and `numberOfLines={1}`, so "Anchor" (~50pt at this letter-spacing) sits on one line, still centred under a 40pt marker | code | PASS 2026-08-05 |

### `X-Client-Info` and API-40's `platform` (FE TDD v1.49 / BE TDD v1.10, 2026-08-06)

| ID | What it proves | How | Expected | Kind | Result |
|---|---|---|---|---|---|
| M5-051 | `platform` cannot be omitted by a call site | Read `src/api/endpoints/consent.ts` | Set inside `query`, not in `RecordConsentBody`. Neither the FR-2a nor the FR-11a screen passes it, so neither can forget it | code | PASS 2026-08-06 |
| M5-052 | The mock is the stricter twin | `POST /consents` without `platform` against mocks | `400 validation_error`. Deliberately stricter than staging, which accepts it as optional for one deploy so installed clients keep working | code | PASS 2026-08-06 |
| M5-053 | Device strings cannot break the header | Read `headerSafe` in `src/config/device.ts` | Everything outside `[A-Za-z0-9._-]` collapses to `_` and the value is length-capped, so `Redmi Note 12 Pro+` → `Redmi_Note_12_Pro_`. No `;`, `\r` or `\n` can reach a header value | code | PASS 2026-08-06 |
| M5-054 | The install id survives sign-out | Read `clearTokens` in `src/auth/tokens.ts` against `DEVICE_ID_KEY` | `clearTokens` removes only the two token keys. The device id is a separate key and is never cleared — regenerating per session would add a `devices` row per login and destroy the correlation | code | PASS 2026-08-06 |
| M5-055 | The header is actually on the wire | Point `EXPO_PUBLIC_API_URL` at a local header-logging server, restart Metro, launch | Present on **every** request. Observed on `/v1/counts`, `/v1/discover`, `/v1/app/version-check` and `/v1/me`: `p=android; os=16; m=google_sdk_gphone64_arm64; a=1.0.0; d=00616cc2-…` — all five fields, well-formed, identical across calls | runtime | PASS 2026-08-06 |
| M5-056 | The install id persists across a relaunch | Force-stop, relaunch, compare `d=` | Byte-identical to the previous run (`00616cc2-a9100e63-1f675637-9da9ee04`). Proves the secure-store round trip: a regenerated id would mean a `devices` row per launch | runtime | PASS 2026-08-06 |

> **How M5-055 was run without a staging token.** Staging has none to give — `POST
> /v1/auth/otp/request` and `/otp/verify` are both 404 (API-1/API-2 on hold behind DLT registration,
> O-8) and Google needs O-19 item (1). It did not matter: pointing `EXPO_PUBLIC_API_URL` at a local
> server that logs headers proves the client's half completely, and `/app/version-check` fires at
> launch **before** any authentication. Repeat with:
>
> - a server logging request headers on `10.0.2.2:<port>`,
> - `.env` → `EXPO_PUBLIC_APP_ENV=staging`, `EXPO_PUBLIC_API_URL=http://10.0.2.2:<port>`,
> - **restart Metro with `--clear`** — `EXPO_PUBLIC_*` are inlined at transform time, so a running
>   bundler serves the old values,
> - restore `.env` and restart Metro afterwards.
>
> ⚠️ **`APP_ENV=staging` is what makes this work**: under `mock` the in-process transport never
> reaches `prepareHeaders`, so no header exists to inspect. That is also why this case cannot be run
> in mock mode at all.

> **One thing seen during the walk that is not a defect in this module.** A `stepIdx` resume can
> look like a *skipped* question when Metro is serving a stale bundle — the fitness screen appeared
> only after a hard restart. Worth knowing before someone files it as a bug.
>

> The second observation from the walk — the "Anchor" label wrapping to "Ancho / r" — **was fixed**
> on the owner's instruction (M5-050), even though `TreasureMap.tsx` is a Module 3 component. The
> cause was `nodeWrap`'s 40pt width, which is the *marker's* diameter and was never meant to bound
> the caption. Not re-verified on device: the graphic only appears between onboarding sections, so
> confirming it costs another full walk for a text-width change.

---

## Module 5.5 — Test harness

Authored by the module (2026-08-06). **This module adds no product behaviour** —
its cases are about the harness itself, and its main output is the six Module 2/3
rows above that moved from `static`/`runtime` to `build`.

⚠️ **Per MIGRATION §2.4.2 this module writes tests and does not fix what they
catch.** Findings are recorded here and reported, not repaired.

### 5.5a — Jest + RNTL

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M55-001 | The runner exists and is green | `yarn test` | All suites pass. This is the case that makes the six converted rows above runnable at all | build | PASS 2026-08-06 |
| M55-002 | Babel config is runner-only | Read `babel.config.js` | It declares `babel-preset-expo` and nothing else — exactly the preset Metro applies by default. A bundler-affecting change here would mean the harness altered production output, which it must not | static | PASS 2026-08-06 |
| M55-003 | The four native mocks are global | Read `jest.setup.js` | `expo-secure-store`, `react-native-reanimated`, `expo-router` and `@react-native-google-signin` are mocked for every suite (MIGRATION §2.4.1). Without them any suite importing the auth or navigation layer throws at import time in Node | static | PASS 2026-08-06 |
| M55-004 | The `@/*` alias resolves under Jest | `yarn test src/lib/__tests__/root-route.test.ts` | Passes. The alias is declared in three places (tsconfig, Metro, `jest.config.js`); a drift makes every suite fail to resolve its imports | build | PASS 2026-08-06 |
| M55-005 | Tests are never bundled | `grep -rn "__tests__\|jest.setup" app/ src/ --include="*.ts" --include="*.tsx" \| grep -v __tests__/` | No import of a test file from app code. Metro bundles only what is reachable from the entry point (FE §13.3), so suites cost nothing at runtime — the same argument C-7 makes for this sheet | static | PASS 2026-08-06 |

### 5.5b — Maestro + the testID convention

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M55-006 | Flows are syntactically valid | `maestro check-syntax .maestro/flows/login.yaml .maestro/flows/onboarding.yaml` | `OK` for both. Cheap, needs no device, and catches the YAML/command errors that otherwise only surface halfway through a run | build | PASS 2026-08-06 |
| M55-007 | Login through the launch gate | `maestro test .maestro/flows/login.yaml` on a `preview-mock` build | Four legs pass: `9000000000`→Discover, `9000000007`→`/blocked` (O-4), a new number→`/consent` with Decline returning to Welcome, and Google→`/consent`. Proves §9.1 decides the destination, not the auth screen (M4-009) | build | **UNRUN** — see the note below |
| M55-008 | Onboarding submits and hands off to Photos | `maestro test .maestro/flows/onboarding.yaml` on a `preview-mock` build | Walks Plot/Anchor/Love as `9000000001`, submits API-7 once, and lands on `verify-step-photos`. The destination comes from §9.1 re-reading `Me`, never a hardcoded `/verify` (M5-015) | build | **UNRUN** — see the note below |
| M55-009 | Step ids are not positional | `grep -n "onboarding-step-" .maestro/flows/onboarding.yaml` | Every id is a draft field key (`onboarding-step-gender`), never an index. M5-044 records `SCREENS` shrinking and growing — an index would answer a different question while still passing | static | PASS 2026-08-06 |
| M55-010 | Option ids are keyed, not labelled | `grep -rn "testID={\`option-\|testID={\`chip-\|testID={\`suggestion-" src/components/onboarding/Primitives.tsx` | Every id interpolates `opt.key`, never `opt.label`. Under FR-3b the backend may reword a label without a client release, so a label-keyed id fails on a copy edit (M5-003). ⚠️ **One violator, recorded as a finding below** | static | **FAIL 2026-08-06** — `OptionCard` uses `option-${title}` |
| M55-011 | The shared shell namespaces its chrome | Read `testIDPrefix` in `src/components/onboarding/OnboardingShell.tsx` | Onboarding and Verify emit `onboarding-*` and `verify-*` respectively. Both previously emitted `onboarding-next`, and they are adjacent screens in one journey — a flow could not tell which it was driving | static | PASS 2026-08-06 |
| M55-012 | The launch gate is reachable by id | Read `src/components/nav/LaunchScreens.tsx` | `launch-pending`, `launch-error`, `launch-retry`, `launch-update-required`, `launch-update-cta` exist. The gate had **zero** testIDs before 5.5b, so no E2E flow could assert it had resolved rather than merely not crashed | static | PASS 2026-08-06 |

> **M55-007 / M55-008 have never been executed.** Maestro 2.8.0 is installed and
> both flows pass `check-syntax`, but §2.4.3 requires a `preview-mock` build and
> the only binary on the iPhone 16 simulator is the **2026-08-05 dev client**
> (it carries `EXDevLauncher`, so a launch opens the launcher, not the app). An
> EAS `preview-mock-simulator` build was started 2026-08-06. **Until these two
> rows carry a PASS, treat the flows as unverified drafts** — the element ids and
> catalogue keys in them were read out of the source and the mock catalogue
> rather than observed on a device, and the widget legs most likely to need
> calibration are the height **slider swipe** and the 12-step quiz `repeat`.
> A blank result here is not a pass.

> **Finding — M55-010, Module 5, `OptionCard`'s testID is keyed on the display
> label.** `src/components/onboarding/Primitives.tsx:27` emits
> ``testID={`option-${title}`}`` while its sibling `OptionGrid` emits
> ``option-${opt.key}``, so the two share the `option-*` namespace with
> incompatible schemes. It is the exact pattern the comment directly above
> `OptionGrid` records as deliberately removed in Module 5 (`option-Male` →
> `option-male`). **Not fixed here** per §2.4.2 — this module reports, it does not
> repair. Mitigating: `OptionCard` is **exported but used nowhere**, so nothing
> renders the bad id today; it is a trap for the next caller rather than a live
> defect, and the fix is one line in its own branch.
