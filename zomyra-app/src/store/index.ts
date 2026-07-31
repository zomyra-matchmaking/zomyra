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
  persistReducer,
  persistStore,
  type PersistedState,
} from "redux-persist";

import { api } from "@/src/api/api";

import { importLegacyState } from "./legacy-migration";
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
const PERSIST_WHITELIST = ["onboarding", "discoveryMode", "discoverFilters"];

const persistedReducer = persistReducer(
  {
    key: "zomyra.root",
    version: 1,
    storage: AsyncStorage,
    whitelist: PERSIST_WHITELIST,
    /**
     * Called with `undefined` on a first run, which is the hook the Zustand
     * import needs — see `legacy-migration.ts`. Once redux-persist state
     * exists this is a pass-through, and future schema changes bump `version`
     * and branch here.
     */
    migrate: async (state: PersistedState) => state ?? (await importLegacyState()),
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
