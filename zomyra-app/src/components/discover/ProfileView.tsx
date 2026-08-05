/**
 * ProfileView — Editorial matrimony layout.
 *
 * Photos dominate the flow. Sections are separated by whitespace and hairline
 * dividers instead of lavender cards. "What We Align On" uses outlined
 * HeartHandshake chips as a lightweight, premium signature moment.
 *
 * Flow:
 *   1. Hero (~75% of screen height, full-bleed, name/age/premium/location overlay)
 *   2. About Me
 *   3. Lifestyle (Leaf / Wine / CigaretteOff / Dumbbell …)
 *   4. Profession & Income (BriefcaseBusiness / IndianRupee)
 *   5. Second Image
 *   6. Quick Facts (BadgeInfo)
 *   7. Third Image
 *   8. What We Align On (HeartHandshake outlined chips)
 *   9. Languages (Languages) & Religion / Faith (Sparkles)
 *  10. Fourth Image
 *  11. Fifth Image
 *
 * Colours come from the semantic tokens in `@/src/theme` — see that module for
 * the values and their measured contrast.
 */
import { LinearGradient } from "expo-linear-gradient";
import {
  BadgeInfo,
  BriefcaseBusiness,
  CigaretteOff,
  Crown,
  Dumbbell,
  Heart,
  HeartHandshake,
  Home,
  IndianRupee,
  Leaf,
  MapPin,
  Sparkles,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Dimensions, Image, Modal, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import type { CompatibilityDimension, DiscoverProfile } from "@/src/lib/discover/mock";
import { colors, alpha, fontSize, fontWeight, radii, spacing } from "@/src/theme";
import { Touchable } from "@/src/components/ui";

const SCREEN = Dimensions.get("window");
const SCREEN_W = Math.min(SCREEN.width, 430);
const SCREEN_H_FULL = SCREEN.height;

// Editorial paddings. Content is inset; photos go edge-to-edge.
const PAD_X = 24;

// ───── Design tokens ─────

// Lifestyle label → icon. Spec-mandated pairings first.
const LIFESTYLE_ICONS: Record<string, LucideIcon> = {
  Vegetarian: Leaf,
  "Social Drinker": Wine,
  "Occasional Drinker": Wine,
  "Non-Drinker": Wine,
  "Non-Smoker": CigaretteOff,
  "Non-smoker": CigaretteOff,
  "Active Lifestyle": Dumbbell,
  Runner: Dumbbell,
  Yoga: Dumbbell,
  "Eats Everything": Leaf,
  "Pet Lover": Heart,
  Creative: Sparkles,
  Spiritual: Sparkles,
  "Career Focused": BriefcaseBusiness,
  "Family Oriented": Home,
};

const ALIGN_ICONS: Record<string, LucideIcon> = {
  // Kept intentionally empty — spec mandates HeartHandshake for every align chip.
};

// Silence unused-var warning for the icon map (kept for future dynamic-icon variant).
void ALIGN_ICONS;

const DIMENSION_TITLE: Record<CompatibilityDimension, string> = {
  all: "Why we think you'll get along",
  lifestyle: "How your lifestyles align",
  compatibility: "How your personalities align",
  marriage_goals: "How your priorities align",
};

// Short editorial captions for each photo slot. Cycled deterministically per
// profile so every card feels curated, not random.
const PHOTO_PROMPTS = [
  "Me during chai",
  "Sunday mornings",
  "Somewhere I feel most me",
  "Little things I love",
  "How a good day looks",
  "In my element",
  "Home is a feeling",
  "Slow evenings",
];

function findFact(profile: DiscoverProfile, label: string): string | undefined {
  return profile.facts.find((f) => f.label.toLowerCase() === label.toLowerCase())
    ?.value;
}

type Props = {
  profile: DiscoverProfile;
  dimension?: CompatibilityDimension;
  onPass?: () => void;
  onConnect?: () => void;
  /** Optional custom footer (used by Requests bottom-sheet for Accept/Decline). */
  footer?: ReactNode;
};

export function ProfileView({ profile, dimension = "all", footer }: Props) {
  const [viewerPhoto, setViewerPhoto] = useState<string | null>(null);
  const [showReason, setShowReason] = useState(false);
  const [tierExpanded, setTierExpanded] = useState(true);

  // Start expanded, collapse to icon-only after a beat so the "Excellent
  // Match" moment lands first, then gracefully tucks away.
  useEffect(() => {
    setTierExpanded(true);
    const t = setTimeout(() => setTierExpanded(false), 3000);
    return () => clearTimeout(t);
  }, [profile.id]);

  const dimScore = profile.scores?.[dimension];
  const reason = dimScore?.reason ?? profile.matchReason;
  const reasonTitle = DIMENSION_TITLE[dimension];

  // Build a 5-slot photo list: hero + up to 4 gallery. Fall back to hero so
  // profiles with fewer photos still render the full editorial rhythm.
  const photos = useMemo(() => {
    const list = [profile.hero, ...profile.gallery];
    while (list.length < 5) list.push(profile.hero);
    return list.slice(0, 5);
  }, [profile.hero, profile.gallery]);

  const height = profile.height ?? findFact(profile, "Height") ?? "—";
  const build = profile.build ?? "—";
  const education = findFact(profile, "Education") ?? "—";
  const family = findFact(profile, "Family") ?? "—";
  const profession = findFact(profile, "Profession") ?? "—";
  const income = profile.income ?? findFact(profile, "Income") ?? "—";
  const languages = findFact(profile, "Languages") ?? "—";
  const religion = profile.religion ?? "—";

  const lifestyle = profile.lifestyle
    .filter((l) => l !== "Career Focused" && l !== "Family Oriented")
    .slice(0, 6);
  const alignedItems = profile.snapshot;

  // Photo captions — deterministic order based on profile id so the same
  // profile always reads the same short prompt above each shot.
  const photoPrompts = useMemo(() => {
    const arr = [...PHOTO_PROMPTS];
    const seed = profile.id
      .split("")
      .reduce((a, c) => a + c.charCodeAt(0), 0);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (seed * (i + 1)) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [profile.id]);

  const heroHeight = Math.round(SCREEN_H_FULL * 0.62);

  return (
    <View style={styles.root}>
      {/* ─────────────── 1. HERO ─────────────── */}
      <View style={[styles.hero, { height: heroHeight }]} testID="discover-hero">
        <Image
          source={{ uri: photos[0] }}
          style={StyleSheet.absoluteFill as never}
          resizeMode="cover"
        />

        {/* Compatibility chip — floats top-right; auto-collapses to icon-only. */}
        <Touchable
          testID="discover-tier-chip"
          onPress={() => {
            setTierExpanded(true);
            setShowReason(true);
          }}
          hitSlop={8}
          style={[styles.heroTierChip]}
        >
          <Sparkles size={12} color={colors.text.onBrand} strokeWidth={2.4} />
          {tierExpanded ? (
            <Animated.View
              entering={FadeIn.duration(240)}
              exiting={FadeOut.duration(220)}
              style={styles.heroTierLabelWrap}
            >
              <Text style={styles.heroTierText} numberOfLines={1}>
                {dimScore?.tier ?? profile.compatibility}
              </Text>
            </Animated.View>
          ) : null}
        </Touchable>

        {/* Tap hero to open the full-screen viewer */}
        <Touchable
          onPress={() => setViewerPhoto(photos[0])}
          style={StyleSheet.absoluteFill as never}
          testID="discover-photo-0"
        />

        {/* Scrim + identity overlay */}
        <LinearGradient
          pointerEvents="none"
          colors={["transparent", alpha(colors.overlay.base, 0.55), alpha(colors.overlay.base, 0.82)]}
          locations={[0, 0.55, 1]}
          style={styles.heroScrim}
        />
        <View pointerEvents="none" style={styles.heroIdentity}>
          <View style={styles.heroNameRow}>
            <Text style={styles.heroName} numberOfLines={1}>
              {profile.name}
              <Text style={styles.heroAge}>, {profile.age}</Text>
            </Text>
            {profile.premium ? (
              <View testID="discover-premium-badge" style={styles.heroPremiumBadge}>
                <Crown size={11} color={colors.premium.onDark} strokeWidth={2.4} fill={colors.premium.onDark} />
                <Text style={styles.heroPremiumText}>Premium</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.heroLocRow}>
            <MapPin size={13} color={alpha(colors.text.onBrand, 0.9)} strokeWidth={2} />
            <Text style={styles.heroLoc} numberOfLines={1}>
              {profile.location}
            </Text>
          </View>
        </View>
      </View>

      {/* ─────────────── 2. ABOUT ME ─────────────── */}
      <Section kicker="ABOUT ME" testID="discover-about">
        <ExpandableText text={profile.summary} />
      </Section>

      <Hairline />

      {/* ─────────────── 3. LIFESTYLE ─────────────── */}
      <Section kicker="LIFESTYLE" testID="discover-lifestyle">
        <View style={styles.factGrid}>
          {lifestyle.map((label) => {
            const I = LIFESTYLE_ICONS[label] ?? Sparkles;
            return (
              <View key={label} style={styles.factGridItem}>
                <I size={16} color={colors.brand.default} strokeWidth={1.8} />
                <Text style={styles.factGridLabel} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </Section>

      <Hairline />

      {/* ─────────────── 4. PROFESSION & INCOME ─────────────── */}
      <Section
        kicker="PROFESSION & INCOME"
        testID="discover-profession-income"
      >
        <View style={styles.professionRow}>
          <BriefcaseBusiness size={16} color={colors.brand.default} strokeWidth={1.8} />
          <Text style={styles.professionText} numberOfLines={2}>
            {profession}
          </Text>
        </View>
        <View style={styles.professionRow}>
          <IndianRupee size={16} color={colors.brand.default} strokeWidth={1.8} />
          <Text style={styles.professionText} numberOfLines={2}>
            {income}
          </Text>
        </View>
      </Section>

      {/* ─────────────── 5. SECOND IMAGE ─────────────── */}
      <EditorialPhoto
        uri={photos[1]}
        caption={photoPrompts[1]}
        testID="discover-photo-1"
        onOpen={() => setViewerPhoto(photos[1])}
      />

      {/* ─────────────── 6. QUICK FACTS ─────────────── */}
      <Section kicker="QUICK FACTS" Icon={BadgeInfo} testID="discover-quick-facts">
        <View style={styles.quickGrid}>
          <QuickFact label="Height" value={height} />
          <QuickFact label="Build" value={build} />
          <QuickFact label="Education" value={education} />
          <QuickFact label="Family" value={family} last />
        </View>
      </Section>

      {/* ─────────────── 7. THIRD IMAGE ─────────────── */}
      <EditorialPhoto
        uri={photos[2]}
        caption={photoPrompts[2]}
        testID="discover-photo-2"
        onOpen={() => setViewerPhoto(photos[2])}
      />

      {/* ─────────────── 8. WHAT WE ALIGN ON ─────────────── */}
      {alignedItems.length > 0 ? (
        <Section
          kicker="WHAT WE ALIGN ON"
          Icon={HeartHandshake}
          testID="discover-align"
        >
          <View style={styles.alignChipRow}>
            {alignedItems.map((s) => (
              <View
                key={s.label}
                testID={`discover-align-chip-${s.label}`}
                style={styles.alignChip}
              >
                <HeartHandshake size={13} color={colors.brand.default} strokeWidth={1.8} />
                <Text style={styles.alignChipText} numberOfLines={2}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Hairline />

      {/* ─────────────── 9. LANGUAGES & RELIGION ─────────────── */}
      <Section
        kicker="LANGUAGES & FAITH"
        testID="discover-lang-religion"
      >
        <View style={styles.langRow}>
          <Text style={styles.langLabel}>Languages</Text>
          <Text style={styles.langValue} numberOfLines={2}>
            {languages}
          </Text>
        </View>
        <View style={[styles.langRow, styles.langRowLast]}>
          <Text style={styles.langLabel}>Religion / Faith</Text>
          <Text style={styles.langValue} numberOfLines={2}>
            {religion}
          </Text>
        </View>
      </Section>

      {/* ─────────────── 10. FOURTH IMAGE ─────────────── */}
      <EditorialPhoto
        uri={photos[3]}
        caption={photoPrompts[3]}
        testID="discover-photo-3"
        onOpen={() => setViewerPhoto(photos[3])}
      />

      {/* ─────────────── 11. FIFTH IMAGE ─────────────── */}
      <EditorialPhoto
        uri={photos[4]}
        caption={photoPrompts[4]}
        testID="discover-photo-4"
        onOpen={() => setViewerPhoto(photos[4])}
        last
      />

      {/* Match-reason modal */}
      <Modal
        visible={showReason}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReason(false)}
        statusBarTranslucent
      >
        <Touchable
          style={styles.reasonBackdrop}
          onPress={() => setShowReason(false)}
        >
          <Touchable style={styles.reasonCard} onPress={() => {}}>
            <View style={styles.reasonChip}>
              <Sparkles size={12} color={colors.text.onBrand} strokeWidth={2.6} />
              <Text style={styles.reasonChipText}>
                {dimScore?.tier ?? profile.compatibility}
              </Text>
            </View>
            <Text style={styles.reasonTitle}>{reasonTitle}</Text>
            <Text style={styles.reasonBody}>{reason}</Text>
            <Touchable
              onPress={() => setShowReason(false)}
              style={[styles.reasonCloseBtn]}
            >
              <Text style={styles.reasonCloseText}>Got it</Text>
            </Touchable>
          </Touchable>
        </Touchable>
      </Modal>

      {/* Full-screen photo viewer */}
      <Modal
        visible={!!viewerPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerPhoto(null)}
        statusBarTranslucent
      >
        <View style={styles.viewerRoot}>
          <Touchable
            testID="photo-viewer-close"
            onPress={() => setViewerPhoto(null)}
            style={styles.viewerClose}
          >
            <X size={22} color={colors.text.onBrand} strokeWidth={2} />
          </Touchable>
          <Touchable
            onPress={() => setViewerPhoto(null)}
            style={styles.viewerBackdrop}
          >
            {viewerPhoto ? (
              <Image
                source={{ uri: viewerPhoto }}
                style={styles.viewerImage}
                resizeMode="contain"
              />
            ) : null}
          </Touchable>
        </View>
      </Modal>

      {footer ? <View style={styles.footerSlot}>{footer}</View> : null}
    </View>
  );
}

// ──────────────────────────── helpers ────────────────────────────

function Section({
  kicker,
  Icon,
  children,
  testID,
}: {
  kicker: string;
  Icon?: LucideIcon;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.section} testID={testID}>
      <View style={styles.sectionHeader}>
        {Icon ? <Icon size={12} color={colors.brand.default} strokeWidth={2} /> : null}
        <Text style={styles.kicker}>{kicker}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Hairline() {
  return <View style={styles.hairline} />;
}

const ABOUT_CLAMP_CHARS = 180;

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isTruncatable = text.length > ABOUT_CLAMP_CHARS;

  return (
    <View>
      <Text
        style={styles.bodyText}
        numberOfLines={expanded || !isTruncatable ? undefined : 4}
      >
        {text}
      </Text>
      {isTruncatable ? (
        <Touchable
          testID="about-toggle"
          onPress={() => setExpanded((v) => !v)}
          hitSlop={8}
          style={[styles.expandToggle]}
        >
          <Text style={styles.expandToggleText}>
            {expanded ? "See less" : "See more"}
          </Text>
        </Touchable>
      ) : null}
    </View>
  );
}

function EditorialPhoto({
  uri,
  caption,
  onOpen,
  testID,
  last,
}: {
  uri: string;
  caption?: string;
  onOpen?: () => void;
  testID?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.editorialPhotoWrap, last && { marginBottom: spacing[2] }]}>
      <Touchable
        onPress={onOpen}
        style={styles.editorialPhoto}
        testID={testID}
      >
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill as never}
          resizeMode="cover"
        />
        {caption ? (
          <>
            <LinearGradient
              pointerEvents="none"
              colors={["transparent", alpha(colors.overlay.base, 0.62)]}
              locations={[0, 1]}
              style={styles.photoCaptionScrim}
            />
            <View pointerEvents="none" style={styles.photoCaptionWrap}>
              <Text style={styles.photoCaptionText} numberOfLines={2}>
                {caption}
              </Text>
            </View>
          </>
        ) : null}
      </Touchable>
    </View>
  );
}

function QuickFact({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.quickFact, last && { marginBottom: spacing[0] }]}>
      <Text style={styles.quickFactLabel}>{label}</Text>
      <Text style={styles.quickFactValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface.default,
    paddingBottom: spacing[6],
  },

  // ─── Hero ───
  hero: {
    width: SCREEN_W,
    backgroundColor: colors.surface.brand,
    overflow: "hidden",
    position: "relative",
  },
  heroScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },
  heroIdentity: {
    position: "absolute",
    left: PAD_X,
    right: PAD_X,
    bottom: 28,
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing[2.5],
  },
  heroName: {
    fontSize: fontSize.displayLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.onBrand,
    letterSpacing: -0.9,
    lineHeight: 40,
  },
  heroAge: {
    fontSize: fontSize.displayLarge,
    fontWeight: fontWeight.regular,
    color: colors.text.onBrand,
    letterSpacing: -0.9,
  },
  heroPremiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
    borderWidth: 1,
    borderColor: alpha(colors.text.onBrand, 0.35),
  },
  heroPremiumText: {
    fontSize: fontSize.nano,
    fontWeight: fontWeight.extrabold,
    color: colors.text.onBrand,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroLocRow: {
    marginTop: spacing[2],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  heroLoc: {
    fontSize: fontSize.label,
    color: alpha(colors.text.onBrand, 0.92),
    fontWeight: fontWeight.medium,
    letterSpacing: 0.1,
  },
  heroTierChip: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: alpha(colors.overlay.base, 0.4),
    borderWidth: 1,
    borderColor: alpha(colors.text.onBrand, 0.2),
    zIndex: 2,
    overflow: "hidden",
  },
  heroTierLabelWrap: {
    marginLeft: spacing[1],
  },
  heroTierText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    color: colors.text.onBrand,
    letterSpacing: 0.2,
  },

  // Languages & Faith — icon-less rows (label above value).
  langRow: {
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  langRowLast: {
    borderBottomWidth: 0,
  },
  langLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.medium,
    color: colors.text.muted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  langValue: {
    marginTop: spacing[1],
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    letterSpacing: -0.1,
  },

  // ─── Section (whitespace-driven, no cards) ───
  section: {
    paddingHorizontal: PAD_X,
    paddingTop: spacing[8],
    paddingBottom: spacing[3],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1.5],
  },
  kicker: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.extrabold,
    letterSpacing: 1.6,
    color: colors.brand.default,
    textTransform: "uppercase",
  },
  sectionTitle: {
    marginTop: spacing[1.5],
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  sectionBody: {
    marginTop: spacing[4],
  },

  hairline: {
    marginTop: spacing[6],
    marginHorizontal: PAD_X,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },

  // ─── About body ───
  bodyText: {
    fontSize: fontSize.body,
    lineHeight: 22,
    color: colors.text.primary,
    fontWeight: fontWeight.medium,
    letterSpacing: -0.1,
  },
  expandToggle: { marginTop: spacing[2.5], alignSelf: "flex-start" },
  expandToggleText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: colors.brand.default,
    letterSpacing: 0.2,
  },

  // ─── Lifestyle grid (icon + label, no bg) ───
  factGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  factGridItem: {
    width: "50%",
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[2.5],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2.5],
  },
  factGridLabel: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    letterSpacing: -0.1,
  },

  // ─── Profession & Income rows (icon + value, full width) ───
  professionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2.5],
    paddingVertical: spacing[2],
  },
  professionText: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    letterSpacing: -0.1,
  },

  // ─── Detail rows (Profession/Income · Languages/Religion) ───
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  detailIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.medium,
    color: colors.text.muted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  detailValue: {
    marginTop: spacing[0.5],
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    letterSpacing: -0.1,
  },

  // ─── Quick facts (2x2, no cards) ───
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  quickFact: {
    width: "50%",
    marginBottom: spacing[4.5],
    paddingRight: spacing[3],
  },
  quickFactLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.medium,
    color: colors.text.muted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  quickFactValue: {
    marginTop: spacing[1],
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    letterSpacing: -0.1,
  },

  // ─── Editorial photos (edge-to-edge, no radius) ───
  editorialPhotoWrap: {
    marginTop: spacing[6],
  },
  editorialPhoto: {
    width: SCREEN_W,
    height: Math.round(SCREEN_W * 1.15),
    overflow: "hidden",
    backgroundColor: colors.surface.brand,
    position: "relative",
  },
  photoCaptionScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "38%",
  },
  photoCaptionWrap: {
    position: "absolute",
    left: PAD_X,
    right: PAD_X,
    bottom: 20,
  },
  photoCaptionText: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colors.text.onBrand,
    letterSpacing: -0.2,
    lineHeight: 24,
    textShadowColor: alpha(colors.overlay.base, 0.4),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  // ─── Align chips (outlined, HeartHandshake, premium & lightweight) ───
  alignChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  alignChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  alignChipText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    letterSpacing: -0.1,
    maxWidth: SCREEN_W - PAD_X * 2 - 60,
  },

  footerSlot: { paddingHorizontal: PAD_X, paddingTop: spacing[3] },

  // ─── Reason modal ───
  reasonBackdrop: {
    flex: 1,
    backgroundColor: alpha(colors.text.primary, 0.45),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[6],
  },
  reasonCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface.default,
    borderRadius: radii["4xl"],
    padding: spacing[6],
    gap: spacing[3],
    shadowColor: colors.shadow.default,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  reasonChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1.5],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
  },
  reasonChipText: { color: colors.text.onBrand, fontSize: fontSize.micro, fontWeight: fontWeight.bold },
  reasonTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  reasonBody: { fontSize: fontSize.title, lineHeight: 24, color: colors.text.primary, fontWeight: fontWeight.regular },
  reasonCloseBtn: {
    marginTop: spacing[2],
    alignSelf: "flex-end",
    paddingHorizontal: spacing[4.5],
    paddingVertical: spacing[3],
    borderRadius: radii["2xl"],
    backgroundColor: colors.brand.default,
  },
  reasonCloseText: { color: colors.text.onBrand, fontSize: fontSize.body, fontWeight: fontWeight.semibold },

  // ─── Photo viewer ───
  viewerRoot: { flex: 1, backgroundColor: colors.surface.media },
  viewerBackdrop: { flex: 1, alignItems: "center", justifyContent: "center" },
  viewerImage: { width: SCREEN_W, height: SCREEN_H_FULL * 0.85 },
  viewerClose: {
    position: "absolute",
    top: 48,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: alpha(colors.text.onBrand, 0.18),
    alignItems: "center",
    justifyContent: "center",
  },
});
