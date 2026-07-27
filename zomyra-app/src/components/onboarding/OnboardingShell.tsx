import { ArrowLeft } from "lucide-react-native";
import { useEffect, useRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii } from "@/src/theme/colors";

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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable
              testID="onboarding-back"
              onPress={onBack}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <ArrowLeft size={20} color={colors.foreground} strokeWidth={2.2} />
            </Pressable>
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
            <Pressable
              testID="onboarding-next"
              disabled={!canNext || loading}
              onPress={onNext}
              style={({ pressed }) => [
                styles.nextBtn,
                (!canNext || loading) && styles.nextBtnDisabled,
                pressed && canNext && { opacity: 0.92 },
              ]}
            >
              {loading ? <ActivityIndicator color={colors.primaryForeground} /> : null}
              <Text style={styles.nextLabel}>{nextLabel}</Text>
            </Pressable>
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
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
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
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.4,
    color: colors.mutedForeground,
    textTransform: "uppercase",
  },
  progressTrack: {
    marginTop: 12,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.secondary,
  },
  progressBar: {
    height: 5,
    backgroundColor: colors.primary,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  progressPulse: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginRight: -2,
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 5,
    elevation: 2,
  },
  // Question container is centered vertically and horizontally.
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: "center",
  },
  questionWrap: {
    alignItems: "center",
    width: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
    letterSpacing: -0.3,
    color: colors.foreground,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  bodyWrap: {
    marginTop: 28,
    width: "100%",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  nextBtn: {
    height: 52,
    borderRadius: radii.md + 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  nextBtnDisabled: {
    backgroundColor: "#D6CFE0",
  },
  nextLabel: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
});
