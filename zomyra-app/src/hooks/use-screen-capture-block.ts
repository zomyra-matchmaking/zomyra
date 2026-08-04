/**
 * NFR-16 — block screenshots and screen recording across the authenticated
 * shell (FE v1.46 §12.5).
 *
 * ## What it actually achieves, per platform
 *
 * | | |
 * |---|---|
 * | **Android** | Genuinely blocked. `FLAG_SECURE` makes the window unreadable to the screenshot pipeline and to recorders — captures come out black |
 * | **iOS** | ⚠️ **Not blocked, and cannot be.** iOS exposes no API to prevent capture; an app can only be *notified* after a screenshot or during a recording. MVP pairs that detection with **no behaviour at all** |
 *
 * ⚠️ **Do not describe this to users or stakeholders as "screenshots are
 * prevented".** On iOS it is not a control, and the spec says so in as many
 * words. Calling this hook on iOS is deliberately a no-op rather than a
 * detection listener, because a listener that triggers nothing is a hook
 * pretending to be a feature.
 *
 * ## Why it is gated on production
 *
 * `IS_PRODUCTION` already exists for exactly this shape of decision (Module 2),
 * so NFR-16 needed no new config. Off in dev and staging because `FLAG_SECURE`
 * blacks out **`adb screencap` too** — leaving it on would break QA evidence,
 * the store-screenshot workflow, and every screenshot this migration log is
 * built from.
 *
 * ## Why the import is lazy
 *
 * The same reason `src/auth/google.ts` gives, and it is the project's
 * convention rather than a local preference: C-2 makes every on-device run a
 * dev-client build, every native addition invalidates every existing copy of
 * that client, and more are scheduled (`lottie-react-native` in Module 7,
 * `expo-notifications` in Module 11). A static import turns "your dev client
 * predates this dependency" into a crash; a lazy one degrades to the feature
 * being absent — which in dev is what it is anyway, since the gate is off.
 *
 * **In production the catch is unreachable**: a production build always
 * contains the module it was compiled with. The fallback only covers the
 * stale-dev-client case, and the gate means dev never asks for it.
 */
import { useEffect } from "react";

import { IS_PRODUCTION } from "@/src/config/env";
import { isAndroid } from "@/src/utils/platform";

export function useScreenCaptureBlock(): void {
  useEffect(() => {
    // iOS is excluded at the call site, not inside the native module, so the
    // no-op is visible here rather than buried one layer down.
    if (!IS_PRODUCTION || !isAndroid) return;

    let unmounted = false;
    let release: (() => Promise<void>) | null = null;

    void (async () => {
      try {
        const capture = await import("expo-screen-capture");
        // Unmounted while the dynamic import was in flight — do not turn the
        // flag on, or nothing will ever turn it off.
        if (unmounted) return;
        release = capture.allowScreenCaptureAsync;
        await capture.preventScreenCaptureAsync();
      } catch {
        // Stale dev client. See the note above; unreachable in production.
      }
    })();

    return () => {
      unmounted = true;
      void release?.().catch(() => undefined);
    };
  }, []);
}
