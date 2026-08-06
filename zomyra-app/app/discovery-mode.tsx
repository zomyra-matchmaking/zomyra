/**
 * Discovery Mode picker — one-time screen shown after matching completes.
 *
 * Presents the same four options as the Discover header sheet (All /
 * Compatibility / Lifestyle / Marriage Goals) so the user can seed their
 * initial feed lens. The selection is persisted (redux-persist), so on
 * subsequent app launches we bounce straight to `/discover`.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Heart,
  Home,
  Leaf,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CompatibilityDimension } from "@/src/lib/discover/mock";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { setDiscoveryMode } from "@/src/store/slices/discovery-mode-slice";
import { colors, fontSize, fontWeight, radii, spacing } from "@/src/theme";
import { Touchable } from "@/src/components/ui";

type Option = {
  key: CompatibilityDimension;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  recommended?: boolean;
};

const OPTIONS: Option[] = [
  {
    key: "all",
    title: "All",
    subtitle: "Best overall matches using every profile signal.",
    Icon: Users,
    recommended: true,
  },
  {
    key: "compatibility",
    title: "Compatibility",
    subtitle: "Personality, values and long-term compatibility.",
    Icon: Heart,
  },
  {
    key: "lifestyle",
    title: "Lifestyle",
    subtitle: "Daily habits, diet, fitness and routines.",
    Icon: Leaf,
  },
  {
    key: "marriage_goals",
    title: "Marriage Goals",
    subtitle: "Family expectations, children, relocation and future plans.",
    Icon: Home,
  },
];

export default function DiscoveryMode() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.discoveryMode.mode);
  const setMode = (next: CompatibilityDimension) => dispatch(setDiscoveryMode(next));
  const [draft, setDraft] = useState<CompatibilityDimension>("all");

  // Skip this screen if the user already picked once. No hydration guard: the
  // persisted slices rehydrate behind `PersistGate` before this screen mounts.
  useEffect(() => {
    if (mode) {
      router.replace("/discover");
    }
  }, [mode, router]);

  const apply = () => {
    setMode(draft);
    router.replace("/discover");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>ONE LAST THING</Text>
        <Text style={styles.title} testID="discovery-mode-title">
          Show me matches based on…
        </Text>
        <Text style={styles.subtitle}>
          Pick the lens for your first set of matches. You can change this any
          time from Discover.
        </Text>

        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const active = draft === opt.key;
            return (
              <Touchable
                key={opt.key}
                testID={`discovery-mode-${opt.key}`}
                onPress={() => setDraft(opt.key)}
                style={[styles.option, active && styles.optionActive]}
              >
                <View
                  style={[styles.optionIconWrap, active && styles.optionIconWrapActive]}
                >
                  <opt.Icon
                    size={20}
                    color={active ? colors.text.onBrand : colors.brand.default}
                    strokeWidth={2}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionTitle}>{opt.title}</Text>
                    {opt.recommended ? (
                      <Text style={styles.recommendedTag}>Recommended</Text>
                    ) : null}
                  </View>
                  <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
              </Touchable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Touchable
          feedback="scale"
          testID="discovery-mode-continue"
          onPress={apply}
          style={[styles.cta]}
        >
          <LinearGradient
            colors={colors.gradient.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Show me matches</Text>
          </LinearGradient>
        </Touchable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.default },
  scroll: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: spacing[6],
  },
  kicker: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.extrabold,
    letterSpacing: 1.6,
    color: colors.brand.default,
    textTransform: "uppercase",
  },
  title: {
    marginTop: spacing[2],
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: spacing[2.5],
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.muted,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  options: {
    marginTop: spacing[7],
    gap: spacing[3],
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3.5],
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[3.5],
    borderRadius: radii["3xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  optionActive: {
    borderColor: colors.brand.default,
    backgroundColor: colors.surface.brand,
  },
  optionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconWrapActive: {
    backgroundColor: colors.brand.default,
    borderColor: colors.brand.default,
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    flexWrap: "wrap",
  },
  optionTitle: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  recommendedTag: {
    fontSize: fontSize.nano,
    fontWeight: fontWeight.bold,
    color: colors.brand.default,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    borderRadius: radii.xs,
    backgroundColor: colors.surface.brandStrong,
  },
  optionSubtitle: {
    marginTop: spacing[1],
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colors.text.muted,
    letterSpacing: -0.1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.border.neutralStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.brand.default },
  radioDot: { width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.brand.default },

  footer: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  cta: { borderRadius: radii.full, overflow: "hidden" },
  ctaGradient: {
    paddingVertical: spacing[4],
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.text.onBrand,
    letterSpacing: 0.2,
  },
});
