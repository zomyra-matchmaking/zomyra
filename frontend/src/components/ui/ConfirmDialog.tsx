/**
 * Confirm dialog — replaces Radix AlertDialog. Centered Modal with two CTAs.
 */
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "@/src/theme/colors";

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
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    backgroundColor: colors.card,
    padding: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.foreground,
  },
  description: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.mutedForeground,
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
    backgroundColor: colors.secondary,
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnDestructive: {
    backgroundColor: colors.destructive,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryForeground,
  },
});
