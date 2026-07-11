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
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { Slider } from "@/src/components/onboarding/Slider";
import { colors, radii } from "@/src/theme/colors";
import { SCALE_QUESTIONS } from "@/src/lib/onboarding/scales";
import type { OnboardingState } from "@/src/lib/onboarding/types";

type Props = {
  state: OnboardingState;
  onUpdateScale: (id: string, value: number) => void;
  onComplete: () => void;
  onBack?: () => void;
};

export function PersonalityQuiz({
  state,
  onUpdateScale,
  onComplete,
  onBack,
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
          <Pressable
            testID="personality-back"
            onPress={handleBack}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            hitSlop={10}
          >
            <ArrowLeft size={20} color={colors.foreground} strokeWidth={2.2} />
          </Pressable>
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
        <Pressable
          testID="personality-continue-button"
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextBtn,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.nextLabel}>{isLast ? "Finish" : "Continue"}</Text>
        </Pressable>
        <View style={styles.helperSpacer} />
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
          <Sparkles size={16} color={colors.primary} />
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 6 : 4,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  counter: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.mutedForeground,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.secondary,
  },
  progressSegmentCompleted: {
    backgroundColor: colors.primary,
  },
  progressSegmentActive: {
    backgroundColor: colors.primary,
    // Slight glow-ish emphasis: brighter than completed but same fill.
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: "center",
  },
  questionCard: {
    alignItems: "center",
    width: "100%",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  titleTag: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.primary,
    textTransform: "uppercase",
  },
  prompt: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.foreground,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  sliderBlock: {
    marginTop: 40,
    width: "100%",
    paddingHorizontal: 4,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(31,18,53,0.14)",
  },
  dotActive: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.5 }],
  },
  sliderWrap: {
    paddingHorizontal: 4,
  },
  labelRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  axisLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foregroundMuted,
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
    paddingHorizontal: 20,
    paddingTop: 12,
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
  helperText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 12,
    color: colors.foregroundSubtle,
  },
  helperSpacer: {
    marginTop: 8,
    height: 15,
  },
});
