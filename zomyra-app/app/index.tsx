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
    shouldShowUpdatePrompt(gate.latestVersion, {
      version: lastPrompt.lastPromptedVersion,
      at: lastPrompt.lastPromptedAt,
    });

  if (showPrompt && gate.latestVersion) {
    const acknowledge = () => {
      // Recorded on answer, not on render, so a launch killed mid-prompt does
      // not burn the week.
      dispatch(updatePromptAcknowledged({ version: gate.latestVersion as string }));
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
          <View style={styles.dialogActions}>
            {gate.storeUrl ? (
              <Button
                label="Update"
                onPress={() => {
                  Linking.openURL(gate.storeUrl as string);
                  acknowledge();
                }}
                fullWidth
              />
            ) : null}
            <Button label="Not now" variant="ghost" onPress={acknowledge} fullWidth />
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
