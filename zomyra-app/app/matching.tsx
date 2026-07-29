import { Heart, Sparkles, UsersRound } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, alpha, fontSize, fontWeight, radii, spacing } from "@/src/theme";

const STEPS = [
  { Icon: UsersRound, text: "Scanning profiles aligned with your values" },
  { Icon: Sparkles, text: "Analyzing compatibility & lifestyle" },
  { Icon: Heart, text: "Curating your top matches" },
];

export default function Matching() {
  const router = useRouter();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setActive(1), 1100);
    const t2 = setTimeout(() => setActive(2), 2200);
    const t3 = setTimeout(() => router.replace("/discovery-mode"), 3400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [router]);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.center}>
        <View style={styles.haloOuter}>
          <View style={styles.haloMid} />
          <View style={styles.haloInner} />
          <View style={styles.iconCircle}>
            <Heart size={36} color={colors.text.onBrand} fill={colors.text.onBrand} />
          </View>
        </View>

        <Text style={styles.title}>Finding people who fit your world</Text>
        <Text style={styles.subtitle}>
          Hang tight — we're matching you on values, lifestyle, and intent.
        </Text>

        <View style={{ marginTop: spacing[7], gap: spacing[2], width: "100%", maxWidth: 320 }}>
          {STEPS.map((s, i) => {
            const state = i < active ? "done" : i === active ? "active" : "pending";
            return (
              <View
                key={i}
                style={[styles.row, state === "pending" && { opacity: 0.5 }]}
              >
                <View
                  style={[
                    styles.rowIcon,
                    state === "done" && { backgroundColor: colors.brand.default },
                    state === "active" && { backgroundColor: colors.surface.brand },
                  ]}
                >
                  <s.Icon
                    size={16}
                    color={state === "done" ? colors.text.onBrand : state === "active" ? colors.brand.default : colors.text.muted}
                  />
                </View>
                <Text style={styles.rowText}>{s.text}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", paddingHorizontal: spacing[6] },
  haloOuter: {
    width: 160,
    height: 160,
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  haloMid: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: alpha(colors.brand.default, 0.15),
  },
  haloInner: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: alpha(colors.brand.default, 0.10),
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand.default,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: {
    marginTop: spacing[8],
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    marginTop: spacing[2],
    fontSize: fontSize.body,
    lineHeight: 20,
    color: colors.text.muted,
    textAlign: "center",
    maxWidth: 280,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[3.5],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surface.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { fontSize: fontSize.label, fontWeight: fontWeight.semibold, color: colors.text.primary, flex: 1 },
});
