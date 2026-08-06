/**
 * The account-status blocker — FE v1.45 §8.1, closing O-4.
 *
 * Reached two ways, and the second is the reason this is a route rather than a
 * branch inside the gate: `GET /me` reporting a non-active `accountStatus` at
 * cold start, and a `403 account_*` arriving on **any** authenticated call
 * mid-session, because BE v1.6 §9.9 enforces at the request level. See
 * `SessionRouter`, which owns both navigations.
 *
 * ## Everything this screen deliberately does not have
 *
 * The spec is unusually specific about the absences, so they are listed rather
 * than left to be re-added by someone who reads the screen as unfinished:
 *
 * - **No distinction between suspended, banned and deleted.** The backend keeps
 *   the three apart for support diagnostics and sends distinct codes; the
 *   client shows one message. There is no in-app path back regardless of which
 *   it is, so naming the cause would only invite an appeal the app cannot take.
 * - **No retry.** Retrying re-asks a question already answered.
 * - **No appeal link, no support address, no store link.**
 * - **No sign-out and no "use another account".** BE §9.9 does not revoke the
 *   session — the tokens still work — so signing out and back in would land
 *   straight back here.
 * - **No way out at all**, which is FE §8's own flagged trade-off: force-quit
 *   is the only exit. Recorded there as a conscious decision in case a minimal
 *   escape hatch is wanted later. **Do not add one unasked.**
 */
import { ShieldOff } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useNonDismissible } from "@/src/hooks/use-non-dismissible";
import { colors, fontSize, fontWeight, lineHeight, radii, spacing } from "@/src/theme";

export default function BlockedScreen() {
  useNonDismissible();

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View
        style={styles.center}
        testID="blocked-screen"
        accessible
        // One node with the whole message, so a screen reader announces the
        // situation in one pass rather than making the user walk an icon, a
        // heading and a paragraph to assemble it.
        accessibilityRole="alert"
        accessibilityLabel="This account is inactive or has been deleted. It can no longer be used."
      >
        <View style={styles.iconCircle}>
          <ShieldOff size={32} color={colors.text.muted} strokeWidth={1.75} />
        </View>
        <Text style={styles.title}>This account is inactive</Text>
        <Text style={styles.body}>
          This account is inactive or has been deleted, and can no longer be used.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
    gap: spacing[4],
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.surface.subtle,
    alignItems: "center",
    justifyContent: "center",
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
    maxWidth: 320,
  },
});
