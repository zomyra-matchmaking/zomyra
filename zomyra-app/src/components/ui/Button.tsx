/**
 * The app's button. Built on `Touchable`, so press feedback and the 44pt
 * target come for free and cannot drift per screen.
 *
 * The prototype re-declared a button in almost every screen — 85 button-shaped
 * style keys across 40 `StyleSheet.create` blocks, with heights of 44/48/52 and
 * four different disabled treatments. Everything here is a token lookup, so
 * "what a primary button looks like" is one answer in one file.
 *
 *     <Button label="Send OTP" onPress={send} disabled={!valid} loading={sending} fullWidth />
 *     <Button label="Decline" variant="ghost" icon={X} onPress={decline} />
 *     <Button label="Upgrade" variant="gradient" size="lg" icon={Sparkles} />
 */
import { type ComponentType } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors, fontSize, fontWeight, radii, spacing } from "@/src/theme";
import { Touchable, type TouchableProps } from "./Touchable";

/** Any icon that takes lucide's shape. Kept structural so this file does not depend on lucide. */
export type ButtonIcon = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export type ButtonVariant =
  /** The one primary action on a screen. Brand fill. */
  | "primary"
  /** Primary, dressed up — the brand gradient. For upsell and celebration CTAs. */
  | "gradient"
  /** Supporting action. Brand-tinted fill, dark label. */
  | "secondary"
  /** Low emphasis. Transparent with a hairline. */
  | "ghost"
  /** Destructive confirmation. */
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

type Props = Omit<TouchableProps, "children" | "style"> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ButtonIcon;
  /** Put the icon after the label instead of before. */
  iconTrailing?: boolean;
  /** Swap the content for a spinner and block presses. */
  loading?: boolean;
  /** Stretch to the container's width. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };
const ICON: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };
const TEXT: Record<ButtonSize, number> = {
  sm: fontSize.label,
  md: fontSize.body,
  lg: fontSize.bodyLarge,
};

/** Fill and label colour per variant. `null` fill means the gradient paints it. */
const VARIANT: Record<
  ButtonVariant,
  { background: string | null; label: string; border?: string }
> = {
  primary: { background: colors.brand.default, label: colors.brand.onBrand },
  gradient: { background: null, label: colors.brand.onBrand },
  secondary: { background: colors.surface.brand, label: colors.text.brand },
  ghost: {
    background: colors.surface.default,
    label: colors.text.primary,
    border: colors.border.default,
  },
  danger: { background: colors.danger.default, label: colors.danger.onDanger },
};

export function Button({
  label,
  variant = "primary",
  size = "lg",
  icon: Icon,
  iconTrailing,
  loading,
  disabled,
  fullWidth,
  style,
  ...rest
}: Props) {
  const base = VARIANT[variant];
  const blocked = disabled || loading;
  // A disabled button paints a light fill, so the variant's own label colour
  // (white, for the filled variants) would vanish into it. The prototype had
  // exactly that bug on every disabled CTA.
  const v = blocked ? { ...base, label: colors.text.muted } : base;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={v.label} />
      ) : (
        <>
          {Icon && !iconTrailing ? (
            <Icon size={ICON[size]} color={v.label} strokeWidth={2} />
          ) : null}
          <Text
            style={[styles.label, { fontSize: TEXT[size], color: v.label }]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {Icon && iconTrailing ? (
            <Icon size={ICON[size]} color={v.label} strokeWidth={2} />
          ) : null}
        </>
      )}
    </>
  );

  const shape: ViewStyle = {
    height: HEIGHT[size],
    paddingHorizontal: size === "sm" ? spacing[3] : spacing[4],
    alignSelf: fullWidth ? "stretch" : "flex-start",
  };

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!blocked, busy: !!loading }}
      disabled={blocked}
      // The button is already at least 36pt tall; slop here would overlap
      // neighbouring actions in a row of two.
      hitSlop={0}
      style={[
        styles.base,
        shape,
        v.background ? { backgroundColor: v.background } : null,
        v.border ? { borderWidth: 1, borderColor: v.border } : null,
        // One disabled treatment, not four. The fill goes flat rather than
        // translucent so a disabled button on a photo still reads as disabled.
        blocked && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {variant === "gradient" && !blocked ? (
        <>
          <LinearGradient
            colors={colors.gradient.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.row}>{content}</View>
        </>
      ) : (
        content
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    borderRadius: radii.lg,
    // Clips the gradient to the rounded shape.
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  label: {
    fontWeight: fontWeight.bold,
    letterSpacing: -0.2,
  },
  disabled: {
    backgroundColor: colors.surface.disabled,
    borderColor: colors.border.default,
  },
});
