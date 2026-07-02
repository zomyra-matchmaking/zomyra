/**
 * Splash → Login. Auto-redirects after 1.8s, identical to the web flow.
 */
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Logo, Wordmark } from "@/src/components/brand/Logo";
import { colors } from "@/src/theme/colors";

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
        <View style={{ marginTop: 18 }}>
          <Wordmark fontSize={44} />
        </View>
        <Text style={styles.tagline}>Beyond Bios. Built on Values.</Text>
      </View>
      <Text style={styles.footer}>MADE FOR MODERN INDIA</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  tagline: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
  footer: {
    marginBottom: 32,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: colors.foregroundSubtle,
  },
});
