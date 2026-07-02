/**
 * Lightweight Toast component — replaces `sonner` from web. Single global host
 * + imperative API (`toast.show("...")`) used across the app.
 */
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, shadows } from "@/src/theme/colors";

type ToastVariant = "default" | "success";

type ToastItem = { id: number; text: string; variant: ToastVariant };

let counter = 0;
const listeners = new Set<(t: ToastItem) => void>();

export const toast = {
  show(text: string) {
    listeners.forEach((l) => l({ id: ++counter, text, variant: "default" }));
  },
  success(text: string) {
    listeners.forEach((l) => l({ id: ++counter, text, variant: "success" }));
  },
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<ToastItem | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    const onShow = (t: ToastItem) => {
      setItem(t);
      opacity.setValue(0);
      translate.setValue(-12);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translate, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(translate, { toValue: -12, duration: 200, useNativeDriver: true }),
        ]).start(() => setItem(null));
      }, 2200);
    };
    listeners.add(onShow);
    return () => {
      listeners.delete(onShow);
    };
  }, [opacity, translate]);

  if (!item) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.host,
        { top: insets.top + 12, opacity, transform: [{ translateY: translate }] },
      ]}
    >
      <View
        style={[
          styles.toast,
          item.variant === "success" && { backgroundColor: colors.primary },
        ]}
      >
        <Text
          style={[
            styles.text,
            item.variant === "success" && { color: colors.primaryForeground },
          ]}
        >
          {item.text}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    backgroundColor: "#1F1235",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    maxWidth: "86%",
    ...shadows.card,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
