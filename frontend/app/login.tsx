import { Phone } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Logo, Wordmark } from "@/src/components/brand/Logo";
import { toast } from "@/src/components/ui/Toast";
import { colors, radii } from "@/src/theme/colors";

export default function Login() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        {/* Top — brand mark sits high on the screen */}
        <View style={styles.brand}>
          <View style={styles.logoRow}>
            <Logo size={56} />
            <Wordmark fontSize={36} />
          </View>
        </View>

        {/* Middle — tagline + illustration occupy the visual breathing room */}
        <View style={styles.middle}>
          <View style={styles.illustrationWrap}>
            <Image
              source={require("../assets/images/login-illustration.png")}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Find a partner who shares your values.</Text>
          <Text style={styles.subtitle}>Meaningful matchmaking for modern Indians.</Text>
        </View>

        {/* Bottom — anchored auth CTAs */}
        <View style={styles.bottom}>
          <Pressable
            testID="login-continue-google"
            onPress={() => toast.show("Google sign-in coming soon")}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.92 }]}
          >
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.secondaryBtnText}>Continue with Google</Text>
          </Pressable>

          <Pressable
            testID="login-continue-phone"
            onPress={() => router.push("/phone")}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.92 }]}
          >
            <Phone size={20} color={colors.primaryForeground} strokeWidth={2.4} />
            <Text style={styles.primaryBtnText}>Continue with Phone</Text>
          </Pressable>

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

          {/* ────────────────────────────────────────────────────────────── */}
          {/* TEMPORARY: dev skip — jumps straight to Discover, bypassing  */}
          {/* phone/otp/onboarding/verify/matching. REMOVE before launch.  */}
          {/* ────────────────────────────────────────────────────────────── */}
          <Pressable
            testID="login-dev-skip"
            onPress={() => router.replace("/discover")}
            style={({ pressed }) => [styles.devSkipBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.devSkipText}>[DEV] Skip to Discover →</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  // Brand sits at the very top of the safe area.
  brand: {
    alignItems: "center",
    paddingTop: 12,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  // Middle absorbs all the spare vertical space so the CTAs stay anchored.
  middle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  illustrationWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  illustration: { width: 280, height: 210 },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  // Bottom — anchored auth CTAs.
  bottom: {
    gap: 12,
  },
  primaryBtn: {
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 4,
  },
  primaryBtnText: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  googleG: {
    fontSize: 17,
    fontWeight: "800",
    color: "#EA4335",
    fontStyle: "italic",
  },
  legal: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  // Modern mobile pattern: bold colored link text instead of underline
  // (Bumble/Hinge/Airbnb-style). Reads cleaner on small text than RN's
  // tight default underline which sits flush against the baseline.
  // On web we also suppress the default tap-highlight + selection box so
  // tapping the link doesn't paint a gray rectangle around the text.
  legalLink: {
    color: colors.primary,
    fontWeight: "700",
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
  // TEMPORARY dev-only skip — remove with the button above.
  devSkipBtn: {
    marginTop: 14,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderStyle: "dashed",
    backgroundColor: "#FEF3C7",
  },
  devSkipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
    letterSpacing: 0.3,
  },
});
