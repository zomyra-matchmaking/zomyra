/**
 * The Redux store — FE TDD §4's "single source of truth for client + server
 * state": slices for client state, the RTK Query cache for server state, and
 * redux-persist across a deliberately small subset of the first.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  isAnyOf,
} from "@reduxjs/toolkit";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  createMigrate,
  persistReducer,
  persistStore,
} from "redux-persist";

import { api } from "@/src/api/api";

import { appUpdateReducer } from "./slices/app-update-slice";
import { chatReducer } from "./slices/chat-slice";
import { discoverFiltersReducer } from "./slices/discover-filters-slice";
import { discoveryModeReducer } from "./slices/discovery-mode-slice";
import { entitlementReducer } from "./slices/entitlement-slice";
import { onboardingReducer } from "./slices/onboarding-slice";
import { requestsReducer } from "./slices/requests-slice";
import { sessionExpired, sessionReducer, signedOut } from "./slices/session-slice";
import { verificationReducer } from "./slices/verification-slice";

const rootReducer = combineReducers({
  [api.reducerPath]: api.reducer,
  appUpdate: appUpdateReducer,
  chat: chatReducer,
  discoverFilters: discoverFiltersReducer,
  discoveryMode: discoveryModeReducer,
  entitlement: entitlementReducer,
  onboarding: onboardingReducer,
  requests: requestsReducer,
  session: sessionReducer,
  verification: verificationReducer,
});

/**
 * **The whitelist is the design decision, not the mechanism.**
 *
 * Persisted, because losing it costs the user real work or a real answer:
 * - `onboarding` — the part-finished draft (NFR-1).
 * - `discoveryMode` — a one-time choice; re-asking it is a bug (FR-15a).
 * - `discoverFilters` — a preference the user set by hand.
 * - `appUpdate` — when the optional-update prompt was last shown (FR-30). The
 *   only thing here that would be *useless* unpersisted rather than merely
 *   re-derivable: the prompt fires on cold start, so an in-memory cooldown
 *   would reset on exactly the launch it is meant to suppress.
 *
 * Not persisted, each for a stated reason:
 * - **tokens** — expo-secure-store only, never AsyncStorage (NFR-2, §4.3).
 * - **`entitlement`** — re-derived from RevenueCat every launch; a stored
 *   `isPremium: true` outlives the pass that paid for it (NFR-13, §4.3).
 * - **`session`** — derivable from the keychain plus `GET /me`; a second copy
 *   can only disagree with the first.
 * - **`verification`** — local `file://` URIs the OS may reclaim, and NFR-11
 *   keeps image data out of persisted storage entirely.
 * - **`chat` / `requests`** — still mock data, and both become RTK Query cache
 *   in Modules 8 and 9. NFR-7's offline window is a *bounded* cache of real
 *   responses, which is that work, not this.
 * - **`api`** — RTK Query's cache is in-memory by design; persisting it whole
 *   is exactly the unbounded growth NFR-11 forbids.
 */
const PERSIST_WHITELIST = [
  "onboarding",
  "discoveryMode",
  "discoverFilters",
  "appUpdate",
];

/**
 * Bump whenever a persisted slice's *shape* changes, and add a matching entry
 * to {@link migrations}.
 *
 * **2 — Module 5 (2026-08-05).** FR-3b reshaped the `onboarding` slice
 * fundamentally: free-text `city` became `cityId` + a separate `state` key,
 * every choice field went from a display label (`"Vegetarian"`) to a catalogue
 * key (`"vegetarian"`), `languagesOther` was added, and eleven prototype fields
 * with no API-7 home were deleted.
 */
const PERSIST_VERSION = 2;

/**
 * **Discard, do not repair.**
 *
 * A v1 draft holds display labels where v2 holds catalogue keys, and the client
 * cannot map between them: the keys are the backend's to define and arrive over
 * API-39, which needs auth and a network call — neither available at rehydrate
 * time, which happens behind `PersistGate` before the app has done anything.
 * Even given the catalogue, matching on label text would be a guess (`"Other"`
 * appears in three categories) and a wrong guess submits a profile the user
 * never filled in. Losing a part-finished draft is the honest failure.
 *
 * ⚠️ **The `migrate` hook is not optional here, and its absence would be
 * silent.** redux-persist's default when the stored version disagrees is a
 * **pass-through** — the old state rehydrates unchanged into the new slice, so
 * a v1 draft would look perfectly restored, render labels as though they were
 * keys, and fail at API-7 with a `400` twenty screens later. `createMigrate`
 * with an explicit `undefined` is what turns that into "start fresh", which is
 * a visible outcome at the point it happens.
 *
 * Returning `undefined` drops **every** whitelisted slice, not just
 * `onboarding` — redux-persist migrations operate on the whole persisted root.
 * That is acceptable: the other three (`discoveryMode`, `discoverFilters`,
 * `appUpdate`) are a re-askable one-time choice, a re-settable preference, and a
 * prompt cooldown whose worst case is one extra optional-update prompt. None is
 * user work; the draft was the only thing worth trying to keep.
 *
 * `debug: false` keeps redux-persist's own migration logging out of production
 * bundles; the outcome is observable through the flow itself.
 */
const migrations = createMigrate({ 2: () => undefined }, { debug: false });

const persistedReducer = persistReducer(
  {
    key: "zomyra.root",
    version: PERSIST_VERSION,
    storage: AsyncStorage,
    whitelist: PERSIST_WHITELIST,
    migrate: migrations,
  },
  rootReducer,
);

/**
 * When a session ends — whether the user asked (`signedOut`) or the refresh
 * token was rejected (`sessionExpired`) — the server-state cache has to go with
 * it. Handled here rather than in the base query, which cannot import `api`
 * without a cycle, and rather than at each sign-out call site, where it is one
 * line away from being forgotten on the path that matters.
 */
const sessionListener = createListenerMiddleware();
sessionListener.startListening({
  matcher: isAnyOf(signedOut, sessionExpired),
  effect: (_action, listenerApi) => {
    listenerApi.dispatch(api.util.resetApiState());
  },
});

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist's lifecycle actions carry functions and a rehydrated
        // snapshot; they are internal and never reach a reducer we own.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .prepend(sessionListener.middleware)
      .concat(api.middleware),
});

export const persistor = persistStore(store);

/**
 * `RootState` is derived from `rootReducer`, not from `store.getState()`:
 * `persistReducer` widens the state type with an optional `_persist` key, and
 * threading that through every `useAppSelector` would be noise.
 */
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
