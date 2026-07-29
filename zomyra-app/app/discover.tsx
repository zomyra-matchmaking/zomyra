/**
 * Discover screen — Premium matrimony feed.
 *
 * Header (Zomyra + bell) → filter chips row → "best XXX matches" banner →
 * interleaved photo/info card profile. Tapping the Compatibility chip
 * opens the Discovery Mode bottom sheet.
 */
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronDown, Crown, Send, SlidersHorizontal, Sparkles, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { CompatibilitySheet } from "@/src/components/discover/CompatibilitySheet";
import { Logo } from "@/src/components/brand/Logo";
import { DualRangeSlider } from "@/src/components/discover/DualRangeSlider";
import { PremiumFilterDialog } from "@/src/components/discover/PremiumFilterDialog";
import { ProfileView } from "@/src/components/discover/ProfileView";
import { MatchOverlay } from "@/src/components/discover/MatchOverlay";
import { FloatingNav } from "@/src/components/nav/FloatingNav";
import type { CompatibilityDimension } from "@/src/lib/discover/mock";
import { discoverService } from "@/src/services/discover";
import { useDiscoveryModeStore } from "@/src/stores/discovery-mode-store";
import { colors, fontSize, fontWeight, radii, spacing } from "@/src/theme";
import { Touchable } from "@/src/components/ui";
import { NAV_CLEARANCE } from "@/src/constants";

type QuickKey = "height" | "build" | "income" | "education";
const QUICK_CHIPS: { key: QuickKey; label: string }[] = [
  { key: "height", label: "Height" },
  { key: "build", label: "Build" },
  { key: "income", label: "Income" },
  { key: "education", label: "Education" },
];

const BUILD_OPTIONS = ["Slim", "Average", "Athletic", "Heavy"];
const INCOME_OPTIONS = [
  "Below ₹5 LPA",
  "₹5–10 LPA",
  "₹10–20 LPA",
  "₹20–35 LPA",
  "₹35–50 LPA",
  "₹50L+",
];
const EDUCATION_OPTIONS = [
  "High School",
  "Diploma",
  "Bachelor's",
  "Master's",
  "MBA",
  "Doctorate",
  "Other",
];

const HEIGHT_MIN = 140;
const HEIGHT_MAX = 200;

const DIM_LABEL: Record<CompatibilityDimension, string> = {
  all: "All",
  personality: "Compatibility",
  lifestyle: "Lifestyle",
  priorities: "Marriage Goals",
};

export default function Discover() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profiles = [] } = useQuery({
    queryKey: ["discover-profiles"],
    queryFn: () => discoverService.list(),
  });
  const initialMode = useDiscoveryModeStore((s) => s.mode);
  const setStoreMode = useDiscoveryModeStore((s) => s.setMode);
  const [dimension, setDimension] = useState<CompatibilityDimension>(initialMode ?? "all");
  const [idx, setIdx] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [quickKey, setQuickKey] = useState<QuickKey | null>(null);

  // Match overlay state
  const [showMatchOverlay, setShowMatchOverlay] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<any>(null);

  // Draft values inside the centered dialog — never persisted because all
  // four filters are Premium (Apply → /premium).
  const [heightRange, setHeightRange] = useState<[number, number]>([150, 195]);
  const [buildPick, setBuildPick] = useState<string | null>(null);
  const [incomePick, setIncomePick] = useState<string | null>(null);
  const [educationPick, setEducationPick] = useState<string | null>(null);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      const sa = a.scores?.[dimension]?.score ?? 0;
      const sb = b.scores?.[dimension]?.score ?? 0;
      return sb - sa;
    });
  }, [profiles, dimension]);

  useEffect(() => {
    setIdx(0);
  }, [dimension]);

  const advance = () => {
    if (sortedProfiles.length === 0) return;
    setIdx((i) => (i + 1) % sortedProfiles.length);
  };

  const handleLike = async () => {
    if (!profile) return;

    // Call API to express interest
    const currentUserId = "current-user-123"; // TODO: Get from auth context
    const result = await discoverService.connect(currentUserId, profile.id);

    if (result.isMatch) {
      setMatchedProfile(profile);
      setShowMatchOverlay(true);
    } else {
      advance();
    }
  };

  const handleStartConversation = () => {
    setShowMatchOverlay(false);
    if (matchedProfile) {
      router.push(`/chats/${matchedProfile.id}` as never);
    }
  };

  const handleKeepDiscovering = () => {
    setShowMatchOverlay(false);
    setMatchedProfile(null);
    advance();
  };

  const profile = sortedProfiles[idx];
  const dimLabel = DIM_LABEL[dimension];

  // Direction-driven header — hides on scroll down, reveals on scroll up.
  const scrollY = useSharedValue(0);
  const hidden = useSharedValue(0); // 0 = shown, 1 = hidden
  const [filterHeaderH, setFilterHeaderH] = useState(140);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e, ctx: { prev?: number }) => {
      const y = e.contentOffset.y;
      const prev = ctx.prev ?? 0;
      const dy = y - prev;
      if (y <= 8) {
        hidden.value = withTiming(0, { duration: 200 });
      } else if (dy > 1) {
        hidden.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
      } else if (dy < -1) {
        hidden.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      }
      ctx.prev = y;
      scrollY.value = y;
    },
  });
  const filterHeaderStyle = useAnimatedStyle(() => ({
    opacity: 1 - hidden.value,
    transform: [{ translateY: -filterHeaderH * hidden.value }],
  }));

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {/* Scrollable profile content — headers overlay on top */}
      <Animated.ScrollView
        contentContainerStyle={{
          paddingBottom: NAV_CLEARANCE,
          // filterHeaderH already includes insets.top (the overlay applies it
          // as internal padding to sit below the notch). The ScrollView
          // itself starts inside the SafeAreaView's insets.top padding, so
          // we subtract it here to avoid the notch height being counted
          // twice — otherwise there's a big empty gap under the chips row.
          paddingTop: Math.max(0, filterHeaderH - insets.top) + 6,
        }}
        showsVerticalScrollIndicator={false}
        testID="discover-scroll"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {profile ? (
          <Animated.View
            key={`${profile.id}-${dimension}`}
            entering={FadeIn.duration(300).easing(Easing.out(Easing.cubic))}
            exiting={FadeOut.duration(180)}
            testID="discover-card"
          >
            <ProfileView
              profile={profile}
              dimension={dimension}
            />
          </Animated.View>
        ) : (
          <Text style={styles.empty}>Loading…</Text>
        )}
      </Animated.ScrollView>

      {/* ─── Floating action pill — Decline (X) + Interest (Send) ─── */}
      {profile ? (
        <View
          pointerEvents="box-none"
          style={[styles.actionFloat, { bottom: insets.bottom + 72 }]}
        >
          <Touchable
            feedback="scale"
            testID="discover-action-decline"
            onPress={advance}
            hitSlop={8}
            style={[styles.actionFloatBtn, styles.actionFloatDecline]}
          >
            <X size={22} color={colors.text.primary} strokeWidth={2.4} />
          </Touchable>
          <Touchable
            feedback="scale"
            testID="discover-action-interest"
            onPress={handleLike}
            hitSlop={8}
            style={[styles.actionFloatBtn, styles.actionFloatInterest]}
          >
            <Send
              size={22}
              color={colors.text.onBrand}
              strokeWidth={2.2}
              style={{ transform: [{ translateX: -1 }] }}
            />
          </Touchable>
        </View>
      ) : null}

      {/* ─── Overlay: Filter header (hides on scroll down, reveals on scroll up) ─── */}
      <Animated.View
        style={[styles.headerOverlay, { paddingTop: insets.top }, filterHeaderStyle]}
        onLayout={(e) => setFilterHeaderH(e.nativeEvent.layout.height)}
        testID="discover-filter-header"
      >
        {/* Header — [🔷 logo]   [✨ Showing your best XXX matches ▾]   [Cog] */}
        <View style={styles.header}>
          <View style={styles.brandDot} pointerEvents="none">
            <Logo size={22} />
          </View>

          <Touchable
            testID="filter-chip-compatibility"
            onPress={() => setSheetOpen(true)}
            style={[styles.statusPill]}
          >
            <Sparkles size={12} color={colors.brand.default} strokeWidth={2} />
            <Text style={styles.statusPillText} numberOfLines={1}>
              Showing your best{" "}
              <Text style={styles.statusPillHi}>{dimLabel}</Text> matches
            </Text>
            <ChevronDown size={12} color={colors.brand.default} strokeWidth={2} />
          </Touchable>

          <Touchable
            testID="filter-icon"
            onPress={() => router.push("/filters" as never)}
            style={[styles.settingsBtn]}
            hitSlop={8}
          >
            <SlidersHorizontal size={16} color={colors.brand.default} strokeWidth={2} />
          </Touchable>
        </View>

        {/* Filter chip row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {QUICK_CHIPS.map((c) => (
            <Touchable
              key={c.key}
              testID={`filter-chip-${c.key}`}
              onPress={() => setQuickKey(c.key)}
              style={styles.chip}
            >
              <Text style={styles.chipLabel}>{c.label}</Text>
              <Crown size={11} color={colors.premium.icon} strokeWidth={2} fill={colors.premium.icon} />
              <ChevronDown size={12} color={colors.text.muted} strokeWidth={2} />
            </Touchable>
          ))}
        </ScrollView>
      </Animated.View>

      <FloatingNav />

      <CompatibilitySheet
        visible={sheetOpen}
        selected={dimension}
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          setDimension(next);
          setStoreMode(next);
        }}
      />

      {/* ── Premium filter dialogs — Apply routes to /premium ── */}
      {(() => {
        const close = () => setQuickKey(null);
        const goPremium = () => {
          close();
          router.push("/premium" as never);
        };
        return (
          <>
            <PremiumFilterDialog
              visible={quickKey === "height"}
              title="Height"
              subtitle="Filter matches by height range."
              onClose={close}
              onApply={goPremium}
              applyLabel="Apply"
            >
              <DualRangeSlider
                min={HEIGHT_MIN}
                max={HEIGHT_MAX}
                low={heightRange[0]}
                high={heightRange[1]}
                onChange={(lo, hi) => setHeightRange([lo, hi])}
                format={(v) => `${v} cm`}
              />
            </PremiumFilterDialog>

            <PremiumFilterDialog
              visible={quickKey === "build"}
              title="Build"
              subtitle="Pick a body type."
              onClose={close}
              onApply={goPremium}
            >
              <ChipPicker
                options={BUILD_OPTIONS}
                value={buildPick}
                onChange={setBuildPick}
              />
            </PremiumFilterDialog>

            <PremiumFilterDialog
              visible={quickKey === "income"}
              title="Income"
              subtitle="Annual income range."
              onClose={close}
              onApply={goPremium}
            >
              <OptionList
                options={INCOME_OPTIONS}
                value={incomePick}
                onChange={setIncomePick}
              />
            </PremiumFilterDialog>

            <PremiumFilterDialog
              visible={quickKey === "education"}
              title="Education"
              subtitle="Highest education level."
              onClose={close}
              onApply={goPremium}
            >
              <OptionList
                options={EDUCATION_OPTIONS}
                value={educationPick}
                onChange={setEducationPick}
              />
            </PremiumFilterDialog>
          </>
        );
      })()}

      {/* Match Overlay */}
      {matchedProfile && (
        <MatchOverlay
          visible={showMatchOverlay}
          currentUserPhoto="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400"
          matchedUserPhoto={matchedProfile.photos[0]}
          matchedUserName={matchedProfile.name}
          matchedUserId={matchedProfile.id}
          onStartConversation={handleStartConversation}
          onKeepDiscovering={handleKeepDiscovering}
        />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────── helpers ───────────────────────────

function ChipPicker({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.chipPickerWrap}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Touchable
            key={opt}
            testID={`dialog-chip-${opt}`}
            onPress={() => onChange(opt)}
            style={[styles.pickerChip, active && styles.pickerChipActive]}
          >
            <Text
              style={[styles.pickerChipText, active && styles.pickerChipTextActive]}
            >
              {opt}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

function OptionList({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ gap: spacing[2] }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Touchable
            key={opt}
            testID={`dialog-option-${opt}`}
            onPress={() => onChange(opt)}
            style={[styles.optionRow, active && styles.optionRowActive]}
          >
            <Text
              style={[styles.optionRowText, active && styles.optionRowTextActive]}
            >
              {opt}
            </Text>
            <View style={[styles.radio, active && styles.radioActive]}>
              {active ? <View style={styles.radioDot} /> : null}
            </View>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.default },

  // Header overlay (position:absolute so it can fade out over content)
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface.default,
    zIndex: 5,
  },

  // header
  header: {
    paddingHorizontal: spacing[3.5],
    paddingTop: spacing[1.5],
    paddingBottom: spacing[1.5],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    zIndex: 10,
  },
  // Combined "Showing your best XXX matches" pill (was 2 rows — now 1)
  statusPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1.5],
    height: 32,
    paddingHorizontal: spacing[3],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.brand,
  },
  brandDot: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPillText: {
    flex: 1,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    letterSpacing: -0.1,
  },
  statusPillHi: { color: colors.brand.default, fontWeight: fontWeight.extrabold },
  kicker: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.extrabold,
    letterSpacing: 2,
    color: colors.brand.default,
  },
  titleH1: {
    marginTop: spacing[0.5],
    fontSize: fontSize.h1,
    fontWeight: fontWeight.extrabold,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: "center",
    justifyContent: "center",
  },
  subHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
    flexDirection: "row",
    alignItems: "center",
  },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
    minWidth: 110,
  },
  headerPillText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    color: colors.brand.default,
    letterSpacing: -0.1,
  },

  // chip row (slim)
  chipsRow: {
    paddingHorizontal: spacing[3.5],
    paddingTop: spacing[0.5],
    paddingBottom: spacing[2],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1.5],
  },
  chip: {
    flexShrink: 0,
    height: 28,
    paddingHorizontal: spacing[2.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  chipLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    letterSpacing: -0.1,
  },

  // ── Premium dialog inner pickers ──
  chipPickerWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  pickerChip: {
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  pickerChipActive: { borderColor: colors.brand.default, backgroundColor: colors.surface.brand },
  pickerChipText: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.text.primary },
  pickerChipTextActive: { color: colors.brand.default, fontWeight: fontWeight.bold },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  optionRowActive: { borderColor: colors.brand.default, backgroundColor: colors.surface.brand },
  optionRowText: { fontSize: fontSize.bodyLarge, fontWeight: fontWeight.semibold, color: colors.text.primary },
  optionRowTextActive: { color: colors.brand.default, fontWeight: fontWeight.bold },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.border.neutralStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.brand.default },
  radioDot: { width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.brand.default },

  // banner
  banner: {
    marginHorizontal: spacing[4],
    marginTop: spacing[0.5],
    marginBottom: spacing[2],
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[3],
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  bannerText: { fontSize: fontSize.micro, fontWeight: fontWeight.medium, color: colors.text.primary },
  bannerHi: { color: colors.brand.default, fontWeight: fontWeight.bold },

  empty: { padding: spacing[8], textAlign: "center", color: colors.text.muted },

  // Floating action pill — sits above the FloatingNav.
  actionFloat: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: spacing[7],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 6,
  },
  actionFloatBtn: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  actionFloatDecline: {
    backgroundColor: colors.surface.default,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    shadowColor: colors.shadow.default,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  actionFloatInterest: {
    backgroundColor: colors.brand.default,
    shadowColor: colors.brand.default,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
