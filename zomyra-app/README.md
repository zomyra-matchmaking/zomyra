# Zomyra — mobile app

Expo SDK 54 · React Native 0.81 · React 19 · expo-router v6 · TypeScript (strict).

Migration status, module sequence and standing constraints live in
[`docs/MIGRATION.md`](docs/MIGRATION.md). Read that before starting a module.

> **This app does not run in Expo Go.** It is an EAS **development build** (constraint C-2) —
> RevenueCat's purchase SDK and push notifications need native code Expo Go cannot load.
> Every on-device check is a dev-client build.

## Requirements

| Tool | Version | Notes |
|---|---|---|
| Node | 20.19.6 | Pinned in `eas.json` so cloud builds match local |
| Yarn | 1.22.x | **Use yarn, not npm.** `yarn.lock` is the only lockfile; npm also fails to resolve this dependency tree |
| eas-cli | ≥ 16 | `npm i -g eas-cli` |

## Install

```bash
yarn install
```

## One-time EAS setup

The project is not yet linked to an EAS account, so `app.json` carries no `extra.eas.projectId`
and builds will fail until someone runs:

```bash
eas login && eas init
```

That writes `extra.eas.projectId` (and `owner`) into `app.json` — commit the result.

## Building the dev client

Install the resulting build once per device; after that only `yarn start` is needed unless a
native dependency changes.

```bash
yarn build:dev:android
```

```bash
yarn build:dev:ios-sim
```

`build:dev:ios-sim` produces a Simulator build and needs no Apple Developer account.
`yarn build:dev:ios` targets a physical iPhone and **is blocked until the Apple Organization
account exists** (see MIGRATION.md O-10) — expect Simulator-only iOS coverage until then.

## Daily loop

```bash
yarn start
```

## Checks

```bash
yarn lint
```

```bash
yarn typecheck
```

`yarn typecheck` runs `tsc --noEmit` raw, and currently reports three pre-existing errors
inherited from the prototype (MIGRATION.md §3), each owned by a later module.

```bash
yarn typecheck:baseline
```

`yarn typecheck:baseline` is the one to gate on: it allows exactly those three known errors and
fails on anything new. When a module fixes one, run `yarn typecheck:baseline --update` and commit
the smaller baseline.

```bash
yarn doctor
```

`yarn doctor` runs `expo-doctor` (18 checks — config schema, dependency versions, duplicate native
modules). It passes clean; keep it that way.

## Build profiles

Defined in `eas.json`:

| Profile | Purpose |
|---|---|
| `development` | Dev client, internal distribution, Android APK |
| `development-simulator` | Same, but an iOS Simulator build |
| `preview` | Release-style internal build, no dev client. Points at staging |
| `preview-simulator` | `preview` for the iOS Simulator — **unsigned, so no Apple account** (O-10) |
| `preview-mock` | `preview` against the in-process mocks. See below |
| `preview-mock-simulator` | `preview-mock` for the iOS Simulator |
| `production` | Store build, auto-incrementing version |

**Why `preview-mock` exists**, since a mock-serving release build looks odd at first glance: a
`preview` build is the only kind where **the app owns the `zomyra://` scheme**. In a dev build
expo-dev-client owns it, so a cold-start deep link opens the launcher rather than the app — which
is why O-18(a) sat unverifiable for a whole module. But staging cannot issue a token yet (phone
auth is undeployed, Google needs OAuth clients), so a `preview` build against staging can only
ever reach the sign-in screen, and every deep-link test ends at `/login` whether the routing is
right or wrong. `preview-mock` is a scheme-owning build with a real session behind it. `mock` is
a named environment and `src/config/env.ts` refuses it outright in `production`, so this cannot
leak into a store build.

Sign in on a `preview-mock` build with **`9000000000`** and any six digits except the reserved
ones for a fully onboarded, verified account (`src/api/mock/accounts.ts`).

`preview-mock` inherits `EXPO_PUBLIC_API_URL` from `preview` and does not override it. That is
deliberate and safe: `EXPO_PUBLIC_APP_ENV=mock` means mocks *whether or not* a host is also
configured — the rule Module 3 corrected, and the same arrangement the local `.env` uses so one
word switches hosts.

⚠️ **`env` values may not be empty strings.** EAS validates the whole file, so one `"": ` anywhere
fails `eas build` for **every** profile. `production` carried an empty `EXPO_PUBLIC_API_URL` from
Module 0 and nobody had run a build since; it is now simply absent, which is the correct
expression of "not decided yet" — `src/config/env.ts` refuses to boot a production build with no
host, and that guard should be the only thing saying so.
