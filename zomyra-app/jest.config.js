/**
 * Jest configuration — FE TDD §13.1 (Jest + React Native Testing Library on the
 * `jest-expo` preset). Stood up in Module 5.5a.
 *
 * The preset supplies the React Native transform, the module-name map for
 * `react-native`, and the haste config; everything below is Zomyra-specific.
 */
module.exports = {
  preset: "jest-expo",

  // The `@/*` path alias from tsconfig.json, mirrored for the runner. Metro and
  // TypeScript both resolve it; Jest needs it spelled out.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",

    /*
     * lucide-react-native to its CommonJS build.
     *
     * The package's `exports` map sends the `react-native` condition — which
     * `jest-expo` selects — to a `.mjs` bundle, and Jest's transform only
     * matches `.[jt]sx?`, so the file arrives at the runtime untouched and
     * throws on its first `export`. The `require` condition points at an
     * equivalent CJS build; naming it directly is smaller and less fragile than
     * teaching the transform about `.mjs`. Every screen imports an icon, so
     * without this no suite can render one.
     */
    "^lucide-react-native$": "<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js",
  },

  // Native modules and Reanimated ship untranspiled ESM/Flow; the preset's list
  // covers the common set. Three additions of our own:
  //   - `@react-native-google-signin` — the auth layer reaches it (behind a
  //     dynamic import) and a bare require would hit its untransformed source;
  //   - the Redux family — `immer` and friends are ESM-only as of RTK 2;
  //   - `react-native-safe-area-context` — screens render inside its provider.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-safe-area-context|@react-native-google-signin/.*|redux-persist|immer|@reduxjs/toolkit|redux|reselect|react-redux))",
  ],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // Only our own suites. `node_modules` and the mock server's own fixtures are
  // excluded so a stray `*.test` fixture never runs as a suite.
  testMatch: ["<rootDir>/**/*.test.ts", "<rootDir>/**/*.test.tsx"],

  clearMocks: true,

  // redux-persist keeps a debounce timer alive on the singleton `persistor`
  // (and on the isolated stores the rehydration suite builds), which Jest cannot
  // reap — the suites themselves complete cleanly. Force-exit rather than leave a
  // hung runner; there is no app-owned async work left open at this point.
  forceExit: true,
};
