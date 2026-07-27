/**
 * Terms of Service — placeholder content.
 * Scrollable, mobile-friendly, with back button.
 */
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/src/theme/colors";

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. Introduction",
    body:
      "Welcome to Zomyra. By accessing or using our application, you agree to be bound by these Terms of Service. Please read them carefully before using the service. These terms apply to all visitors, users, and others who access or use the platform.",
  },
  {
    heading: "2. User Responsibilities",
    body:
      "You are responsible for safeguarding the account you use to access the service and for any activities or actions performed under your account. Information you provide during onboarding must be accurate, complete, and kept up to date. You agree to notify us immediately of any unauthorized use of your account.",
  },
  {
    heading: "3. Acceptable Use",
    body:
      "You agree not to misuse the service or assist anyone in doing so. Prohibited conduct includes harassment, impersonation, posting unlawful or misleading content, attempting to gain unauthorized access to other accounts, and using the service for any commercial or solicitation purpose without our written consent.",
  },
  {
    heading: "4. Termination",
    body:
      "We may suspend or terminate your access to the service at any time, with or without cause and with or without notice, for conduct that we believe violates these Terms or is otherwise harmful to other users, us, or third parties, or for any other reason at our sole discretion.",
  },
  {
    heading: "5. Contact Information",
    body:
      "If you have any questions about these Terms, please contact us at hello@zomyra.app. We will do our best to respond promptly and address any concerns you may have about the service.",
  },
];

export default function TermsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="terms-back"
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <ArrowLeft size={20} color={colors.foreground} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>LAST UPDATED · AUGUST 2025</Text>
        <Text style={styles.intro}>
          These Terms of Service govern your use of Zomyra. By using the app, you agree to these terms.
        </Text>

        {SECTIONS.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={styles.sectionHeading}>{s.heading}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <Text style={styles.footnote}>
          This is placeholder content for development. The final Terms will be reviewed by counsel before launch.
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
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  intro: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.foreground,
    marginBottom: 8,
  },
  section: { marginTop: 22 },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.mutedForeground,
  },
  footnote: {
    marginTop: 28,
    fontSize: 12,
    fontStyle: "italic",
    color: colors.mutedForeground,
  },
});
