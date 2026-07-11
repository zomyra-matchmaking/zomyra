// Loads Plus Jakarta Sans (variable font) so the entire app renders in it.
// We register the same variable TTF under multiple family aliases so that
// styles can use string family names per weight in addition to numeric
// fontWeight; either approach resolves to the same file on every platform.
import { useFonts } from "expo-font";

export const FONT_FAMILY = "PlusJakartaSans";

export const useAppFonts = (): readonly [boolean, Error | null] =>
  useFonts({
    PlusJakartaSans: require("../../assets/fonts/PlusJakartaSans.ttf"),
    "PlusJakartaSans-Medium": require("../../assets/fonts/PlusJakartaSans.ttf"),
    "PlusJakartaSans-SemiBold": require("../../assets/fonts/PlusJakartaSans.ttf"),
    "PlusJakartaSans-Bold": require("../../assets/fonts/PlusJakartaSans.ttf"),
    "PlusJakartaSans-ExtraBold": require("../../assets/fonts/PlusJakartaSans.ttf"),
  });
