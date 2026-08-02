/**
 * The Discover tab's own stack — FE TDD §3.3.
 *
 * `Discover feed → Profile detail (pushed)`. Profile detail is not a route yet:
 * `ProfileView` renders inline inside `discover.tsx` today, and §3.5 records
 * that it is **one shared screen reused from both Discover and Requests** with
 * a footer that varies by entry context. Module 7 owns pulling it out — when it
 * does, it needs to exist in *both* tab stacks (or at the root with an entry
 * param), not only here.
 *
 * `filters.tsx` is in this stack because §3.4 scopes Filters to the Discover tab
 * only, and FR-24 makes it a full pushed screen rather than a modal.
 */
import { Stack } from "expo-router";

import { colors } from "@/src/theme";

export const unstable_settings = {
  // Which screen the tab shows first, and the one a `popToTop` returns to.
  // Without this the stack's initial route is whichever file sorts first —
  // `discover` beats `filters` alphabetically today, which would make this work
  // by accident rather than by declaration.
  initialRouteName: "discover",
};

export default function DiscoverStackLayout() {
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
