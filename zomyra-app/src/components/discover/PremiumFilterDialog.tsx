/**
 * PremiumFilterDialog — centered modal (not a bottom sheet) used by the
 * Height / Build / Income / Education quick filters on Discover.
 *
 * Layout: dimmed backdrop · centered card with X close · animated fade+zoom
 * entry · Cancel / Apply footer.
 *
 * All four filters are Premium, so tapping Apply routes to /premium via the
 * `onApply` callback supplied by the parent — the filter value itself is
 * never persisted.
 */
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import { useEffect, useRef, type ReactNode } from "react";
import {
  Animated,
  Modal,
  Pressable,
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

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  onApply: () => void;
  applyLabel?: string;
};

export function PremiumFilterDialog({
  visible,
  title,
  subtitle,
  children,
  onClose,
  onApply,
  applyLabel = "Apply",
}: Props) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          bounciness: 6,
          speed: 18,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.92);
    }
  }, [visible, opacity, scale]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          testID="premium-dialog-backdrop"
        />
        <Animated.View
          style={[styles.card, { transform: [{ scale }], opacity }]}
          testID="premium-dialog"
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable
              testID="premium-dialog-close"
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

          <View style={{ marginTop: 18 }}>{children}</View>

          <View style={styles.footer}>
            <Pressable
              testID="premium-dialog-cancel"
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="premium-dialog-apply"
              onPress={onApply}
              style={({ pressed }) => [
                styles.applyBtn,
                pressed && { transform: [{ scale: 0.985 }] },
              ]}
            >
              <LinearGradient
                colors={[PURPLE, PURPLE_DEEP]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.applyGradient}
              >
                <Text style={styles.applyText}>{applyLabel}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "700", color: TEXT, letterSpacing: -0.3 },
  subtitle: { marginTop: 4, fontSize: 13, color: MUTED, lineHeight: 18 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: LIGHT_PURPLE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },

  footer: {
    marginTop: 20,
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  cancelText: { fontSize: 15, fontWeight: "700", color: TEXT },
  applyBtn: {
    flex: 1.4,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: PURPLE,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  applyGradient: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  applyText: { color: "#FFF", fontSize: 15, fontWeight: "700", letterSpacing: -0.1 },
});
