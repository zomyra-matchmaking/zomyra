/**
 * Confirm dialog — replaces Radix AlertDialog. Title, description, two CTAs.
 * Now a thin composition of `Dialog` + `Button`; it declares no styles of its
 * own beyond the row that lays the two buttons out.
 */
import { StyleSheet, View } from "react-native";

import { spacing } from "@/src/theme";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

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
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      testID="confirm-dialog"
    >
      <View style={styles.actions}>
        <Button
          testID="confirm-dialog-cancel"
          label={cancelLabel}
          variant="secondary"
          size="md"
          onPress={onCancel}
          style={styles.action}
        />
        <Button
          testID="confirm-dialog-confirm"
          label={confirmLabel}
          variant={destructive ? "danger" : "primary"}
          size="md"
          onPress={onConfirm}
          style={styles.action}
        />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
