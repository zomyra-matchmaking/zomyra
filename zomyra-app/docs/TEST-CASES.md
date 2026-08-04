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
| 3–12 | — | Not started |

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

_Not started. Cases this module owes, from MIGRATION.md — delete this list as they are written:_

- Tab state and scroll position survive switching tabs (FR-20) — the prototype's `router.push` nav failed exactly this
- `accountStatus` is checked **before** the routing table; any non-`active` value reaches the blocker (§12.4)
- A `403 account_*` mid-session routes to the blocker, not to a generic error
- The version gate: below minimum blocks, below latest prompts and continues, current proceeds (FR-30)
- The shared loading primitive respects OS reduce-motion (§13, NFR-6a)
- Screen capture is blocked in production builds and **not** in dev/staging (NFR-16, §12.5)
