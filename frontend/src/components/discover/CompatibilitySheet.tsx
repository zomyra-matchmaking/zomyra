/**
 * CompatibilitySheet — premium bottom sheet for Discovery Mode.
 *
 * 4 radio options (All / Compatibility / Lifestyle / Marriage Goals) +
 * privacy card + "Apply & Show Matches" CTA with purple gradient.
 *
 * Built with React Native primitives (Modal + Animated) — no extra deps.
 */
import { LinearGradient } from "expo-linear-gradient";
import {
  Heart,
  Home,
  Leaf,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { CompatibilityDimension } from "@/src/lib/discover/mock";

const PURPLE = "#5B2C6F";
const PURPLE_DEEP = "#3D1A4A";
const LIGHT_PURPLE = "#F5F3FF";
const BORDER = "#ECEAF7";
const TEXT = "#111827";
const MUTED = "#6B7280";

const SCREEN_H = Dimensions.get("window").height;

type Option = {
  key: CompatibilityDimension;
  title: string;
  subtitle: string;
  recommended?: boolean;
  Icon: LucideIcon;
};

const OPTIONS: Option[] = [
  {
    key: "all",
    title: "All",
    subtitle: "Best overall matches using all profile signals.",
    recommended: true,
    Icon: Users,
  },
  {
    key: "personality",
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
    key: "priorities",
    title: "Marriage Goals",
    subtitle: "Family expectations, children, relocation and future plans.",
    Icon: Home,
  },
];

type Props = {
  visible: boolean;
  selected: CompatibilityDimension;
  onClose: () => void;
  onApply: (next: CompatibilityDimension) => void;
};

export function CompatibilitySheet({ visible, selected, onClose, onApply }: Props) {
  const [draft, setDraft] = useState<CompatibilityDimension>(selected);
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setDraft(selected);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_H,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, selected, translateY, backdrop]);

  const apply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
              paddingTop: Math.max(insets.top + 20, 32),
              maxHeight: SCREEN_H * 0.85, // Don't let sheet go above 85% of screen
              marginTop: Math.max(insets.top + 20, 60), // Force sheet to start lower
            },
          ]}
          testID="compat-sheet"
        >
          <View style={styles.grabber} />
          
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: Math.max(insets.bottom, 20) }}
          >
            <View style={styles.headerRow}>
              <Text style={styles.title}>Discovery Mode</Text>
              <Pressable
                testID="compat-sheet-close"
                onPress={onClose}
                hitSlop={10}
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
              >
                <X size={18} color={TEXT} strokeWidth={2.2} />
              </Pressable>
            </View>
            <Text style={styles.subtitle}>
              Choose how Zomyra should rank the people you see today.
            </Text>

            <View style={{ marginTop: 16, gap: 10 }}>
              {OPTIONS.map((opt) => {
                const active = draft === opt.key;
                const I = opt.Icon;
                return (
                  <Pressable
                    key={opt.key}
                    testID={`compat-option-${opt.key}`}
                    onPress={() => setDraft(opt.key)}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <View style={[styles.optionIcon, active && styles.optionIconActive]}>
                      <I
                        size={20}
                        color={active ? "#FFF" : PURPLE}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.optionTitleRow}>
                        <Text style={styles.optionTitle}>{opt.title}</Text>
                        {opt.recommended ? (
                          <View style={styles.recommendBadge}>
                            <Text style={styles.recommendText}>Recommended</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.optionSub}>{opt.subtitle}</Text>
                    </View>
                    <View
                      style={[styles.radio, active && styles.radioActive]}
                    >
                      {active ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Privacy card ── */}
            <View style={styles.privacyCard}>
              <View style={styles.privacyIcon}>
                <ShieldCheck size={18} color={PURPLE} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyTitle}>Your choice is always private</Text>
                <Text style={styles.privacySub}>
                  Only you can see how you discover matches.
                </Text>
              </View>
            </View>

            {/* ── CTA ── */}
            <Pressable
              testID="compat-apply"
              onPress={apply}
              style={({ pressed }) => [
                styles.cta,
                pressed && { transform: [{ scale: 0.985 }] },
              ]}
            >
              <LinearGradient
                colors={[PURPLE, PURPLE_DEEP]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>Apply & Show Matches</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,24,39,0.45)",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: MUTED,
    fontWeight: "400",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: LIGHT_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  // option row
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFF",
  },
  optionActive: {
    borderColor: PURPLE,
    backgroundColor: LIGHT_PURPLE,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: LIGHT_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconActive: { backgroundColor: PURPLE },
  optionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.2,
  },
  recommendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: PURPLE,
  },
  recommendText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  optionSub: { marginTop: 2, fontSize: 12.5, color: MUTED, lineHeight: 18 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: PURPLE },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: PURPLE,
  },

  // privacy
  privacyCard: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: LIGHT_PURPLE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  privacyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  privacyTitle: { fontSize: 14, fontWeight: "700", color: TEXT },
  privacySub: { marginTop: 2, fontSize: 12, color: MUTED },

  // CTA
  cta: {
    marginTop: 20,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: PURPLE,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },
  ctaGradient: {
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#FFF", fontSize: 18, fontWeight: "700", letterSpacing: -0.2 },
});
