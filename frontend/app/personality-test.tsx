/**
 * Personality Test — standalone entry point for retaking the personality
 * chat outside the onboarding flow. Reuses the same PersonalityChat
 * component used in Section 3 of onboarding, so the conversational UX is
 * identical. Persists updated scale values into the onboarding store, then
 * returns to the previous screen (typically Edit Profile).
 */
import { useRouter } from "expo-router";
import { View } from "react-native";

import { PersonalityChat } from "@/src/components/onboarding/PersonalityChat";
import { useOnboardingStore } from "@/src/stores/onboarding-store";

export default function PersonalityTestScreen() {
  const router = useRouter();
  const state = useOnboardingStore((s) => s.state);
  const set = useOnboardingStore((s) => s.set);
  const hasHydrated = useOnboardingStore((s) => s._hasHydrated);

  if (!hasHydrated) {
    return <View style={{ flex: 1, backgroundColor: "#fff" }} />;
  }

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
    <View style={{ flex: 1, backgroundColor: "#fff" }} testID="personality-test-screen">
      <PersonalityChat
        state={state}
        onUpdateScale={(id, value) => set("scales", { ...state.scales, [id]: value })}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </View>
  );
}
