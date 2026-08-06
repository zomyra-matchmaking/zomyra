/**
 * Global test setup — the four mocks MIGRATION §2.4.1 names as the harness's
 * groundwork. Each stands in for a native or navigation module that has no
 * JS-only implementation and would otherwise throw at import time in Node.
 *
 * These are deliberately thin. A test that needs richer behaviour (a stored
 * token, a specific route) overrides the relevant function locally rather than
 * teaching this file about every case.
 */

// 1. expo-secure-store — the keychain. An in-memory Map so `setItemAsync` /
//    `getItemAsync` round-trip within a test, which is all the token and
//    device-id helpers need.
jest.mock("expo-secure-store", () => {
  const store = new Map();
  return {
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
    __store: store,
  };
});

// AsyncStorage — its official in-memory mock. Not one of the four §2.4.1 names,
// but redux-persist writes through it, so the store's persistence tests need a
// real round trip rather than a throwing native stub.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// 2. react-native-reanimated — its official mock, plus silencing the worklet
//    warning that otherwise floods unrelated suites.
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
});

// 3. expo-router — the navigation surface. Screens call `router.replace` /
//    `useRouter`; component tests assert against these spies rather than a real
//    navigator.
jest.mock("expo-router", () => {
  const router = {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    setParams: jest.fn(),
  };
  return {
    router,
    useRouter: () => router,
    useLocalSearchParams: () => ({}),
    useSegments: () => [],
    usePathname: () => "/",
    Link: ({ children }) => children,
    Redirect: () => null,
    Stack: Object.assign(() => null, { Screen: () => null }),
    Tabs: Object.assign(() => null, { Screen: () => null }),
  };
});

// 4. @react-native-google-signin — the native sign-in SDK. The auth layer only
//    ever reaches it through a dynamic import (M4-001), but a suite that pulls
//    that path in must not hit `NativeModule.getConstants()` on a bare require.
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(),
    signInSilently: jest.fn(),
    signOut: jest.fn(),
    revokeAccess: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  },
  isErrorWithCode: (e) => Boolean(e && typeof e === "object" && "code" in e),
}));
