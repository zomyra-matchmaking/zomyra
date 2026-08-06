# Testing — how the harness runs

Stood up in **Module 5.5** (MIGRATION.md §2.4). This file is the runner
documentation; the coverage index is `docs/TEST-CASES.md`, and a case backed by a
test here cites its command in that sheet's **Verify** column and carries type
`build`.

## Unit + component (5.5a — Jest + React Native Testing Library)

FE TDD §13.1's tooling: `jest-expo` preset, RNTL for components.

```bash
yarn test            # run every suite once
yarn test:watch      # watch mode
yarn test <path>     # a single file, e.g. yarn test src/lib/__tests__/root-route.test.ts
```

- **Config:** `jest.config.js` (preset, the `@/*` alias mirrored from
  `tsconfig.json`, `transformIgnorePatterns` widened for RTK/immer/redux-persist).
- **Global mocks:** `jest.setup.js` — the four §2.4.1 names (`expo-secure-store`,
  `react-native-reanimated`, `expo-router`, `@react-native-google-signin`) plus
  AsyncStorage's in-memory mock, which redux-persist writes through. A suite that
  needs richer behaviour overrides the relevant function locally rather than
  growing this file.
- **`babel.config.js`** exists only for the runner. It declares
  `babel-preset-expo` — exactly the preset Metro already applies by default — so
  it is a no-op for every production build.
- **Where tests live:** beside the code, in `__tests__/*.test.ts(x)`.
- **`forceExit`** is on: redux-persist keeps a debounce timer Jest cannot reap.
  The suites complete cleanly; nothing app-owned is left pending.

### The rule this harness runs under (MIGRATION §2.4.2)

A red test against merged code is a **finding**, not a fix. Record it in
`TEST-CASES.md`'s *Last result* and report `<ID> — <module> — <symptom>`; the fix
belongs in its own branch, because the module that broke a case is often not the
one that owns it. The one exception is a test that is itself wrong.

## E2E (5.5b — Maestro)

FE TDD §13.2's tooling. Installed via Homebrew (`mobile-dev-inc/tap/maestro`);
needs a JDK, which the formula pulls in.

```bash
maestro test .maestro/flows              # both flows
maestro test .maestro/flows/login.yaml   # one
maestro check-syntax .maestro/flows/login.yaml
maestro studio                           # interactive: inspect the a11y tree live
```

**Runs against a `preview-mock` build, never staging** (MIGRATION §2.4.3):
deterministic fixtures, no OTP delivery, no live backend. A suite that fails
because staging is down is a suite people learn to ignore.

```bash
yarn build:preview-mock:ios-sim   # or :android
```

⚠️ **A dev client is not a substitute.** It carries `EXDevLauncher`, so a launch
opens the launcher rather than the app and every flow fails at step one.

⚠️ **`clearState` does not clear the iOS keychain.** Tokens live there
(expo-secure-store, NFR-2) and survive an app-data wipe *and* a reinstall,
because the keychain is keyed on the bundle id every Zomyra build shares — so a
flow inherits whatever session the last build left behind and starts mid-app.
**Begin every leg with `clearKeychain`.** This cost the first Maestro run:
it launched straight into `/discovery-mode`.

Reserved mock OTP codes are `000000` (`otp_expired`) and `111111`
(`too_many_attempts`); any other six digits succeed. The flows use `123456`.

⚠️ **Both flows are currently red**, blocked on a Module 4 sign-in race
(M55-007 in `docs/TEST-CASES.md`) — not on anything wrong with the flows.

### The two flows, and why only two

`.maestro/flows/login.yaml` and `.maestro/flows/onboarding.yaml` — FE §13.2's
first two priorities. The other three (Express Interest→Match with the cap and
snap-back, chat with optimistic reconciliation, the premium purchase race) belong
to **Modules 7, 9 and 10**, which each write their own; 5.5 must not write them
blind against screens that do not exist yet (MIGRATION §2.4.2).

## The testID convention (5.5b)

Maestro drives the app through the accessibility tree, so a testID is the
contract between a screen and its flow. Three rules:

1. **`<screen>-<element>`, kebab-case.** `login-continue-phone`, `otp-verify`,
   `consent-agree`, `blocked-screen`.
2. **Repeated or catalogue-driven items are keyed on the *key*, never the
   label** — `option-male`, `chip-hindi`, `suggestion-ka-bengaluru`. Under FR-3b
   the backend may reword any label at any time without a client release, so a
   label-keyed id is a test that breaks on a copy edit (M5-003).
3. **Never positional.** Onboarding steps are `onboarding-step-<draft field
   key>` (`onboarding-step-gender`), not `onboarding-step-7`. M5-044 records that
   `SCREENS` both shrank and grew during Module 5 — an index would silently come
   to name a different question while the flow still passed.

`OnboardingShell` is shared by Onboarding **and** Verify, so it takes a
`testIDPrefix` (`onboarding` / `verify`). Before 5.5b both stacks emitted
`onboarding-next`, and the two are adjacent in one journey — exactly where that
ambiguity does damage.
