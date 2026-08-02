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

import { PersonalityQuiz } from "@/src/components/onboarding/PersonalityQuiz";
import { useOnboardingDraft } from "@/src/hooks/use-onboarding-draft";
import { colors } from "@/src/theme";

export default function PersonalityTestScreen() {
  const router = useRouter();
  const { draft: state, set } = useOnboardingDraft();

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
      <PersonalityQuiz
        state={state}
        onUpdateScale={(id, value) => set("scales", { ...state.scales, [id]: value })}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </View>
  );
}
