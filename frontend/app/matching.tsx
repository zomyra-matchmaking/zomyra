import { Heart, Sparkles, UsersRound } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/src/theme/colors";

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
    const t3 = setTimeout(() => router.replace("/discover"), 3400);
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
            <Heart size={36} color="#fff" fill="#fff" />
          </View>
        </View>

        <Text style={styles.title}>Finding people who fit your world</Text>
        <Text style={styles.subtitle}>
          Hang tight — we're matching you on values, lifestyle, and intent.
        </Text>

        <View style={{ marginTop: 28, gap: 8, width: "100%", maxWidth: 320 }}>
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
                    state === "done" && { backgroundColor: colors.primary },
                    state === "active" && { backgroundColor: colors.secondary },
                  ]}
                >
                  <s.Icon
                    size={16}
                    color={state === "done" ? "#fff" : state === "active" ? colors.primary : colors.mutedForeground}
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
  center: { alignItems: "center", paddingHorizontal: 24 },
  haloOuter: {
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  haloMid: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(91,44,111,0.15)",
  },
  haloInner: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(91,44,111,0.10)",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: {
    marginTop: 32,
    fontSize: 22,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
    textAlign: "center",
    maxWidth: 280,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { fontSize: 13.5, fontWeight: "600", color: colors.foreground, flex: 1 },
});
