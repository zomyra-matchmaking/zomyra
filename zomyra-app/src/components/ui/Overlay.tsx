/**
 * The shared shell behind every modal surface: RN's `Modal`, a scrim, and
 * tap-to-dismiss. `Dialog` and `BottomSheet` both sit on it.
 *
 * The prototype opened `<Modal>` directly in 11 places, each re-implementing
 * the backdrop — and each choosing its own scrim colour and its own answer to
 * whether a tap outside closes it. Two forgot `onRequestClose`, which is what
 * Android's back button calls: without it the sheet cannot be dismissed with
 * the system gesture.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Modal, StyleSheet, View } from "react-native";

import { colors } from "@/src/theme";
import { Touchable } from "./Touchable";

export type OverlayProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Tapping the scrim dismisses. Off for flows that must be answered. */
  dismissOnBackdropPress?: boolean;
  /** `fade` for centred dialogs; `none` when the child animates itself. */
  animationType?: "none" | "fade" | "slide";
  testID?: string;
};

export function Overlay({
  open,
  onClose,
  children,
  dismissOnBackdropPress = true,
  animationType = "fade",
  testID,
}: OverlayProps) {
  // The scrim always fades in, whatever `animationType` the content uses —
  // a scrim that pops to full opacity reads as a rendering glitch. Children
  // that animate themselves (BottomSheet) pass "none" and still get this.
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: open ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [open, fade]);

  return (
    <Modal
      visible={open}
      transparent
      animationType={animationType}
      // Android's hardware/gesture back. Easy to omit, and its absence traps
      // the user inside the sheet.
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <Touchable
            testID={testID ? `${testID}-backdrop` : "overlay-backdrop"}
            accessibilityRole="button"
            accessibilityLabel="Close"
            feedback="none"
            hitSlop={0}
            disabled={!dismissOnBackdropPress}
            onPress={dismissOnBackdropPress ? onClose : undefined}
            style={[StyleSheet.absoluteFill, styles.scrim]}
          />
        </Animated.View>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: colors.overlay.scrim,
  },
});
