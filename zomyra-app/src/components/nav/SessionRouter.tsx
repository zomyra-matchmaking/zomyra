/**
 * The one place a **session event** turns into a navigation.
 *
 * Module 2 deliberately left this open: the base query clears the keychain and
 * dispatches `sessionExpired`, and its comment says outright that *"where that
 * sends the user is Module 3's root gate, not a decision for the network
 * layer."* The same now applies to `accountBlocked`. Both signals are raised
 * from `src/api/base-query.ts`, which cannot import a route without the network
 * layer knowing about navigation — so it reports, and this listens.
 *
 * Mounted once, beside the `<Stack>` in `app/_layout.tsx`. It renders nothing.
 *
 * ## Why a listener and not a check inside each screen
 *
 * Both events are **request-level and mid-session**. NFR-15's forced logout
 * fires the moment any call's refresh fails; BE §9.9's `403 account_*` can
 * arrive on any authenticated endpoint at any time — a user can be halfway
 * through a conversation when an admin suspends the account. Neither is a
 * cold-start concern, so neither can be handled by the root gate alone, and
 * putting the check in every screen means eleven copies and one that gets
 * forgotten.
 *
 * The **cold-start** halves stay in `app/index.tsx`, which routes declaratively
 * off `GET /me`. The two paths converge on the same destinations and cannot
 * fight, because each guards on where the user already is.
 */
import { usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

import { useAppSelector } from "@/src/store/hooks";

export function SessionRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const blocked = useAppSelector((s) => s.session.blocked);
  const expired = useAppSelector((s) => s.session.expired);

  useEffect(() => {
    // Already there — re-replacing would remount the screen on every render
    // that touches the session slice.
    if (!blocked || pathname === "/blocked") return;
    // `replace`, not `push`: the blocker is non-dismissible, so it must not
    // leave a back-stack entry to pop (FE §8.1).
    router.replace("/blocked");
  }, [blocked, pathname, router]);

  useEffect(() => {
    /*
     * NFR-15's forced logout. `expired` rather than `status === "anonymous"`
     * because the two are not the same event: `anonymous` is also the state of
     * someone who simply has not signed in yet, and sending *them* to Login
     * from here would fight the root gate on every cold start.
     *
     * Ordered after the blocked check for a reason — a blocked account's
     * session is **not** revoked (BE §9.9), so the two cannot both be true from
     * the same cause, but if they ever were, the dead end wins over the
     * sign-in screen.
     */
    if (!expired || blocked || pathname === "/login") return;
    router.replace("/login");
  }, [expired, blocked, pathname, router]);

  return null;
}
