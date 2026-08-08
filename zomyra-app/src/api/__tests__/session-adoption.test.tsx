/**
 * M55-007 — a sign-in must not navigate before the session it just obtained has
 * been adopted.
 *
 * ## What the defect actually was
 *
 * Both auth screens did `await verifyOtp(...)` / `await googleSignIn(...)` and
 * then `router.replace("/")`. The tokens are written by `adoptSession`, hung off
 * RTK Query's `onQueryStarted` — which RTK Query **starts** before the trigger
 * promise resolves but never **awaits**. So the screen's `await` said only "the
 * server answered", while the root gate routes on `session.status`, which
 * `adoptSession` sets two `await`s later. The gap is one keychain write wide:
 * invisible to a human thumb, lost 4/4 times under Maestro, and the user landed
 * back on Welcome after a sign-in that had in fact succeeded.
 *
 * ## Why the assertions are shaped like this
 *
 * The interesting property is an **ordering**, not an end state — wait long
 * enough after any sign-in and everything is authenticated whether the fix is
 * present or not. So `router.replace` is spied on to capture the session
 * *at the instant it was called*. That is the only formulation that fails if
 * someone removes the `await sessionAdopted()` from a screen.
 *
 * The keychain write is deliberately slowed (`MOCK_KEYCHAIN_MS`) so the window
 * is wide and the test does not depend on how many microtasks happen to sit
 * between the two events on a given machine.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { sessionAdopted } from "@/src/api";
import { store } from "@/src/store";
import { signedOut } from "@/src/store/slices/session-slice";

// The real token helpers, with only the keychain write slowed down — 60ms is
// wide enough to lose the race decisively if the fix is absent. Mocking the
// whole module would take `base-query`'s refresh path with it. The literal is
// inlined because a `jest.mock` factory is hoisted above any const it could
// read.
jest.mock("@/src/auth/tokens", () => {
  const actual = jest.requireActual("@/src/auth/tokens");
  return {
    ...actual,
    setTokens: jest.fn(async (pair: { accessToken: string; refreshToken: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 60));
      return actual.setTokens(pair);
    }),
  };
});

/*
 * The global expo-router mock, restated with search params.
 *
 * `jest.setup.js` returns `useLocalSearchParams: () => ({})`, and `app/otp.tsx`
 * redirects to `/phone` without a `phone` param — so this suite has to supply
 * one. A local `jest.mock` replaces the setup mock outright rather than layering
 * on it (`requireActual` here would pull in the *real* expo-router, whose
 * `router.replace` is not a spy), so the rest of the surface is repeated
 * verbatim.
 */
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
    useLocalSearchParams: () => ({ dial: "+91", phone: "9000000000" }),
    useSegments: () => [],
    usePathname: () => "/",
    Link: ({ children }: { children: unknown }) => children,
    Redirect: () => null,
    Stack: Object.assign(() => null, { Screen: () => null }),
    Tabs: Object.assign(() => null, { Screen: () => null }),
  };
});

/*
 * `src/auth/google` is deliberately **not** mocked. `USE_API_MOCKS` is true
 * under Jest (no `EXPO_PUBLIC_APP_ENV` → `mock`), so the real
 * `signInWithGoogle()` already short-circuits to `MOCK_GOOGLE_ID_TOKEN` without
 * touching the native SDK — the same path a `preview-mock` build takes. Mocking
 * it would also blank that constant for `src/api/mock/handlers.ts`, which
 * imports it to recognise the token.
 */

// Imported after the mocks above so the screens pick them up.
// eslint-disable-next-line import/first
import LoginScreen from "@/app/login";
// eslint-disable-next-line import/first
import OtpScreen from "@/app/otp";

function renderScreen(ui: React.ReactElement) {
  return render(
    <Provider store={store}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        {ui}
      </SafeAreaProvider>
    </Provider>,
  );
}

/**
 * Replaces the router spy with one that records the session as it stood when
 * navigation was requested. Returns a getter for that snapshot.
 */
function captureSessionAtNavigation() {
  const snapshot: { status?: string; href?: string } = {};
  (router.replace as jest.Mock).mockImplementation((href: string) => {
    snapshot.href = href;
    snapshot.status = store.getState().session.status;
  });
  return snapshot;
}

beforeEach(() => {
  store.dispatch(signedOut());
});

describe("sign-in adopts the session before it navigates (M55-007)", () => {
  it("navigates only once the phone sign-in's tokens are on the keychain", async () => {
    const seen = captureSessionAtNavigation();
    renderScreen(<OtpScreen />);

    for (let i = 0; i < 6; i += 1) {
      fireEvent.changeText(screen.getByTestId(`otp-digit-${i}`), String(i + 1));
    }
    fireEvent.press(screen.getByTestId("otp-verify"));

    await waitFor(() => expect(seen.href).toBe("/"));
    // If the adoption were not awaited this would be "anonymous", and the root
    // gate would answer `unauthenticated` → `/login`.
    expect(seen.status).toBe("authenticated");
    await expect(sessionAdopted()).resolves.toBe(true);
  });

  it("does not navigate at all when the keychain write fails", async () => {
    // The credentials were accepted and the *client* is what failed, so there is
    // nothing to correct in the form — but there is also no session, and
    // navigating would strand the user on a gate that bounces them straight
    // back. `sessionAdopted()` reporting false is what makes that distinguishable.
    const tokens = jest.requireMock("@/src/auth/tokens");
    tokens.setTokens.mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
      throw new Error("keychain unavailable");
    });

    const seen = captureSessionAtNavigation();
    renderScreen(<OtpScreen />);

    for (let i = 0; i < 6; i += 1) {
      fireEvent.changeText(screen.getByTestId(`otp-digit-${i}`), String(i + 1));
    }
    fireEvent.press(screen.getByTestId("otp-verify"));

    await waitFor(() => expect(screen.getByTestId("otp-error")).toBeTruthy());
    expect(seen.href).toBeUndefined();
    await expect(sessionAdopted()).resolves.toBe(false);
  });

  it("holds for the Google path too — both share adoptSession", async () => {
    // `auth.ts:79` and `auth.ts:95` pass the same lifecycle to the same
    // function, so a fix applied to only one screen leaves half the defect.
    const seen = captureSessionAtNavigation();
    renderScreen(<LoginScreen />);

    fireEvent.press(screen.getByTestId("login-continue-google"));

    await waitFor(() => expect(seen.href).toBe("/"));
    expect(seen.status).toBe("authenticated");
  });
});
