/**
 * Bottom sheet — the "half card". Replaces `vaul` from web. Sits on `Overlay`
 * for the modal shell and scrim, and animates its own entrance, so it passes
 * `animationType="none"` and drives the translate itself.
 *
 * `height` is a fraction of the screen. The two common cases have names:
 * `SHEET_HALF` for a peek and `SHEET_TALL` for a near-full sheet (the default,
 * which is what every existing call site wants).
 */
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing } from "@/src/theme";
import { Overlay } from "./Overlay";

/** Half the screen — a peek that leaves the context behind it visible. */
export const SHEET_HALF = 0.5;
/** Near-full. The default: enough room for a scrolling profile or filter list. */
export const SHEET_TALL = 0.88;

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Sheet height as a fraction of screen height. */
  heightFraction?: number;
  testID?: string;
};

export function BottomSheet({
  open,
  onClose,
  children,
  heightFraction = SHEET_TALL,
  testID = "bottom-sheet",
}: Props) {
  const insets = useSafeAreaInsets();
  const screenH = Dimensions.get("window").height;
  const sheetH = screenH * heightFraction;
  const translate = useRef(new Animated.Value(sheetH)).current;

  useEffect(() => {
    Animated.timing(translate, {
      toValue: open ? 0 : sheetH,
      duration: open ? 260 : 220,
      useNativeDriver: true,
    }).start();
  }, [open, sheetH, translate]);

  return (
    <Overlay open={open} onClose={onClose} animationType="none" testID={testID}>
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
    </Overlay>
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
    shadowColor: colors.shadow.default,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: radii.full,
    backgroundColor: colors.border.default,
    marginTop: spacing[2],
    marginBottom: spacing[1.5],
  },
});
