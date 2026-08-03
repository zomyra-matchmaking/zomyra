/**
 * FR-30's version check + §9.1's routing decision, as one hook.
 *
 * **Why this is a hook and not just `app/index.tsx`'s body.** The gate used to
 * live entirely in the root route, which meant it only ran when the app opened
 * at `/`. Two ways past it, both found by testing rather than reading:
 *
 * 1. **Deep links open their route directly.** `zomyra:///chats/<id>` — which is
 *    exactly what Module 11 will issue from a push notification — mounts the
 *    conversation without `/` ever rendering. No version check, no
 *    `accountStatus` check, no routing table.
 * 2. **Forward navigation inside a session.** A screen calling `router.replace`
 *    does not consult the gate either, which is how a `pending` user reached
 *    Discover from the "Held" screen.
 *
 * A gate that only guards the front door is not a gate. `app/(tabs)/_layout.tsx`
 * uses this hook too, so every route that can show real user content re-asks
 * the same question from the same cached answer.
 *
 * **It costs no extra requests.** Both queries are RTK Query hooks keyed on
 * their arguments, so the tab layout subscribes to the same cache entries the
 * root gate already populated. On a deep-link cold start it is the tab layout
 * that fills them, and `/` never runs at all.
 */
import { useCheckAppVersionQuery, useGetMeQuery } from "@/src/api";
import { APP_VERSION } from "@/src/config/app-headers";
import {
  resolveUpdateRequirement,
  UPDATE_REQUIREMENT_ON_ERROR,
  type UpdateRequirement,
} from "@/src/lib/app-update";
import {
  resolveRootDestination,
  type RootDestination,
  type RootRouteContext,
} from "@/src/lib/root-route";
import { useAppSelector } from "@/src/store/hooks";
import { isIOS } from "@/src/utils/platform";

/**
 * The client-side half of §9.1's inputs, for anything calling
 * {@link resolveRootDestination}.
 *
 * It exists because there is now more than one caller — this hook and
 * `HeldVerification`'s "Check again" — and the table takes a fact
 * (`GET /me` does not report FR-2a consent) that each would otherwise look up
 * for itself. One lookup, so the two cannot answer differently.
 *
 * Takes the `userId` rather than reading it, because it is only known once
 * `GET /me` has resolved and a hook cannot be called conditionally on that.
 */
export function useRootRouteContext(): (userId: string) => RootRouteContext {
  const consentedUserIds = useAppSelector((s) => s.consent.sensitiveDataUserIds);
  return (userId: string) => ({
    sensitiveDataConsentGiven: consentedUserIds.includes(userId),
  });
}

/** API-5 takes the store this build came from, not the OS it happens to run on. */
const PLATFORM = isIOS ? "ios" : "android";

export type LaunchGate =
  /** Still resolving. Callers show the shared default loading state. */
  | { status: "pending" }
  /** FR-30 outcome 1 — full-screen, non-dismissible. */
  | { status: "update-required"; storeUrl?: string }
  /** No usable session. Only `/login` is reachable. */
  | { status: "unauthenticated" }
  /**
   * `GET /me` could not be answered after its retries. **Not a logout** — the
   * tokens are still valid, so this is a "something went wrong, try again",
   * never a bounce to the sign-in screen.
   */
  | { status: "error"; retry: () => void }
  /**
   * Resolved. `destination` is where §9.1 says this user belongs, and
   * `updateAvailable` carries FR-30 outcome 2 for whoever wants to show it.
   */
  | {
      status: "ready";
      destination: RootDestination;
      updateAvailable: boolean;
      latestVersion: string | null;
      storeUrl?: string;
    };

export function useLaunchGate(): LaunchGate {
  const sessionStatus = useAppSelector((s) => s.session.status);
  const routeContext = useRootRouteContext();

  // ---- 1 · Version check (FR-30) -----------------------------------------
  const version = useCheckAppVersionQuery({ platform: PLATFORM });

  const requirement: UpdateRequirement | "pending" = version.isSuccess
    ? resolveUpdateRequirement(APP_VERSION, version.data)
    : version.isError
      ? // Fails open by contract (API-5, §9.1). A flaky network must never
        // produce an inescapable "Update required" for an update that does not
        // exist.
        UPDATE_REQUIREMENT_ON_ERROR
      : "pending";

  // ---- 2 · GET /me (API-6) ------------------------------------------------
  // `skip` is what enforces FR-30's ordering: this request is not issued until
  // the version check has resolved and is not blocking.
  const me = useGetMeQuery(undefined, {
    skip:
      requirement === "pending" ||
      requirement === "blocked" ||
      sessionStatus !== "authenticated",
  });

  if (requirement === "blocked") {
    return { status: "update-required", storeUrl: version.data?.updateUrl };
  }
  if (requirement === "pending" || sessionStatus === "unknown") {
    return { status: "pending" };
  }
  if (sessionStatus !== "authenticated") {
    return { status: "unauthenticated" };
  }
  if (me.isError) {
    return { status: "error", retry: () => void me.refetch() };
  }
  if (!me.data) {
    return { status: "pending" };
  }

  return {
    status: "ready",
    destination: resolveRootDestination(me.data, routeContext(me.data.userId)),
    updateAvailable: requirement === "optional",
    latestVersion: version.data?.latestVersion ?? null,
    storeUrl: version.data?.updateUrl,
  };
}
