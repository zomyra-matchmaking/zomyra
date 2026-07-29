/**
 * Text field with a label, hint and error slot. Ten `<TextInput>` sites in the
 * prototype each re-declared the same 52pt box, the same hairline, and their
 * own idea of what an error looks like — three of them had no error state at
 * all.
 *
 *     <Input label="Full name" value={name} onChangeText={setName} />
 *     <Input label="Bio" value={bio} onChangeText={setBio} multiline rows={4}
 *            maxLength={300} showCount />
 *     <Input value={phone} onChangeText={setPhone} error="Enter a valid number"
 *            keyboardType="number-pad" left={<CountrySelector … />} />
 */
import { forwardRef, useState, type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { colors, fontSize, fontWeight, radii, spacing } from "@/src/theme";

type Props = Omit<TextInputProps, "style"> & {
  label?: string;
  /** Helper text under the field. Replaced by `error` when that is set. */
  hint?: string;
  /** Error message. Its presence is what puts the field in the error state. */
  error?: string;
  /** Node rendered inside the field's left edge — a prefix or a picker. */
  left?: ReactNode;
  /** Node rendered inside the field's right edge — a clear or reveal button. */
  right?: ReactNode;
  /** Visible rows when `multiline`. Drives the field's height. */
  rows?: number;
  /** Show a `n/max` counter. Requires `maxLength`. */
  showCount?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

const ROW_HEIGHT = 52;
const LINE_HEIGHT = 20;

export const Input = forwardRef<TextInput, Props>(function Input(
  {
    label,
    hint,
    error,
    left,
    right,
    rows = 1,
    showCount,
    maxLength,
    multiline,
    value,
    containerStyle,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const invalid = !!error;

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.field,
          multiline && { height: LINE_HEIGHT * rows + spacing.lg * 2, alignItems: "flex-start" },
          focused && styles.fieldFocused,
          invalid && styles.fieldInvalid,
        ]}
      >
        {left}
        <TextInput
          ref={ref}
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          placeholderTextColor={colors.text.muted}
          // The field owns its own border and background, so the inner input is
          // transparent — otherwise the focus ring sits behind an opaque box.
          style={[styles.input, multiline && styles.inputMultiline]}
          accessibilityLabel={label}
          // Reads the error (or hint) out with the field, rather than leaving
          // it as text that merely happens to sit nearby (NFR-6).
          accessibilityHint={error ?? hint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {right}
      </View>

      {error || hint || (showCount && maxLength) ? (
        <View style={styles.footer}>
          <Text style={[styles.hint, invalid && styles.error]} numberOfLines={2}>
            {error ?? hint ?? ""}
          </Text>
          {showCount && maxLength ? (
            <Text style={styles.count}>
              {value?.length ?? 0}/{maxLength}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.sm,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: ROW_HEIGHT,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.neutral,
    backgroundColor: colors.surface.default,
  },
  fieldFocused: {
    borderColor: colors.brand.default,
  },
  fieldInvalid: {
    borderColor: colors.danger.default,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSize.title,
    color: colors.text.primary,
    // Android adds vertical padding that desyncs the text from the box.
    paddingVertical: 0,
  },
  inputMultiline: {
    height: "100%",
    paddingTop: spacing.lg,
    textAlignVertical: "top",
    fontSize: fontSize.body,
    lineHeight: LINE_HEIGHT,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.xs + 2,
  },
  hint: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.text.muted,
  },
  error: {
    color: colors.danger.default,
    fontWeight: fontWeight.medium,
  },
  count: {
    fontSize: fontSize.caption,
    color: colors.text.muted,
  },
});
