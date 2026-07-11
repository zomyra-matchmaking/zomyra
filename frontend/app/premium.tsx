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
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRequestsStore } from "@/src/stores/requests-store";

const PURPLE = "#5B2C6F";
const PURPLE_DEEP = "#3D1A4A";
const LIGHT_PURPLE = "#F5F3FF";
const BORDER = "#ECEAF7";
const TEXT = "#111827";
const MUTED = "#6B7280";
const GOLD = "#F59E0B";

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
        <Pressable
          testID="premium-back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <ArrowLeft size={22} color={TEXT} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Premium</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <LinearGradient
            colors={[PURPLE, PURPLE_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.crownBadge}>
              <Crown size={20} color={GOLD} strokeWidth={2} fill={GOLD} />
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
                <Check size={14} color="#FFF" strokeWidth={3} />
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

        <Pressable
          testID="premium-purchase"
          onPress={() => setPremium(!premium)}
          style={({ pressed }) => [
            styles.cta,
            pressed && { transform: [{ scale: 0.985 }] },
          ]}
        >
          <LinearGradient
            colors={[PURPLE, PURPLE_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Sparkles size={18} color="#FFF" strokeWidth={2.4} />
            <Text style={styles.ctaText}>
              {premium ? "You're Premium" : "Upgrade to Premium"}
            </Text>
          </LinearGradient>
        </Pressable>

        <Text style={styles.fine}>
          Subscription auto-renews. Cancel anytime in your account settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: { minWidth: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: TEXT, letterSpacing: -0.2 },

  heroCard: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: PURPLE,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 8,
  },
  heroGradient: { padding: 24, alignItems: "flex-start" },
  crownBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 21,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    color: PURPLE,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 10,
  },
  benefitsCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  benefit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  benefitDivider: { borderBottomWidth: 1, borderBottomColor: BORDER },
  benefitIcon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { flex: 1, fontSize: 14, color: TEXT, fontWeight: "500", lineHeight: 20 },

  pricingCard: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
    borderRadius: 24,
    backgroundColor: LIGHT_PURPLE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  pricingTitle: { fontSize: 16, fontWeight: "700", color: TEXT },
  pricingSubtitle: { marginTop: 2, fontSize: 12, color: MUTED },
  priceBig: { fontSize: 22, fontWeight: "800", color: PURPLE, letterSpacing: -0.3 },
  priceCaption: { fontSize: 11, color: MUTED },

  cta: {
    marginTop: 18,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: PURPLE,
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
  ctaText: { color: "#FFF", fontSize: 18, fontWeight: "700", letterSpacing: -0.2 },

  fine: {
    marginTop: 14,
    fontSize: 12,
    color: MUTED,
    textAlign: "center",
  },
});
