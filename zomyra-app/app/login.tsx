import { Phone } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { toast } from "@/src/components/ui/Toast";
import { colors, fontSize, fontWeight, spacing } from "@/src/theme";
import { Button } from "@/src/components/ui";

function GoogleG() {
  return <Text style={styles.googleG}>G</Text>;
}

export default function Login() {
  const router = useRouter();
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
          <Button
            testID="login-continue-google"
            label="Continue with Google"
            variant="ghost"
            icon={GoogleG}
            onPress={() => toast.show("Google sign-in coming soon")}
            fullWidth
            style={styles.authBtn}
          />

          <Button
            testID="login-continue-phone"
            label="Continue with Phone"
            icon={Phone}
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
            (Module 3). Two reasons, and the second is why it could not simply
            be left for Module 4:

            1. FR-2 excludes it from production, so it was always going to be
               deleted — and a "REMOVE before launch" comment is a poor
               substitute for removing it.
            2. **It no longer worked, and worse, it worked misleadingly.** It
               called `router.replace("/discover")`, and the tabs are now
               guarded (`app/(tabs)/_layout.tsx`): an account that has not
               finished onboarding or verification is bounced straight back out.
               A dev button that appears to jump you into the app and silently
               returns you is more confusing than no button.

            To reach a tab during development, make `GET /me` in
            `src/api/mock/handlers.ts` return a complete, verified, active
            account — that exercises the real gate instead of going around it.
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
