/**
 * Personality Test — standalone entry point for retaking the personality
 * quiz outside the onboarding flow. Reuses the same PersonalityQuiz
 * component used in Section 3 of onboarding: one question per screen with
 * a segmented progress bar at the top. Persists updated scale values into
 * the onboarding store, then returns to the previous screen (typically
 * Edit Profile).
 */
import { useRouter } from "expo-router";
import { View } from "react-native";

import { useGetCompatibilityQuizQuery } from "@/src/api";
import { PersonalityQuiz } from "@/src/components/onboarding/PersonalityQuiz";
import { Button, LoadingScreen } from "@/src/components/ui";
import { useOnboardingDraft } from "@/src/hooks/use-onboarding-draft";
import { colors, spacing } from "@/src/theme";

export default function PersonalityTestScreen() {
  const router = useRouter();
  const { draft: state, set } = useOnboardingDraft();
  // The question set is the backend's (API-33), same as onboarding — this reuses
  // the session-cached response rather than a hardcoded list. The actual retake
  // submit (API-26) is still Module 6's; this screen only persists the draft.
  const { data: quiz, isError: quizError, refetch: refetchQuiz } = useGetCompatibilityQuizQuery();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/edit-profile");
    }
  };

  const handleComplete = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/edit-profile");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.default }} testID="personality-test-screen">
      {quizError || (quiz && quiz.questions.length === 0) ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[4], padding: spacing[6] }}>
          <Button testID="personality-test-retry" label="Couldn't load the quiz — try again" onPress={() => void refetchQuiz()} />
        </View>
      ) : !quiz ? (
        <LoadingScreen label="Loading your compatibility quiz…" />
      ) : (
        <PersonalityQuiz
          questions={quiz.questions}
          state={state}
          onUpdateScale={(id, value) => set("scales", { ...state.scales, [id]: value })}
          onComplete={handleComplete}
          onBack={handleBack}
        />
      )}
    </View>
  );
}
