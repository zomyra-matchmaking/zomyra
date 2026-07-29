// Loads Plus Jakarta Sans (variable font) so the entire app renders in it.
// We register the same variable TTF under multiple family aliases so that
// styles can use string family names per weight in addition to numeric
// fontWeight; either approach resolves to the same file on every platform.
import { useFonts } from "expo-font";

// The family name is a design token, not a loader detail — `src/theme` owns it
// and this hook registers whatever the theme declares. Re-exported so existing
// call sites keep working.
export { FONT_FAMILY } from "@/src/theme";

export const useAppFonts = (): readonly [boolean, Error | null] =>
  useFonts({
    PlusJakartaSans: require("../../assets/fonts/PlusJakartaSans.ttf"),
    "PlusJakartaSans-Medium": require("../../assets/fonts/PlusJakartaSans.ttf"),
    "PlusJakartaSans-SemiBold": require("../../assets/fonts/PlusJakartaSans.ttf"),
    "PlusJakartaSans-Bold": require("../../assets/fonts/PlusJakartaSans.ttf"),
    "PlusJakartaSans-ExtraBold": require("../../assets/fonts/PlusJakartaSans.ttf"),
  });
