import { useRouter } from "expo-router";
import { useState } from "react";
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

import { CountrySelector } from "@/src/components/auth/CountrySelector";
import { ScreenHeader } from "@/src/components/common/ScreenHeader";
import { DEFAULT_COUNTRY, type Country } from "@/src/lib/countries";
import { authService } from "@/src/services/auth";
import { colors, radii } from "@/src/theme/colors";

export default function PhoneScreen() {
  const router = useRouter();
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);

  const digits = phone.replace(/\D/g, "");
  const isValid = digits.length === country.length;
  const showError = touched && phone.length > 0 && !isValid;

  // Autofill / paste handling: when iOS or Android auto-fills the field with
  // a full international number (e.g. "+919408265432" or "919408265432"),
  // strip the leading country dial code so we only store the local digits.
  // The country code is controlled separately by the CountrySelector.
  const onChangePhone = (t: string) => {
    let raw = t.replace(/\D/g, "");
    const dialDigits = country.dial.replace(/\D/g, ""); // "91"
    if (
      dialDigits &&
      raw.length > country.length &&
      raw.startsWith(dialDigits)
    ) {
      raw = raw.slice(dialDigits.length);
    }
    setPhone(raw.slice(0, country.length));
  };

  const send = async () => {
    if (!isValid || sending) return;
    setSending(true);
    await authService.sendOtp(country, digits);
    setSending(false);
    router.push({ pathname: "/otp", params: { dial: country.dial, phone: digits } });
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ paddingHorizontal: 24, flex: 1 }}>
          <ScreenHeader onBack={() => router.back()} />
          <Text style={styles.title}>Enter your phone number</Text>
          <Text style={styles.subtitle}>We'll send you a verification code to continue.</Text>

          <View style={styles.row}>
            <CountrySelector
              value={country}
              onChange={(c) => {
                setCountry(c);
                setPhone("");
                setTouched(false);
              }}
            />
            <TextInput
              testID="phone-input"
              value={phone}
              onChangeText={onChangePhone}
              onBlur={() => setTouched(true)}
              keyboardType="number-pad"
              placeholder="Enter mobile number"
              placeholderTextColor={colors.mutedForeground}
              autoComplete="tel"
              autoCorrect={false}
              textContentType="telephoneNumber"
              style={[styles.input, showError && { borderColor: colors.destructive }]}
            />
          </View>

          {showError ? (
            <Text style={styles.errorText}>
              Enter a valid {country.length}-digit number for {country.name}.
            </Text>
          ) : null}

          <Text style={styles.hint}>
            {isValid
              ? `We'll send a verification code to ${country.dial} ${digits}.`
              : "We'll send a verification code to your phone number."}
          </Text>

          <Pressable
            testID="phone-send-otp"
            disabled={!isValid || sending}
            onPress={send}
            style={({ pressed }) => [
              styles.cta,
              (!isValid || sending) && styles.ctaDisabled,
              pressed && isValid && { opacity: 0.92 },
            ]}
          >
            {sending ? <ActivityIndicator color={colors.primaryForeground} /> : null}
            <Text style={styles.ctaText}>{sending ? "Sending OTP…" : "Send OTP"}</Text>
          </Pressable>

          <View style={{ flex: 1 }} />

          <Text style={styles.legal}>We'll never share your phone number with other users.</Text>
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
  input: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.foreground,
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: colors.destructive,
  },
  hint: {
    marginTop: 14,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  hintStrong: {
    color: colors.foreground,
    fontWeight: "700",
  },
  cta: {
    marginTop: 18,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaDisabled: { backgroundColor: "#D6CFE0" },
  ctaText: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: "700",
  },
  legal: {
    textAlign: "center",
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 12,
  },
});
