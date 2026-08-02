/**
 * The Requests tab's own stack — FE TDD §3.3.
 *
 * `Requests list → Profile detail (shared screen, pushed)`. Profile detail is
 * not a route yet — see the note in `(discover)/_layout.tsx`; it is the same
 * screen, and §3.5 says its footer varies by which tab pushed it
 * (Decline / Express Interest vs. Accept / Decline).
 */
import { Stack } from "expo-router";

import { colors } from "@/src/theme";

export const unstable_settings = {
  initialRouteName: "requests",
};

export default function RequestsStackLayout() {
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
