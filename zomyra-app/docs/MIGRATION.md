# Zomyra Frontend Migration Log

Living record of the migration from the Emergent-generated prototype to an app aligned with
**Frontend TDD v1.39**, integrating against the contract in **Backend TDD v1.2**.

**How to use this file.** It is the handoff between work sessions. Starting a module should
require reading only this file plus the relevant TDD sections — not prior chat history.
Append a "Module log" entry at the end of every module, in the same session that finishes it.

- Started: 2026-07-27
- Codebase: `zomyra/zomyra-app` (Expo SDK 54, RN 0.81.5, React 19.1, expo-router v6)
  — renamed from `frontend/` on 2026-07-27, along with the app identity (see §8)
- Status: **Module 0 not yet started.** Baseline below is the untouched Emergent output.

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

---

## 2. Module sequence

| # | Module | Status | One-line rationale for its position |
|---|---|---|---|
| 0 | Build & project foundation | Not started | Bundle ID must be final before RevenueCat/FCM bind to it; unblocks all native deps |
| 1 | Design system & theming | Not started | Later modules rewrite most screens — tokens must exist first or the debt is re-created |
| 2 | State & data layer | Not started | Every subsequent module plugs into it; nothing can reach the backend until it exists |
| 3 | Navigation | Not started | Tab semantics + root gate are structural; needs Module 2 to call `GET /me` |
| 4 | Auth & session | Not started | First real API integration; unblocks every authenticated call |
| 5 | Onboarding & profile schema | Not started | Fixes data-model drift at the source, before other screens consume those enums |
| 6 | Photos & verification | Not started | Removes the base64-in-storage violation; establishes the image-cache foundation |
| 7 | Discover, filters & Express Interest→Match | Not started | Core loop and densest edge-case spec; needs 5 and 6 |
| 8 | Requests | Not started | Small; reuses Discover's pagination and the shared Match screen |
| 9 | Chat & realtime | Not started | Largest single feature; independent once the core loop is proven |
| 10 | Premium & entitlements | Not started | Needs the dev build and every gated surface to already exist |
| 11 | Push notifications | Not started | Cross-cutting: routes into chat, requests, verification, premium |
| 12 | Hardening | Not started | Accessibility, offline, Sentry, tests — applies across finished screens |

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
| O-1 | **Real bundle identifier / package name**, replacing `com.emergent.zomyraapppreview.q3b1np` (e.g. `com.zomyra.app`). Must be final before the dev build — RevenueCat and FCM bind to it in Modules 10–11 and changing it later invalidates both. *Still open;* the rest of the app identity (name/slug/scheme) was settled on 2026-07-27, see §8. | Module 0 | Product owner |
| O-2 | Apple Developer account ($99/yr) + Play Console ($25), and `google-services.json` / `GoogleService-Info.plist`. Modules 1–9 run on the dev client without these. | Modules 10–11 | Product owner |
| O-3 | **API-32 field-name conflict:** FE TDD §9.12 sends/returns `{ pushEnabled }`; BE TDD §14.13 uses `{ notificationsEnabled }`. A real contract conflict, not a doc paraphrase. | Module 11 | FE + BE |
| O-4 | **`accountStatus` routing gap:** BE `GET /me` returns `active \| suspended \| banned`, but FE §9.1's routing table defines no destination for suspended/banned. | Module 3 | FE + product |
| O-5 | Express Interest daily cap value `N` (FR-17a) is still "to be set by product". | Module 7 | Product owner |
| O-6 | Height filter bounds inconsistent across wireframes (140–210cm vs 140–200cm), FE TDD §8. | Module 7 | Product owner |
| O-7 | Whether an unmatched (not blocked) user can resurface in Discover (FR-25b). BE defaults to yes. | Module 9 | Product owner |
| O-8 | **Where the real backend lives, and its base URL(s)** per environment (dev/staging/prod). Note `zomyra/backend/` is *not* it — see §7. If no server exists yet, Module 2 builds the RTK Query layer against the BE TDD §14 contract with a mock/MSW-style handler behind the same base query, so swapping in a live URL is config-only. | Module 2 | FE + BE |

**Resolved, do not reopen:** dark mode is out of scope — light theme only (2026-07-27).

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

_(No entries yet — Module 0 has not started.)_

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

**Deliberately unchanged:** `ios.bundleIdentifier` / `android.package` are still
`com.emergent.zomyraapppreview.q3b1np` — that is O-1 and needs the owner's decision, not a guess.
Also unchanged: `userInterfaceStyle` is still `"automatic"` despite constraint C-3; flipping it to
`"light"` is Module 0's job, kept out of this rename so the commit stays single-purpose.
