# Zomyra Frontend Migration Log

Living record of the migration from the Emergent-generated prototype to an app aligned with
**Frontend TDD v1.39**, integrating against the contract in **Backend TDD v1.2**.

**How to use this file.** It is the handoff between work sessions. Starting a module should
require reading only this file plus the relevant TDD sections — not prior chat history.
Append a "Module log" entry at the end of every module, in the same session that finishes it.

- Started: 2026-07-27
- Codebase: `zomyra/zomyra-app` (Expo SDK 54, RN 0.81.5, React 19.1, expo-router v6)
  — renamed from `frontend/` on 2026-07-27, along with the app identity (see §8)
- Status: **Module 0 complete** (2026-07-28). §3's baseline still describes the untouched Emergent
  output and is kept as the historical reference point; §6 records what Module 0 changed.

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

### Repository state (as of 2026-07-27)

`origin` is `git@github.com:niharshah25/zomyra.git`. **`master` is the live line** — it carries the
Discovery Mode work (FR-15a) and the `PersonalityChat` → `PersonalityQuiz` rewrite (FR-7) that
`main` lacks. Everything in this document was assessed against `master`.

`main` is a **separate, unrelated history** (no common ancestor with `master`) last touched
2026-07-09, and is still GitHub's configured default branch. It is stale — treat it as an archive,
never as a merge target. Because the histories are unrelated, git cannot merge the two without
`--allow-unrelated-histories` and an artificial merge commit; there is no reason to attempt it,
since `master` already contains everything `main` has except `package-lock.json` (the project uses
yarn) and the superseded `PersonalityChat.tsx`.

> **Outstanding manual step for the owner:** switch the GitHub default branch to `master` in repo
> settings. Until that happens, new PRs default to targeting the stale `main`, and the repo's
> landing page shows 9-day-old code.

---

## 2. Module sequence

| # | Module | Status | One-line rationale for its position |
|---|---|---|---|
| 0 | Build & project foundation | **Complete** (2026-07-28) | Bundle ID must be final before RevenueCat/FCM bind to it; unblocks all native deps |
| 1 | Design system & theming | Not started | Later modules rewrite most screens — tokens must exist first or the debt is re-created |
| 2 | State & data layer | Not started | Every subsequent module plugs into it; nothing can reach the backend until it exists |
| 3 | Navigation | Not started | Tab semantics + root gate are structural; needs Module 2 to call `GET /me` |
| 4 | Auth & session | Not started | First real API integration; unblocks every authenticated call |
| 5 | Onboarding & profile schema | Not started | Fixes data-model drift at the source, before other screens consume those enums |
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
| 0 · Build foundation | 1 day | | 5 · Onboarding & schema | 3–4 days |
| 1 · Design system | 1–2 days | | 6 · Photos & verification | 3–4 days |
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
| O-10 | **Store accounts → Organization, registered once the LLP and D-U-N-S exist. Final (2026-07-28).** An Individual placeholder account was considered twice and rejected both times: it publishes the seller name as a person rather than "Zomyra" on a product asking strangers to share religion, income and biometric selfies, and it forces a later account conversion or app transfer. **Sequence:** LLP → D-U-N-S (request the day the certificate lands — the one pure-waiting link in the chain) → Apple Org + Play Org enrolment → reserve the "Zomyra" name immediately → PAN/TAN and current account applied for in parallel. **Genuine upside of this path:** Organization accounts are **exempt from Play's 14-day closed-testing requirement**, which a personal account would have carried — so the delay costs roughly two weeks less than it appears. **Cost to plan around:** no iOS physical-device testing until the Apple account exists — Android device builds and the iOS Simulator work throughout, but device-only behaviour (safe areas, keyboard avoidance, Dynamic Type per NFR-6a, haptics per FR-25a, permission dialogs) stays unverified until ~September. Do not let App Review be the first real iOS hardware the app runs on. | Before the §2.1 gate | Product owner | The LLP is not yet formed, so neither store account can be opened as an Organization yet. Deliberately *not* taking an Individual account as a placeholder: it would publish the seller name as a person rather than "Zomyra", pull a personal Play account into the multi-tester/14-day pre-publication requirement, and require a later account conversion or app transfer. Critical-path check: LLP (~2–4 wks) → D-U-N-S (5–14 business days) → Apple org approval (1–4 wks) ≈ 6–10 weeks total, which fits inside the Modules 0–9 window since none of them need an account. **Owner track, in parallel with engineering:** start LLP formation, buy `zomyra.com`, file the India trademark (stronger and more durable protection than an App Store name reservation), set up `developer@zomyra.com` as the account holder rather than a personal inbox. | Before the §2.1 gate | Product owner |
| O-9 | **Canonical domain conflict.** `app/terms.tsx:36` and `app/privacy.tsx:36` publish contact addresses at **`zomyra.app`** (`hello@`, `privacy@`), but the domain being purchased is **`zomyra.com`** (confirmed unregistered 2026-07-28). Pick one and correct the legal copy — these are user-facing addresses in Terms and Privacy, so a dead inbox there is worse than a cosmetic bug. Also decides the domain for universal links / associated domains in Module 11. | Module 12 (or sooner if the copy ships) | Product owner |
| O-8 | **Backend base URL + OpenAPI spec.** Status as of 2026-07-28: backend development is **underway**, built with Claude Code from the BE TDD — not yet known to be deployed or reachable. Note `zomyra/backend/` is *not* it (see §7). Needed: (a) a reachable dev/staging base URL including the `/v1` prefix; (b) **a served OpenAPI schema** (NestJS `@nestjs/swagger` → `/v1/docs-json`). Module 2 builds the RTK Query layer with mocks behind the base query either way, so a live URL is a config swap — but the spec should land as early as possible, see O-11. | Module 2 (mocks) / Module 4 (live) | FE + BE |
| O-11 | **Contract-drift control between two parallel implementations.** Both frontend and backend are being built from the same TDDs, which explicitly describe their field names as "illustrative, not finalized" — so divergence is expected, not hypothetical. O-3, the `/v1` prefix and `accountStatus` are the three already found by reading both docs; more will exist. **Mitigation:** treat a served OpenAPI schema as the single source of truth over the Word docs, and generate typed endpoints from it in Module 2 via `@rtk-query/codegen-openapi`, so drift surfaces as a compile error rather than a runtime 400 during integration. Pin O-3 and the `accountStatus` routing on both sides now, while each is a one-line change. | Module 2 | FE + BE |

| O-12 | ~~Is web still a target?~~ **→ No. Web is out of scope** (2026-07-28, owner). Removed in Module 0: the `expo.web` config block, the `yarn web` script, `react-dom` + `react-native-web`, `app/+html.tsx`, `src/utils/storage/index.web.ts`, `favicon.png`, and the RN-Web font-injection block in `app/_layout.tsx`. `platforms: ["ios", "android"]` now declares this in config, and `expo export --platform web` refuses. **Consequence for Module 2:** the `import.meta` workaround in `onboarding-store.ts` was a *web-bundle* problem only — it is no longer a constraint on the persistence design. | Module 0 | ✅ Decided |
| O-13 | ~~`ios.supportsTablet`~~ **→ Stays `true`. iPad and Android tablets are a target** (2026-07-28, owner). Accepted trade-offs, none of them blockers: App Store Connect will require 13-inch iPad screenshots at submission, App Review will exercise the app on iPad, and the phone-designed layouts need to hold up on a large screen — that is real layout work for Modules 1 and 3 and QA in 12, not a config flag. Android tablets need no flag (supported by default) but carry Play's large-screen quality guidelines. Reversible any time before the first submission. | Modules 1/3 (layout), 12 (screenshots) | ✅ Decided |
| O-14 | **Final icon and splash artwork — awaiting delivery.** Module 0's assets are generated from `assets/images/zomyra-logo.png`, which the owner has confirmed is **not the final mark**; a designer is producing a new logo and splash, to be supplied directly. Treat the current icon/splash as a placeholder good enough for dev builds only. Required formats are listed in §10. Also still open: the `#FFFFFF` splash and adaptive-icon backgrounds were picked to satisfy C-3, not from the palette. | Before submission (Module 12) | Product owner — in progress |

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
- See O-3 and O-4 above for the two live conflicts.

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
- Modules 1 and 3 inherit tablet layout work from O-13; Module 12 inherits the iPad screenshots.
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
- **iPad and Android tablets confirmed as targets (O-13).** `ios.supportsTablet` stays `true`. This
  is not free: iPad screenshots are required at submission, App Review will run the app on iPad, and
  the phone-designed layouts have to hold up on a large screen — layout work for Modules 1 and 3,
  QA in Module 12.
- **`ITSAppUsesNonExemptEncryption: false` added** to `ios.infoPlist`. Owner confirmed the app uses
  only standard HTTPS — image *compression* is not encryption, and there is no chat encryption
  anywhere. **Revisit if Module 9 ever adds end-to-end encrypted messaging.** Without this every
  TestFlight upload stalls on an export-compliance prompt.
- **Brand assets (O-14):** the current icon and splash are confirmed placeholders — a new logo and
  splash are being produced by a designer and will be supplied later. Required formats and the
  reasoning behind each are now in **§10**.

Verified after these changes: doctor 18/18, lint green, typecheck baseline green, iOS bundle exports
clean (6.43 MB), and `expo export --platform web` correctly fails.

**Still not done — the one thing blocking a real build:** `eas init` under a **Zomyra Expo
organization** (free, and unlike the store accounts it needs no LLP or D-U-N-S — so there is no
reason to take the personal-account shortcut O-10 rejected for Apple and Google). Owner action.

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

## 10. Brand assets — what the designer needs to deliver (O-14)

Module 0 shipped placeholders generated from the old `zomyra-logo.png`. A new logo and splash are
being designed and will replace them. **The single most useful deliverable is the vector source**
— with an SVG or PDF every size below can be regenerated exactly, and none of it needs revisiting
when a new density or store requirement appears.

| Asset | Spec | Why the spec is what it is |
|---|---|---|
| **Vector source** | SVG (or PDF/AI), logo mark and full lockup as separate files | Everything else derives from it |
| **App icon** | 1024×1024 PNG, **fully opaque — no alpha channel**, square, **no rounded corners**, no drop shadow | Apple rejects icons containing transparency; iOS and Android apply their own corner mask, so pre-rounding shows as a double-rounded edge |
| **Android adaptive foreground** | 1024×1024 PNG **with** transparency, artwork inside the centre 66% (≈676px) | Android masks the outer third into circles/squircles/squares per launcher — anything outside that ring gets clipped on some devices |
| **Adaptive background** | A solid colour (or a 1024×1024 image) | Supplied separately from the foreground; currently `#FFFFFF` as a C-3 placeholder |
| **Splash mark** | PNG with transparency, ≥1024px on its long edge, plus the intended background colour | Drawn centred over a solid colour by `expo-splash-screen`; it is not a full-bleed image |
| ~~Favicon~~ | Not needed | Web is out of scope (O-12) |

Two constraints worth passing to the designer up front: the icon must stay legible at **48×48**
(Android launcher) and the mark must read against **white**, since C-3 fixes a light theme. The
current placeholder's mark is only 304×217 real pixels, which is why it looks soft when scaled.
