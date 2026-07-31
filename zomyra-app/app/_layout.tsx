import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox, Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PersistGate } from "redux-persist/integration/react";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { useAppFonts, FONT_FAMILY } from "@/src/hooks/use-app-fonts";
import { bootstrapSession } from "@/src/auth/bootstrap";
import { ToastHost } from "@/src/components/ui/Toast";
import { persistor, store } from "@/src/store";
import { useAppDispatch } from "@/src/store/hooks";
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

/**
 * Everything below `PersistGate`, so it only mounts once the persisted slices
 * have rehydrated. That ordering matters: a screen reading the onboarding
 * draft on its first render would otherwise see the empty initial state and
 * decide the user has no draft. The splash stays up throughout, because
 * `hideAsync` is called from here.
 */
function AppShell() {
  const dispatch = useAppDispatch();
  const [iconsLoaded, iconsError] = useIconFonts();
  const [appFontsLoaded, appFontsError] = useAppFonts();
  const loaded = iconsLoaded && appFontsLoaded;
  const error = iconsError ?? appFontsError;

  // Resolve the keychain into a session status once per launch (NFR-2).
  useEffect(() => {
    void bootstrapSession(dispatch);
  }, [dispatch]);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <>
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
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          {/* `loading={null}` keeps the native splash visible rather than
              flashing a blank frame — rehydration is a single AsyncStorage
              read and resolves in a frame or two. */}
          <PersistGate loading={null} persistor={persistor}>
            <AppShell />
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
