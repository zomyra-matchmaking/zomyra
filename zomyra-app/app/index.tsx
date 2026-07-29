/**
 * Splash → Login. Auto-redirects after 1.8s, identical to the web flow.
 */
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Logo, Wordmark } from "@/src/components/brand/Logo";
import { colors, fontSize, fontWeight, spacing } from "@/src/theme";

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/login"), 1800);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.center}>
        <Logo size={96} />
        <View style={{ marginTop: spacing[4.5] }}>
          <Wordmark size={fontSize.displayXl} />
        </View>
        <Text style={styles.tagline}>Beyond Bios. Built on Values.</Text>
      </View>
      <Text style={styles.footer}>MADE FOR MODERN INDIA</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing[8] },
  tagline: {
    marginTop: spacing[3],
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colors.text.muted,
  },
  footer: {
    marginBottom: spacing[8],
    fontSize: fontSize.micro,
    fontWeight: fontWeight.semibold,
    letterSpacing: 2,
    color: colors.text.muted,
  },
});
