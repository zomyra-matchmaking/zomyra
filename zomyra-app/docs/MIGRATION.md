# Zomyra Frontend Migration Log

Living record of the migration from the Emergent-generated prototype to an app aligned with
**Frontend TDD v1.40**, integrating against the contract in **Backend TDD v1.2**.
**Spec-change history is in §12** — the TDDs are living documents; check it before starting a module.

**How to use this file.** It is the handoff between work sessions. Starting a module should
require reading only this file plus the relevant TDD sections — not prior chat history.
Append a "Module log" entry at the end of every module, in the same session that finishes it.

- Started: 2026-07-27
- Codebase: `zomyra/zomyra-app` (Expo SDK 54, RN 0.81.5, React 19.1, expo-router v6)
  — renamed from `frontend/` on 2026-07-27, along with the app identity (see §8)
- Status: **Module 2 complete** (2026-07-31). §3's baseline still describes the untouched Emergent
  output and is kept as the historical reference point; §6 records what each module changed.
  ⚠️ **§3's "Data layer" subsection is now history too** — the 14-line `fakeNetwork` stub, the six
  Zustand stores and "no `fetch` call to any host" it records were all replaced in Module 2.
  ⚠️ **§3's "Design language" subsection is now history, not current state** — the 281 hex literals,
  the 13 rival palettes and the four NFR-6a failures it records were all resolved in Module 1.
- **Handoff state:** **Module 1 is merged** — PR #2 landed on `master` on 2026-07-30, alongside
  Module 0 (PR #1). **Module 2 is finished and awaiting the owner:** its commit sits on
  `module/2-state-data-layer` (branched from `f97e879`), **committed but not pushed and with no PR
  open** — per C-6 the owner does both. `git log master..module/2-state-data-layer` shows what is
  pending.
- **Verified green as of 2026-07-31:** `yarn doctor` 18/18 · `yarn lint` 0 errors (14 pre-existing
  warnings) · `yarn typecheck:baseline` clean (the same 3 inherited errors, no new ones) · Metro
  bundles 3550 modules for iOS and Android · the auth flow walked end to end on the iPhone 16 Plus
  simulator and on the Android 16 emulator.
  ⚠️ `yarn lint` caches to **`.expo/cache/eslint`**. If it reports errors that `npx eslint app src
  --no-cache` does not, `rm -rf .expo/cache` before believing it — this cost time in Module 1.
- **C-2 is now proven, not just configured.** The first EAS build ran on 2026-07-28
  (`development-simulator`, build 1) and the app launched on an iPhone 16 Plus simulator against
  Metro. See §6's "First build" entry. iOS *device* and Android builds remain unrun.
- **Next up: Module 3 — Navigation.** The sequence in §2 is being followed in order. Module 3's
  root gate now has something to call: `useGetMeQuery()` (API-6) exists and answers from mocks.
  O-4 is its live blocker — `GET /me` returns `accountStatus: suspended | banned` and the FE routing
  table has no destination for either. See `docs/CONTRACT-QUESTIONS.md`.
- **Before starting the next module, read:** §1 (constraints), §2 (sequence), §11 (build internals),
  §4 (open items), **§12 (spec-change history — check before starting any module)**, then §6's
  Module 2 entry. §3 is history, not current state.

---

## 1. Standing constraints

These are decided, not open. Do not relitigate them without the owner saying so.

| # | Constraint | Detail |
|---|---|---|
| C-1 | **Frontend-only** | The backend TDD is reference material, used to verify our API integration matches what the backend exposes. Never modify `zomyra/backend/` (a FastAPI `server.py` exists in-tree) or propose backend changes. |
| C-2 | **EAS Development Build, not Expo Go** | Required for RevenueCat's native purchase SDK and push notifications. Converted in Module 0; a one-way door. From that point every on-device verification is a dev-client build. |
| C-3 | **Light mode only** | No dark palette, no `useColorScheme` branching. `app.json` `userInterfaceStyle` set to `"light"`. |
| C-4 | **Semantic design tokens** | Tokens named by role (`colors.text.primary`, `colors.border.subtle`), never by value (`colors.purple700`) — so a theme change stays a one-file change even with a single theme. |
| C-5 | **One module at a time** | Finish, summarize, append to this log, stop. Never auto-continue into the next module. |
| C-6 | **Branch per module, merged by PR** | `master` is the integration branch and takes no direct commits. **Create the branch at the *start* of a module, before any file changes** — `module/<n>-<slug>`, e.g. `module/0-build-foundation` — so no work ever lands on `master` by accident. At module end: commit, append the §6 log entry, summarise, and **stop**. **The owner pushes and opens the PR against `master`** — never push, force-push, or open PRs unless explicitly asked. *(Pre-Module-0 setup docs were committed directly to `master`; this rule applies from Module 0 onward.)* |

### Repository state (updated 2026-07-29)

`origin` is `git@github.com:zomyra-matchmaking/zomyra.git`. **`master` is the live line** — it
carries the Discovery Mode work (FR-15a) and the `PersonalityChat` → `PersonalityQuiz` rewrite
(FR-7) that `main` lacks. Everything in this document was assessed against `master`, and **`master`
is now GitHub's default branch**, so PRs target it by default.

`main` is a **separate, unrelated history** (no common ancestor with `master`) last touched
2026-07-09. It is stale — treat it as an archive, **never as a merge target**. Because the histories
are unrelated, git cannot merge the two without `--allow-unrelated-histories` and an artificial merge
commit; there is no reason to attempt it, since `master` already contains everything `main` has
except `package-lock.json` (the project uses yarn) and the superseded `PersonalityChat.tsx`.

---

## 2. Module sequence

| # | Module | Status | One-line rationale for its position |
|---|---|---|---|
| 0 | Build & project foundation | **Complete** (2026-07-28) | Bundle ID must be final before RevenueCat/FCM bind to it; unblocks all native deps |
| 1 | Design system & theming | **Complete** (2026-07-30) | Later modules rewrite most screens — tokens must exist first or the debt is re-created |
| 2 | State & data layer | **Complete** (2026-07-31) | Every subsequent module plugs into it; nothing can reach the backend until it exists |
| 3 | Navigation | Not started | Tab semantics + root gate are structural; needs Module 2 to call `GET /me` |
| 4 | Auth & session | Not started | First real API integration; unblocks every authenticated call |
| 5 | Onboarding & profile schema | Not started | Fixes data-model drift at the source, before other screens consume those enums. **+FE TDD v1.40's state field — see §12.1** |
| 6 | Photos & verification | Not started | Removes the base64-in-storage violation; establishes the image-cache foundation |
| 7 | Discover, filters & Express Interest→Match | Not started | Core loop and densest edge-case spec; needs 5 and 6 |
| 8 | Requests | Not started | Small; reuses Discover's pagination and the shared Match screen |
| 9 | Chat & realtime | Not started | Largest single feature; independent once the core loop is proven |
| 10 | Premium & entitlements | Not started | ⛔ **Gated — see §2.1.** Needs the dev build and every gated surface to already exist |
| 11 | Push notifications | Not started | ⛔ **Gated — see §2.1.** Cross-cutting: routes into chat, requests, verification, premium |
| 12 | Hardening | Not started | Accessibility, offline, Sentry, tests — applies across finished screens |

### 2.1 ⛔ Store-account gate — must clear before Module 10 starts

**Do not begin Module 10 until every item below is done.** Modules 0–9 need none of it and run
entirely on the EAS dev client, so this can be arranged in parallel with that work — but Modules 10
and 11 cannot be built, tested, or meaningfully verified without it. Starting Module 10 early means
writing purchase and push code that cannot be run even once.

| Prerequisite | Cost | Why it blocks |
|---|---|---|
| **Apple Developer Program** enrolment | $99/year | No RevenueCat iOS products, no StoreKit sandbox testing, no push via APNs, no physical-iPhone builds |
| **Google Play Console** account | $25 one-time | No Play Billing products, no `com.zomyra.app` package claim |
| **`com.zomyra.app` registered on both** | — | Apple: register the App ID in Developer Portal → Identifiers. Google: claimed on first Play Console bundle upload. Until then O-1 is chosen but unconfirmed (§9) |
| **"Zomyra" display name reserved** on App Store Connect | — | Separate namespace from the bundle ID, first-come, and more prone to squatting. Reserved by creating the app record |
| **In-app purchase products created** — the four FR-29c fixed-term tiers (1 week / 1 month / 3 month / 6 month), non-renewing | — | RevenueCat maps its offerings onto real store products; API-30's plans merge by `revenueCatProductId` client-side (FE TDD §9.11) |
| **RevenueCat account**, apps linked to both stores, entitlements configured | Free under $2.5k/mo tracked revenue | Module 10's entire purchase flow runs through its SDK |
| **`google-services.json` + `GoogleService-Info.plist`** from Firebase | Free | Generated *per package name* — a bundle-ID change after this point invalidates both files |
| **Apple Paid Applications Agreement** signed + payout banking/tax details on both stores | — | Easy to overlook: StoreKit returns **empty product lists** until this agreement is active, which reads exactly like a code bug and can burn a day of Module 10. Google needs an equivalent payments/merchant profile. Neither store needs banking to *create* the account — only to sell, which Premium requires |
| **Current account in the LLP's name** | — | Serial dependency, often underestimated: LLP certificate → PAN/TAN → current account → store payout setup, roughly 2–4 weeks *after* incorporation. Payout accounts must be in the entity's name, not personal. Start PAN/TAN the day incorporation completes |

**The two gated modules are not equally gated — 11 can run before 10.**

| | Module 11 (Push) | Module 10 (Premium) |
|---|---|---|
| Store account | Required | Required |
| Bundle ID registered | Required | Required |
| D-U-N-S / LLP | Only if Organization | Only if Organization |
| PAN → current account | **Not needed** | **Required** |
| Paid Applications Agreement | **Not needed** | **Required** |
| IAP products + RevenueCat | Not needed | Required |
| Also needs | APNs key, Firebase config files (free) | — |

Because the India banking chain (PAN → current account → payout setup) trails incorporation by
another 2–4 weeks, the account will almost certainly be live before the financial side is. **When
that happens, run Module 11 first and Module 10 after** — they are independent, and reordering
converts a hard wait into finished work. The numbering is a default, not a dependency.

**Caveat when running 11 first:** FR-29c's "premium pass expiring soon" push routes to the Premium
screen (§6.10). The routing itself is testable — `app/premium.tsx` exists as a route from the
prototype onward — but the trigger is not, since there is no real subscription with an expiry until
Module 10. Re-verify that one notification category after Module 10; every other category
(match, message, request, verification result, moderation) tests fully without it. Treat the swap as
conditional on what is actually ready, not as a fixed reordering.

**Why Module 10 truly blocks on banking, not just on an account:** until the Paid Applications
Agreement is active, StoreKit returns an **empty product list** — no prices, no tiers, no purchase
to test, and RevenueCat has nothing to map entitlements onto. Module 10's code can be written
beforehand, but none of it can be verified, which makes writing it first a poor use of the time.

**Owner note on timing (O-10):** the accounts must be **Organization**, which requires the LLP to
exist first — so the real lead time is LLP → D-U-N-S → Apple verification, roughly 6–10 weeks. Start
that track now, in parallel with Modules 0–9, rather than at this gate. An Individual account was
considered as a placeholder to reserve the "Zomyra" name early and **rejected** — see O-10 for why.

**Claiming the App Store name (only possible once Apple enrolment is approved):** register the
bundle ID first — Developer Portal → Certificates, Identifiers & Profiles → Identifiers → **+** →
App IDs → App → **Explicit**, `com.zomyra.app`, enabling *In-App Purchase* and *Push Notifications*
at creation so provisioning profiles don't need regenerating later. Then App Store Connect → My Apps
→ **+** → New App, name `Zomyra` (30-char limit), that bundle ID, any SKU. **App Store Connect
rejects the name on that screen if it is taken — that rejection is the only definitive availability
check that exists.** Note the reservation is not indefinite: Apple may release the name if the app
is not submitted for review within ~180 days, which is why reserving it long before submission is
not the free option it appears to be. Google Play does not enforce app-name uniqueness at all; there
the unique identifier is the package name, bound at first App Bundle upload, so nothing is claimable
in advance.

---

## 2.2 Target schedule (set 2026-07-28)

**Launch target: late September / early October 2026.** Estimates are for build time and will be
refined as modules land; elapsed time runs longer because of review turnaround and backend pace.

| Module | Est. build | | Module | Est. build |
|---|---|---|---|---|
| 0 · Build foundation | ✅ 1 day | | 5 · Onboarding & schema | 4–5 days *(+1, §12.1)* |
| 1 · Design system | ✅ 1–2 days | | 6 · Photos & verification | 3–4 days |
| 2 · State & data layer | 3–5 days | | 7 · Discover / interest | 4–6 days |
| 3 · Navigation | 2–3 days | | 8 · Requests | 1–2 days |
| 4 · Auth | 2–3 days | | 9 · Chat & realtime | 4–6 days |
| | | | **0–9 total** | **24–36 days (5–7 wks build, 7–10 elapsed)** |

| Window | Engineering | Legal / accounts |
|---|---|---|
| Jul 29 – Aug 4 | Modules 0, 1 | Apple + Play enrolled · LLP filed · name reserved |
| Aug 5 – 18 | Modules 2, 3 | LLP certificate → PAN/TAN → D-U-N-S |
| ~Aug 18 | Android device + iOS Simulator testing throughout | D-U-N-S requested the day the LLP certificate lands |
| Aug 19 – Sep 1 | Modules 4, 5 | Current account applied for |
| Sep 2 – 15 | Modules 6, 7 | **Org accounts live → reserve "Zomyra", first iOS device build**, Paid Apps Agreement, IAP products |
| Sep 16 – 22 | Modules 8, 9 | — |
| Sep 23 – 29 | Modules 11, 12 (10 if banking ready) | — |
| Sep 30 – Oct 7 | Submission + review | — |

**Schedule check against the calendar (2026-07-31).** **Engineering is ahead, not slipping.** The
table above budgets Jul 29 – Aug 4 for Modules 0 and 1 and Aug 5 – 18 for Modules 2 and 3; Modules 0,
1 and 2 are all done by Jul 31, so Module 2 landed roughly a week early against a 3–5 day estimate.
The estimates below are left unchanged rather than rewritten to match — one module finishing fast is
not evidence the remaining ones will, and Module 2 was unusually self-contained (no backend, no
device-specific behaviour, no design decisions).

**What that headroom does not cover, and the honest read:** the engineering column is the only one
with evidence behind it. The same rows carry a legal/accounts column — "Apple + Play enrolled · LLP
filed · name reserved" for the Jul 29 – Aug 4 window — and this document has no confirmation that any
of it has started. Per §2.2a that chain is 6–10 weeks and it is the one that gates Modules 10 and 11.
**O-8 is the nearer risk:** the backend's status note is still the one written on 2026-07-28, and
Modules 4–9 need it. Being a week ahead on the client buys nothing if the API arrives late — see
`docs/CONTRACT-QUESTIONS.md`.

**Known risks to this schedule:** backend pace (Modules 4–9 all depend on it); an Apple rejection
under Guideline 4.3, which FE TDD §12 flags as a live risk for this category — budget one rejection
cycle; and review turnaround between modules, the cheapest week available to reclaim.
**Pressure valve:** if Premium's banking chain slips, ship free-tier and fast-follow Module 10.

**Submission checklist (Module 12) — two items that cost a full review cycle if missed:**

1. **Guideline 4.3 (Spam).** Apple rejects apps it considers undifferentiated in saturated
   categories, and applies it hard to dating/matchmaking. Paste FE TDD §12's drafted text into App
   Store Connect's **Notes for Review** — most 4.3 rejections come from leaving that field blank.
   The differentiators are real product decisions, not positioning: no swipe deck (FR-13), quiz-driven
   scoring (FR-6), Discovery Modes (FR-15), mandatory verification before matching (FR-11).
2. **A working demo account.** App Review cannot receive your OTP SMS, so phone-auth apps must ship
   a **production** test number with a fixed OTP that bypasses SMS — distinct from the staging bypass
   in §2.3. Apps are routinely rejected for reviewers being unable to log in.

Adjacent guidelines this app already satisfies, worth not regressing: **1.2** (UGC safety — needs
reporting, blocking and moderation: FR-25b and FR-9 cover it) and **5.1.1(v)** (in-app account
deletion: FR-28).

### 2.2a Store accounts — the Organization decision in full (O-10)

*Promoted out of the O-10 table cell on 2026-07-28. The cell had accumulated three extra columns,
and because Markdown drops cells beyond the header count, everything below was **invisible in the
rendered document** while still present in the source.*

**Decision (final):** both store accounts are **Organization**, opened once the LLP and D-U-N-S
exist. The LLP is not yet formed, so neither can be opened yet.

**An Individual account as a placeholder was considered twice and rejected both times.** It would
publish the seller name as a person rather than "Zomyra" — on a product asking strangers for their
religion, income and biometric selfies — pull a personal Play account into the multi-tester /
14-day pre-publication requirement, and force a later account conversion or app transfer.

**Critical path:** LLP (~2–4 wks) → D-U-N-S (5–14 business days) → Apple Org approval (1–4 wks)
≈ **6–10 weeks total**, which fits inside the Modules 0–9 window because none of those modules need
a store account. Request D-U-N-S the day the LLP certificate lands — it is the one pure-waiting link
in the chain.

**Genuine upside of this path:** Organization accounts are **exempt from Play's 14-day closed-testing
requirement**, which a personal account would have carried — so the delay costs roughly two weeks
less than it appears.

**Cost to plan around:** no iOS physical-device testing until the Apple account exists. Android
device builds and the iOS Simulator cover the gap, but device-only behaviour — safe areas, keyboard
avoidance, Dynamic Type (NFR-6a), haptics (FR-25a), permission dialogs — stays unverified until
~September. **Do not let App Review be the first real iOS hardware the app runs on.**

**Owner track, to run in parallel with engineering:**

- Start LLP formation
- Buy `zomyra.com` — gates `developer@zomyra.com`, and it is the cheapest, fastest item in the chain
- File the India trademark — stronger and more durable than an App Store name reservation
- Set up `developer@zomyra.com` as the store account holder rather than a personal inbox. The
  asymmetry matters: the **Expo** account email is trivially changed later, while Apple and Google
  account-holder transfers are formal, bureaucratic processes. Be relaxed about the first, strict
  about the second.

### 2.3 Staging environment — joint ask for the backend side

Needed before Module 4 can be *verified* rather than merely written:

- **Deployed `/v1` API** with a reachable base URL, plus the served OpenAPI schema (O-8, O-11)
- **OTP bypass or a fixed test code** — otherwise every login test sends a real SMS. A five-minute
  backend change that saves days
- **Seeded profile data** — Module 7 cannot test pagination without enough profiles to page through
- **Ably staging keys** and an S3 bucket for photos
- **Deterministic stubs for both ML services** if photo moderation and selfie face-match aren't
  ready — Module 6 needs *a* response, not a real one. Staging should be able to return
  approved/rejected and verified/mismatch on demand

---

## 3. Baseline: what the code actually was at start

Verified by reading the code on 2026-07-27, before any changes. **The app is a UI prototype,
not a partially-integrated app.** Do not assume the TDD-described architecture exists anywhere.

### Data layer
- **No network layer at all.** `src/services/api.ts` is a 14-line `fakeNetwork()` `setTimeout`.
  `authService.verifyOtp` accepts any 6 digits. `discoverService` sorts a hardcoded array.
  `uploadService` returns the local file URI unchanged. No base URL, no env var, no `fetch`/axios
  call to any host in `app/` or `src/`.
- **State is Zustand** (6 stores in `src/stores/`) **+ TanStack Query used exactly once**
  (`app/discover.tsx:81`) — not Redux Toolkit + RTK Query + redux-persist (FE TDD §4).
- Persistence is a hand-rolled debounced `AsyncStorage.setItem` in `onboarding-store.ts`. Its
  header comment records that `zustand/middleware`'s `persist` was avoided because of an
  `import.meta` failure **in the web bundle** — a web constraint currently shaping the design.
- `src/utils/storage/index.ts` wraps SecureStore correctly but is **never called for tokens**;
  no tokens exist. NFR-2 unimplemented because there is nothing to store.

> Implication for estimating: the gap is *"build the data layer that was never built,"* not
> *"port one state library to another."* The Zustand→RTK port is the smaller half of Module 2.

### Navigation
- One flat `<Stack>` in `app/_layout.tsx` with 21 sibling routes.
- `src/components/nav/FloatingNav.tsx` is an absolutely-positioned bar calling `router.push()` —
  every tab tap pushes onto the same stack. No state/scroll preservation (violates FR-20 / §3.3),
  and history grows unbounded.
- `app/index.tsx` waits 1.8s then hard-redirects to `/login` regardless of session. No version
  check (FR-30), no `GET /me` routing table (§9.1).

### Features
| Area | Reality |
|---|---|
| Discover | All mocks loaded at once; `idx` wraps modulo so cards cycle forever. No cursor pagination, no last-3 prefetch, no hero prefetch, no retry/error states. Express Interest **awaits then advances** — inverse of §6.6's optimistic + snap-back. No cap, no FIFO match queue. |
| Verification | Local 6-step wizard; "submit" writes a timestamp to a Zustand store. No 3s timeout, no verified/mismatch/pending branching, no biometric consent (FR-11a). |
| Photos | **Stored as base64 data URIs in the persisted store** (`app/edit-profile.tsx:132`) — violates NFR-11. No compression, no upload progress, no moderation. Slot prompts generic, not FR-8's six fixed ones. |
| Images | **`expo-image` is a dependency but imported nowhere** — every image is RN's `Image`. No foundation for NFR-9 / NFR-14 (`cacheKey` decoupled from rotating signed URLs). |
| Chat | Fully mock; messages in local `useState`. No Ably, no pagination, no temp-id reconciliation, no presence. Report reasons list 5 options; FR-25b specifies 6. |
| Premium | Static screen. "Premium" is a boolean in `requests-store` flipped by a dev chip. No RevenueCat, plans, restore, sync, or long-poll. |
| Absent entirely | Google OAuth (a "coming soon" toast), FR-2a consent, push notifications, `/counts` badges (badge counts a mock array's length), Sentry. |
| Accessibility | **1** accessibility prop in the whole codebase, vs. 159 `testID`s. NFR-6/6a unstarted. |

### Design language

> ⚠️ **Resolved in Module 1 (2026-07-29).** Everything in this subsection describes the prototype as
> found and is kept only as the before-picture. There are now zero hex and zero `rgba()` literals in
> `app/` and `src/`, no local palettes, and no text token below WCAG AA. See §6's Module 1 entry.

- `src/theme/colors.ts` exists and is good — and is largely abandoned.
- **281 hardcoded hex literals, 51 unique**, against a palette defining ~25. Only **26 of 66**
  files import the theme.
- **13 files declare rival local palettes** (`PURPLE`, `TEXT`, `MUTED`, `BORDER`, `LIGHT_PURPLE`,
  `GOLD`): Discover, Profile, Edit Profile, Premium, Filters, ProfileView, MatchOverlay,
  FloatingNav, and 5 more.
- Two competing languages: the theme is purple-tinted (`#1F1235`, `#E8E1EF`), the screen-local
  blocks are stock Tailwind grays (`#111827`, `#6B7280`, `#ECEAF7`).
- `radii`/`spacing` used **12 times total** vs. **193 raw `borderRadius:`** and **215 raw
  `fontWeight:`** literals. No type scale (8+ ad-hoc font sizes).
- **WCAG AA against white (NFR-6a), computed:** `foreground` 17.6:1 PASS · `mutedForeground`
  4.9:1 PASS · `foregroundSubtle` **2.6:1 FAIL** · `primarySoft` **4.2:1 FAIL** ·
  `accent` **2.6:1 FAIL** · `warning` **2.2:1 FAIL**. All four failures are used as text colors.

#### Why the design layer looks like this — provenance (established 2026-07-28)

Useful for Module 1, because it changes the remap from an audit into a mechanical substitution.
The app began as a **React web project** (Lovable-style: Vite + React + Tailwind/shadcn) and was
later converted to React Native by Emergent on an explicit "convert to React Native" prompt.

The conversion swapped the build system cleanly — there is **no** `vite.config`, `tailwind.config`,
`postcss.config`, `index.html` or Babel config anywhere in the repo — but it carried the *styling
vocabulary* across verbatim. The screen-local grays are not arbitrary picks; they are **Tailwind's
default gray ramp**, counted in the tree on 2026-07-28:

| Hex | Tailwind name | Occurrences |
|---|---|---|
| `#111827` | gray-900 | 12 |
| `#6B7280` | gray-500 | 12 |
| `#E5E7EB` | gray-200 | 5 |
| `#F3F4F6` | gray-100 | 1 |
| `#9CA3AF` | gray-400 | 1 |

**Two consequences for Module 1.** First, the 281 hex literals are a *translation artifact*, not
carelessness: web CSS has variables, RN `StyleSheet` has none until a token layer exists, so a
mechanical conversion inlines every value — which is exactly the debt C-4 exists to stop recurring.
Second, because these are Tailwind defaults rather than hand-picked colours, they map
**systematically** onto semantic tokens — `#111827` is consistently primary text, `#6B7280`
consistently muted text. Remap by role, not file by file.

### Type safety
`tsconfig.json` sets `strict: true`, but **the project does not typecheck.** `npx tsc --noEmit`
reports 3 errors, all pre-existing in the Emergent output (verified against `HEAD` on 2026-07-27,
before any of our changes):

1. `app/edit-profile.tsx:143` — calls `setPhotoIdxToReplace(...)`, which is **never declared**.
   Not just a type error: this throws at runtime whenever that path executes. Module 6 owns it.
2. `app/filters.tsx:153` — `RowKey` (includes `"age"`) passed where `MultiFilterKey` is expected.
   Module 7 owns it.
3. `src/lib/chats/mock.ts:251` — object missing `matchReason` and `scores` from `DiscoverProfile`.
   Dies with the mocks in Module 9.

There is no typecheck in CI (there is no CI). Module 0 should add `tsc --noEmit` as a script;
whether it gates commits before these 3 are fixed is a Module 0 call.

### Build posture
- `app.json` is Emergent scaffold: name/slug `"frontend"`, bundle ID
  `com.emergent.zomyraapppreview.q3b1np`, no EAS `projectId`, plugins only `expo-router` + splash.
- **No `eas.json`.** Web bundler config, `+html.tsx`, RN-Web font hacks, and a
  `storage/index.web.ts` shim — built for browser preview.
- `userInterfaceStyle` is `"automatic"` while only a light palette exists → a device in dark mode
  gets dark system chrome against light screens. Fixed under C-3.
- `scripts/cmd-guard/` blocks a few deprecated Expo packages on install. Benign; not a blocker.

---

## 4. Open items requiring a decision

| ID | Item | Needed by | Owner |
|---|---|---|---|
| O-1 | ~~Real bundle identifier / package name~~ **→ `com.zomyra.app`** (2026-07-28). See §9. **Applied in Module 0**; still needs registering with both stores once O-2 lands. | Module 0 | ✅ Done |
| O-2 | **Hard gate on Module 10 — see §2.1.** Apple Developer account ($99/yr) + Play Console ($25), `com.zomyra.app` registered on both, the "Zomyra" display name reserved on App Store Connect, and `google-services.json` / `GoogleService-Info.plist` in hand. Modules 0–9 run on the dev client without any of it. | **Before Module 10** | Product owner |
| O-3 | **API-32 field-name conflict:** FE TDD §9.12 sends/returns `{ pushEnabled }`; BE TDD §14.13 uses `{ notificationsEnabled }`. A real contract conflict, not a doc paraphrase. | Module 11 | FE + BE |
| O-4 | **`accountStatus` routing gap:** BE `GET /me` returns `active \| suspended \| banned`, but FE §9.1's routing table defines no destination for suspended/banned. | Module 3 | FE + product |
| O-5 | Express Interest daily cap value `N` (FR-17a) is still "to be set by product". | Module 7 | Product owner |
| O-6 | Height filter bounds inconsistent across wireframes (140–210cm vs 140–200cm), FE TDD §8. | Module 7 | Product owner |
| O-7 | Whether an unmatched (not blocked) user can resurface in Discover (FR-25b). BE defaults to yes. | Module 9 | Product owner |
| O-10 | **Store accounts → Organization, registered once the LLP and D-U-N-S exist. Final (2026-07-28).** Long-form rationale, critical path and the parallel owner track are in **§2.2a** — the detail outgrew a table cell. | Before the §2.1 gate | Product owner |
| O-9 | **Canonical domain conflict.** `app/terms.tsx:36` and `app/privacy.tsx:36` publish contact addresses at **`zomyra.app`** (`hello@`, `privacy@`), but the domain being purchased is **`zomyra.com`** (confirmed unregistered 2026-07-28). Pick one and correct the legal copy — these are user-facing addresses in Terms and Privacy, so a dead inbox there is worse than a cosmetic bug. Also decides the domain for universal links / associated domains in Module 11. | Module 12 (or sooner if the copy ships) | Product owner |
| O-8 | **Backend base URL + OpenAPI spec.** ⚠️ **Unchanged as of 2026-07-31** — Module 2 looked for a URL to probe and found none: there is no base URL anywhere in this repo, the TDDs, or this document, so there was nothing to test reachability against. Module 2 shipped the mock transport behind the base query as planned, and switching to a live host is now genuinely a one-line `.env` change (`EXPO_PUBLIC_API_URL`). Status as of 2026-07-28: backend development is **underway**, built with Claude Code from the BE TDD — not yet known to be deployed or reachable. Note `zomyra/backend/` is *not* it (see §7). Needed: (a) a reachable dev/staging base URL including the `/v1` prefix; (b) **a served OpenAPI schema** (NestJS `@nestjs/swagger` → `/v1/docs-json`). Module 2 builds the RTK Query layer with mocks behind the base query either way, so a live URL is a config swap — but the spec should land as early as possible, see O-11. | Module 2 (mocks) / Module 4 (live) | FE + BE |
| O-11 | **Mechanism shipped in Module 2; the asks are sent-ready but not yet sent.** `openapi-config.ts` + `yarn api:generate` are in place, so the moment a schema is served, generated types replace the hand-written ones in `src/api/contract.ts` and drift becomes a compile error. The concrete questions for the backend — O-3, O-4, O-16, plus three found while building (where `retryAfterSeconds` lives, whether `nextCursor` is opaque, and a prototype-side `discoveryMode` enum mismatch) — are written up ready to forward in **`docs/CONTRACT-QUESTIONS.md`**. C-1 means sending them is the owner's step. **Contract-drift control between two parallel implementations.** Both frontend and backend are being built from the same TDDs, which explicitly describe their field names as "illustrative, not finalized" — so divergence is expected, not hypothetical. O-3, the `/v1` prefix and `accountStatus` are the three already found by reading both docs; more will exist. **Mitigation:** treat a served OpenAPI schema as the single source of truth over the Word docs, and generate typed endpoints from it in Module 2 via `@rtk-query/codegen-openapi`, so drift surfaces as a compile error rather than a runtime 400 during integration. Pin O-3 and the `accountStatus` routing on both sides now, while each is a one-line change. | Module 2 | FE + BE |

| O-12 | ~~Is web still a target?~~ **→ No. Web is out of scope** (2026-07-28, owner). Removed in Module 0: the `expo.web` config block, the `yarn web` script, `react-dom` + `react-native-web`, `app/+html.tsx`, `src/utils/storage/index.web.ts`, `favicon.png`, and the RN-Web font-injection block in `app/_layout.tsx`. `platforms: ["ios", "android"]` now declares this in config, and `expo export --platform web` refuses. **Consequence for Module 2:** the `import.meta` workaround in `onboarding-store.ts` was a *web-bundle* problem only — it is no longer a constraint on the persistence design. | Module 0 | ✅ Decided |
| O-13 | ~~`ios.supportsTablet`~~ **→ `false`. iPad is out of MVP scope** (2026-07-28, owner — reversed the same day during Module 0 PR review; the earlier "tablets are a target" note in §6 is superseded). What this buys the MVP: no 13-inch iPad screenshots required at submission, App Review stops exercising a phone-designed UI on iPad, and Modules 1/3 owe no large-screen layout work. **iPad users can still install** — iOS runs it letterboxed in iPhone-compatibility mode; `false` means "not optimised for iPad", not "blocked". **Android needs no equivalent change** — there is no phone-only flag in `app.json`, tablets are supported by default, and Play requires no tablet screenshots. Re-enabling post-MVP is one line plus the layout work. | Post-MVP if revisited | ✅ Decided |
| O-14 | **Logo delivered 2026-07-28 — splash artwork still pending.** The designer's vector lockup is in-tree (`assets/brand/zomyra-lockup.svg`), and the icon, adaptive icon and in-app logo are now generated from it at full sharpness — see §10. **(b) settled in Module 1:** both backgrounds stay `#FFFFFF`, now as `colors.background` rather than a C-3 placeholder — reasoning in §10.2. **Still open:** (a) a purpose-designed splash from the designer; the current splash is an interim render of the lockup; (c) whether the app icon should be purple-on-white (current, faithful to the supplied artwork) or inverted white-on-purple. **Module 1 found (b) and (c) are not separable** — the Android foreground is the purple mark on transparency, so a purple `adaptiveIcon.backgroundColor` renders purple-on-purple. Changing that background *is* the icon-inversion decision, and it needs a new foreground asset with it. | Splash + icon treatment: before submission | Product owner |

| O-15 | **FR-3a fallback when a town isn't in the curated list** — flagged as undecided *by the spec itself* (FE TDD v1.40, §12.1). Three linked questions: (a) does the user pick the nearest listed city, or get a free-text "other" entry; (b) if free-text, is that profile excluded from FR-5 same-city matching; (c) how deep does the curated per-state list go — every district town, or the top N cities per state. **This is not cosmetic:** it decides whether `city` is a closed enum or an open string, which changes the Discover filter (a picker vs. a search), the backend's matching query, and whether two users typing "Bangalore" and "Bengaluru" ever match. Needs settling before Module 5 builds the screen, not after. | **Module 5** | Product owner + BE |
| O-16 | **Backend TDD v1.2 has no `state` field.** FE TDD v1.40 adds it to FR-3, API-7's `plot` object and API-23's response, but BE §14.2 (line 798) and §14.10 (line 1125) still list `…gender, city, heightCm…` with no `state`. The backend needs the column, the submit-payload field, the `/profile/me` response field, and FR-5's "same state" matching resolved against it rather than via city→state lookup. **Frontend-only constraint (C-1) means this is a message to send, not a change to make** — but Module 5 will 400 on submit until it lands. Exactly the drift O-11 predicted, caught by doc diff rather than at runtime. | **Module 5** | BE (flag from FE) |

**Resolved, do not reopen:** dark mode is out of scope — light theme only (2026-07-27).
**Web is out of scope** — iOS and Android only (2026-07-28, O-12).

---

## 5. Contract notes (FE TDD §9 ↔ BE TDD §14)

The two documents are genuinely aligned; the backend was revised to match the frontend contract
(photos returned in `/profile/me`, `PATCH /profile` echoing saved fields, `quizVersion`,
`403 immutable_field`, RevenueCat-customer-id-based sync, plan field names). Watch for:

- **All backend routes are `/v1/*` prefixed**; FE TDD paths omit it. The client base URL must
  carry `/v1`.
- Every request sends `X-App-Version` and `X-Bundle-Update-Id` (observational only). The backend
  additionally issues `X-Request-Id`, echoed in responses — worth capturing for Sentry correlation
  (§10.2).
- Error envelope is `{ error: { code, message, details? } }`. **Branch on `code`, never on message
  text.**
- Access token ~15 min, refresh token ~30 days and **single-use/rotating**. Concurrent 401s must
  share **one in-flight refresh promise** or the second call gets a spurious
  `refresh_token_invalid` (BE §9.2).
- `200 { status: "pending" }` on verification means work is genuinely in flight server-side —
  **must not** offer manual retry. A real 5xx is the opposite and should retry. Easy to conflate.
- **`state` is missing backend-side.** FE TDD v1.40 adds it to API-7 and API-23; BE TDD v1.2 does
  not have it in either. See O-16 — Module 5 cannot submit onboarding successfully until it exists.
- See O-3, O-4 and O-16 above for the live conflicts.

---

## 6. Module log

Append one entry per completed module. Keep entries short and factual: what changed, what is
deliberately still stubbed, and anything the next module inherits.

### Module 0 — Build & project foundation (completed 2026-07-28)

**Changed:**

- **Bundle identifier applied (O-1, §9).** `ios.bundleIdentifier` and `android.package` are both
  `com.zomyra.app`, replacing Emergent's `com.emergent.zomyraapppreview.q3b1np`.
- **`userInterfaceStyle` → `"light"`** (C-3).
- **Dev-client conversion (C-2).** `expo-dev-client@~6.0.21` installed and `eas.json` added with
  four profiles: `development` (dev client, internal, Android APK), `development-simulator` (the
  same for the iOS Simulator — **builds with no Apple account**, which is what makes O-10's
  Simulator-only iOS period workable), `preview`, `production`. Node pinned to 20.19.6 so cloud
  builds match local; `appVersionSource: "remote"`.
- **First lockfile in the repo's history.** There was none — not tracked, not even on disk. Expo's
  tooling consequently chose npm over the declared `packageManager: yarn@1.22.22`, and npm then
  failed outright on a peer conflict. `yarn.lock` is now committed and yarn is the only supported
  package manager.
- **`expo-doctor` now passes 18/18** (was 16/18):
  - Deduplicated two native modules that were installed twice — `@react-navigation/native` (exact
    pins `7.1.8`/`7.3.16`/`7.4.0` relaxed to the `^` ranges Expo expects) and `@expo/vector-icons`
    (`15.0.3` → `^15.1.1`, the version `expo` itself ships). Two copies of a native module is a
    build-failure risk, not a warning.
  - Fixed `icon.png` and `adaptive-icon.png`, which were 512×513 and failed config-schema
    validation outright.
- **Emergent/Expo branding removed from the launch experience** — not recorded in §3's baseline, so
  noting it here: the app icon was Expo's default blue "e", and the splash was Emergent's logo above
  the words *"Start building apps on emergent"* on black. Both regenerated from the real brand mark
  in `assets/images/zomyra-logo.png`: `icon.png` (1024×1024, **opaque** — iOS rejects alpha),
  `adaptive-icon.png` (1024×1024, mark kept inside Android's centre-66% safe zone), a new
  `splash-icon.png`, and `favicon.png`. Splash and adaptive-icon backgrounds `#000000` → `#FFFFFF`
  (C-3). Deleted `splash-image.png` and `app-image.png`. Resolution caveat → **O-14**.
- **`tsc --noEmit` wired in, deliberately not gating on the three known errors** — this was the call
  §3 left to Module 0. `yarn typecheck` runs tsc raw; `yarn typecheck:baseline` allows exactly the
  three errors recorded in `scripts/typecheck-baseline.json` and fails on anything new (verified in
  both directions with a deliberate probe error). Errors are keyed by file + TS code rather than
  line number, so ordinary edits do not churn the baseline. Fixing the three stays with Modules 6, 7
  and 9; each should re-run `yarn typecheck:baseline --update` and commit the smaller baseline.
- **`yarn lint` is green** (0 errors, 15 pre-existing warnings). All 6 errors were
  `react/no-unescaped-entities`, now disabled project-wide: it is an HTML-oriented rule, and its
  suggested fix (`&apos;`) renders **literally** inside RN `<Text>` — applying it would have shipped
  visible defects into six screens. No source files were touched.
- **README replaced** (Expo template → actual build/run doc: yarn-only, dev-client-only, the
  profiles, the checks, and the `eas init` step). **`.gitignore`:** added `/ios` and `/android`
  (CNG output), and re-included `.env.example`, which the repo-root `.gitignore` would otherwise
  swallow silently before Module 2 needs it. Removed the `reset-project` template script, which
  moves `app/` aside — no value here and a live hazard.

**Still stubbed / deferred:**

- **No EAS project link, and therefore no build has actually run.** `app.json` has no
  `extra.eas.projectId` / `owner`; writing one requires an EAS account, so `eas init` is an owner
  step (documented in the README). Everything else is verified locally: `expo config` resolves the
  new identity, `expo export --platform ios` bundles clean (6.43 MB), doctor 18/18, lint green,
  typecheck baseline green.
- No native `ios/` or `android/` directories — continuous native generation, produced at build time.
- **`X-App-Version` / `X-Bundle-Update-Id` (§5) are not wired.** `expo-updates` was deliberately not
  installed: it is only meaningful once an EAS project exists, and it drags in `runtimeVersion`
  policy decisions. Module 2 inherits this with the API client.
- ~~Web left entirely untouched~~ — **superseded the same day: web was removed outright once the
  owner decided O-12. See the addendum below.**

**Inherited by next module:**

- Module 1 receives a light-mode-locked, doctor-clean, lint-clean project. The `#FFFFFF` splash and
  adaptive-icon backgrounds are placeholders chosen to satisfy C-3 — revisit them when the palette
  lands (O-14).
- Module 2 receives `.env.example` un-ignored, an iOS/Android-only project (no web constraint on
  persistence — see the addendum), and owns adding `expo-updates` once the EAS project exists.
- ~~Modules 1 and 3 inherit tablet layout work from O-13~~ — **withdrawn: iPad is out of MVP
  (O-13 reversed 2026-07-28). Phone layouts only.**
- ~~Module 12: add `ITSAppUsesNonExemptEncryption`~~ — **done in the addendum below.**

**Decisions made:**

- Typecheck does **not** gate on the three inherited errors; a baseline guard catches new ones
  instead. A permanently-red `yarn typecheck` would simply be ignored.
- `react/no-unescaped-entities` off project-wide (reason above).
- Icon and splash regenerated from the existing brand mark rather than left as Expo/Emergent
  defaults — owner-approved mid-module; the resolution caveat is recorded as O-14.
- Dependency version pins relaxed to Expo's expected `^` ranges where exact pins were forcing
  duplicate native modules.

#### Module 0 addendum — owner decisions applied same day (2026-07-28)

Four items raised at the end of Module 0 were decided by the owner and applied on the same branch,
before the PR:

- **Web removed entirely (O-12).** Deleted the `expo.web` config block, the `yarn web` script,
  `react-dom` and `react-native-web`, `app/+html.tsx`, `src/utils/storage/index.web.ts` and
  `favicon.png`; dropped the RN-Web font-injection block from `app/_layout.tsx` and the now-dead
  `Platform` import; refreshed the stale web comments in `storage-base.ts` and `storage/index.ts`.
  Added `"platforms": ["ios", "android"]` so the decision lives in config rather than by omission —
  `expo export --platform web` now refuses outright. `@expo/metro-runtime` was **kept**: it is a
  hard dependency and non-optional peer of `expo-router`, unlike `react-dom`/`react-native-web`
  which are optional peers. `expo-web-browser` and `react-native-webview` also stay — both are
  native components, unrelated to the web target.
  **Module 2 inherits the real payoff:** `onboarding-store.ts`'s hand-rolled persistence exists only
  because `zustand/middleware`'s `persist` broke the *web* bundle via `import.meta`. That reason is
  gone; the note in the file has been updated so it is not preserved out of caution.
- ~~**iPad and Android tablets confirmed as targets (O-13).**~~ **Superseded during PR review the
  same day: iPad is out of MVP and `ios.supportsTablet` is now `false`.** See O-13 in §4. Modules 1
  and 3 owe no large-screen layout work, and Module 12 needs no iPad screenshots.
- **`ITSAppUsesNonExemptEncryption: false` added** to `ios.infoPlist`. Owner confirmed the app uses
  only standard HTTPS — image *compression* is not encryption, and there is no chat encryption
  anywhere. **Revisit if Module 9 ever adds end-to-end encrypted messaging.** Without this every
  TestFlight upload stalls on an export-compliance prompt.
- **Brand assets (O-14):** the current icon and splash are confirmed placeholders — a new logo and
  splash are being produced by a designer and will be supplied later. Required formats and the
  reasoning behind each are now in **§10**.

Verified after these changes: doctor 18/18, lint green, typecheck baseline green, iOS bundle exports
clean (6.43 MB), and `expo export --platform web` correctly fails.

#### EAS project linked (2026-07-28)

**`@zomyra/zomyra`** — `owner: "zomyra"`, `extra.eas.projectId: 143317a3-7ae8-4e58-a0c1-482ae287cc19`.
Dashboard: <https://expo.dev/accounts/zomyra/projects/zomyra>

Created under a Zomyra **organization**, not the personal account. Expo orgs are free and need no
LLP or D-U-N-S, so none of what makes O-10 slow for Apple and Google applies — there was no reason
to take the personal-account shortcut O-10 rejected. `owner` stores the **org name, not an email**,
so handing administration to `developer@zomyra.com` later is a membership change: no project
transfer, no new `projectId`, no rebuild.

Account structure: personal login `zomyra002` (`zomyra002@gmail.com`, Owner) → organization
`zomyra` → project `zomyra`. `owner` and `slug` were pinned in `app.json` *before* `eas init` so the
project could not be created under the personal account by a mis-picked prompt.

**Consequence — Modules 0–9 no longer wait on anything external.** An EAS **Android** dev-client
build needs only this Expo account: no Play Console, no Apple account, none of the §2.1 gate. iOS
stays Simulator-only until the Apple Organization account exists, exactly as O-10 predicted.

*Housekeeping:* a stray project `@zomyra002/zomyra002` was auto-created under the personal account
during signup. It is unrelated to this repo and can be deleted from its project settings.

#### First build — C-2 verified end to end (2026-07-28)

Profile `development-simulator`, build 1, no Apple account involved (simulator builds are unsigned).
The `.app` was installed on a booted iPhone 16 Plus simulator, connected to Metro at
`localhost:8081`, and **bundled and rendered the login screen successfully** — 3536 modules, no
errors. This closes the "configured but unproven" caveat that Module 0 shipped with.

Confirmed in the built binary's `Info.plist`, i.e. Module 0's config actually reached the app rather
than just the config file:

| Key | Value | Proves |
|---|---|---|
| `CFBundleIdentifier` | `com.zomyra.app` | O-1 applied |
| `CFBundleDisplayName` | `Zomyra` | no longer "frontend" (§8) |
| `UIUserInterfaceStyle` | `Light` | C-3 |
| `ITSAppUsesNonExemptEncryption` | `false` | export-compliance declaration |
| `UIDeviceFamily` | `[1]` — iPhone only | O-13 reversal took effect |
| `CFBundleURLSchemes` | `zomyra`, `com.zomyra.app` | deep-link scheme for Module 11 |
| `CFBundleVersion` | `1` | EAS now owns build numbers (`appVersionSource: remote`) |

~~**Still unrun:** Android (needs no account — the obvious next one)~~ — **Android has since been
built and run.** See the Module 1 addendum "first Android build" below (local Gradle build, 76 MB
debug APK on an Android 16 emulator), and Module 2, which re-verified the same emulator. **iOS
*device* remains correctly unrun**, blocked on the Apple account (O-10).

**Bonus finding for Module 1 — there are four purples, not three.** Sampling the rendered login
screen pixel-by-pixel: the Z mark is `#5B2C70`, the `Zomyra` wordmark `#7C3AED`, the heading
`#1F1235`, and the primary button **`#5B2C6F`** — one hex digit from the brand mark (blue 111 vs
112). `#5B2C6F` is `colors.primary` *and* the hardcoded `const PURPLE` in 10+ files, so it is the
one that actually dominates the UI. Visually identical to the brand, textually distinct — a
find-and-replace on `#5B2C70` would miss every occurrence. Corroborating the §3 provenance note,
`src/theme/colors.ts` line 1 states outright that its tokens were *"extracted from the original
Tailwind config"*.

### Module 1 — Design system & theming (completed 2026-07-30)

**Changed:**

- **Two-layer token system, as §10.3 specified.** `src/theme/palette.ts` holds five private numbered
  ramps; `src/theme/colors.ts` holds the semantic tokens everything else imports; `src/theme/index.ts`
  is the barrel (`import { colors, radii, fontSize } from "@/src/theme"`). The old deep import
  `@/src/theme/colors` was retargeted at the barrel in all 26 files that used it.
- **Brand purple anchored at ramp step 900, not 600** — `purple[900]` *is* `#5B2C70`, the single fill
  in the delivered artwork. The rest of the ramp is generated from its own hue,
  hsl(281.5, 43.6%, 30.6%), on a Tailwind-shaped lightness curve. Computed contrast on white:
  500 4.44 · 600 6.35 · 700 8.15 · 800 9.33 · **900 10.30** · 950 14.41, which reproduces §10.3's
  measured 10.30:1 exactly and confirms the arithmetic.
- **The greys are Tailwind's default gray ramp, kept verbatim** — §3's provenance note said to remap
  by role, and because `#111827` *is* gray-900 and always meant "primary text", the substitution is
  exact rather than a re-design. Amber, red and emerald are likewise Tailwind's, since the prototype
  was already reaching for those exact steps.
- **All four purples reconciled onto `#5B2C70`.** `#5B2C6F` (`colors.primary` + the hardcoded
  `PURPLE` in 13 files), `#7C3AED` (the `Logo.tsx` wordmark) and `#1F1235` (`colors.foreground`) are
  gone from `app/` and `src/`. **A fifth disguise the doc had not recorded:** `rgba(91,44,111,…)` —
  `#5B2C6F` in decimal — appeared 8 times and is invisible to any search for the hex form. That is
  what `alpha(token, n)` now exists to prevent.
- **Every raw colour is gone: 0 hex literals and 0 `rgba()` literals in `app/` and `src/`**, down
  from 281 hex (49 unique) and 56 rgba. The 13 rival local palettes (`PURPLE`, `TEXT`, `MUTED`,
  `BORDER`, `LIGHT_PURPLE`, `GOLD`, `SOFT`, `HAIRLINE`, `DANGER*`, `PURPLE_DEEP`) are deleted.
- **C-4 is now enforced by ESLint, not by convention.** `eslint.config.js` adds
  `no-restricted-syntax` selectors that reject hex and `rgba()` string literals anywhere in
  `app/**` or `src/**`, plus a `no-restricted-imports` rule blocking `**/theme/palette` so the
  private ramp layer cannot leak into a component. `src/theme/**` is exempt — it is the one place
  colour values may exist. The rule surfaced the full worklist as 314 lint errors and was driven to
  zero, which is why "all raw colour is gone" is checkable rather than asserted.
- **NFR-6a: all four failures fixed; 0 text-carrying tokens now fall below AA** (audited
  programmatically against `colors.background` across all 64 tokens).
  - `foregroundSubtle` `#A99DBA` (2.56) → `text.muted` `#6B7280` (4.83). Two call sites.
  - `SOFT` `#9CA3AF` (2.50), the 11.5px uppercase labels in ProfileView → `text.muted`.
  - `primarySoft` `#8B5CF6` (4.23) and `accent` `#C084FC` (2.64) → **deleted; both were dead
    tokens**, referenced nowhere. So were `gradientStart`, `gradientEnd`, `black`, `success`,
    `warning` and `destructiveForeground`.
  - `warning` `#F59E0B` (2.15) was the gold, used only for Crown/Lock icons. Split by context:
    `premium.onDark` (amber-500) on the purple gradient, `premium.icon` (amber-600, 3.19 — clears
    WCAG 1.4.11's 3:1 for non-text) on white, `premium.text` (amber-700, 5.02) for copy.
  - `text.disabled` (gray-400, 2.50) ships **below AA on purpose** and is documented as such —
    WCAG 1.4.3 exempts inactive components. It is the only sub-AA token that can touch text.
- **Type scale.** 26 distinct font sizes (19 integer + 7 fractional half-steps like 11.5 and 14.5)
  and 6 weights across 314 literals → 14 named sizes and 5 named weights. The five true one-offs
  (9, 17, 19, 24, 34 — 16 occurrences) snap to the nearest step, **downward wherever there was a
  choice**, so nothing that fitted before can start overflowing.
- **Radii.** 11 distinct values across 193 literals → 9 named steps. `radii.pill` renamed `radii.full`.
  `borderRadius: 35` and `60` (MatchOverlay's avatar circles) became `radii.full`, which is
  equivalent on a fixed-size square.
- **`FONT_FAMILY` has one owner.** It was declared in `src/hooks/use-app-fonts.ts` and would have
  been declared again in the theme; the theme now owns it and the hook re-exports it, so the loader
  registers whatever the design system declares.
- **Third-party colour has an explicit home.** `colors.external.google` (`#EA4335`) exists so the
  no-raw-hex rule can stay absolute while the one colour we genuinely do not control stays visible
  as an exception.
- **O-14(b) settled** — see §10.2. `app.json` is unchanged; what changed is that `#FFFFFF` is now
  `colors.background` with a stated reason instead of a C-3 placeholder.

**Still stubbed / deferred:**

- ~~Spacing is tokenised but not applied~~ — **superseded: spacing was migrated in full on the
  owner's ask. See the spacing subsection below.** `lineHeight` literals are still raw.
- **Eight tokens ship unreferenced** — `text.secondary`, `text.disabled`, `text.link`,
  `success.text`, `surface.media`, `overlay.scrimStrong`, `premium.textStrong`, `border.onBrand`
  are roles the system needs to be coherent but that today's screens do not reach for. Noted here
  rather than left to be discovered: if a later module still has no use for one, delete it. Genuinely
  speculative tokens (`brand.fill`, `shadow.brand`) were removed rather than shipped.
- **The component language covers the common controls, not every pattern.** Added on the owner's
  ask after the token work landed — see the "Component primitives" subsection below.
- **Accessibility beyond colour is untouched** — NFR-6's touch targets and the single
  `accessibilityLabel` in the codebase stay with Module 12. `MIN_TOUCH_TARGET` is exported for it.
- **`src/hooks/use-icon-fonts.ts` pins `ICON_VECTOR_VERSION = "15.0.3"`** while `package.json` now
  has `@expo/vector-icons@^15.1.1` (Module 0 relaxed it). The file's own comment says the two must
  match. Harmless today — that CDN path is only taken under Expo Go, which C-2 retired — but it is
  drift, and it belongs to whoever next touches font loading.

**Inherited by next module:**

- Module 2 receives a project where colour, type and radius are single-sourced **and where the
  common controls exist** — any UI it adds should import tokens from `@/src/theme` and controls from
  `@/src/components/ui`, and will fail lint if it reaches for raw colour or `Pressable` instead.
- **The four-purples trap is closed**, but the lesson generalises: this codebase hides values in
  `rgba()` decimal form. Grep for both spellings when auditing anything colour-adjacent.
- Modules 3–9 own migrating spacing per screen as they rewrite, and own deleting any of the eight
  unused tokens they still do not need.

**Decisions made:**

- Brand purple sits at ramp step **900**. Numbering it 600 would have left no room beneath it.
- The neutral, amber, red and emerald ramps are **Tailwind's, unmodified** — the prototype's values
  already were, so adopting them makes the remap exact instead of approximate.
- Gold is **three tokens, not one**, because a single gold cannot be legible on both white and the
  purple gradient.
- `alpha(token, n)` replaces hand-written `rgba()` rather than tokenising 56 individual translucent
  values.
- The no-raw-colour rule is an **error, not a warning**. A warning would have been absorbed into the
  15 the project already tolerates.
- ~~Spacing was **not** mass-migrated~~ — **reversed on the owner's ask; see the spacing subsection.**
  The reversal was right for a reason the first pass missed: the objection was that snapping to a 4pt
  grid would move ~200 elements, but the app is not on a 4pt grid — it is on a **2pt** one, and once
  the scale matches reality the migration is a substitution, not a re-design.

#### Module 1 addendum — component primitives (owner ask, 2026-07-29)

Tokens fix *what things look like*; they do nothing about **how many times a button is rebuilt**.
The owner asked for a component language alongside the design language, and specifically for a
shared touchable — correctly, because press feedback is platform behaviour and resolving it per
call site guarantees drift.

**The evidence for the touchable, counted before building it:** 106 press call sites (102
`Pressable`, 4 `TouchableOpacity`) using **7 different press opacities** (0.7 / 0.8 / 0.85 / 0.9 /
0.92 / 0.95 / 1) and **5 different scales** (0.94 / 0.97 / 0.98 / 0.985 / 0.99) — and
**zero `android_ripple` anywhere**, so every Android tap was getting iOS feedback.

**`src/components/ui/` is now the primitive tier**, exported from one barrel:

| Primitive | What it owns |
|---|---|
| **`Touchable`** | The base. Everything else is built on it. iOS dim / Android ripple chosen once, `feedback` variants (`opacity` · `scale` · `highlight` · `none`), 44pt `hitSlop` by default (NFR-6), `accessibilityRole`/`State` wired |
| **`Button`** | 5 variants (primary · gradient · secondary · ghost · danger) × 3 sizes, icon, `loading`, one disabled treatment |
| **`Input`** | Boxed field with label, hint, **error state**, focus ring, `multiline`, character count |
| **`Overlay`** | The modal shell — RN `Modal` + scrim + backdrop dismiss + `onRequestClose` |
| **`Dialog`** | Centred card on `Overlay`. `ConfirmDialog` is now a thin composition of `Dialog` + two `Button`s |
| **`BottomSheet`** | The half-card, rebuilt on `Overlay`. `SHEET_HALF` / `SHEET_TALL` name the two heights |

**Migrated:** all 106 press sites → `Touchable`, with each site's hand-rolled feedback hoisted into
the `feedback` prop. Auth CTAs (login ×2, phone, otp) and the Requests accept/decline pair →
`Button`. The phone field and the onboarding bio → `Input`. `ConfirmDialog` and `BottomSheet`
rebuilt on the primitives.

**Enforced:** `eslint.config.js` now also blocks importing `Pressable` / `TouchableOpacity` /
`TouchableHighlight` from `react-native` outside `src/components/ui/`, for the same reason the raw
colour rule exists.

**Two bugs fixed in passing, both from centralising:**

- **Disabled buttons were unreadable.** Every disabled CTA kept its white label on the light
  lavender disabled fill. `Button` swaps the label to `text.muted` when blocked. Visible on the
  phone screen's "Send OTP".
- **Inputs had no focus state.** `Input` draws a brand-coloured focus ring; nothing did before.

**Deliberately not migrated:**

- **`edit-profile.tsx`'s fields stay raw `TextInput`.** They are *inline editable text* — borderless,
  width-sized-to-content, sitting inside a card row — not boxed form fields. Forcing them into
  `Input` would have been a visual regression, not a cleanup. Different pattern, different primitive,
  and that primitive does not exist yet.
- **The OTP screen's six single-character boxes.** A specialised control, not a form field.
- **`profile.tsx`'s two bespoke `Modal`s** (log-out, delete-account) — they carry an icon treatment
  `Dialog` does not model.
- **No `Card`, `Chip` or `Text`/typography component**, though 28 card-ish and 55 chip-ish style
  keys say all three are warranted. Left because Modules 3–9 rewrite most of these screens and the
  right API is easier to see with the real requirements in hand.

> ⚠️ **Pre-existing bug found and confirmed, not introduced here: a `ConfirmDialog` opened while a
> `BottomSheet` is open never appears.** Both are RN `Modal`s declared as siblings, and iOS silently
> refuses to present a second modal over the first — so the dialog renders behind the sheet.
> **Verified by testing the same tap on the pre-primitives commit, where it fails identically.**
> It affects Requests' decline flow (`app/requests.tsx`) and any future sheet→confirm path.
> The real fix is a single modal host with a portal, rather than `Modal` per surface — which the
> `Overlay` primitive now makes a **one-file change** instead of an eleven-file one. Left for
> whichever module needs the flow to work; Module 8 owns Requests.

#### Module 1 addendum — spacing (owner ask, 2026-07-30)

Module 1 originally shipped a spacing scale without applying it, on the argument that snapping
~200 off-grid values would shift layout everywhere with no way to verify. The owner pushed back:
spacing belongs in the design language. **That was right, and the original objection rested on a
wrong premise.**

**The scale was wrong, not the migration.** The first pass assumed a 4pt grid and then found that
2, 6, 10, 14 and 18 did not fit it. Counting the real distribution across 603 literals:

| | | | | | | | | | | | | |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **2** | **4** | **6** | **8** | **10** | **12** | **14** | **16** | 18 | **20** | **24** | **28** | **32** · **40** |
| 31 | 45 | 49 | 97 | 51 | 80 | 43 | 52 | 17 | 16 | 34 | 8 | 18 · 5 |

That is a **2pt grid**, and the bolded values are **exactly Tailwind's default spacing scale**
(`0.5 1 1.5 2 2.5 3 3.5 4 5 6 7 8 10`) — the same provenance §3 records for the greys, surviving the
same web→RN conversion. Adopting the real grid turns the migration into a substitution: only
**27 occurrences** were genuinely off-scale (3, 5, 7, 9, 11, 13, 22, 36), and each snapped by 1–2pt,
which is imperceptible. Forcing 4pt would have moved 6 → 8, 10 → 12 and 14 → 16 on ~200 elements.

**`spacing[n]` is keyed by step index, not pixel value.** `spacing[4]` is four steps — 16pt today.
`STEP` in `layout.ts` rescales the app's whole rhythm from one line, which is the property C-4 asks
for. `4.5` (18pt) is the one step Tailwind does not ship; it is here because 18pt has 17 uses and
snapping them away would have been a change made to match someone else's table.

**Migrated:** 581 literals → scale steps. **2 left as named local constants** because they are
layout decisions rather than rhythm — `ROW_ICON_INSET` (68, aligns profile row dividers past the
icon tile) and `MENU_TOP_OFFSET` (60, drops the chat overflow menu below the header).

**One real inconsistency fixed:** three screens padded their scroll by `120` to clear the floating
nav and `app/profile.tsx` used `110`, leaving its last row 10pt higher than everywhere else for no
stated reason. All four now use **`NAV_CLEARANCE`**.

**Enforced:** a third `no-restricted-syntax` selector rejects numeric `padding`/`margin`/`gap`
values (`0` excepted — it means "none", not a rhythm choice).

> ⚠️ **esquery gotcha, cost real time:** matching a numeric literal with a regex
> (`Literal[value=/^[0-9.]+$/]`) **silently matches nothing** — esquery does not stringify numbers.
> The rule reported zero problems while two known violations sat in the tree. Compare
> (`Literal[value!=0]`), do not regex-match. Noted in the config beside the selector.

Verified on the simulator against the pre-migration screenshots: login, profile, **edit-profile**
(the densest screen, most spacing literals) and filters all render unchanged.

#### Module 1 addendum — PR review follow-ups (2026-07-30)

Three review comments, all applied on the same branch.

- **Fixed layout values moved out of the theme → `src/constants/`.** `NAV_CLEARANCE` and
  `MIN_TOUCH_TARGET` were sitting in `src/theme/layout.ts` next to the scales. The line drawn, and
  written at the top of the new file: **the theme holds scales you pick a step from; constants hold
  values with one right answer.** `spacing[4]` is a design choice; the nav is as tall as it is.
  `src/theme/layout.ts` is now purely `radii` + `spacing`. Screen-local one-offs (`ROW_ICON_INSET`,
  `MENU_TOP_OFFSET`) deliberately stayed in their screens — hoisting single-use values into a shared
  file turns it into a junk drawer.
- **Numeric-suffixed icons aliased on import.** `Trash2`, `CheckCircle2`, `UserCircle2` — the digit
  is lucide's *glyph variant* number and carries no meaning at the call site. Now
  `Trash2 as TrashIcon` etc., so JSX reads `<TrashIcon />`. Five files. (Lucide's own `…Icon`
  aliases keep the digit, so they do not help here.)
- **`Platform.OS` comparisons replaced by `isIOS` / `isAndroid`** in `src/utils/platform.ts` — 16
  comparisons across 11 files. There is deliberately **no `isWeb`**: web is out of scope (O-12) and
  `app.json` declares `platforms: ["ios", "android"]`, so a web branch is unreachable code that
  reads as live.

**Three pieces of dead code fell out of that sweep**, which is the argument for the helper:

| Found | Where |
|---|---|
| `keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}` — both branches identical | `app/chats/[id].tsx`, `OnboardingShell.tsx` |
| `if (Platform.OS !== "web")` guarding a haptic — always true | `DateWheel.tsx` |
| `if (Platform.OS === "web")` scroll-idle fallback, plus the `idleTimer` ref that only served it | `DateWheel.tsx` |

The DateWheel removal was re-verified on the simulator: the wheel still snaps and the derived age
still updates, so `commit()` was always coming from the momentum handlers.

> ⚠️ **Left alone deliberately — a real inconsistency worth a decision.** `KeyboardAvoidingView`
> uses `behavior={isIOS ? "padding" : "height"}` in three screens and `isIOS ? "padding" : undefined`
> in three others. On Android with `adjustResize` (Expo's default) `undefined` is usually right and
> `"height"` can double-adjust. Unifying them changes keyboard behaviour on Android, which **cannot
> be verified on the iOS Simulator** — so it wants an Android dev-client build first. Module 3
> (Navigation) or whoever runs the first Android build should settle it.

#### Module 1 addendum — first Android build, and two bugs only Android could show (2026-07-30)

Module 0 left Android as "the obvious next one" — it needs no store account, only the Expo org.
Built and verified locally rather than on EAS: **`BUILD SUCCESSFUL in 17m 13s`**, 76 MB debug APK,
installed and running on an Android 16 (API 36) emulator.

*Toolchain, since none existed:* `android-commandlinetools` via Homebrew (~5.8 GB with platform 36,
build-tools 36, platform-tools, emulator and the arm64 system image), plus the NDK 27.1 that Gradle
pulls on first build for Reanimated's worklets. `ANDROID_HOME=/opt/homebrew/share/android-commandlinetools`.
`npx expo prebuild --platform android` then `npx expo run:android`. **`yarn.lock` was sha-checked
before and after every step** (§11) and never changed.

**The manifest confirms Module 0's config reached the binary**, the Android counterpart of §6's
`Info.plist` table:

| Key | Value | Proves |
|---|---|---|
| `package` | `com.zomyra.app` | O-1, identical to the iOS bundle id |
| `application: label` | `Zomyra` | no longer "frontend" (§8) |
| `application-icon` | `mipmap-anydpi-v26/ic_launcher.xml` | the adaptive icon is wired |
| `targetSdkVersion` | `36` | Android 16 |
| `android:scheme` | `zomyra` | deep links for Module 11 |

**The adaptive icon was seen for the first time, not just measured.** §10.1 computed the 51% scale
from the safe-radius maths; on the launcher the Z sits fully inside the circular mask with margin,
so the measurement holds.

**Two bugs, both invisible on iOS by construction:**

1. **The status bar was white-on-white.** Sampled every pixel of the band: all `rgb(255,255,255)`,
   contrast **1.00:1** — clock, wifi and battery entirely invisible. Cause: with `edgeToEdgeEnabled`
   the generated `styles.xml` sets `android:statusBarColor` `#FFFFFF` and **no
   `windowLightStatusBar`**, so Android drew light icons on the app's white surface. iOS never
   showed it because `UIUserInterfaceStyle: Light` makes it choose dark content itself. Fixed with a
   single `<StatusBar style="dark" />` in `app/_layout.tsx` — `expo-status-bar` was already a
   dependency and had never been rendered. Re-measured: **5.73:1 PASS**.
2. **Filled buttons had no press feedback at all on Android.** `Touchable` suppressed the iOS dim
   whenever it applied a ripple, but `android_ripple` renders as the view's *background drawable*, so
   `Button`'s opaque `backgroundColor` painted straight over it. Net effect: ripple hidden, dim
   suppressed, nothing. Measured 0/39 sampled pixels changing under a held press.

   The first fix — a clipping wrapper with a transparent inner `Pressable` — does make the ripple
   render, but it means splitting arbitrary caller styles across two views, and it broke the login
   layout immediately. **Reverted.** `Touchable` now flattens the incoming style and uses a ripple
   only where one can actually render (transparent surface), falling back to the dim otherwise.
   Feedback that works beats feedback that is native but invisible. Re-measured on the primary
   button: **39/39 points change under press.** Opaque surfaces get the same dim iOS has always had.

   `Touchable` also gained `rippleOnDark`, set by `Button` for the filled variants — a ripple tinted
   like its own background is the same as no feedback. Two ripple tints now exist for that reason.

**Side effect kept:** `expo prebuild` rewrote the `android` / `ios` package scripts from
`expo start --*` to `expo run:*`. Correct now that a local native build path exists, and neither
script was documented in the README before.

**Not settled by this build:** the `KeyboardAvoidingView` `"height"` vs `undefined` split flagged in
the PR-review addendum. It needs a keyboard-open comparison across the six screens, which is its own
pass — the build only made it *possible*.

### Module 2 — State & data layer (completed 2026-07-31)

**The framing that mattered:** §3 called this *"build the data layer that was never built,"* and that
was right. The Zustand→RTK port was 366 lines and about a fifth of the work; the rest was a network
layer that did not exist in any form — no base URL, no `fetch` to any host, no tokens, no errors.

**Changed:**

- **A real RTK Query layer.** `src/api/` holds one API slice (`createApi`, endpoints *injected* per
  module so later modules don't all edit one file) over a base query with four layers: transport →
  auth/silent-refresh → error normalisation → retry. Endpoints live in `src/api/endpoints/`; screens
  import from `@/src/api` and nothing else.
- **The `/v1` prefix is carried once**, in `src/config/env.ts`, so endpoint definitions transcribe
  straight out of FE TDD §9 (which omits it) while every request hits BE TDD §7.1's real path.
  `resolveApiBaseUrl()` tolerates a configured URL that already ends in `/v1` — a plausible `.env`
  value should not silently produce `/v1/v1/…`.
- **Mocks sit *behind* the base query, not in place of it** (`src/api/mock/`). The mock transport
  implements the same `BaseQueryFn` signature as `fetchBaseQuery` and returns the same
  `{ error: { status, data } }` shape, so auth, refresh, error handling and retry are the same code
  in development as against staging. **Switching to a real backend is setting `EXPO_PUBLIC_API_URL`
  and nothing else** — which is what O-8 needed to stop being a blocker.
- **The mock refresh token is single-use and rotating**, exactly as BE TDD §9.2 describes. That is
  deliberate: the concurrent-401 bug §5 warns about now *reproduces locally* if the shared-promise
  logic is ever broken, instead of first appearing during integration. `expireAccessToken()` exists
  so the 401 → refresh → retry path can actually be exercised.
- **Concurrent 401s share one in-flight refresh promise** (`refreshInFlight` in `base-query.ts`).
  Without it the second caller presents a token the first already rotated, gets a spurious
  `refresh_token_invalid`, and force-logs-out a healthy session — and the backend reads the replay
  as possible token theft (§9.2 phase D), so the bug looks like an attack in the logs.
- **NFR-2: tokens are in expo-secure-store, and `src/utils/storage`'s `secure*` methods finally have
  a caller.** `src/auth/tokens.ts` owns them, with a synchronous in-memory mirror in front so a
  Keychain read doesn't happen per request. **Verified on both platforms rather than asserted** — see
  "Verified" below.
- **Errors are one shape, and `code` is the contract.** `src/api/errors.ts` normalises everything
  into `ApiError { status, code, message, details?, requestId?, retryAfterSeconds? }`.
  `ApiErrorCode` is a **closed union of every code named in either TDD**, so a typo in a branch is a
  compile error rather than a branch that silently never runs. `X-Request-Id` is captured onto every
  error for the Sentry↔backend correlation FE TDD §10.2 wants — most useful exactly when something
  failed.
- **Retry is opt-in per endpoint, not global.** FE TDD §9 gives endpoints deliberately different
  behaviour (Discover 3 retries behind the logo animation §6.5; Chat a Retry button instead §9.8), so
  a global default would quietly override the spec. `retryCondition` never retries a 4xx — the server
  rejected the request on its merits and will again — with 429 as the one exception, since that is a
  "not yet", not a "no".
- **§5's pending-vs-5xx trap is resolved in one place.** `verificationOutcome()` returns a discriminated
  union carrying `canRetry`, so `200 { status: "pending" }` (work genuinely in flight — offering retry
  would fire a duplicate verification) can never be conflated with a 5xx (nothing in flight — retry is
  exactly right). Both feel like "it didn't finish" at the call site, which is why neither screen gets
  to decide.
- **Six Zustand stores → eight RTK slices**, and the split is the point: `premium` was a stray boolean
  inside `requests-store` and is now its own `entitlement` slice, which is what lets it be excluded
  from persistence on the record. A new `session` slice gives Module 3's root gate something to read.
- **Persistence reopened and redesigned (O-12).** `zustand/middleware`'s `persist` was avoided only
  because it broke the *web* bundle via `import.meta`; web is gone, so the hand-rolled debounced
  `AsyncStorage.setItem` in `onboarding-store.ts` is replaced by redux-persist. **The whitelist is
  three slices and every exclusion has a stated reason** (`src/store/index.ts`): tokens → keychain
  only; `entitlement` → re-derived from RevenueCat, since a stored `isPremium: true` outlives the
  pass that paid for it; `session` → derivable, and a second copy can only disagree; `verification` →
  `file://` URIs the OS may reclaim; `api` → RTK Query's cache is in-memory by design.
- **The Zustand-era persisted state is imported, not abandoned.** `legacy-migration.ts` runs as
  redux-persist's `migrate` hook — so it happens *before* rehydration rather than racing it, and only
  when no redux-persist state exists yet — reads `zomyra.onboarding.v1` and
  `zomyra.discovery-mode.v1`, and deletes them. Skipping this would have silently discarded a
  part-finished draft: NFR-1's exact failure mode, caused by the code meant to prevent it.
- **Cache is cleared when a session ends**, via a listener on `signedOut` / `sessionExpired` in the
  store. Not in the base query (it cannot import `api` without a cycle) and not at each call site,
  where it is one line from being forgotten on the path that matters — FE TDD §9.12 raises the
  shared-device case directly.
- **`X-App-Version` / `X-Bundle-Update-Id` decided explicitly, as §6's Module 0 entry asked.** Both
  headers are sent now. `X-Bundle-Update-Id` is the literal `"embedded"`, which FE TDD §9 defines as
  the value for a build that has never received an OTA update — **this project's actual state, so it
  is accurate rather than a stub.** `expo-updates` stays uninstalled (it drags in `runtimeVersion`
  policy); when it lands, one constant in `src/config/app-headers.ts` becomes
  `Updates.updateId ?? "embedded"` and every call site is already sending the header.
- **O-11's mechanism shipped.** `openapi-config.ts` + `yarn api:generate` (`@rtk-query/codegen-openapi`)
  are wired against `/v1/docs-json`. `src/api/contract.ts` carries the hand-written types until then,
  labelled provisional at the top. **`state` is deliberately absent from `OnboardingSubmitRequest`
  and `ProfileResponse`**, matching BE TDD v1.2 — hand-patching it in would produce types that compile
  against a backend that rejects them. Module 5 owns it (§12.1); O-16 is a message, not a change.
- **`docs/CONTRACT-QUESTIONS.md` is new** — O-3, O-4 and O-16 written up as one-line asks ready to
  forward, plus three found while building: whether `retryAfterSeconds` sits in `error.details` or
  beside `code` (both documents are ambiguous, and the client currently accepts either — a defensive
  guess that should not survive), whether `nextCursor` is opaque, and a prototype-side
  `discoveryMode` enum that matches neither TDD. C-1 makes sending them the owner's step.
- **Dependencies:** `+@reduxjs/toolkit`, `+react-redux`, `+redux-persist`,
  `+@rtk-query/codegen-openapi` (dev). **`-zustand` and `-@tanstack/react-query`** — the latter was
  used exactly once (`app/discover.tsx`) and FE TDD §4 replaces it.
- **Deleted:** `src/services/api.ts` (the 14-line `fakeNetwork`), `auth.ts`, `discover.ts`, and all
  six files in `src/stores/`. `FILTER_OPTIONS` moved to `src/lib/discover/filter-options.ts` — it is
  static reference data, not state, and becomes API-13 in Module 7.
- **Two controller hooks** (FE TDD §4.1's "Controller" layer): `useOnboardingDraft` — which exists so
  screens keep the type-safe one-liner `set("city", v)` rather than a `dispatch(setField({…}))` whose
  key and value are unrelated to the compiler — and `useDiscoverFilters`.
- **The `_hasHydrated` flags and their placeholder screens are gone.** `PersistGate` now gates the
  whole tree in `app/_layout.tsx`, so rehydration is complete before any screen mounts and three
  hand-rolled hydration guards became unreachable.

**Verified:**

- `yarn doctor` 18/18 · `yarn lint` 0 errors (the same 14 pre-existing warnings) ·
  `yarn typecheck:baseline` clean, the same 3 inherited errors and no new ones · Metro bundles 3550
  modules for **both** iOS and Android · `yarn.lock` sha-checked around every install (§11); npm was
  never run.
- **Auth flow walked end to end on both platforms** — iPhone 16 Plus simulator and the Android 16
  emulator — login → phone → API-1 → OTP → API-2 → onboarding.
- **NFR-2 checked against the filesystem, not inferred.** On Android, `shared_prefs/SecureStore.xml`
  appears *only after* login and holds both tokens as AES ciphertext with Keystore-backed keys
  (`"scheme":"aes"`, `usesKeystoreSuffix`), **zero plaintext**; AsyncStorage's `RKStorage` has
  `persist:zomyra.root` and **0 occurrences of `accessToken`**. On iOS, grepping the *entire* app data
  container for the issued token values returns nothing.
- **The persist whitelist was read off disk**, not trusted: the stored root contains exactly
  `onboarding`, `discoveryMode`, `discoverFilters` and `_persist` — no `session`, no `entitlement`, no
  `api`. `stepIdx` was watched updating and persisting as screens advanced.
- **The legacy import demonstrably ran:** the rehydrated draft came up carrying values that only a
  pre-Module-2 Zustand session could have written, with the old AsyncStorage keys gone.

**Still stubbed / deferred:**

- **Seven endpoints exist, not thirty-seven.** API-1, API-2, API-4 (internal to the base query),
  API-5, API-6, API-11, API-12 and API-34 are wired, each with a mock. That is a deliberate spread —
  one unauthenticated POST, token rotation, an authenticated GET, cursor pagination, multipart, and a
  low-stakes silent one — so every semantic the module owns is exercised by something. The remaining
  endpoints belong to the modules that own their screens. **An endpoint without a mock 404s**, which
  is why none were added speculatively.
- **`requests` and `chat` slices are still mock data**, ported unchanged. They are server state;
  Modules 8 and 9 replace them with RTK Query and delete them.
- **`src/services/upload.ts` survives on purpose** — FE TDD §4.6 puts photo upload behind
  `expo-file-system`'s `createUploadTask`, not RTK Query, because `fetch` cannot report upload
  progress and FR-9 needs a bar. Module 6 builds it.
- **API-12's real response shape is thinner than what the mock serves.** FE TDD §9.5 defines a card as
  `{ id, name, age, city, heroPhotoUrl, excellentMatch, matchReasons }`; the mock returns the
  prototype's richer `DiscoverProfile` so Discover keeps rendering. The *pagination envelope* is real.
  Noted in `contract.ts`; Module 7 reconciles it.
- **Express Interest calls nothing.** `app/discover.tsx`'s like handler now advances locally. No
  behaviour was lost — the mock service it used to await recorded interests in a dictionary that could
  never produce a match. API-14 with optimistic advance and snap-back (§6.6) is Module 7's.
- **`setupListeners` is not wired** — RTK Query's refetch-on-focus/reconnect needs RN-specific
  AppState/NetInfo bindings rather than the default window events. Worth doing when a module actually
  wants it.
- **The auth screens were rewired, not rebuilt.** `phone.tsx` and `otp.tsx` call the new mutations, but
  `rate_limited`'s `retryAfterSeconds`, `otp_expired` vs `too_many_attempts`, and the lockout are all
  still Module 4's.
- **`redux-persist@6.0.0` warns `unmet peer dependency "redux@>4.0.0"` on install.** Harmless — redux
  5.0.1 is present as an RTK transitive; yarn only warns because it is not a direct dependency.

**Inherited by next module:**

- **Module 3 gets what it needs to build the root gate:** `useGetMeQuery()` (API-6) answering the full
  §9.1 routing table from mocks, `useCheckAppVersionQuery()` (API-5, which **fails open by contract** —
  an error means "no update required", never a reason to hold the user), `useGetCountsQuery()` (API-34)
  for the tab badges, and a `session` slice with `status` / `expired`, where `expired` distinguishes a
  forced logout from someone who simply hasn't signed in.
- **O-4 is Module 3's live blocker**, not a footnote: `GET /me` returns `accountStatus: suspended |
  banned` and the FE routing table has no destination for either.
- **The base query already dispatches `sessionExpired` and clears the keychain on a failed refresh.**
  Module 3 decides where that sends the user; the network layer deliberately does not.
- Any module adding an endpoint adds a mock beside it, and exports its hooks through `src/api/index.ts`
  — `injectEndpoints` runs as an import side effect, so an endpoint file nobody imports yields hooks
  that are `undefined` at runtime.

**Decisions made:**

- **Mocks behind the base query, not a mock service layer.** The alternative — swappable service
  objects, which is what the prototype had — means the auth, retry and error code paths are never
  exercised until the backend appears. Here they run from day one and only the host changes.
- **Endpoints are injected per module rather than declared centrally**, so twelve modules don't
  serialise on one file. `tagTypes` stays central because invalidation crosses module boundaries.
- **Retry defaults to off.** FE TDD §9 specifies per-endpoint behaviour; a global default would
  silently override it.
- **`ApiErrorCode` is a closed union.** An open `string` would make every branch a guess.
- **`X-Bundle-Update-Id: "embedded"` now, rather than omitting the header until `expo-updates` lands.**
  The value is accurate today and the swap is one line later.
- **The generated types will not have `state`, and that is correct.** Generating against the schema is
  the whole point of O-11 (§12.1); patching the output would hide O-16 rather than surface it.
- **The legacy AsyncStorage keys are imported rather than dropped**, even though the only affected
  users are developers — it is cheap now and impossible later.

#### Module 2 addendum — named environments, and the first real HTTP call (2026-07-31)

Added when the owner confirmed a staging environment was being stood up the same day. Module 2 had
shipped a single `EXPO_PUBLIC_API_URL` with an implicit rule — "no URL means mocks" — which is right
for development and **dangerous in exactly one case**, described below.

**`EXPO_PUBLIC_APP_ENV` now names the environment:** `mock` | `staging` | `production`. It is a named
environment rather than just a URL because more than the URL hangs off it — Sentry's `environment`
tag (§10.2), whether dev-only affordances may exist, and which misconfigurations are worth refusing
to boot over.

**Where each value is set, and why they are separate:**

| | Local (`yarn start`, `yarn ios`, `yarn android`) | EAS cloud builds |
|---|---|---|
| Source | `.env` (gitignored; `.env.example` is the template) | `eas.json` → `build.<profile>.env` |

EAS never reads `.env` — it is gitignored and not uploaded — so a local experiment cannot leak into a
build. Profiles now carry: `development` / `development-simulator` → `mock` (today's working state;
one word to flip once staging has a URL), `preview` → `staging`, `production` → `production`.

**⚠️ The failure this closes.** Previously a **production** build whose `EXPO_PUBLIC_API_URL` was
never set would fall back to the mock transport and ship to real users showing **fabricated
profiles** — an app that looks like it works, populated by invented people. Two rules now prevent it:

1. `staging` and `production` **refuse to boot** without a host, throwing at import time so the very
   first launch of any such build surfaces it, long before submission. A build that dies is caught by
   whoever installs it; one that silently serves fixtures may not be.
2. **`production` can never use mocks** — not by omission, and not via `EXPO_PUBLIC_API_MOCKS=1`.
   A development switch that can reach a production build is a way to ship fixtures to real users.

`EXPO_PUBLIC_API_MOCKS=1` still works in `mock` and `staging`, which is how a screen gets built
against a backend that is up but incomplete.

**Verified — the resolution matrix was run against the real module**, not reasoned about: 11 cases
covering unset, explicit mock, staging with a plain URL / a trailing slash / a URL already ending in
`/v1`, the mocks override, production, and the three that must throw (staging with no URL, production
with no URL, and a typo'd `APP_ENV=prod`). All 11 behaved correctly, including `production` +
`MOCKS=1` keeping mocks **off**.

**More importantly, the real `fetch` path ran for the first time.** Until now every request in this
project's history has gone through a mock. A throwaway host was stood up on `localhost:4000` speaking
the TDD's shapes, the app was pointed at it with `APP_ENV=staging`, and the auth flow was driven from
the simulator. What actually went over the wire:

- `POST /v1/auth/otp/request` — **the `/v1` prefix is on the wire**, not just in a constant.
- `X-App-Version: 1.0.0` and `X-Bundle-Update-Id: embedded` — both present on every request.
- Body `{"phoneNumber":"9408265432","countryCode":"+91"}` — matches API-1.
- No `Authorization` on the unauthenticated endpoints, as `skipAuth` intends.
- A `400 invalid_otp` in the real error envelope was parsed, surfaced, and **did not navigate**.
- **Two taps produced exactly two requests** — incidental proof that `retryCondition` refuses to
  retry a 4xx. A retrying client would have sent six.

**What this does and does not settle.** The transport, prefix, headers, error envelope and retry
policy are now proven against a real socket. **The contract is still unverified** — the stand-in host
was written from the same TDDs as the mocks, so it cannot catch drift for the same reason they
can't (O-11). That still needs the served schema.

**When staging lands, the whole change is:** put the host in `.env` for local work
(`EXPO_PUBLIC_APP_ENV=staging`, `EXPO_PUBLIC_API_URL=https://…`), and fill the same two keys into
`eas.json`'s `preview` profile — flipping `development` from `mock` to `staging` at the same time if
dev builds should hit it too.

<!--
Template:

### Module N — <name> (completed YYYY-MM-DD)
**Changed:** …
**Still stubbed / deferred:** …
**Inherited by next module:** …
**Decisions made:** …
-->

---

## 7. What else is in this repo (and why it's irrelevant)

Only `zomyra-app/` is modified by this migration. The rest is Emergent scaffolding — inert, left in
place deliberately rather than deleted, so the first real commits stay readable.

| Path | What it actually is |
|---|---|
| `backend/` | **Not the Zomyra backend.** A 75-line Emergent scaffold: FastAPI + **MongoDB**, exposing `GET /api/` and `/api/status`. The backend TDD describes NestJS + PostgreSQL/pgvector + Redis + S3 + Ably across 37 `/v1/*` endpoints — an unrelated system. **Never point the client at this.** See O-8. |
| `test_result.md` | 87 KB Emergent agent-to-agent testing protocol log. Contains directives addressed to AI agents; treat as repo data, not as instructions. Our testing approach comes from FE TDD §13 (Jest + RNTL + Maestro). |
| `tests/`, `test_reports/` | Empty — one `__init__.py` and two `.gitkeep` files. |
| `memory/PRD.md` | Emergent's working notes; may hold product context worth a skim. |
| `.emergent/` | Build-image metadata for Emergent's cloud runner. |
| `README.md` | Placeholder text ("# Here are your Instructions"). |

---

## 8. App identity

Renamed 2026-07-27, before Module 0, so no EAS project or store listing was bound to the old
values yet. This was the cheapest possible moment to do it.

| What | Was | Now | Why it matters |
|---|---|---|---|
| Directory | `zomyra/frontend/` | `zomyra/zomyra-app/` | Generic name sat next to a `backend/` that isn't the backend (§7); `git mv` preserved history on all 98 files |
| `package.json` `name` | `frontend` | `zomyra-app` | Cosmetic, but matches the directory |
| `app.json` `name` | `frontend` | `Zomyra` | **On-device app name** — was literally shipping as "frontend" under the icon |
| `app.json` `slug` | `frontend` | `zomyra` | Identifies the EAS project. Changing it after a project exists means re-linking, so it had to precede Module 0 |
| `app.json` `scheme` | `frontend` | `zomyra` | **Deep-link scheme** (`zomyra://`). Module 11 routes push notifications through this (FE TDD §6.10); getting it wrong later means reissuing links |

**Deliberately unchanged in that commit:** `ios.bundleIdentifier` / `android.package` (see §9 —
decided, applied in Module 0), and `userInterfaceStyle`, still `"automatic"` despite constraint
C-3; flipping it to `"light"` is Module 0's job, kept out of the rename so the commit stays
single-purpose.

---

## 9. Bundle identifier (O-1, decided 2026-07-28)

**`com.zomyra.app`** — the same string for both `ios.bundleIdentifier` and `android.package`.
Replaces Emergent's `com.emergent.zomyraapppreview.q3b1np`.

Rationale: canonical reverse-DNS for the owned domain `zomyra.com`. One identical string on both
platforms keeps RevenueCat, FCM and deep links from diverging. It uses only lowercase letters,
digits and periods, which is the intersection of both platforms' rules — **iOS forbids underscores,
Android forbids hyphens**, so anything outside that set breaks one of them.

Availability evidence gathered 2026-07-28 (indicative, not conclusive):

| Check | Result |
|---|---|
| Play Store `com.zomyra.app` | HTTP 404 — no published app on that package |
| Play Store `com.zomyra` | HTTP 404 |
| App Store name search "zomyra" (IN / US) | 0 real matches |

Those probes only see *published* apps and *display names*. They cannot see packages reserved in
Play Console but never shipped, packages permanently burned by a deleted app, or Apple App IDs
registered under any developer account. **The definitive checks are registering the App ID in the
Apple Developer Portal and claiming the package on first Play Console upload — both gated on O-2.**

**Change window — the lock points are not account creation:**

| Stage | Changeable? |
|---|---|
| `app.json` only | Yes — one line, plus a credentials refresh on the next EAS build |
| Store account created, App ID not yet registered | Yes |
| App ID registered in Apple Developer Portal | Yes — simply register a different one |
| **App record created in App Store Connect** | **No** — permanently bound to that record; a change means a new record, and the name reservation stays on the old one |
| **First bundle uploaded to Google Play** | **No, ever** — a package name can never be changed or reused, even if the app is deleted |

Cheap to change during Modules 0–9. After Modules 10–11 it also means regenerating
`google-services.json`, `GoogleService-Info.plist` and the RevenueCat configuration.

**Related but separate:** the App Store *display name* "Zomyra" is a different namespace, is
first-come, and is more prone to squatting than the bundle ID. Creating the app record in App Store
Connect reserves it — a reason to obtain the Apple account earlier than Module 10, even though no
technical work blocks on it.

---

## 10. Brand assets (O-14)

### 10.1 Delivered 2026-07-28 — the vector lockup

The designer supplied `Logo_zomayra_.svgz` (note: the filename misspells the brand; the artwork does
not). It is vendored as **`assets/brand/zomyra-lockup.svg`** — decompressed, because the compressed
form is opaque to diffs and review — with the original `.svgz` kept alongside it.

- Illustrator export, `viewBox 0 0 1080 1080`, **7 paths, one fill: `#5B2C70`**
- Paths 0–5 are the ZOMYRA wordmark letters (all at y≈777, ~90 units tall)
- **Path 6 is the Z mark** (508×534 at 286,212) — separated programmatically for the icon, since a
  wordmark lockup is illegible at 48×48

**`scripts/make-brand-assets.js` regenerates every raster from that vector.** Run it only when the
artwork changes — it needs `sharp`, which is deliberately *not* a project dependency (large native
package, run perhaps twice a year): `npm i --no-save sharp && node scripts/make-brand-assets.js`.

| Generated | Size | Alpha | From |
|---|---|---|---|
| `icon.png` | 1024×1024 | **none** (Apple rejects alpha) | mark @ 72% on white |
| `adaptive-icon.png` | 1024×1024 | yes | mark @ **51%** — see below |
| `splash-icon.png` | 795×1024 | yes | full lockup — **interim** |
| `zomyra-logo.png` | 1024×1024 | yes | mark @ 92%, drives in-app `<Logo/>` |
| `zomyra-lockup.png` | 795×1024 | yes | full lockup for in-app use (login hero) |

`splash-icon.png` and `zomyra-lockup.png` are the same artwork today but deliberately separate
files, so the designer's purpose-built splash can replace the former without disturbing screens
that want the lockup.

**Login screen (owner tweak, 2026-07-28):** the header `<Logo/> + <Wordmark/>` row was removed and
the couple illustration replaced by the lockup as the hero — `assets/images/login-illustration.png`
is deleted. Side effect worth keeping: that screen previously rendered the `#7C3AED` wordmark beside
the `#5B2C70` mark, so swapping in the single-fill lockup removed two of the four competing purples
from it. `app/index.tsx` still renders the `<Logo/> + <Wordmark/>` pair and retains the mismatch —
Module 1's to resolve.

⚠️ **The adaptive-icon scale is measured, not guessed.** Android masks the foreground to a circle of
66% diameter, and *a bounding box that fits the square can still have corners outside the circle*.
At 55% the Z's bottom-left sat **18.6px beyond** the safe radius and would have been clipped on
circular launchers; 51% clears it with 7.4px of margin. Re-measure if the artwork ever changes —
the check is furthest non-transparent pixel from centre vs. `width × 0.66 / 2`.

**Brand colour for Module 1: `#5B2C70`.** This is the *only* fill in the delivered artwork, so it is
the authoritative brand purple. It exposes **four** competing purples, confirmed by sampling the
rendered login screen on the simulator (§6, "First build"):

| Hex | Where | Note |
|---|---|---|
| `#5B2C70` | delivered logo artwork | authoritative brand |
| **`#5B2C6F`** | `colors.primary` + hardcoded `const PURPLE` in 10+ files | **one hex digit off the brand** — dominates the actual UI |
| `#7C3AED` | `Logo.tsx` `Wordmark` | Tailwind violet-600, web residue (§3) |
| `#1F1235` | `colors.foreground` | near-black heading tone |

The `#5B2C6F` / `#5B2C70` pair is the trap: visually indistinguishable, textually distinct, so a
find-and-replace on the brand value silently misses every real usage. Module 1 owns reconciling all
four. Corroborating §3, `src/theme/colors.ts` line 1 says its tokens were *"extracted from the
original Tailwind config"*.

*Possible palette hints, unconfirmed:* the SVG's `<style>` block declares eight classes but uses only
one. The seven unused fills — `#4A202A`, `#FAD5E1`, `#FDFDFD`, `#111113`, `#F2EBE0`, `#F6F5F5`,
`#F2F2F2` — look like a deep plum, a soft pink and a cream, i.e. plausibly the intended supporting
palette. **Confirm with the designer before treating them as brand colours**; they may equally be
leftovers from an unrelated artboard.

### 10.2 Still outstanding

**A purpose-designed splash.** The current `splash-icon.png` is an interim render of the full lockup,
drawn at `imageWidth: 200` over `#FFFFFF`. It is honest placeholder quality, not a designed launch
screen. The designer is also producing a **splash animation** — see §10.2a for what that requires.

#### 10.2a Animated splash — how it actually works, and the designer brief

**An animated splash is two stages, not one.** Worth understanding before briefing anyone, because
the constraint below is easy to miss and expensive to re-do.

1. **Native splash — static image only.** It is displayed while the app binary boots, before any JS
   exists to animate. Neither OS allows skipping it, and `expo-splash-screen` exposes only a
   fade-out, which is **iOS-only** (verified against the SDK docs, 2026-07-28). Android 12+ also
   shows its own system splash with the app icon.
2. **JS-rendered animation.** After the native splash hides, a React component plays the animation.
   Standard pattern: `preventAutoHideAsync()` → render → hide the native splash underneath.
   `app/_layout.tsx` already calls `preventAutoHideAsync()`.

| Option | Format | Cost |
|---|---|---|
| **Lottie** — recommended, the only one a designer can export to | `.json` (After Effects → Bodymovin) | `lottie-react-native`: native module, needs a fresh dev build; install via `npx expo install` for the SDK-54 build, and confirm New Architecture support since `newArchEnabled: true` |
| Reanimated | hand-coded | Already installed, no new dependency — but nothing exports to it |
| Rive | `.riv` | Another native module; more runtime control, less common |
| GIF / video | — | Poor fit: quality, size, no transparency |

⚠️ **The constraint most people miss: the animation's first frame must match the static splash
exactly.** The native splash is on screen first, so if the animation opens on a different
composition the user sees a visible jump at the handoff. Brief the animation as starting *from* the
resting lockup.

**Designer brief:** export Lottie JSON via the Bodymovin/LottieFiles plugin · shape layers,
transforms, trim paths and opacity only (Lottie does not support AE expressions or most effects;
mattes and masks are patchy) · **convert the ZOMYRA wordmark to outlines**, not a text layer ·
transparent background, we paint the colour · **under ~1.5s, one-shot, not looping** — it gates
first paint · supply the AE project file alongside the JSON.

**Owner note:** the same animation is wanted in-app beyond the splash (e.g. the login hero), which
is another reason to favour Lottie — one JSON can be reused at any size.

**Both background colours** (`expo-splash-screen` and `android.adaptiveIcon`) stay `#FFFFFF` —
**settled in Module 1 (O-14b)**, and now a palette decision rather than a C-3 placeholder. The
values in `app.json` did not change; what changed is that there is a reason for them:

- The splash background equals `colors.background`, the app's own page colour. The native splash is
  therefore the same white the first screen paints, so nothing flashes at the handoff. That also
  serves §10.2a's constraint — the animated splash's first frame has to match the static one, and
  matching is easiest when the background is already the app's.
- The adaptive-icon background **cannot** be chosen independently of the icon treatment below.
  `adaptive-icon.png` is the purple mark on transparency, so a purple `backgroundColor` renders
  purple-on-purple and the mark disappears. White is the only value consistent with the foreground
  that exists today.

**Icon treatment (O-14c, still open):** currently purple-on-white, faithful to the supplied artwork.
White-on-purple would be more striking on a home screen. Per the point above, that is **one decision,
not two** — inverting the icon means a new white-on-transparent foreground *and* a purple adaptive
background, together. Module 1 deliberately did not make it: it is a design call, and the brand
purple is now `colors.brand.default`, so applying it later is a one-line config change plus a rerun
of `scripts/make-brand-assets.js`.

### 10.3 Colour tokens — guidance for Module 1 (owner discussion, 2026-07-28)

> **Implemented 2026-07-29.** This section is now the *rationale*; the result is
> `src/theme/palette.ts` (layer 1) and `src/theme/colors.ts` (layer 2), and §6's Module 1 entry
> records what shipped. The guidance below was followed as written — brand at step 900, ramp private,
> semantic tokens public — and C-4 is enforced by ESLint rather than left as a convention. The one
> thing that changed on contact with the code: the seven "possible palette hints" below were **not**
> adopted (see the note at the end of §10.1 — still unconfirmed with the designer).

**A numbered ramp is wanted, but it must stay private.** The owner raised naming steps
`purple-600` / `purple-800` rather than inventing values ad hoc. That is right in spirit, and it
does **not** require changing C-4 — it requires two layers, which is how Radix, Material 3 and
shadcn all work:

| Layer | Example | Who imports it |
|---|---|---|
| **1 · Ramp** (private) | `purple[600]`, `purple[800]` | Only layer 2. **Never a screen or component.** |
| **2 · Semantic** (public) | `colors.text.primary`, `colors.brand.default`, `colors.surface.subtle` | Everything else |

C-4 forbids *components* consuming value-named tokens, so a theme change stays a one-file edit. It
does not forbid a ramp existing underneath. Keeping both gives Module 1 somewhere to land the 51
unique hexes systematically instead of mapping them one by one.
**If the owner ever wants components using `purple600` directly, that is a real C-4 change and only
the owner can make it.**

⚠️ **Do not anchor the brand at "600".** `#5B2C70` is dark — on a Tailwind-style scale it sits around
**800–900** (Tailwind `purple-900` is `#581C87`, nearly identical). Numbering it 600 would leave no
room below it and mislead every later module.

**Measured contrast against white (NFR-6a), computed 2026-07-28:**

| Colour | Ratio | Verdict |
|---|---|---|
| `#5B2C70` brand purple | **10.30:1** | AAA — safe for body text |
| `#7C3AED` `Logo.tsx` Wordmark | 5.70:1 | AA only |
| `#1F1235` theme foreground | 17.56:1 | AAA |
| `#4A202A` unused — plum | 13.71:1 | AAA |
| `#111113` unused — near-black | 18.86:1 | AAA |
| `#FAD5E1` unused — pink | 1.34:1 | **surface only, never text** |
| `#F2EBE0` unused — cream | 1.18:1 | **surface only, never text** |

Two consequences. First, **reconciling onto `#5B2C70` improves accessibility** rather than trading it
away — §3 records four *current* theme colours failing NFR-6a, and the brand purple passes AAA.
Second, the contrast split makes the unused fills look like a **deliberate palette** — two dark text
tones, one brand, several light surfaces — which is the shape a designed system has, not artboard
leftovers. Still confirm with the designer (§10.1), but treat it as likely rather than speculative.

A numbered ramp also makes NFR-6a auditing systematic: once steps are fixed, "step N and above passes
AA on white" is a rule Module 12 can check mechanically instead of colour by colour.

### 10.4 Spec for any future artwork

**The single most useful deliverable is the vector source** — with an SVG or PDF every size below can
be regenerated exactly, and none of it needs revisiting when a new density or store requirement
appears.

| Asset | Spec | Why the spec is what it is |
|---|---|---|
| **Vector source** | SVG (or PDF/AI), logo mark and full lockup as separate files | Everything else derives from it |
| **App icon** | 1024×1024 PNG, **fully opaque — no alpha channel**, square, **no rounded corners**, no drop shadow | Apple rejects icons containing transparency; iOS and Android apply their own corner mask, so pre-rounding shows as a double-rounded edge |
| **Android adaptive foreground** | 1024×1024 PNG **with** transparency, artwork inside the centre 66% (≈676px) | Android masks the outer third into circles/squircles/squares per launcher — anything outside that ring gets clipped on some devices |
| **Adaptive background** | A solid colour (or a 1024×1024 image) | Supplied separately from the foreground; currently `#FFFFFF` as a C-3 placeholder |
| **Splash mark** | PNG with transparency, ≥1024px on its long edge, plus the intended background colour | Drawn centred over a solid colour by `expo-splash-screen`; it is not a full-bleed image |
| ~~Favicon~~ | Not needed | Web is out of scope (O-12) |

Two constraints worth passing to the designer up front: the icon must stay legible at **48×48**
(Android launcher) and the mark must read against **white**, since C-3 fixes a light theme.

---

## 11. Build internals — non-obvious facts, verified 2026-07-28

Things about how this project builds that are easy to get wrong and expensive to rediscover.

**`yarn lint` caches, and the cache lies (found 2026-07-29).** `expo lint` writes to
**`.expo/cache/eslint/`** — not `.eslintcache`, and not `node_modules/.cache`, which is where you
will look first. After a large refactor it can keep reporting `import/namespace` parse errors for
files that are now valid, because the *importing* file's cached result still references the old
parse of the imported one. `npx eslint app src --no-cache` is the ground truth; when the two
disagree, `rm -rf .expo/cache` and re-run. This cost real time in Module 1 — the errors looked like
genuine syntax breakage in a file that was already fixed.

**There is no `babel.config.js`, and that is correct — do not "fix" it.** Metro is the bundler, not
the transpiler; it delegates per-file transformation to `@expo/metro-config`'s babel-transformer,
whose `loadBabelConfig` looks for `.babelrc` / `.babelrc.js` / `babel.config.js` and, **finding
none, injects `babel-preset-expo` itself**. That preset supplies the JSX transform,
`@babel/preset-typescript`, the expo-router plugin, and `WorkletsBabelPlugin` — which is what makes
the ~74 Reanimated worklet calls in Discover, ProfileView and MatchOverlay work.
⚠️ **The footgun:** the moment *any* Babel config file exists, Expo stops injecting the default. If
a module ever needs one (a module resolver, a custom plugin), it **must** list `babel-preset-expo`
explicitly, or JSX, TypeScript and worklets silently stop being transformed.

**Types are stripped, never checked.** `@babel/preset-typescript` deletes annotations without any
type checking, so a bundle will build cleanly over type errors — which is exactly why the three
inherited errors do not break `expo export`, and why `tsc --noEmit` has to be its own step. Run
`yarn typecheck:baseline`; it is green today and fails on anything new.

**Environment variables:** use Expo's built-in `.env` support with the `EXPO_PUBLIC_*` prefix.
`react-native-dotenv` was removed in Module 0 (unwired and superseded). **`EXPO_PUBLIC_*` values are
inlined into the shipped bundle** — correct for O-8's API base URL, never for a secret.
`.env.example` is deliberately un-ignored in `zomyra-app/.gitignore`, overriding the repo-root
`.gitignore`, which would otherwise swallow it silently.

**Package manager is yarn, and only yarn.** `yarn.lock` is the only lockfile. npm cannot resolve
this dependency tree (it fails on a `@react-navigation/native` peer conflict), and with no lockfile
present Expo's own tooling silently picks npm — which is how the repo ended up with duplicate native
modules before Module 0.

⚠️ **Never run `npm install` in this project — not even `npm i --no-save`.** npm 7+ reads an
existing `yarn.lock` and rewrites it in npm's own style, converting every `resolved` URL from
`registry.yarnpkg.com` to `registry.npmjs.org` and dropping the integrity fragments. It happened
once during Module 0 (a one-off `sharp` install for `scripts/make-brand-assets.js`) and churned
2,492 lines before being caught and reverted. The `--no-save` flag does **not** protect you. When a
tool is needed transiently, install it to a prefix outside the repo and point `NODE_PATH` at it:

```
npm --prefix /tmp/zomyra-brand-tools i sharp
NODE_PATH=/tmp/zomyra-brand-tools/node_modules node scripts/make-brand-assets.js
```

**Do not reintroduce `save-exact`.** `.npmrc` carried `save-exact=true` and was removed in Module 0.
The reasoning inverted once a lockfile existed: `save-exact` guards against version drift only when
there is *no* lockfile, and `yarn.lock` now pins every package — transitive included — to an exact
resolved version, so `^7.4.0` installs exactly as deterministically as `7.4.0`. What exact pins
still do is **prevent deduplication**: a pinned `7.1.8` cannot satisfy a transitive `^7.1.14`, so
yarn installs both, and for *native* modules two copies is a build failure rather than a warning.
That is what took `expo-doctor` to 16/18 before Module 0. It also fights Expo directly —
`expo install` deliberately writes SDK-compatible ranges, and `expo-doctor` validates against them.
**Use `yarn install --frozen-lockfile`** for the guarantee `save-exact` was reaching for; it fails
loudly if `package.json` and `yarn.lock` ever disagree.

**The `resolutions` block in `package.json` is inherited from Emergent — investigated 2026-07-28.**
One entry was removed, two were kept, and the reasoning matters because the remaining two still warn
on every install:

- ~~`@eslint/plugin-kit: 0.3.4`~~ **removed.** It satisfied *neither* consumer: the tree held two
  eslints — our exactly-pinned `9.25.0` (wanting `^0.2.8`) and a nested `9.39.5` pulled in via
  `eslint-config-expo → eslint-plugin-expo` (wanting `^0.4.1`). Forcing `0.3.4` matched no range and
  worked only by luck. **Root cause was the exact pin on eslint** — another `save-exact` artifact.
  Relaxing to `^9.39.5` deduplicated both packages to one copy each, and the resolution became
  unnecessary. Lint findings are byte-identical before and after (15 warnings, 0 errors).
- `postcss: 8.5.10` **kept.** `@expo/metro-config@54.0.17` asks for `~8.4.32`; 8.4→8.5 is a minor
  bump within the same major and API-compatible.
- `uuid: 11.1.1` **kept.** `xcode@3.0.1` (used by `@expo/config-plugins` during prebuild) asks for
  `^7.0.3` — four majors behind. **Verified safe rather than assumed:** `xcode` does
  `require('uuid')` and calls only `uuid.v4()`, which is stable across those versions, and uuid 11's
  CJS build still exports it. It does *not* use the `uuid/v4` deep import that uuid 9 removed, which
  would have thrown during the first EAS iOS build.

Both surviving entries look like deliberate security bumps. They warn but are harmless; **verify
before removing either**, and re-check `uuid` if `xcode`/`@expo/config-plugins` is ever upgraded.

---

## 12. Spec-change history

The TDDs are living documents. Every version bump gets an entry here with its **code impact**, so a
module starting later doesn't have to diff Word files to find out what moved. Diff the extracted
text rather than reading the whole document — the deltas are usually small and easy to miss by eye.

### 12.1 Frontend TDD v1.39 → v1.40 (received 2026-07-30)

**One change, five places: a `state` field added ahead of `city` in onboarding.** Verified by full
text diff — 5 hunks, no other edits anywhere in the document.

| # | Where | Change |
|---|---|---|
| 1 | **FR-3** | `state` inserted between gender and city — single-select from India's states/UTs. `city` becomes an autocomplete **scoped to the selected state**, not an all-India list |
| 2 | **FR-3a** *(new)* | Both lists are **bundled client-side as static reference data** (28 states + 8 UTs, curated cities per state) — no endpoint, deliberately, to avoid a network dependency mid-onboarding. Changing state **clears any city already entered** |
| 3 | **FR-5** | "same state" match preference now resolves against this field directly, instead of requiring a city→state lookup |
| 4 | **§3.2** | Plot section grows from ~16 to ~17 screens |
| 5 | **API-7 / API-23** | `state` added to the submit `plot` object and to the `/profile/me` response |

**Code impact — all of it lands in Module 5:**

- `src/lib/onboarding/data.ts` currently exports **`INDIAN_CITIES`, a flat 52-entry all-India
  array**. It has to become a `state → cities` map. Authoring that dataset is real work, not a
  rename — 36 states/UTs with a curated city list each — and it is the reason Module 5's estimate
  moved from 3–4 to **4–5 days**.
- `OnboardingState` (`src/lib/onboarding/types.ts:48`) has `city: string` and **no state field**.
  Add `state`, and implement the cascade: changing state clears `city`.
- One new onboarding screen, positioned before the city screen.
- **Edit Profile must expose both.** FR-4's immutability list is name / DOB / height only, so state
  and city *are* editable — and the same cascade rule applies there. Changing state in Edit Profile
  must clear or re-validate city, or a user ends up in Karnataka/Mumbai.
- **Module 7 inherits two knock-ons:** `discover-filters-store.ts` currently has `location` as a
  flat list of 8 hardcoded cities, which no longer reflects the model; and FR-5's "same state"
  resolution changes what the Discover query filters on.

**Two things this opened, both tracked:** O-15 (the fallback when a user's town isn't listed —
flagged as undecided by the spec itself, and it determines whether `city` is a closed enum or an
open string) and O-16 (Backend TDD v1.2 has no `state` field at all).
