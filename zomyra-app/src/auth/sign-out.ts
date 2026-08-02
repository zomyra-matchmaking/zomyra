/**
 * Ending a session, deliberately.
 *
 * The involuntary path (NFR-15's force logout, when a refresh is rejected)
 * lives in `src/api/base-query.ts` and dispatches `sessionExpired`. Both end up
 * in the same place: tokens gone from the keychain, and the RTK Query cache
 * emptied by the listener in `src/store/index.ts`.
 *
 * Emptying the cache matters more than it looks on a shared device — FE TDD
 * §9.12 raises exactly this scenario for push tokens (User A logs out, User B
 * logs in), and a surviving cache would show B the tail of A's Discover feed.
 */
import type { AppDispatch } from "@/src/store";
import { signedOut } from "@/src/store/slices/session-slice";

import { clearTokens } from "./tokens";

export async function signOut(dispatch: AppDispatch): Promise<void> {
  await clearTokens();
  dispatch(signedOut());
}
