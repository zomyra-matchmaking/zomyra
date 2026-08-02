/**
 * The Profile tab's own stack — FE TDD §3.3: `Profile home → Edit profile`.
 *
 * `personality-test.tsx` is here too. §3.3's table does not list it, but it is
 * the compatibility-quiz retake (FR-6) and Profile is its only entry point —
 * which is the same reasoning §3.4 applies to Delete Account.
 *
 * Delete account (FR-28) is Profile-tab-only per §3.4 and stays a dialog inside
 * `profile.tsx`; it is not a route and should not become one.
 */
import { Stack } from "expo-router";

import { colors } from "@/src/theme";

export const unstable_settings = {
  initialRouteName: "profile",
};

export default function ProfileStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.surface.default },
      }}
    />
  );
}
