/**
 * Privacy Policy — placeholder content.
 * Scrollable, mobile-friendly, with back button.
 */
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fontSize, fontWeight, radii } from "@/src/theme";
import { Touchable } from "@/src/components/ui";

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. Data Collection",
    body:
      "We collect information you provide during onboarding (such as name, age, location, preferences, photos, and verification details) and limited usage data (such as device type, app version, and interaction events) that helps us improve the experience.",
  },
  {
    heading: "2. Data Usage",
    body:
      "We use the information you share to match you with compatible people, personalize your experience, keep the community safe, send important account notifications, and improve our products. We do not sell your personal information to third parties.",
  },
  {
    heading: "3. Verification Data",
    body:
      "Photos, video selfies, and identity-related data submitted as part of verification are used solely to confirm your identity, deter impersonation, and maintain trust on the platform. Verification artifacts are retained only as long as required for safety and compliance.",
  },
  {
    heading: "4. User Rights",
    body:
      "You may access, update, export, or delete your personal data at any time from the in-app settings. You may also contact us to revoke consent for specific processing activities. We will respond to verified requests in line with applicable privacy laws.",
  },
  {
    heading: "5. Contact Information",
    body:
      "For privacy questions or to exercise any of the rights above, please email privacy@zomyra.app. We aim to respond within 14 days and will keep you informed of progress on more complex requests.",
  },
];

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Touchable
          testID="privacy-back"
          onPress={() => router.back()}
          hitSlop={10}
          style={[styles.backBtn]}
        >
          <ArrowLeft size={20} color={colors.text.primary} strokeWidth={2.2} />
        </Touchable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>LAST UPDATED · AUGUST 2025</Text>
        <Text style={styles.intro}>
          Your privacy matters. This policy explains what we collect, how we use it, and the choices you have.
        </Text>

        {SECTIONS.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={styles.sectionHeading}>{s.heading}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <Text style={styles.footnote}>
          This is placeholder content for development. The final Privacy Policy will be reviewed by counsel before launch.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  kicker: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.4,
    color: colors.text.muted,
    marginBottom: 8,
  },
  intro: {
    fontSize: fontSize.bodyLarge,
    lineHeight: 23,
    color: colors.text.primary,
    marginBottom: 8,
  },
  section: { marginTop: 22 },
  sectionHeading: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: fontSize.body,
    lineHeight: 22,
    color: colors.text.muted,
  },
  footnote: {
    marginTop: 28,
    fontSize: fontSize.caption,
    fontStyle: "italic",
    color: colors.text.muted,
  },
});
