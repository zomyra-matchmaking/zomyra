/**
 * **OTP verify** — FE TDD §3.1, §6.11, FR-1a, API-2.
 *
 * ## The error handling Module 2 deferred here
 *
 * It shipped a screen that toasted whatever came back and otherwise treated all
 * three of API-2's rejections identically. They are not the same:
 *
 * | Code | What the user should do | What this screen does |
 * |---|---|---|
 * | `invalid_otp` | Re-enter the code | Inline error, boxes cleared, focus back on the first — **unlimited retry** |
 * | `otp_expired` | Get a *new* code | Inline error, and the resend cooldown is **cleared immediately** so Resend is available now |
 * | `too_many_attempts` | Wait | Inline error with `retryAfterSeconds` counted down, Verify disabled until it elapses |
 *
 * ⚠️ **No client-side lockout is invented.** §6.11 says incorrect entry gets an
 * inline error with *"unlimited retry (no lockout count currently specified)"*,
 * while API-2 lists a `429 too_many_attempts` after five wrong attempts. Those
 * are not in conflict once you notice whose rule it is: the **server** counts
 * and the client honours what it is told. Counting attempts here as well would
 * lock people out on a rule nobody wrote down, and it would drift from the
 * server's count the moment either changed.
 *
 * The token pair never passes through this screen — `verifyOtp`'s
 * `onQueryStarted` puts it on the keychain (`src/api/endpoints/auth.ts`). What
 * this screen *does* owe that work is a wait: see `sessionAdopted` at the
 * bottom of `verify()`, and M55-007.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/src/components/common/ScreenHeader";
import {
  errorMessage,
  isApiError,
  sessionAdopted,
  useRequestOtpMutation,
  useVerifyOtpMutation,
} from "@/src/api";
import { formatCountdown, useCountdown } from "@/src/hooks/use-countdown";
import { useKeyboardInset } from "@/src/hooks/use-keyboard-inset";
import { colors, radii, fontSize, fontWeight, spacing } from "@/src/theme";
import { Button, Touchable } from "@/src/components/ui";

const OTP_LENGTH = 6;
/** FR-1a's figure. Only used if `/phone` did not pass API-1's own value. */
const RESEND_SECONDS = 30;

function mask(dial: string, phone: string) {
  if (!phone) return dial;
  const visible = phone.slice(-2);
  const masked = "X".repeat(Math.max(0, phone.length - 2));
  return `${dial} ${masked + visible}`.trim();
}

export default function OtpScreen() {
  const router = useRouter();
  const {
    dial = "+91",
    phone = "",
    cooldown = "",
  } = useLocalSearchParams<{ dial?: string; phone?: string; cooldown?: string }>();
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [verifyOtp, { isLoading: verifying }] = useVerifyOtpMutation();
  const [requestOtp, { isLoading: resending }] = useRequestOtpMutation();
  /*
   * Two independent clocks, because they gate different actions and only one of
   * them is ours. `resend` is FR-1a's 30-second courtesy (seeded from API-1's
   * `resendCooldownSeconds`); `lockout` is the server's `too_many_attempts`
   * window, and nothing here decides when it starts or how long it runs.
   */
  const resend = useCountdown(Number(cooldown) || RESEND_SECONDS);
  const lockout = useCountdown();
  const inputsRef = useRef<Array<TextInput | null>>([]);
  /*
   * ⚠️ **This screen does not use `KeyboardAvoidingView`, and that is the fix.**
   *
   * Its CTA is bottom-anchored behind a full-height spacer, and the KAV only
   * reclaims part of the keyboard's height on Android's edge-to-edge layout —
   * so the entire shortfall came off the button and `Verify & Continue` sat
   * **completely behind the numeric keypad**. Measured on the emulator: six
   * digits entered, nothing to tap. See `useKeyboardInset` for the numbers.
   *
   * Padding by the platform-reported keyboard height instead keeps the CTA
   * pinned to the bottom with no keyboard, and lifts it to sit directly above
   * one when it opens. The two mechanisms must not be combined — see the hook.
   */
  const keyboardInset = useKeyboardInset();
  /*
   * `max`, not a sum. The two insets guard the *same* edge and never apply at
   * once: with no keyboard the gesture bar is what the CTA must clear, and with
   * one the keyboard is — and on Android `useKeyboardInset` has already folded
   * the gesture bar into its own figure. Adding them would push the button a
   * gesture-bar's height above the keypad for no reason.
   */
  const safeArea = useSafeAreaInsets();
  const bottomInset = Math.max(keyboardInset, safeArea.bottom);

  useEffect(() => {
    if (!phone) {
      router.replace("/phone");
      return;
    }
    inputsRef.current[0]?.focus();
  }, [phone, router]);

  const code = digits.join("");
  const isComplete = /^\d{6}$/.test(code);
  const lockedOut = lockout.secondsLeft > 0;
  const masked = useMemo(() => mask(dial as string, phone as string), [dial, phone]);

  const resetBoxes = () => {
    setDigits(Array(OTP_LENGTH).fill(""));
    inputsRef.current[0]?.focus();
  };

  const onChange = (i: number, raw: string) => {
    // Typing is the user's answer to the error; clear it so the message does
    // not outlive the code it was about.
    setError(null);
    const v = raw.replace(/\D/g, "");
    if (!v) {
      setDigits((prev) => {
        const next = [...prev];
        next[i] = "";
        return next;
      });
      return;
    }
    if (v.length === 1) {
      setDigits((prev) => {
        const next = [...prev];
        next[i] = v;
        return next;
      });
      if (i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus();
    } else {
      // Paste fallback
      const chars = v.slice(0, OTP_LENGTH - i).split("");
      setDigits((prev) => {
        const next = [...prev];
        chars.forEach((c, idx) => (next[i + idx] = c));
        return next;
      });
      const nextIndex = Math.min(i + chars.length, OTP_LENGTH - 1);
      inputsRef.current[nextIndex]?.focus();
    }
  };

  const onKeyPress = (i: number, key: string) => {
    if (key === "Backspace" && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
      setDigits((prev) => {
        const next = [...prev];
        next[i - 1] = "";
        return next;
      });
    }
  };

  const verify = async () => {
    if (!isComplete || verifying || lockedOut) return;
    setError(null);
    const result = await verifyOtp({
      phoneNumber: phone as string,
      countryCode: dial as string,
      otp: code,
    });

    if (result.error) {
      const failure = result.error;
      setError(errorMessage(failure));
      if (isApiError(failure)) {
        if (failure.code === "invalid_otp") {
          // §6.11: inline error, unlimited retry. Clearing the boxes is the
          // whole recovery — there is nothing else for the user to change.
          resetBoxes();
        } else if (failure.code === "otp_expired") {
          // A new code is the only way forward, so make Resend available now
          // rather than leaving the user watching out a cooldown for a code
          // that can no longer work.
          resetBoxes();
          resend.clear();
        } else if (failure.code === "too_many_attempts" && failure.retryAfterSeconds) {
          lockout.start(failure.retryAfterSeconds);
        }
      }
      return;
    }

    /*
     * ⚠️ **M55-007.** The mutation resolving means the *server* accepted the
     * code; it does not mean the client has adopted the session. Navigating on
     * the strength of the former raced the keychain write and the root gate,
     * finding no session, bounced back to Welcome — every time under
     * automation, never once by hand. There is nothing for the user to fix
     * here, so a failure is a plain "try again" rather than an OTP error.
     */
    if (!(await sessionAdopted())) {
      setError("We couldn't complete sign-in. Please try again.");
      return;
    }

    /*
     * **FR-1a, and this line is the fix.** It used to be
     * `router.replace("/onboarding")` unconditionally, which sent a returning
     * user back through a signup they had already finished.
     *
     * The destination is not decided here. API-2 returns `isNewAccount` and
     * `profileComplete`, but §9.1 also needs `verificationStatus` and
     * `discoveryMode` — an existing account can be mid-verification or yet to
     * pick a Discovery Mode. `/` runs `resolveRootDestination` against the full
     * `GET /me`, so there is one copy of that table rather than a thinner
     * second one here that the tabs guard would then contradict.
     */
    router.replace("/");
  };

  const requestNewCode = async () => {
    if (resend.secondsLeft > 0 || resending) return;
    setError(null);
    const result = await requestOtp({
      phoneNumber: phone as string,
      countryCode: dial as string,
    });

    if (result.error) {
      const failure = result.error;
      setError(errorMessage(failure));
      // A resend can be rate-limited independently of the verify lockout — the
      // two are different server-side budgets, so the cooldown takes the
      // server's number rather than restarting at 30.
      if (isApiError(failure) && failure.code === "rate_limited" && failure.retryAfterSeconds) {
        resend.start(failure.retryAfterSeconds);
      }
      return;
    }

    resetBoxes();
    resend.start(result.data?.resendCooldownSeconds ?? RESEND_SECONDS);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={[styles.body, { paddingBottom: bottomInset }]}>
        <View style={{ paddingHorizontal: spacing[6], flex: 1 }}>
          <ScreenHeader onBack={() => router.back()} />
          <Text style={styles.title}>Verify your number</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to <Text style={{ color: colors.text.primary, fontWeight: fontWeight.bold }}>{masked}</Text>
          </Text>

          <View style={styles.row}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                testID={`otp-digit-${i}`}
                value={d}
                onChangeText={(t) => onChange(i, t)}
                onKeyPress={(e) => onKeyPress(i, e.nativeEvent.key)}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                autoCorrect={false}
                maxLength={1}
                style={[styles.box, error ? styles.boxError : null]}
              />
            ))}
          </View>

          {error ? (
            <Text testID="otp-error" style={styles.error} accessibilityRole="alert">
              {error}
              {lockedOut ? ` Try again in ${formatCountdown(lockout.secondsLeft)}.` : ""}
            </Text>
          ) : null}

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive the code?</Text>
            {resend.secondsLeft > 0 ? (
              <Text style={styles.resendPending}>
                {" "}Resend in {formatCountdown(resend.secondsLeft)}
              </Text>
            ) : (
              <Touchable
                testID="otp-resend"
                onPress={requestNewCode}
                disabled={resending}
                hitSlop={6}
              >
                <Text style={styles.resendAction}>
                  {" "}{resending ? "Resending…" : "Resend OTP"}
                </Text>
              </Touchable>
            )}
          </View>

          {/* Keeps the CTA at the bottom. The keyboard inset above is what
              stops that becoming "behind the keyboard". */}
          <View style={{ flex: 1 }} />

          <Button
            testID="otp-verify"
            label={verifying ? "Verifying…" : "Verify & Continue"}
            loading={verifying}
            // Blocked by the server's lockout as well as by an incomplete code.
            // Leaving it tappable would spend an attempt to be told the same
            // thing, and on a real backend that may extend the window.
            disabled={!isComplete || lockedOut}
            onPress={verify}
            fullWidth
            style={styles.cta}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  title: {
    marginTop: spacing[4],
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.3,
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: spacing[2],
    fontSize: fontSize.bodyLarge,
    lineHeight: 21,
    color: colors.text.muted,
  },
  row: { marginTop: spacing[6], flexDirection: "row", gap: spacing[2], alignItems: "stretch" },
  box: {
    width: 44,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.neutral,
    backgroundColor: colors.surface.default,
    textAlign: "center",
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    paddingHorizontal: spacing[0],
  },
  // The boxes carry the error state too, so the message is not the only signal
  // — a screen reader announces the alert, and sighted users see the field.
  boxError: { borderColor: colors.danger.default },
  error: {
    marginTop: spacing[3],
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: colors.danger.default,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
  // Padded by the live keyboard height, so the CTA below it is lifted rather
  // than covered. See `useKeyboardInset`.
  body: { flex: 1 },
  resendRow: { marginTop: spacing[4], flexDirection: "row", justifyContent: "center", alignItems: "center" },
  resendLabel: { color: colors.text.muted, fontSize: fontSize.label },
  resendPending: {
    color: colors.text.muted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
  },
  resendAction: {
    color: colors.brand.default,
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
  },
  cta: { marginBottom: spacing[4.5] },
});
