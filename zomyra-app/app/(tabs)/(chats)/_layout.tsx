/**
 * The Chats tab's own stack — FE TDD §3.3: `Chat list → Conversation`.
 *
 * `chats/[id].tsx` keeps its path: the group contributes nothing to the URL, so
 * a conversation is still `/chats/<id>`. That matters beyond tidiness — FE §6.10
 * routes a message push straight to that deep link, and Module 11 will bind it
 * to `zomyra://chats/<id>`.
 */
import { Stack } from "expo-router";

import { colors } from "@/src/theme";

export const unstable_settings = {
  initialRouteName: "chats",
};

export default function ChatsStackLayout() {
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
