import { ArrowLeft } from "lucide-react-native";
import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, fontSize, fontWeight, spacing } from "@/src/theme";
import { Touchable } from "@/src/components/ui";
import { isIOS } from "@/src/utils/platform";

type Props = {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
  /** Hide the bottom Continue button entirely (used for auto-advancing single-selects). */
  hideNext?: boolean;
  nextLabel?: string;
  loading?: boolean;
  hideStepLabel?: boolean;
  /**
   * A stable key per question. When this changes, the body fades+slides in.
   * Defaults to the step index.
   */
  transitionKey?: string | number;
  children: ReactNode;
};

export function OnboardingShell({
  step,
  total,
  title,
  subtitle,
  onBack,
  onNext,
  canNext,
  hideNext,
  nextLabel = "Continue",
  loading,
  hideStepLabel,
  transitionKey,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const targetPct = Math.min(100, Math.round(((step + 1) / total) * 100));

  // Cross-question transition: fade + slight vertical slide each time
  // `transitionKey` changes. Slight vertical movement reads more like
  // a "card stack" advance than a horizontal swipe.
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const animKey = transitionKey ?? step;
  const firstRender = useRef(true);

  // Smoothly animate the progress bar width with ease-in-out 300ms.
  const progressAnim = useRef(new Animated.Value(targetPct)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: targetPct,
      duration: 300,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false, // width is a layout prop
    }).start();
  }, [targetPct, progressAnim]);

  // Subtle breathing pulse on the leading dot of the progress bar.
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    opacity.setValue(0);
    translateY.setValue(12);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [animKey, opacity, translateY]);

  const widthInterpolation = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={isIOS ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Touchable
              testID="onboarding-back"
              onPress={onBack}
              style={[styles.backBtn]}
              hitSlop={8}
            >
              <ArrowLeft size={20} color={colors.text.primary} strokeWidth={2.2} />
            </Touchable>
            {!hideStepLabel ? (
              <Text style={styles.stepLabel}>
                Step {step + 1} of {total}
              </Text>
            ) : (
              <View />
            )}
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: widthInterpolation }]}>
              <Animated.View style={[styles.progressPulse, { opacity: pulse }]} />
            </Animated.View>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.questionWrap,
              { opacity, transform: [{ translateY }] },
            ]}
          >
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={styles.bodyWrap}>{children}</View>
          </Animated.View>
        </ScrollView>

        {!hideNext ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Touchable
              testID="onboarding-next"
              disabled={!canNext || loading}
              onPress={onNext}
              style={[styles.nextBtn, (!canNext || loading) && styles.nextBtnDisabled]}
            >
              {loading ? <ActivityIndicator color={colors.brand.onBrand} /> : null}
              <Text style={styles.nextLabel}>{nextLabel}</Text>
            </Touchable>
          </View>
        ) : (
          <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[1.5],
    paddingBottom: spacing[2.5],
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  stepLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.4,
    color: colors.text.muted,
    textTransform: "uppercase",
  },
  progressTrack: {
    marginTop: spacing[3],
    height: 5,
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
  },
  progressBar: {
    height: 5,
    backgroundColor: colors.brand.default,
    borderRadius: radii.full,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  progressPulse: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
    marginRight: -2,
    shadowColor: colors.brand.default,
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 5,
    elevation: 2,
  },
  // Question container is centered vertically and horizontally.
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
    justifyContent: "center",
  },
  questionWrap: {
    alignItems: "center",
    width: "100%",
  },
  title: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: colors.text.primary,
    textAlign: "center",
  },
  subtitle: {
    marginTop: spacing[2],
    fontSize: fontSize.bodyLarge,
    lineHeight: 22,
    color: colors.text.muted,
    textAlign: "center",
  },
  bodyWrap: {
    marginTop: spacing[7],
    width: "100%",
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2.5],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background,
  },
  nextBtn: {
    height: 52,
    borderRadius: radii.md + 1,
    backgroundColor: colors.brand.default,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing[2],
  },
  nextBtnDisabled: {
    backgroundColor: colors.surface.disabled,
  },
  nextLabel: {
    color: colors.brand.onBrand,
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.1,
  },
});
