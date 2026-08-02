/**
 * The three full-screen states the launch gate can land on, shared by
 * `app/index.tsx` and `app/(tabs)/_layout.tsx` so a deep-link cold start looks
 * identical to an ordinary one.
 */
import { Linking, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";

import { Logo } from "@/src/components/brand/Logo";
import { Button, Loading } from "@/src/components/ui";
import { useNonDismissible } from "@/src/hooks/use-non-dismissible";
import { colors, fontSize, fontWeight, lineHeight, spacing } from "@/src/theme";

/**
 * The waiting state. Branded because it replaces the splash and is the first
 * thing the app paints — but it is the **shared default loading state**
 * (MIGRATION §13.1 #1) underneath, not a fifth bespoke treatment.
 */
export function LaunchPending({ label = "Getting things ready" }: { label?: string }) {
  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.center}>
        <Logo size={72} />
        <Loading label={label} />
      </View>
    </SafeAreaView>
  );
}

/** FR-30 outcome 1. Full-screen, non-dismissible, the app goes no further. */
export function UpdateRequired({ storeUrl }: { storeUrl?: string }) {
  useNonDismissible();

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      {/* No back gesture and no header — there is nothing to go back to. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.center} accessible accessibilityRole="alert">
        <Logo size={72} />
        <Text style={styles.title}>Update required</Text>
        <Text style={styles.body}>
          This version of Zomyra is no longer supported. Update to the latest version to
          continue.
        </Text>
        {/* The store link is the only control on the screen, and it is hidden
            rather than dead if the backend sent no URL — a button that does
            nothing on a screen with no way out is worse than no button. */}
        {storeUrl ? (
          <Button
            label="Update Zomyra"
            onPress={() => Linking.openURL(storeUrl)}
            fullWidth
            style={styles.cta}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

/**
 * `GET /me` could not be answered — NFR-7's "fail visibly, not silently".
 *
 * ⚠️ **This is not a logout, and must never become one.** The earlier version of
 * the gate redirected here to `/login`, which was wrong in a way that looked
 * fine: the tokens are still valid, the user is still signed in, and a backend
 * having a bad five minutes would have shown every one of them a sign-in screen
 * as though their session had ended. `getMe` has already retried twice and been
 * through silent refresh by the time this renders, so the honest thing to say
 * is "we couldn't reach us", with the only action that can help.
 */
export function LaunchError({ onRetry }: { onRetry: () => void }) {
  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.center} accessible accessibilityRole="alert">
        <Logo size={72} />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          We couldn&apos;t reach Zomyra just now. Check your connection and try again.
        </Text>
        <Button label="Try again" onPress={onRetry} fullWidth style={styles.cta} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
    gap: spacing[6],
  },
  title: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  body: {
    fontSize: fontSize.bodyLarge,
    lineHeight: fontSize.bodyLarge * lineHeight.relaxed,
    color: colors.text.muted,
    textAlign: "center",
  },
  cta: { marginTop: spacing[2] },
});
