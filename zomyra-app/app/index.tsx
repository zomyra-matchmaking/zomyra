/**
 * **The root gate.** Every cold start passes through here.
 *
 * It replaces the prototype's splash, which waited 1.8s and hard-redirected to
 * `/login` regardless of session — so a signed-in user was sent to sign in
 * again, and an unsupported client was never told.
 *
 * ## The sequence, and why it is a sequence
 *
 *   1. **Version check** (FR-30 / §6.14) — API-5, *before any other request*.
 *      An unsupported client may not be able to talk to the API safely at all,
 *      which is why this resolves first rather than racing `GET /me`.
 *   2. **`GET /me`** (API-6) — only once step 1 is not blocking, and only when
 *      the keychain actually held a token. No token means `/login`; there is
 *      nothing to ask about.
 *   3. **`accountStatus` first, then the routing table** (§8.1, §9.1) — both in
 *      `resolveRootDestination`, which is where that ordering is documented.
 *
 * The three steps are separated by `skip` flags rather than `await`s so RTK
 * Query still owns caching and dedupe. `versionGate !== "pending"` is the whole
 * of rule 1: the `/me` query cannot be issued until the version check has
 * resolved, one way or the other.
 *
 * ## Three version outcomes, not two (§6.14)
 *
 * | Outcome | Behaviour |
 * |---|---|
 * | below `minSupportedVersion`, or `forceUpdate` | full-screen, **non-dismissible**, store link — the app goes no further |
 * | below `latestVersion`, at or above minimum | **dismissible** prompt, then proceed normally |
 * | at or above `latestVersion` | proceed silently |
 * | **network/timeout failure** | **fails open** — skip the check for this launch. Never a reason to hold the user |
 *
 * Cold-start only, for MVP: an already-open session is not re-validated
 * mid-use even if the backend's minimum moves. §6.14 accepts that gap
 * explicitly rather than solving it with per-request enforcement.
 */
import { Redirect, Stack } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCheckAppVersionQuery, useGetMeQuery } from "@/src/api";
import { Logo } from "@/src/components/brand/Logo";
import { Button, Dialog, Loading } from "@/src/components/ui";
import { APP_VERSION } from "@/src/config/app-headers";
import { useNonDismissible } from "@/src/hooks/use-non-dismissible";
import {
  resolveUpdateRequirement,
  UPDATE_REQUIREMENT_ON_ERROR,
  type UpdateRequirement,
} from "@/src/lib/app-update";
import { resolveRootDestination } from "@/src/lib/root-route";
import { useAppSelector } from "@/src/store/hooks";
import { colors, fontSize, fontWeight, lineHeight, spacing } from "@/src/theme";
import { isIOS } from "@/src/utils/platform";

/** API-5 takes the store this build came from, not the OS it happens to run on. */
const PLATFORM = isIOS ? "ios" : "android";

export default function RootGate() {
  const sessionStatus = useAppSelector((s) => s.session.status);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  // ---- 1 · Version check (FR-30) -----------------------------------------
  const version = useCheckAppVersionQuery({ platform: PLATFORM });

  const versionGate: UpdateRequirement | "pending" = version.isSuccess
    ? resolveUpdateRequirement(APP_VERSION, version.data)
    : version.isError
      ? // Fails open by contract (API-5, §9.1). A flaky network must never
        // produce an inescapable "Update required" for an update that does not
        // exist.
        UPDATE_REQUIREMENT_ON_ERROR
      : "pending";

  // ---- 2 · GET /me (API-6) ------------------------------------------------
  // `skip` is what enforces FR-30's ordering: this request is not issued until
  // the version check has resolved and is not blocking. `bootstrapSession` has
  // meanwhile turned the keychain into `status`, so an anonymous launch never
  // fires an authenticated call it knows will 401.
  const me = useGetMeQuery(undefined, {
    skip:
      versionGate === "pending" ||
      versionGate === "blocked" ||
      sessionStatus !== "authenticated",
  });

  if (versionGate === "blocked") {
    return <UpdateRequired storeUrl={version.data?.updateUrl} />;
  }

  if (versionGate === "pending" || sessionStatus === "unknown") {
    return <Gate label="Getting things ready" />;
  }

  // The dismissible prompt. `/me` is already in flight behind it — the version
  // gate has passed, so FR-30's ordering is satisfied and there is no reason to
  // make the user wait for the network after they tap "Not now".
  if (versionGate === "optional" && !updateDismissed) {
    return (
      <>
        <Gate label="Getting things ready" />
        <UpdateAvailable
          storeUrl={version.data?.updateUrl}
          onDismiss={() => setUpdateDismissed(true)}
        />
      </>
    );
  }

  // ---- 3 · Route ----------------------------------------------------------
  if (sessionStatus !== "authenticated") return <Redirect href="/login" />;

  if (me.isError) {
    /*
     * `getMe` already retries twice, and a 401 has been through silent refresh
     * and a forced logout by the time it surfaces here — so reaching this line
     * means the call genuinely cannot be answered. Login is the only honest
     * destination: the alternative is stranding the user on a splash with no
     * route, which is the failure §9.1's retry budget exists to avoid.
     */
    return <Redirect href="/login" />;
  }

  if (!me.data) return <Gate label="Getting things ready" />;

  return <Redirect href={resolveRootDestination(me.data)} />;
}

/**
 * The waiting state. Branded rather than a bare spinner because it replaces the
 * splash and is the first thing the app paints — but it is the **shared default
 * loading state** (§13.1 #1) underneath, not a fifth bespoke treatment.
 */
function Gate({ label }: { label: string }) {
  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.center}>
        <Logo size={72} />
        <Loading label={label} />
      </View>
    </SafeAreaView>
  );
}

/** FR-30 outcome 1. Full-screen, non-dismissible, the app goes no further. */
function UpdateRequired({ storeUrl }: { storeUrl?: string }) {
  useNonDismissible();

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      {/* No back gesture and no header — there is nothing to go back to. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.center} accessible accessibilityRole="alert">
        <Logo size={72} />
        <Text style={styles.title}>Update required</Text>
        <Text style={styles.body}>
          This version of Zomyra is no longer supported. Update to the latest version to
          continue.
        </Text>
        {/* The store link is the only control on the screen, and it is hidden
            rather than dead if the backend sent no URL — a button that does
            nothing on a screen with no way out is worse than no button. */}
        {storeUrl ? (
          <Button
            label="Update Zomyra"
            onPress={() => Linking.openURL(storeUrl)}
            fullWidth
            style={styles.cta}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

/** FR-30 outcome 2 — dismissible, then the app continues loading normally. */
function UpdateAvailable({
  storeUrl,
  onDismiss,
}: {
  storeUrl?: string;
  onDismiss: () => void;
}) {
  return (
    <Dialog
      open
      onClose={onDismiss}
      title="Update available"
      description="A newer version of Zomyra is available with the latest improvements."
    >
      <View style={styles.dialogActions}>
        {storeUrl ? (
          <Button
            label="Update"
            onPress={() => {
              Linking.openURL(storeUrl);
              onDismiss();
            }}
            fullWidth
          />
        ) : null}
        <Button label="Not now" variant="ghost" onPress={onDismiss} fullWidth />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
    gap: spacing[6],
  },
  title: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  body: {
    fontSize: fontSize.bodyLarge,
    lineHeight: fontSize.bodyLarge * lineHeight.relaxed,
    color: colors.text.muted,
    textAlign: "center",
  },
  cta: { marginTop: spacing[2] },
  dialogActions: { marginTop: spacing[5], gap: spacing[2] },
});
