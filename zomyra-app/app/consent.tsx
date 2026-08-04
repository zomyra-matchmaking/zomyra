/**
 * **FR-2a — the one-time sensitive-data notice.**
 *
 * Sits between account creation and the Onboarding stack: *"Immediately after a
 * new account is created (FR-1a) and before the Onboarding stack begins, a
 * one-time consent screen states plainly which categories of sensitive data
 * will be collected through onboarding — religion, income, and
 * lifestyle/health-adjacent fields (diet, drinking, smoking) — with a link to
 * the full privacy policy and a required 'I understand and agree' action before
 * continuing; declining returns to the Welcome screen. Shown once per account,
 * never again."*
 *
 * ## Four things here are requirements, not styling
 *
 * 1. **The categories are named, not summarised.** "Some personal information"
 *    would satisfy the layout and not the requirement. Religion, income, diet,
 *    drinking and smoking each appear by name, because that specificity is what
 *    makes the consent informed.
 * 2. **Agreement is an explicit act.** There is no pre-ticked box and no
 *    continue-implies-consent. Two buttons, and the destructive one is not the
 *    default.
 * 3. **Declining signs out.** FR-2a says it returns to Welcome — but the
 *    backend has *already created the account* by this point (API-2/API-3 issue
 *    tokens before this screen is reachable). Leaving those tokens on the
 *    keychain would put a signed-in user on the Welcome screen, and the next
 *    cold start would route them past a notice they had refused. So the local
 *    session ends; the server-side account remains, and signing in again
 *    re-asks. Nothing here can delete the account — FR-28's deletion is a
 *    Profile action on an onboarded user.
 * 4. **It is not reached by navigation.** `resolveRootDestination` returns
 *    `/consent`, so the gate *and* the tabs guard both enforce it. A deep link
 *    that skips `/` still cannot get past it, which is the same hole Module 3's
 *    addendum closed for verification.
 *
 * ⚠️ **This is general sensitive-data consent only.** FR-11a's biometric
 * consent — the selfie used for face-match — is a **separate, explicit step**
 * at the start of Verification, and FE v1.45 says so deliberately: biometric
 * data may carry stricter consent requirements in some jurisdictions. **Module
 * 6 owns it.** Do not fold the two together to save a screen.
 */
import { useRouter } from "expo-router";
import { Ban, HeartHandshake, Lock, Wine } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { errorMessage, useRecordConsentMutation } from "@/src/api";
import { signOut } from "@/src/auth/sign-out";
import { Button, Touchable } from "@/src/components/ui";
import { SENSITIVE_DATA_CONSENT_VERSION } from "@/src/lib/consent";
import { useAppDispatch } from "@/src/store/hooks";
import { colors, fontSize, fontWeight, radii, spacing } from "@/src/theme";

/**
 * The categories FR-2a names, in its own words. Kept as data so the screen
 * cannot quietly drop one during a layout change — and so the list reads as a
 * checklist against the requirement.
 */
const CATEGORIES = [
  {
    icon: HeartHandshake,
    title: "Religion and community",
    body: "Your religion, languages and family background, so we can match on the things that matter to you.",
  },
  {
    icon: Lock,
    title: "Income and education",
    body: "Your income range, education and profession. Shown to people you match with, never to the open internet.",
  },
  {
    icon: Wine,
    title: "Lifestyle",
    body: "Your diet, and whether you drink or smoke. These sit close to health information, so we ask before collecting them.",
  },
] as const;

export default function ConsentScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordConsent, { isLoading: recording }] = useRecordConsentMutation();

  const agree = async () => {
    if (recording || declining) return;
    setError(null);

    /*
     * ⚠️ **Navigation waits on the record, and that ordering is the point.**
     *
     * Before FE v1.46 this screen was only a client-side gate — BE v1.7 records
     * that the consent columns "were never actually written by anything", so
     * nothing could prove consent had been obtained. Proceeding on a failed
     * API-40 call would put that back: the user would be in Onboarding handing
     * over religion and income with no record anywhere that they had agreed.
     *
     * So a failure keeps them here with a retry (NFR-7's "fail visibly"). The
     * `version` is the version of *the copy above* — see `lib/consent.ts`.
     */
    const result = await recordConsent({
      consentType: "sensitive_data",
      version: SENSITIVE_DATA_CONSENT_VERSION,
    });

    if (result.error) {
      setError(errorMessage(result.error));
      return;
    }

    /*
     * Back to the gate rather than straight to `/onboarding`. §9.1's table is
     * the single place that decides where a user belongs, and the mutation
     * invalidates `Me`, so the refetched `consents` array makes it say
     * Onboarding on its own. Hardcoding it here would be a second copy of the
     * row above this one — and one that could disagree with the server.
     */
    router.replace("/");
  };

  const decline = async () => {
    if (declining || recording) return;
    setDeclining(true);
    await signOut(dispatch);
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Before we begin</Text>
        <Text style={styles.intro}>
          Setting up your profile asks for some sensitive details. Here is exactly what, and
          why — so you can decide before you answer anything.
        </Text>

        <View style={styles.list}>
          {CATEGORIES.map(({ icon: Icon, title, body }) => (
            <View key={title} style={styles.item}>
              <View style={styles.itemIcon}>
                <Icon size={18} color={colors.brand.default} />
              </View>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{title}</Text>
                <Text style={styles.itemBody}>{body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.note}>
          <Ban size={16} color={colors.text.muted} />
          <Text style={styles.noteText}>
            You can skip individual questions, edit your answers later, and delete your
            account at any time.
          </Text>
        </View>

        <Touchable
          testID="consent-privacy-link"
          onPress={() => router.push("/privacy")}
          feedback="opacity"
          accessibilityRole="link"
          hitSlop={8}
        >
          <Text style={styles.link}>Read the full Privacy Policy</Text>
        </Touchable>
      </ScrollView>

      <View style={styles.actions}>
        {error ? (
          <Text testID="consent-error" style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Button
          testID="consent-agree"
          label="I understand and agree"
          loading={recording}
          disabled={declining}
          onPress={agree}
          fullWidth
        />
        <Button
          testID="consent-decline"
          label="Not now"
          variant="ghost"
          loading={declining}
          disabled={recording}
          onPress={decline}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.3,
    color: colors.text.primary,
  },
  intro: {
    marginTop: spacing[2],
    fontSize: fontSize.bodyLarge,
    lineHeight: 22,
    color: colors.text.muted,
  },
  list: { marginTop: spacing[6], gap: spacing[4] },
  item: { flexDirection: "row", gap: spacing[3] },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: { flex: 1, minWidth: 0 },
  itemTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  itemBody: {
    marginTop: spacing[1],
    fontSize: fontSize.body,
    lineHeight: 20,
    color: colors.text.muted,
  },
  note: {
    marginTop: spacing[6],
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.surface.subtle,
  },
  noteText: {
    flex: 1,
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: colors.text.muted,
  },
  link: {
    marginTop: spacing[4],
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    lineHeight: 20,
    color: colors.brand.default,
    textAlign: "center",
  },
  error: {
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: colors.danger.default,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
  // Anchored outside the ScrollView: the agree action must be visible without
  // scrolling to the end, or "explicit" degrades into "eventually findable".
  actions: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.surface.default,
  },
});
