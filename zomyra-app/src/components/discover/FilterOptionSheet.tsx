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

const PURPLE = "#5B2C6F";
const PURPLE_DEEP = "#3D1A4A";
const LIGHT_PURPLE = "#F5F3FF";
const BORDER = "#ECEAF7";
const TEXT = "#111827";
const MUTED = "#6B7280";

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
                <X size={18} color={TEXT} strokeWidth={2.2} />
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
              colors={[PURPLE, PURPLE_DEEP]}
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
  },
  title: { fontSize: 22, fontWeight: "700", color: TEXT, letterSpacing: -0.3 },
  subtitle: { marginTop: 4, fontSize: 13, color: MUTED },
  clearBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  clearText: { color: PURPLE, fontWeight: "700", fontSize: 13 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: LIGHT_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFF",
  },
  optionActive: { borderColor: PURPLE, backgroundColor: LIGHT_PURPLE },
  optionTitle: { fontSize: 16, fontWeight: "600", color: TEXT, letterSpacing: -0.2 },
  optionTitleActive: { color: PURPLE, fontWeight: "700" },
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
  radioDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: PURPLE },

  cta: {
    marginTop: 12,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: PURPLE,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },
  ctaGradient: { height: 58, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#FFF", fontSize: 18, fontWeight: "700", letterSpacing: -0.2 },
});
