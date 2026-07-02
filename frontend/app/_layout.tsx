import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, Platform, Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { useAppFonts, FONT_FAMILY } from "@/src/hooks/use-app-fonts";
import { ToastHost } from "@/src/components/ui/Toast";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

// Apply Plus Jakarta Sans across the whole app.
//
// Native (iOS/Android): set Text/TextInput defaultProps. RN merges
// defaultProps before per-instance props, so the family flows down unless
// a child explicitly overrides it.
//
// Web: RN-Web rewrites Text to a div with its own CSS classes and ignores
// defaultProps for fontFamily, so we additionally inject a global CSS rule
// targeting React Native Web's text containers. `!important` beats the
// auto-generated atomic class rules from RN-Web's StyleSheet.
type WithDefaultProps = { defaultProps?: { style?: unknown } };
const TextAny = Text as unknown as WithDefaultProps;
const TextInputAny = TextInput as unknown as WithDefaultProps;
TextAny.defaultProps = TextAny.defaultProps || {};
TextAny.defaultProps.style = [
  { fontFamily: FONT_FAMILY },
  (TextAny.defaultProps as { style?: unknown }).style,
];
TextInputAny.defaultProps = TextInputAny.defaultProps || {};
TextInputAny.defaultProps.style = [
  { fontFamily: FONT_FAMILY },
  (TextInputAny.defaultProps as { style?: unknown }).style,
];

if (Platform.OS === "web" && typeof document !== "undefined") {
  const STYLE_ID = "zomyra-global-font";
  if (!document.getElementById(STYLE_ID)) {
    const styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.textContent = `
      html, body, #root, button, input, textarea, select, [class*="css-text"], [class*="css-view"] {
        font-family: ${FONT_FAMILY}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [appFontsLoaded, appFontsError] = useAppFonts();
  const loaded = iconsLoaded && appFontsLoaded;
  const error = iconsError ?? appFontsError;

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              contentStyle: { backgroundColor: "#FFFFFF" },
            }}
          />
          <ToastHost />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
