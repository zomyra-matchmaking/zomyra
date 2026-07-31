/**
 * Cold-start session resolution.
 *
 * Reads the keychain once and tells the store whether this launch starts
 * authenticated. It answers only "is there a token", which is all the client
 * can know locally — whether that token still *works*, and where the user
 * belongs, is `GET /me` (API-6) and Module 3's root gate.
 *
 * Kept separate from the store so that resolution is an explicit call from the
 * app shell rather than a side effect of importing a module.
 */
import type { AppDispatch } from "@/src/store";
import { sessionResolved } from "@/src/store/slices/session-slice";

import { getAccessToken } from "./tokens";

export async function bootstrapSession(dispatch: AppDispatch): Promise<void> {
  const token = await getAccessToken();
  dispatch(sessionResolved({ authenticated: !!token }));
}
