/**
 * Confirm dialog — replaces Radix AlertDialog. Centered Modal with two CTAs.
 */
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, fontSize, fontWeight } from "@/src/theme";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={styles.card}
          onPress={(e) => e.stopPropagation()}
          testID="confirm-dialog"
        >
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              testID="confirm-dialog-cancel"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.btn,
                styles.btnGhost,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.btnGhostText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              testID="confirm-dialog-confirm"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.btn,
                destructive ? styles.btnDestructive : styles.btnPrimary,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.btnPrimaryText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.scrim,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: radii["3xl"],
    backgroundColor: colors.surface.default,
    padding: 20,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  description: {
    marginTop: 6,
    fontSize: fontSize.label,
    lineHeight: 19,
    color: colors.text.muted,
  },
  actions: {
    marginTop: 18,
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    backgroundColor: colors.surface.brand,
  },
  btnGhostText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  btnPrimary: {
    backgroundColor: colors.brand.default,
  },
  btnDestructive: {
    backgroundColor: colors.danger.default,
  },
  btnPrimaryText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.brand.onBrand,
  },
});
