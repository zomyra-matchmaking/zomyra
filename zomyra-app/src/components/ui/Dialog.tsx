/**
 * Centred modal card. The generic form of what `ConfirmDialog` does — use
 * `Dialog` when you need arbitrary content, `ConfirmDialog` for the common
 * title / description / two-buttons case.
 *
 *     <Dialog open={open} onClose={close} title="Premium filter" description="…">
 *       <Button label="See plans" variant="gradient" fullWidth onPress={…} />
 *     </Dialog>
 */
import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fontSize, fontWeight, lineHeight, radii, spacing } from "@/src/theme";
import { Overlay } from "./Overlay";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  dismissOnBackdropPress?: boolean;
  testID?: string;
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  dismissOnBackdropPress = true,
  testID = "dialog",
}: Props) {
  return (
    <Overlay
      open={open}
      onClose={onClose}
      dismissOnBackdropPress={dismissOnBackdropPress}
      testID={testID}
    >
      <View style={styles.centre} pointerEvents="box-none">
        <View style={styles.card} testID={testID}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {description ? <Text style={styles.description}>{description}</Text> : null}
          {children ? <View style={styles.body}>{children}</View> : null}
        </View>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  centre: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[6],
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: radii["3xl"],
    backgroundColor: colors.surface.default,
    padding: spacing[5],
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  description: {
    marginTop: spacing[1.5],
    fontSize: fontSize.label,
    lineHeight: fontSize.label * lineHeight.relaxed,
    color: colors.text.muted,
  },
  body: {
    marginTop: spacing[4.5],
  },
});
