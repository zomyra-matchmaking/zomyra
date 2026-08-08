/**
 * **Welcome** — FE TDD §3.1's first screen, and FR-1's two entry paths.
 *
 * It carries two things beyond the buttons:
 *
 * - **API-3 (§6.12).** The Google SDK produces an `idToken`; `googleSignIn`
 *   exchanges it for the token pair. §6.12's one unique branch is a cancelled
 *   consent sheet, which returns here **silently** — no request was ever sent,
 *   so there is nothing to retry and nothing to report.
 * - **NFR-15 / §6.13's forced logout.** Module 2 added `session.expired` to
 *   distinguish "your session ended" from "you have not signed in yet", Module
 *   3 wired `SessionRouter` to send expired users here, and nothing read the
 *   flag. This screen is where it becomes something the user is actually told.
 */
import { AlertCircle, Phone } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { errorMessage, sessionAdopted, useGoogleSignInMutation } from "@/src/api";
import { signInWithGoogle } from "@/src/auth/google";
import { toast } from "@/src/components/ui/Toast";
import { colors, fontSize, fontWeight, radii, spacing } from "@/src/theme";
import { Button } from "@/src/components/ui";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { expiryAcknowledged } from "@/src/store/slices/session-slice";

function GoogleG() {
  return <Text style={styles.googleG}>G</Text>;
}

export default function Login() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [googleSignIn, { isLoading: signingIn }] = useGoogleSignInMutation();
  const [openingSheet, setOpeningSheet] = useState(false);

  /*
   * NFR-15's message, shown once.
   *
   * Copied into local state and *then* acknowledged, rather than rendered
   * straight from the store: acknowledging clears `expired`, so a banner bound
   * to the store would announce the logout and vanish in the same frame. Local
   * state keeps it on screen for this visit while the store flag is already
   * spent, which is what makes "once" true across a remount.
   */
  const sessionExpired = useAppSelector((s) => s.session.expired);
  const [showExpiredNotice, setShowExpiredNotice] = useState(false);
  useEffect(() => {
    if (!sessionExpired) return;
    setShowExpiredNotice(true);
    dispatch(expiryAcknowledged());
  }, [sessionExpired, dispatch]);

  const busy = signingIn || openingSheet;

  const continueWithGoogle = async () => {
    if (busy) return;
    setOpeningSheet(true);
    const result = await signInWithGoogle().finally(() => setOpeningSheet(false));

    // §6.12: cancelled is not an error state. Stay on Welcome, say nothing.
    if (result.status === "cancelled") return;
    if (result.status === "unavailable") {
      toast.show(result.message);
      return;
    }

    const exchange = await googleSignIn({ idToken: result.idToken });
    if (exchange.error) {
      toast.show(errorMessage(exchange.error));
      return;
    }
    /*
     * ⚠️ **M55-007, the Google half.** Both auth paths share `adoptSession`, so
     * both shared the race: the exchange resolving is not the same event as the
     * tokens reaching the keychain, and the gate routes on the second one.
     */
    if (!(await sessionAdopted())) {
      toast.show("We couldn't complete sign-in. Please try again.");
      return;
    }

    /*
     * To the gate, not to a destination. API-3 returns `isNewAccount` and
     * `profileComplete`, which is not enough to satisfy §9.1 — it also needs
     * `verificationStatus` and `discoveryMode`. `resolveRootDestination` reads
     * all of them off `GET /me` and owns FR-2a's consent row as well, so
     * branching here would be a second, thinner copy of that table.
     */
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        {/* Middle — the brand lockup is the hero; no separate header mark. */}
        <View style={styles.middle}>
          <Image
            source={require("../assets/images/zomyra-lockup.png")}
            style={styles.lockup}
            resizeMode="contain"
            accessible
            accessibilityRole="image"
            accessibilityLabel="Zomyra"
          />
          <Text style={styles.title}>Find a partner who shares your values.</Text>
          <Text style={styles.subtitle}>Meaningful matchmaking for modern Indians.</Text>
        </View>

        {/* Bottom — anchored auth CTAs */}
        <View style={styles.bottom}>
          {showExpiredNotice ? (
            <View
              testID="login-session-expired"
              style={styles.notice}
              accessible
              accessibilityRole="alert"
            >
              <AlertCircle size={16} color={colors.text.muted} />
              <Text style={styles.noticeText}>
                You were signed out because your session expired. Please sign in again.
              </Text>
            </View>
          ) : null}

          <Button
            testID="login-continue-google"
            label="Continue with Google"
            variant="ghost"
            icon={GoogleG}
            loading={busy}
            onPress={continueWithGoogle}
            fullWidth
            style={styles.authBtn}
          />

          <Button
            testID="login-continue-phone"
            label="Continue with Phone"
            icon={Phone}
            disabled={busy}
            onPress={() => router.push("/phone")}
            fullWidth
            style={styles.authBtn}
          />

          <Text style={styles.legal}>
            By continuing, you agree to our{" "}
            <Text
              testID="login-terms-link"
              style={styles.legalLink}
              onPress={() => router.push("/terms")}
            >
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text
              testID="login-privacy-link"
              style={styles.legalLink}
              onPress={() => router.push("/privacy")}
            >
              Privacy Policy
            </Text>
            .
          </Text>

          {/*
            The `[DEV] Skip to Discover` chip that used to sit here is gone
            (Module 3), and Module 4 deliberately did not put one back.

            FR-2 excludes it from production, so it was always going to be
            deleted — but the stronger reason is that any shortcut from this
            screen either goes *around* the gate, in which case the tabs guard
            bounces it straight back out, or goes *through* the gate, in which
            case it is just signing in.

            So sign in. In mock mode `9000000000` is a fully onboarded, verified
            account and lands on Discover; any unseeded number is a new signup
            and lands on consent → onboarding. `9000000001`–`9000000008` seed one
            account per remaining row of the §9.1 routing table — onboarding, the
            three verification entries, the Discovery Mode picker, and the three
            blocked statuses. See `src/api/mock/accounts.ts` for which is which,
            and for the reserved OTP codes that reach `otp_expired` and
            `too_many_attempts`.
          */}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  // Middle absorbs all the spare vertical space so the CTAs stay anchored.
  middle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // Lockup aspect is 795x1024 (mark over wordmark) — height/width kept in that
  // ratio so `contain` leaves no dead space around it.
  lockup: { width: 202, height: 260, marginBottom: spacing[7] },
  title: {
    fontSize: fontSize.h1,
    lineHeight: 32,
    fontWeight: fontWeight.extrabold,
    color: colors.text.primary,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    marginTop: spacing[2],
    fontSize: fontSize.body,
    color: colors.text.muted,
    textAlign: "center",
  },
  // Bottom — anchored auth CTAs.
  bottom: {
    gap: spacing[3],
  },
  // NFR-15's forced-logout message. A banner rather than a toast because a
  // toast can be missed, and this explains why the user is looking at a
  // sign-in screen they did not ask for.
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.neutral,
    backgroundColor: colors.surface.subtle,
  },
  noticeText: {
    flex: 1,
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: colors.text.muted,
  },
  // Both auth CTAs are Buttons; this only makes them taller than the default
  // `lg` and gives the primary its brand lift, since they are the hero of the
  // screen rather than an inline action.
  authBtn: {
    height: 56,
  },
  googleG: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.extrabold,
    color: colors.external.google,
    fontStyle: "italic",
  },
  legal: {
    marginTop: spacing[3.5],
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: colors.text.muted,
    textAlign: "center",
  },
  // Modern mobile pattern: bold colored link text instead of underline
  // (Bumble/Hinge/Airbnb-style). Reads cleaner on small text than RN's
  // tight default underline which sits flush against the baseline.
  // On web we also suppress the default tap-highlight + selection box so
  // tapping the link doesn't paint a gray rectangle around the text.
  legalLink: {
    color: colors.brand.default,
    fontWeight: fontWeight.bold,
    ...Platform.select({
      web: {
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTapHighlightColor: "transparent",
      },
      default: {},
    }),
  } as const,
});
