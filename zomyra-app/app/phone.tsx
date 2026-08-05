/**
 * **Phone entry** — FE TDD §3.1, FR-1's phone path, API-1.
 *
 * Module 2 wired the mutation and left the error handling here: it did nothing
 * with a failure beyond declining to navigate, so `rate_limited`,
 * `sms_delivery_failed` and an invalid number were all indistinguishable from a
 * dead button — the failure mode NFR-7 ("fail visibly, not silently") exists to
 * forbid, and the same one that cost Module 3 real time when mocks were
 * silently off.
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CountrySelector } from "@/src/components/auth/CountrySelector";
import { ScreenHeader } from "@/src/components/common/ScreenHeader";
import { DEFAULT_COUNTRY, type Country } from "@/src/lib/countries";
import { errorMessage, isApiError, useRequestOtpMutation } from "@/src/api";
import { formatCountdown, useCountdown } from "@/src/hooks/use-countdown";
import { colors, fontSize, fontWeight, spacing } from "@/src/theme";
import { Button, Input } from "@/src/components/ui";
import { isIOS } from "@/src/utils/platform";

/** FR-1a's figure, used only if API-1's response omits its own. */
const DEFAULT_RESEND_SECONDS = 30;

export default function PhoneScreen() {
  const router = useRouter();
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requestOtp, { isLoading: sending }] = useRequestOtpMutation();
  /*
   * `429 rate_limited` carries `retryAfterSeconds` (§9.1). Honouring it is the
   * difference between telling the user when they may try again and letting
   * them tap into the same rejection repeatedly.
   */
  const cooldown = useCountdown();

  const digits = phone.replace(/\D/g, "");
  const isValid = digits.length === country.length;
  const showError = touched && phone.length > 0 && !isValid;
  const blocked = cooldown.secondsLeft > 0;

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
    if (!isValid || sending || blocked) return;
    setSubmitError(null);
    const result = await requestOtp({ phoneNumber: digits, countryCode: country.dial });

    if (result.error) {
      const error = result.error;
      if (isApiError(error) && error.code === "rate_limited") {
        // `retryAfterSeconds` is optional in the envelope, so the guard is real
        // rather than defensive noise — without a number there is nothing to
        // count down to, and the message has to stand on its own.
        if (error.retryAfterSeconds) cooldown.start(error.retryAfterSeconds);
      }
      setSubmitError(errorMessage(error));
      return;
    }

    router.push({
      pathname: "/otp",
      params: {
        dial: country.dial,
        phone: digits,
        // The server's own cooldown, not a constant. FR-1a says 30 seconds and
        // API-1 returns `resendCooldownSeconds` — if the backend ever widens it
        // under load, the screen should follow rather than offer a Resend that
        // is guaranteed to be refused.
        cooldown: String(result.data?.resendCooldownSeconds ?? DEFAULT_RESEND_SECONDS),
      },
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={isIOS ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ paddingHorizontal: spacing[6], flex: 1 }}>
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
              onChangeText={(t) => {
                setSubmitError(null);
                onChangePhone(t);
              }}
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

          {submitError ? (
            <Text testID="phone-submit-error" style={styles.error} accessibilityRole="alert">
              {submitError}
              {blocked ? ` You can try again in ${formatCountdown(cooldown.secondsLeft)}.` : ""}
            </Text>
          ) : (
            <Text style={styles.hint}>
              {isValid
                ? `We'll send a verification code to ${country.dial} ${digits}.`
                : "We'll send a verification code to your phone number."}
            </Text>
          )}

          <Button
            testID="phone-send-otp"
            label={sending ? "Sending OTP…" : "Send OTP"}
            loading={sending}
            disabled={!isValid || blocked}
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
  row: { marginTop: spacing[6], flexDirection: "row", gap: spacing[2], alignItems: "flex-start" },
  inputWrap: { flex: 1, minWidth: 0 },
  hint: {
    marginTop: spacing[3.5],
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: colors.text.muted,
  },
  // Occupies the hint's slot rather than sitting beneath it, so the CTA does
  // not shift down when an error appears.
  error: {
    marginTop: spacing[3.5],
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: colors.danger.default,
    fontWeight: fontWeight.semibold,
  },
  cta: { marginTop: spacing[4.5] },
  legal: {
    textAlign: "center",
    fontSize: fontSize.caption,
    color: colors.text.muted,
    marginBottom: spacing[3],
  },
});
