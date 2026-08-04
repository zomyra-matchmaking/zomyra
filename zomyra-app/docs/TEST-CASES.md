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
| 5–12 | — | Not started |

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
| M2-001 | Tokens never touch disk | `grep -rn "AsyncStorage" src/` and read `src/store/index.ts` | Tokens are in `expo-secure-store` only. `PERSIST_WHITELIST` contains no token/session slice — NFR-2. **A failure here is a security regression, not a bug** | static | — |
| M2-002 | Onboarding draft survives a kill | Fill part of onboarding, force-quit the app, reopen | The draft is still there at the same step — NFR-1. Distinct from M2-003: the *draft* persists, the *catalogues* must not | runtime | — |
| M2-003 | Reference data is not persisted | Read `src/store/index.ts` | `api` is absent from `PERSIST_WHITELIST`. RTK Query's cache stays in memory — FE §4.3, NFR-11. Persisting a full cities table to disk is the failure this prevents | static | — |
| M2-004 | Concurrent 401s share one refresh | Read `src/api/base-query.ts` | A single module-scoped in-flight refresh promise that all 401s await. Parallel refreshes replay a single-use token and force-logout a healthy session (BE §9.2) | static | — |
| M2-005 | Environment fails loud | Set `EXPO_PUBLIC_APP_ENV=nonsense`, start the app | Throws with a message naming the valid values. Silently defaulting to `production` is the failure mode this guards | runtime | — |
| M2-006 | Legacy Zustand state imports once | With old Zustand data in AsyncStorage and no redux-persist state, cold start | `legacy-migration.ts` imports it; a returning user does not lose their draft to the port | runtime | — |

## Module 3 — Navigation

Authored by the module (2026-08-02) and extended by its follow-up (2026-08-05: keyboard re-measure +
NFR-16). `Last result` records verification that actually happened during those passes; `—` marks a
case authored for future regression runs but not formally re-run.

### Root gate, version check & the §9.1 routing table

| ID | Area | Verify | Expect | Type | Last result |
|---|---|---|---|---|---|
| M3-001 | Gate ordering | Read `app/index.tsx` / `src/components/nav/use-launch-gate.ts` | `useGetMeQuery` (API-6) carries `skip` until the version gate (API-5) resolves and the session is authenticated — an anonymous launch never fires an authenticated call it knows will 401 | static | — |
| M3-002 | Routing is a pure function | Read `src/lib/root-route.ts` | `resolveRootDestination` is pure. `accountStatus` is an **early return**, not a column — a suspended user with `profileComplete: false` reaches the blocker, not Onboarding | static | — |
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
