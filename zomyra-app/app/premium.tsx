/**
 * Premium screen — placeholder purchase / upgrade screen.
 * Opened from the Filters screen when a user taps a premium filter row.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  Crown,
  Sparkles,
} from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRequestsStore } from "@/src/stores/requests-store";
import { colors, alpha, fontSize, fontWeight, radii } from "@/src/theme";
import { Touchable } from "@/src/components/ui";

const BENEFITS = [
  "Unlock all premium filters (Height, Income, Family, Education, more)",
  "See who liked your profile",
  "Priority in match recommendations",
  "Unlimited rewinds & connection requests",
  "Premium-only verification badge",
];

export default function PremiumScreen() {
  const router = useRouter();
  const setPremium = useRequestsStore((s) => s.setPremium);
  const premium = useRequestsStore((s) => s.premium);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Touchable
          testID="premium-back"
          onPress={() => router.back()}
          style={[styles.headerBtn]}
          hitSlop={8}
        >
          <ArrowLeft size={22} color={colors.text.primary} strokeWidth={2} />
        </Touchable>
        <Text style={styles.headerTitle}>Premium</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <LinearGradient
            colors={colors.gradient.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.crownBadge}>
              <Crown size={20} color={colors.premium.onDark} strokeWidth={2} fill={colors.premium.onDark} />
            </View>
            <Text style={styles.heroTitle}>Zomyra Premium</Text>
            <Text style={styles.heroSubtitle}>
              Find serious matches faster — with deeper filters & priority
              visibility.
            </Text>
          </LinearGradient>
        </View>

        <Text style={styles.sectionTitle}>WHAT YOU GET</Text>
        <View style={styles.benefitsCard}>
          {BENEFITS.map((b, i) => (
            <View
              key={b}
              style={[styles.benefit, i < BENEFITS.length - 1 && styles.benefitDivider]}
            >
              <View style={styles.benefitIcon}>
                <Check size={14} color={colors.text.onBrand} strokeWidth={3} />
              </View>
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>

        <View style={styles.pricingCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pricingTitle}>3-month plan</Text>
            <Text style={styles.pricingSubtitle}>Most popular</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.priceBig}>₹1,299</Text>
            <Text style={styles.priceCaption}>billed once</Text>
          </View>
        </View>

        <Touchable
          feedback="scale"
          testID="premium-purchase"
          onPress={() => setPremium(!premium)}
          style={[styles.cta]}
        >
          <LinearGradient
            colors={colors.gradient.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Sparkles size={18} color={colors.text.onBrand} strokeWidth={2.4} />
            <Text style={styles.ctaText}>
              {premium ? "You're Premium" : "Upgrade to Premium"}
            </Text>
          </LinearGradient>
        </Touchable>

        <Text style={styles.fine}>
          Subscription auto-renews. Cancel anytime in your account settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.default },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: { minWidth: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: fontSize.heading, fontWeight: fontWeight.bold, color: colors.text.primary, letterSpacing: -0.2 },

  heroCard: {
    borderRadius: radii["4xl"],
    overflow: "hidden",
    shadowColor: colors.brand.default,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 8,
  },
  heroGradient: { padding: 24, alignItems: "flex-start" },
  crownBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: alpha(colors.text.onBrand, 0.18),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: alpha(colors.text.onBrand, 0.25),
  },
  heroTitle: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text.onBrand,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: fontSize.body,
    color: alpha(colors.text.onBrand, 0.85),
    lineHeight: 21,
  },

  sectionTitle: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
    color: colors.brand.default,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 10,
  },
  benefitsCard: {
    backgroundColor: colors.surface.default,
    borderRadius: radii["4xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
  },
  benefit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  benefitDivider: { borderBottomWidth: 1, borderBottomColor: colors.border.default },
  benefitIcon: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { flex: 1, fontSize: fontSize.body, color: colors.text.primary, fontWeight: fontWeight.medium, lineHeight: 20 },

  pricingCard: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
    borderRadius: radii["4xl"],
    backgroundColor: colors.surface.brand,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  pricingTitle: { fontSize: fontSize.title, fontWeight: fontWeight.bold, color: colors.text.primary },
  pricingSubtitle: { marginTop: 2, fontSize: fontSize.caption, color: colors.text.muted },
  priceBig: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.brand.default, letterSpacing: -0.3 },
  priceCaption: { fontSize: fontSize.micro, color: colors.text.muted },

  cta: {
    marginTop: 18,
    borderRadius: radii["2xl"],
    overflow: "hidden",
    shadowColor: colors.brand.default,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },
  ctaGradient: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { color: colors.text.onBrand, fontSize: fontSize.heading, fontWeight: fontWeight.bold, letterSpacing: -0.2 },

  fine: {
    marginTop: 14,
    fontSize: fontSize.caption,
    color: colors.text.muted,
    textAlign: "center",
  },
});
