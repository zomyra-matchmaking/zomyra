/**
 * Lightweight bottom sheet using react-native Modal + Animated. Replaces
 * `vaul` from web. Two modes: full content height OR `snap` (0.7 of screen).
 */
import { useEffect, useRef, type ReactNode } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii } from "@/src/theme/colors";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Sheet height as a fraction of screen height (default 0.85). */
  heightFraction?: number;
};

export function BottomSheet({ open, onClose, children, heightFraction = 0.88 }: Props) {
  const insets = useSafeAreaInsets();
  const screenH = Dimensions.get("window").height;
  const sheetH = screenH * heightFraction;
  const translate = useRef(new Animated.Value(sheetH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(translate, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translate, { toValue: sheetH, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [open, sheetH, translate, fade]);

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <Pressable
            testID="bottom-sheet-backdrop"
            onPress={onClose}
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetH,
              paddingBottom: insets.bottom,
              transform: [{ translateY: translate }],
            },
          ]}
        >
          <View style={styles.grabber} />
          <View style={{ flex: 1 }}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginTop: 8,
    marginBottom: 6,
  },
});
