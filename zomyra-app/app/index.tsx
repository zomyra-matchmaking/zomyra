/**
 * **The root gate.** Every cold start that opens at `/` passes through here.
 *
 * It replaces the prototype's splash, which waited 1.8s and hard-redirected to
 * `/login` regardless of session — so a signed-in user was sent to sign in
 * again, and an unsupported client was never told.
 *
 * ## The sequence, and why it is a sequence
 *
 *   1. **Version check** (FR-30 / §6.14) — API-5, *before any other request*.
 *   2. **`GET /me`** (API-6) — only once step 1 is not blocking.
 *   3. **`accountStatus` first, then the routing table** (§8.1, §9.1).
 *
 * All three now live in {@link useLaunchGate}, because this route is **not the
 * only way in**: a deep link opens its own route directly, so
 * `app/(tabs)/_layout.tsx` runs the same gate. What stays here is the part that
 * is genuinely the front door's — FR-30's dismissible prompt, which is a
 * cold-start notification and would be absurd on a push-opened conversation.
 */
import { useIsFocused } from "@react-navigation/native";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { Button, Dialog } from "@/src/components/ui";
import {
  LaunchError,
  LaunchPending,
  UpdateRequired,
} from "@/src/components/nav/LaunchScreens";
import { useLaunchGate } from "@/src/components/nav/use-launch-gate";
import { shouldShowUpdatePrompt } from "@/src/lib/app-update";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { updatePromptAcknowledged } from "@/src/store/slices/app-update-slice";
import { spacing } from "@/src/theme";

export default function RootGate() {
  const gate = useLaunchGate();
  const dispatch = useAppDispatch();
  const lastPrompt = useAppSelector((s) => s.appUpdate);
  const [dismissedThisLaunch, setDismissedThisLaunch] = useState(false);
  const isFocused = useIsFocused();

  /*
   * ⚠️ **O-18(a) — the deep-link race, and this line is the whole fix.**
   *
   * This route resolves asynchronously (version check, then `GET /me`) and
   * stays *mounted* underneath whatever a deep link opened on top of it. So
   * when the gate finally answered, its `Redirect` fired regardless — the
   * conversation a push notification opened appeared, then was replaced by
   * Discover a second later. That is Module 11's core path.
   *
   * A route that is not focused has been superseded and has no business
   * navigating. `useIsFocused` seeds its first value from
   * `navigation.isFocused()`, so there is no frame where a normal launch
   * renders blank while focus resolves.
   *
   * Module 3 wrote this guard and **reverted it for lack of evidence** — in a
   * dev build expo-dev-client owns `zomyra://`, so a cold-start deep link opens
   * the launcher instead of the app and neither the bug nor the fix could be
   * seen. Module 4 built a scheme-owning `preview` and settled it; MIGRATION §4
   * (O-18) records what was actually observed.
   *
   * The *security* half never depended on this: `app/(tabs)/_layout.tsx` runs
   * the same gate against the deep-linked route, so an unverified or blocked
   * account is stopped whichever navigation wins.
   */
  if (!isFocused) return null;

  if (gate.status === "update-required") return <UpdateRequired storeUrl={gate.storeUrl} />;
  if (gate.status === "pending") return <LaunchPending />;
  if (gate.status === "error") return <LaunchError onRetry={gate.retry} />;
  if (gate.status === "unauthenticated") return <Redirect href="/login" />;

  /*
   * FR-30 outcome 2 — dismissible, then the app continues loading normally.
   *
   * Suppressed to **once per version, then quiet for a week** (owner decision;
   * see `shouldShowUpdatePrompt`). FR-30 sets no frequency, and read literally
   * it means a modal on every cold start until the user updates — which trains
   * people to dismiss it unread and makes the one that matters invisible.
   *
   * `/me` is already in flight behind it: the version gate has passed, so
   * FR-30's ordering is satisfied and there is no reason to make the user wait
   * on the network after tapping "Not now".
   */
  const showPrompt =
    gate.updateAvailable &&
    !dismissedThisLaunch &&
    gate.latestVersion !== null &&
    shouldShowUpdatePrompt(gate.latestVersion, gate.storeUrl, {
      version: lastPrompt.lastPromptedVersion,
      at: lastPrompt.lastPromptedAt,
    });

  // `storeUrl` is non-empty whenever `showPrompt` is true — that is the first
  // thing `shouldShowUpdatePrompt` checks — so the dialog always has a real
  // action to offer.
  if (showPrompt && gate.latestVersion && gate.storeUrl) {
    const storeUrl = gate.storeUrl;
    const latestVersion = gate.latestVersion;
    const acknowledge = () => {
      // Recorded on answer, not on render, so a launch killed mid-prompt does
      // not burn the week.
      dispatch(updatePromptAcknowledged({ version: latestVersion }));
      setDismissedThisLaunch(true);
    };

    return (
      <>
        <LaunchPending />
        <Dialog
          open
          onClose={acknowledge}
          title="Update available"
          description="A newer version of Zomyra is available with the latest improvements."
        >
          <View style={styles.dialogActions} testID="launch-update-prompt">
            <Button
              testID="launch-update-now"
              label="Update"
              onPress={() => {
                Linking.openURL(storeUrl);
                acknowledge();
              }}
              fullWidth
            />
            <Button
              testID="launch-update-later"
              label="Not now"
              variant="ghost"
              onPress={acknowledge}
              fullWidth
            />
          </View>
        </Dialog>
      </>
    );
  }

  return <Redirect href={gate.destination} />;
}

const styles = StyleSheet.create({
  dialogActions: { marginTop: spacing[5], gap: spacing[2] },
});
