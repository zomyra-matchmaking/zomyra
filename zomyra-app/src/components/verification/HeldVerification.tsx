/**
 * §9.1's **"Held 'Verification in progress' screen"** — the row the routing
 * table sends `verificationStatus: "pending"` to.
 *
 * It exists because the screen it replaced did not hold. `app/verify.tsx`'s
 * step 5 is the *local* "submitted" confirmation, and its Continue button
 * routed on to `/matching` → the Discovery Mode picker → Discover. A user whose
 * check was genuinely still running server-side could therefore walk into the
 * feed, which FR-11 forbids — verification is mandatory *before* matching. The
 * root gate corrected them on the next cold start, but not within the session,
 * and "blocked until the next launch" is not blocked.
 *
 * ## What it deliberately does and does not offer
 *
 * - **No forward action.** There is nowhere legitimate to go.
 * - **"Check again" re-reads `GET /me`; it does not re-submit.** FR-11's "must
 *   not offer manual retry" is about not firing a second verification attempt —
 *   `200 { status: "pending" }` means work is genuinely in flight and a
 *   resubmission would duplicate it. Re-reading `/me` is the self-correcting
 *   path §9.1 already depends on, and it is what turns a dead end into a wait.
 * - **It does not sign the user out.** They are verified-pending, not
 *   unauthenticated.
 *
 * ⚠️ **Module 6 owns the real copy.** This is the routing consequence handled
 * where it was leaking; the wording, the "usually within a few hours" promise
 * and any polling belong with the verification flow itself (FR-11/FR-12).
 */
import { Clock } from "lucide-react-native";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGetMeQuery } from "@/src/api";
import { Button, Loading } from "@/src/components/ui";
import { resolveRootDestination } from "@/src/lib/root-route";
import { colors, fontSize, fontWeight, lineHeight, radii, spacing } from "@/src/theme";

export function HeldVerification() {
  const router = useRouter();
  // Same cache entry the gate reads, so "Check again" is a refetch rather than
  // a second subscription.
  const { isFetching, refetch } = useGetMeQuery();

  const checkAgain = async () => {
    const next = await refetch().unwrap().catch(() => null);
    // Only move if the answer actually changed — re-navigating to the screen we
    // are already on would remount it and look like a failure.
    if (!next) return;
    const destination = resolveRootDestination(next);
    if (destination !== "/verify?entry=pending") router.replace(destination);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <Clock size={32} color={colors.brand.default} strokeWidth={1.75} />
        </View>
        <Text style={styles.title}>Verification in progress</Text>
        <Text style={styles.body}>
          We&apos;re still reviewing your verification selfie. You&apos;ll be able to start
          matching as soon as it&apos;s done — we&apos;ll let you know.
        </Text>

        {isFetching ? (
          <Loading label="Checking" />
        ) : (
          <Button
            label="Check again"
            variant="secondary"
            onPress={checkAgain}
            fullWidth
            style={styles.cta}
          />
        )}
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
    backgroundColor: colors.surface.brand,
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
  cta: { marginTop: spacing[2] },
});
