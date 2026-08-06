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

Pending. Runs against a `preview-mock` build (MIGRATION §2.4.3), never staging.
See `.maestro/` once it lands.
