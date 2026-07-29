/**
 * FilterOptionSheet — premium bottom sheet for Age / Religion / Diet / Location.
 *
 * Single-select option list with radio buttons. Same look as CompatibilitySheet
 * (32-radius, grabber, gradient "Apply" CTA) so the design language is consistent.
 */
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, alpha, fontSize, fontWeight, radii } from "@/src/theme";

const SCREEN_H = Dimensions.get("window").height;

type Props = {
  visible: boolean;
  title: string;
  options: string[];
  selected: string | null;
  onClose: () => void;
  onApply: (value: string | null) => void;
};

export function FilterOptionSheet({
  visible,
  title,
  options,
  selected,
  onClose,
  onApply,
}: Props) {
  const [draft, setDraft] = useState<string | null>(selected);
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

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

  const clear = () => {
    setDraft(null);
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
          style={[styles.sheet, { transform: [{ translateY }] }]}
          testID={`filter-sheet-${title.toLowerCase()}`}
        >
          <View style={styles.grabber} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {draft !== null ? (
                <Pressable
                  onPress={clear}
                  testID="filter-sheet-clear"
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.clearBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              ) : null}
              <Pressable
                testID="filter-sheet-close"
                onPress={onClose}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <X size={18} color={colors.text.primary} strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.subtitle}>Pick one option below.</Text>

          <ScrollView style={{ maxHeight: SCREEN_H * 0.5 }} contentContainerStyle={{ gap: 10, paddingVertical: 12 }}>
            {options.map((opt) => {
              const active = draft === opt;
              return (
                <Pressable
                  key={opt}
                  testID={`filter-option-${opt}`}
                  onPress={() => setDraft(opt)}
                  style={[styles.option, active && styles.optionActive]}
                >
                  <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                    {opt}
                  </Text>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            testID="filter-sheet-apply"
            onPress={apply}
            style={({ pressed }) => [
              styles.cta,
              pressed && { transform: [{ scale: 0.985 }] },
            ]}
          >
            <LinearGradient
              colors={colors.gradient.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Apply</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: alpha(colors.text.primary, 0.45),
  },
  sheet: {
    backgroundColor: colors.surface.default,
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
    borderRadius: radii.full,
    backgroundColor: colors.surface.muted,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: fontSize.h2, fontWeight: fontWeight.bold, color: colors.text.primary, letterSpacing: -0.3 },
  subtitle: { marginTop: 4, fontSize: fontSize.label, color: colors.text.muted },
  clearBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  clearText: { color: colors.brand.default, fontWeight: fontWeight.bold, fontSize: fontSize.label },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
    alignItems: "center",
    justifyContent: "center",
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  optionActive: { borderColor: colors.brand.default, backgroundColor: colors.surface.brand },
  optionTitle: { fontSize: fontSize.title, fontWeight: fontWeight.semibold, color: colors.text.primary, letterSpacing: -0.2 },
  optionTitleActive: { color: colors.brand.default, fontWeight: fontWeight.bold },
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

  cta: {
    marginTop: 12,
    borderRadius: radii["2xl"],
    overflow: "hidden",
    shadowColor: colors.brand.default,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },
  ctaGradient: { height: 58, alignItems: "center", justifyContent: "center" },
  ctaText: { color: colors.text.onBrand, fontSize: fontSize.heading, fontWeight: fontWeight.bold, letterSpacing: -0.2 },
});
