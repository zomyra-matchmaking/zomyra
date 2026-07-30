import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox, Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { useAppFonts, FONT_FAMILY } from "@/src/hooks/use-app-fonts";
import { ToastHost } from "@/src/components/ui/Toast";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

// Apply Plus Jakarta Sans across the whole app by setting Text/TextInput
// defaultProps. RN merges defaultProps before per-instance props, so the family
// flows down unless a child explicitly overrides it.
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
              contentStyle: { backgroundColor: colors.surface.default },
            }}
          />
          <ToastHost />
          {/*
            Dark status-bar content, because C-3 fixes a light theme and the
            app paints white behind the bar. Android does not infer this: with
            edgeToEdgeEnabled the generated styles.xml sets a white
            statusBarColor but no windowLightStatusBar, so the clock, wifi and
            battery rendered white-on-white — verified 1.00:1 on the emulator.
            iOS never showed it, since UIUserInterfaceStyle: Light makes it
            pick dark content on its own.
          */}
          <StatusBar style="dark" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
