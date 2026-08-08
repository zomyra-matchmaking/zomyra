/**
 * PersonalityQuiz — one-question-per-screen compatibility test.
 *
 * Replaces the previous conversational PersonalityChat. Each of the
 * SCALE_QUESTIONS gets its own screen with:
 *   - A segmented progress bar at the top (one small bar per question)
 *   - The question title + prompt
 *   - A smooth slider between the two extremes with labels underneath
 *   - A Continue button that only enables once the user has interacted
 *
 * State is persisted through `onUpdateScale` into the onboarding store so
 * navigating back preserves prior answers.
 */
import { useMemo, useState } from "react";
import { ActivityIndicator, Animated, Easing, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { Slider } from "@/src/components/onboarding/Slider";
import { colors, radii, alpha, fontSize, fontWeight, spacing } from "@/src/theme";
import { SCALE_QUESTIONS } from "@/src/lib/onboarding/scales";
import type { OnboardingState } from "@/src/lib/onboarding/types";
import { Touchable } from "@/src/components/ui";
import { isAndroid } from "@/src/utils/platform";

type Props = {
  state: OnboardingState;
  onUpdateScale: (id: string, value: number) => void;
  onComplete: () => void;
  onBack?: () => void;
  /** API-7 is in flight (fires from Finish on the last question). */
  submitting?: boolean;
  /** A submit failure to surface beside the Finish button, or null. */
  submitError?: string | null;
};

export function PersonalityQuiz({
  state,
  onUpdateScale,
  onComplete,
  onBack,
  submitting = false,
  submitError = null,
}: Props) {
  const insets = useSafeAreaInsets();
  const total = SCALE_QUESTIONS.length;

  // Start at the first unanswered question if the user is coming back to
  // finish; otherwise start at 0.
  const initialIndex = useMemo(() => {
    const firstUnanswered = SCALE_QUESTIONS.findIndex(
      (q) => state.scales[q.id] == null,
    );
    return firstUnanswered === -1 ? 0 : firstUnanswered;
  }, [state.scales]);

  const [index, setIndex] = useState(initialIndex);

  const question = SCALE_QUESTIONS[index];
  const value = state.scales[question.id] ?? 3;
  const isLast = index === total - 1;

  const handleBack = () => {
    if (index === 0) {
      onBack?.();
      return;
    }
    setIndex(index - 1);
  };

  const handleNext = () => {
    // While API-7 is in flight the Finish button is disabled; this guard also
    // blocks the programmatic path so a double-submit (→ 409) is impossible.
    if (submitting) return;
    // Ensure the current question has a persisted value (defaults to the
    // middle position, 3) even if the user hasn't touched the slider.
    if (state.scales[question.id] == null) {
      onUpdateScale(question.id, value);
    }
    if (isLast) {
      onComplete();
      return;
    }
    setIndex(index + 1);
  };

  const handleSliderChange = (v: number) => {
    onUpdateScale(question.id, v);
  };

  const handleSliderComplete = (_v: number) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // ignore on web
    }
  };

  return (
    <SafeAreaView
      style={styles.root}
      edges={["top", "left", "right"]}
      testID="personality-quiz"
    >
      {/* Header with back button + segmented progress bar */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Touchable
            testID="personality-back"
            onPress={handleBack}
            style={[styles.backBtn]}
            hitSlop={10}
          >
            <ArrowLeft size={20} color={colors.text.primary} strokeWidth={2.2} />
          </Touchable>
          <Text style={styles.counter} testID="personality-counter">
            {index + 1} / {total}
          </Text>
        </View>

        <View style={styles.progressRow} testID="personality-progress">
          {SCALE_QUESTIONS.map((q, i) => (
            <ProgressSegment
              key={q.id}
              state={
                i < index ? "completed" : i === index ? "active" : "upcoming"
              }
            />
          ))}
        </View>
      </View>

      {/* Question body */}
      <QuestionBody
        // Re-mount on every question change so intro animation fires again.
        key={question.id}
        title={question.title}
        prompt={question.prompt}
        left={question.left}
        right={question.right}
        value={value}
        onChange={handleSliderChange}
        onComplete={handleSliderComplete}
      />

      {/* Continue button */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <Touchable
          testID="personality-continue-button"
          onPress={handleNext}
          disabled={submitting}
          accessibilityState={{ disabled: submitting, busy: submitting }}
          style={[styles.nextBtn, submitting && styles.nextBtnDisabled]}
        >
          {submitting ? (
            <ActivityIndicator
              testID="personality-continue-spinner"
              color={colors.brand.onBrand}
            />
          ) : (
            <Text style={styles.nextLabel}>{isLast ? "Finish" : "Continue"}</Text>
          )}
        </Touchable>
        {submitError ? (
          <Text style={styles.submitError} testID="personality-submit-error">
            {submitError}
          </Text>
        ) : (
          <View style={styles.helperSpacer} />
        )}
      </View>
    </SafeAreaView>
  );
}

function ProgressSegment({
  state: segState,
}: {
  state: "completed" | "active" | "upcoming";
}) {
  return (
    <View
      style={[
        styles.progressSegment,
        segState === "completed" && styles.progressSegmentCompleted,
        segState === "active" && styles.progressSegmentActive,
      ]}
    />
  );
}

function QuestionBody({
  title,
  prompt,
  left,
  right,
  value,
  onChange,
  onComplete,
}: {
  title: string;
  prompt: string;
  left: string;
  right: string;
  value: number;
  onChange: (v: number) => void;
  onComplete: (v: number) => void;
}) {
  // Fade + slight slide in on mount (each new question).
  const opacity = useMemo(() => new Animated.Value(0), []);
  const translateY = useMemo(() => new Animated.Value(12), []);

  useMemoOnce(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  });

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          styles.questionCard,
          { opacity, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.titleRow}>
          <Sparkles size={16} color={colors.brand.default} />
          <Text style={styles.titleTag}>{title}</Text>
        </View>
        <Text style={styles.prompt}>{prompt}</Text>

        <View style={styles.sliderBlock}>
          <View style={styles.dots}>
            {[1, 2, 3, 4, 5].map((n) => (
              <View
                key={n}
                style={[
                  styles.dot,
                  value === n && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <View style={styles.sliderWrap}>
            <Slider
              min={1}
              max={5}
              step={1}
              value={value}
              onChange={onChange}
              onComplete={onComplete}
            />
          </View>

          <View style={styles.labelRow}>
            <Text style={[styles.axisLabel, styles.axisLabelLeft]}>{left}</Text>
            <Text style={[styles.axisLabel, styles.axisLabelRight]}>
              {right}
            </Text>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// Runs the given callback exactly once, on first render. Prevents re-running
// on state updates. Used for a mount-only entrance animation.
function useMemoOnce(fn: () => void) {
  useMemo(() => {
    fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: isAndroid ? 6 : 4,
    paddingBottom: spacing[3],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[3.5],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  counter: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.2,
    color: colors.text.muted,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
  },
  progressSegmentCompleted: {
    backgroundColor: colors.brand.default,
  },
  progressSegmentActive: {
    backgroundColor: colors.brand.default,
    // Slight glow-ish emphasis: brighter than completed but same fill.
    shadowColor: colors.brand.default,
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
    paddingBottom: spacing[6],
    justifyContent: "center",
  },
  questionCard: {
    alignItems: "center",
    width: "100%",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1.5],
    marginBottom: spacing[3],
  },
  titleTag: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.2,
    color: colors.brand.default,
    textTransform: "uppercase",
  },
  prompt: {
    fontSize: fontSize.h2,
    lineHeight: 30,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.3,
    color: colors.text.primary,
    textAlign: "center",
    paddingHorizontal: spacing[1],
  },
  sliderBlock: {
    marginTop: spacing[10],
    width: "100%",
    paddingHorizontal: spacing[1],
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing[2.5],
    marginBottom: spacing[4],
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radii.full,
    backgroundColor: alpha(colors.brand.strong, 0.14),
  },
  dotActive: {
    backgroundColor: colors.brand.default,
    transform: [{ scale: 1.5 }],
  },
  sliderWrap: {
    paddingHorizontal: spacing[1],
  },
  labelRow: {
    marginTop: spacing[3.5],
    flexDirection: "row",
    justifyContent: "space-between",
  },
  axisLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colors.text.muted,
    maxWidth: "45%",
    lineHeight: 18,
  },
  axisLabelLeft: {
    textAlign: "left",
  },
  axisLabelRight: {
    textAlign: "right",
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
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
  helperText: {
    marginTop: spacing[2],
    textAlign: "center",
    fontSize: fontSize.caption,
    color: colors.text.muted,
  },
  helperSpacer: {
    marginTop: spacing[2],
    height: 15,
  },
  submitError: {
    marginTop: spacing[2],
    textAlign: "center",
    fontSize: fontSize.caption,
    color: colors.danger.default,
    minHeight: 15,
  },
});
