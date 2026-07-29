/**
 * Platform predicates. Import these instead of comparing `Platform.OS` at the
 * call site — there were 16 such comparisons across 11 files, and spreading a
 * string equality check that thin is how the two dead branches below survived.
 *
 * These are constants, not functions: `Platform.OS` cannot change at runtime,
 * so there is nothing to re-evaluate and nothing to memoise.
 *
 * ⚠️ **There is no `isWeb`, deliberately.** Web is out of scope (O-12) and
 * `app.json` declares `platforms: ["ios", "android"]`, so a web branch is
 * unreachable code that reads as if it were live. `DateWheel` had two.
 */
import { Platform } from "react-native";

export const isIOS = Platform.OS === "ios";
export const isAndroid = Platform.OS === "android";
