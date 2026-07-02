import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/src/components/common/ScreenHeader";
import { toast } from "@/src/components/ui/Toast";
import { authService } from "@/src/services/auth";
import { colors, radii } from "@/src/theme/colors";

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
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
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
    setVerifying(true);
    try {
      await authService.verifyOtp(dial as string, phone as string, code);
      toast.success("Welcome to Zomyra");
      router.replace("/onboarding");
    } catch (e) {
      toast.show((e as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    await authService.resendOtp(dial as string, phone as string);
    setResending(false);
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ paddingHorizontal: 24, flex: 1 }}>
          <ScreenHeader onBack={() => router.back()} />
          <Text style={styles.title}>Verify your number</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to <Text style={{ color: colors.foreground, fontWeight: "700" }}>{masked}</Text>
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
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              Didn't receive the code?
            </Text>
            {secondsLeft > 0 ? (
              <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: "600" }}>
                {" "}Resend in {mm}:{ss}
              </Text>
            ) : (
              <Pressable testID="otp-resend" onPress={resend} disabled={resending} hitSlop={6}>
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
                  {" "}{resending ? "Resending…" : "Resend OTP"}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={{ flex: 1 }} />

          <Pressable
            testID="otp-verify"
            disabled={!isComplete || verifying}
            onPress={verify}
            style={({ pressed }) => [
              styles.cta,
              (!isComplete || verifying) && styles.ctaDisabled,
              pressed && isComplete && { opacity: 0.92 },
            ]}
          >
            {verifying ? <ActivityIndicator color={colors.primaryForeground} /> : null}
            <Text style={styles.ctaText}>{verifying ? "Verifying…" : "Verify & Continue"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  title: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.foreground,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: colors.mutedForeground,
  },
  row: { marginTop: 24, flexDirection: "row", gap: 8, alignItems: "stretch" },
  box: {
    width: 44,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: colors.foreground,
    paddingHorizontal: 0,
  },
  resendRow: { marginTop: 16, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  cta: {
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
  },
  ctaDisabled: { backgroundColor: "#D6CFE0" },
  ctaText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "700" },
});
