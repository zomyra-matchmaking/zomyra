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
  `tsconfig.json`, `transformIgnorePatterns` widened for RTK/immer/redux-persist
  and `react-native-safe-area-context`).
- **`lucide-react-native` is mapped to its CommonJS build.** Its `exports` map
  sends the `react-native` condition — the one `jest-expo` selects — to a `.mjs`
  bundle, and Jest's transform only matches `.[jt]sx?`, so the file reaches the
  runtime untransformed and throws on its first `export`. Every screen imports an
  icon, so without the mapping **no suite can render a screen at all**; the two
  suites that do (M55-013…015) were what surfaced it.
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
yarn build:preview-mock:ios-sim   # or :android — EAS, ~20 min, one build credit
```

**Or build it locally**, which is what the 2026-08-06 fix run used. Free, and
fast enough to re-run after a one-line change — which matters, because a flow
that can only be re-tested by spending a cloud build is a flow nobody re-tests.
Needs Xcode and CocoaPods (`brew install cocoapods`):

```bash
LANG=en_US.UTF-8 EXPO_PUBLIC_APP_ENV=mock npx expo run:ios --configuration Release --device "iPhone 16"
```

- **`--configuration Release` is not optional.** A Debug build expects Metro to
  be serving the bundle; Maestro launches the app with no packager attached.
- **`LANG=en_US.UTF-8` is not optional either** on this checkout. CocoaPods
  normalises the project path through Ruby's Unicode tables and dies with
  `Encoding::CompatibilityError` under the default `ASCII-8BIT` locale — the
  repo path contains spaces. Homebrew prints the same advice on install.
- `EXPO_PUBLIC_APP_ENV=mock` is what makes it a *`preview-mock`* build rather
  than merely a local one; the other three variables in `eas.json`'s
  `preview-mock` profile only matter to a real Google sign-in, which this build
  short-circuits anyway.

#### ⚠️ The checkout path contains spaces, and three build scripts do not quote it

`/Users/…/New Matrimony App/…`. EAS is unaffected (it builds at a clean path);
**local builds are not**. Three separate unquoted expansions had to be patched by
hand on 2026-08-06, and every one of them lives in generated or vendored files
that `expo prebuild` / `yarn install` will silently restore:

| Where | Symptom |
|---|---|
| `ios/Pods/Pods.xcodeproj` — EXConstants' `[CP-User] Generate app.config` phase | `No such file or directory: /Users/…/New` — build fails outright |
| `ios/Zomyra.xcodeproj` — `Bundle React Native code and images` | same, at link time |
| `node_modules/expo-constants/scripts/get-app-config-ios.sh:14` — `basename $PROJECT_DIR` | **silent.** BSD `basename` accepts the split words and returns three lines, the `!= "Pods"` guard matches, and the script `exit 0`s having written nothing. The build **succeeds** and the app then dies at launch on `expo-linking needs access to the expo-constants manifest` |

The third is the dangerous one: a green build that crashes on first launch, with
an error naming a package unrelated to the cause.

**The durable fix is to move the checkout to a path without spaces** — patching
regenerated files is not a fix, it is a thing to redo. Until then, expect to
re-apply all three after any `expo prebuild` or `yarn install`.

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

⚠️ **`hideKeyboard` is a tap, and it can hit your button.** On iOS Maestro
dismisses the keyboard by tapping outside it. Screens whose CTA is *lifted above*
the keyboard rather than hidden behind it — which is most of ours, see
`useKeyboardInset` — will take that tap on the CTA. On the onboarding name step
this advanced the form before the flow's own Continue tap, so the run **silently
skipped the DOB question** and still passed for two more assertions. **Tap the
lifted CTA directly; do not `hideKeyboard` first.**

Both flows pass as of 2026-08-06 (2/2, 4m35s, iPhone 16 simulator).

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
