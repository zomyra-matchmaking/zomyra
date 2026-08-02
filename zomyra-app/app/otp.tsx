import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/src/components/common/ScreenHeader";
import { toast } from "@/src/components/ui/Toast";
import { errorMessage, useRequestOtpMutation, useVerifyOtpMutation } from "@/src/api";
import { colors, radii, fontSize, fontWeight, spacing } from "@/src/theme";
import { Button, Touchable } from "@/src/components/ui";
import { isIOS } from "@/src/utils/platform";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function mask(dial: string, phone: string) {
  if (!phone) return dial;
  const visible = phone.slice(-2);
  const masked = "X".repeat(Math.max(0, phone.length - 2));
  return `${dial} ${masked + visible}`.trim();
}

export default function OtpScreen() {
  const router = useRouter();
  const { dial = "+91", phone = "" } = useLocalSearchParams<{ dial?: string; phone?: string }>();
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  // API-2 / API-1. The mutation lands the tokens in expo-secure-store itself
  // (see src/api/endpoints/auth.ts), so no token ever passes through this
  // screen. Module 4 owns branching on `otp_expired` vs `too_many_attempts`.
  const [verifyOtp, { isLoading: verifying }] = useVerifyOtpMutation();
  const [requestOtp, { isLoading: resending }] = useRequestOtpMutation();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputsRef = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (!phone) {
      router.replace("/phone");
      return;
    }
    inputsRef.current[0]?.focus();
  }, [phone, router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const code = digits.join("");
  const isComplete = /^\d{6}$/.test(code);
  const masked = useMemo(() => mask(dial as string, phone as string), [dial, phone]);

  const onChange = (i: number, raw: string) => {
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
    if (!isComplete || verifying) return;
    const result = await verifyOtp({
      phoneNumber: phone as string,
      countryCode: dial as string,
      otp: code,
    });
    if (result.error) {
      toast.show(errorMessage(result.error));
      return;
    }
    toast.success("Welcome to Zomyra");
    router.replace("/onboarding");
  };

  const resend = async () => {
    if (secondsLeft > 0 || resending) return;
    await requestOtp({ phoneNumber: phone as string, countryCode: dial as string });
    setDigits(Array(OTP_LENGTH).fill(""));
    inputsRef.current[0]?.focus();
    setSecondsLeft(RESEND_SECONDS);
    toast.show(`New code sent to ${masked}`);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={isIOS ? "padding" : "height"}
        style={{ flex: 1 }}
      >
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
                style={styles.box}
              />
            ))}
          </View>

          <View style={styles.resendRow}>
            <Text style={{ color: colors.text.muted, fontSize: fontSize.label }}>
              Didn't receive the code?
            </Text>
            {secondsLeft > 0 ? (
              <Text style={{ color: colors.text.muted, fontSize: fontSize.label, fontWeight: fontWeight.semibold }}>
                {" "}Resend in {mm}:{ss}
              </Text>
            ) : (
              <Touchable testID="otp-resend" onPress={resend} disabled={resending} hitSlop={6}>
                <Text style={{ color: colors.brand.default, fontWeight: fontWeight.bold, fontSize: fontSize.label }}>
                  {" "}{resending ? "Resending…" : "Resend OTP"}
                </Text>
              </Touchable>
            )}
          </View>

          <View style={{ flex: 1 }} />

          <Button
            testID="otp-verify"
            label={verifying ? "Verifying…" : "Verify & Continue"}
            loading={verifying}
            disabled={!isComplete}
            onPress={verify}
            fullWidth
            style={styles.cta}
          />
        </View>
      </KeyboardAvoidingView>
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
  resendRow: { marginTop: spacing[4], flexDirection: "row", justifyContent: "center", alignItems: "center" },
  cta: { marginBottom: spacing[4.5] },
});
