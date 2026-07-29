import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CountrySelector } from "@/src/components/auth/CountrySelector";
import { ScreenHeader } from "@/src/components/common/ScreenHeader";
import { DEFAULT_COUNTRY, type Country } from "@/src/lib/countries";
import { authService } from "@/src/services/auth";
import { colors, fontSize, fontWeight } from "@/src/theme";
import { Button, Input } from "@/src/components/ui";

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
            <Input
              testID="phone-input"
              value={phone}
              onChangeText={onChangePhone}
              onBlur={() => setTouched(true)}
              keyboardType="number-pad"
              placeholder="Enter mobile number"
              autoComplete="tel"
              autoCorrect={false}
              textContentType="telephoneNumber"
              error={
                showError
                  ? `Enter a valid ${country.length}-digit number for ${country.name}.`
                  : undefined
              }
              containerStyle={styles.inputWrap}
            />
          </View>

          <Text style={styles.hint}>
            {isValid
              ? `We'll send a verification code to ${country.dial} ${digits}.`
              : "We'll send a verification code to your phone number."}
          </Text>

          <Button
            testID="phone-send-otp"
            label={sending ? "Sending OTP…" : "Send OTP"}
            loading={sending}
            disabled={!isValid}
            onPress={send}
            fullWidth
            style={styles.cta}
          />

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
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.3,
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: 8,
    fontSize: fontSize.bodyLarge,
    lineHeight: 21,
    color: colors.text.muted,
  },
  row: { marginTop: 24, flexDirection: "row", gap: 8, alignItems: "flex-start" },
  inputWrap: { flex: 1, minWidth: 0 },
  hint: {
    marginTop: 14,
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: colors.text.muted,
  },
  hintStrong: {
    color: colors.text.primary,
    fontWeight: fontWeight.bold,
  },
  cta: { marginTop: 18 },
  legal: {
    textAlign: "center",
    fontSize: fontSize.caption,
    color: colors.text.muted,
    marginBottom: 12,
  },
});
