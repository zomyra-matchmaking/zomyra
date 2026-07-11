/**
 * ProfileView — Premium matrimony layout (Apple + Hinge + Airbnb inspired).
 *
 * Interleaved photo + info cards in a single vertical column.
 * Tokens: PURPLE #5B2C6F · LIGHT_PURPLE #F5F3FF · BORDER #ECEAF7 ·
 *         TEXT #111827 · MUTED #6B7280.
 * Card radius 24, soft 0/8/24 rgba(0,0,0,0.06) shadow, 8-pt spacing.
 */
import {
  Briefcase,
  Cigarette,
  CigaretteOff,
  Crown,
  Dumbbell,
  Heart,
  HeartHandshake,
  Home,
  IndianRupee,
  Info,
  Landmark,
  Languages as LanguagesIcon,
  Leaf,
  MapPin,
  Plane,
  Sparkles,
  UserRound,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useMemo, useState, type ReactNode } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { CompatibilityDimension, DiscoverProfile } from "@/src/lib/discover/mock";

const SCREEN = Dimensions.get("window");
const SCREEN_W = Math.min(SCREEN.width, 430);
const SCREEN_H_FULL = SCREEN.height;
const PAD_X = 16; // 8-pt grid
const CARD_W = SCREEN_W - PAD_X * 2;

// ───── Design tokens ─────
const PURPLE = "#5B2C6F";
const LIGHT_PURPLE = "#F5F3FF";
const BORDER = "#ECEAF7";
const TEXT = "#111827";
const MUTED = "#6B7280";

const PROMPTS = [
  "Let's talk about hidden cafes ☕️",
  "Collecting sunsets whenever I can 🌅",
  "Chai talks and long drives ☕️🚗",
  "Slow Sundays and good books 📖",
  "Looking for my plus-one for adventures ✨",
];

// Lifestyle → icon
const LIFESTYLE_ICONS: Record<string, LucideIcon> = {
  Vegetarian: Leaf,
  "Non-Smoker": CigaretteOff,
  "Non-smoker": CigaretteOff,
  "Social Drinker": Wine,
  "Occasional Drinker": Wine,
  "Non-Drinker": Wine,
  "Eats Everything": Leaf,
  "Active Lifestyle": Dumbbell,
  Runner: Dumbbell,
  Yoga: Dumbbell,
  "Pet Lover": Heart,
  Creative: Sparkles,
  Spiritual: Sparkles,
  "Career Focused": Briefcase,
  "Family Oriented": Home,
};

// What we align on → icon
const ALIGN_ICONS: Record<string, LucideIcon> = {
  "Both want children": UserRound,
  "Similar household expectations": Home,
  "Open to relocation": Plane,
  "Open to relocate": Plane,
  "Different views on interfaith marriage": HeartHandshake,
  "Open to interfaith marriage": HeartHandshake,
  "Interfaith Marriage": HeartHandshake,
  "Aligned on financial discipline": Briefcase,
  "Different household expectations": Home,
  "Different career intensity": Briefcase,
  "Different relocation preferences": Plane,
  "Comfortable with smoking": Cigarette,
  "Comfortable with Smoking": Cigarette,
  "Vegetarian household": Leaf,
  "Vegetarian Household": Leaf,
};

const DIMENSION_TITLE: Record<CompatibilityDimension, string> = {
  all: "Why we think you'll get along",
  lifestyle: "How your lifestyles align",
  personality: "How your personalities align",
  priorities: "How your priorities align",
};

function findFact(profile: DiscoverProfile, label: string): string | undefined {
  return profile.facts.find((f) => f.label.toLowerCase() === label.toLowerCase())
    ?.value;
}

type Props = {
  profile: DiscoverProfile;
  dimension?: CompatibilityDimension;
  /** Optional: kept for compat with existing callers (Requests sheet); Discover now renders its own floating action bar. */
  onPass?: () => void;
  onConnect?: () => void;
  /** Optional custom footer (used by Requests bottom-sheet for Accept/Decline). */
  footer?: ReactNode;
};

export function ProfileView({ profile, dimension = "all", footer }: Props) {
  const [viewerPhoto, setViewerPhoto] = useState<string | null>(null);
  const [showReason, setShowReason] = useState(false);

  const prompts = useMemo(() => {
    const arr = [...PROMPTS];
    const seed = profile.id
      .split("")
      .reduce((a, c) => a + c.charCodeAt(0), 0);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (seed * (i + 1)) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [profile.id]);

  const dimScore = profile.scores?.[dimension];
  const reason = dimScore?.reason ?? profile.matchReason;
  const reasonTitle = DIMENSION_TITLE[dimension];

  const photos = useMemo(() => {
    const list = [profile.hero, ...profile.gallery];
    while (list.length < 3) list.push(profile.hero);
    return list.slice(0, 4);
  }, [profile.hero, profile.gallery]);

  const height = profile.height ?? findFact(profile, "Height") ?? "—";
  const build = profile.build ?? "—";
  const education = findFact(profile, "Education") ?? "—";
  const family = findFact(profile, "Family") ?? "—";
  const profession = findFact(profile, "Profession") ?? "—";
  const income = profile.income ?? findFact(profile, "Income") ?? "—";
  const languages = findFact(profile, "Languages") ?? "—";
  const religion = profile.religion ?? "—";

  const lifestyle = profile.lifestyle.slice(0, 6);
  const alignedItems = profile.snapshot;

  return (
    <View style={{ paddingBottom: 16 }}>
      {/* ── Identity header ── */}
      <View style={styles.identityRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.identityNameRow}>
            <Text style={styles.identityName} numberOfLines={1}>
              {profile.name}, {profile.age}
            </Text>
            {profile.premium ? (
              <View testID="discover-premium-badge" style={styles.premiumBadge}>
                <Crown size={11} color="#FFF" strokeWidth={2.4} fill="#FFF" />
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.identityLocRow}>
            <MapPin size={14} color={MUTED} strokeWidth={2} />
            <Text style={styles.identityLoc} numberOfLines={1}>
              {profile.location}
            </Text>
          </View>
        </View>
        <Pressable
          testID="discover-tier-chip"
          onPress={() => setShowReason(true)}
          style={({ pressed }) => [styles.refreshDot, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <Sparkles size={18} color={PURPLE} strokeWidth={2} />
        </Pressable>
      </View>

      <Prompt text={prompts[0]} />

      <PhotoCard
        uri={photos[0]}
        testID="discover-photo-0"
        onOpen={() => setViewerPhoto(photos[0])}
      />

      <InfoCard kicker="ABOUT ME" Icon={UserRound} testID="discover-about">
        <Text style={styles.cardBody}>{profile.summary}</Text>
      </InfoCard>

      <Prompt text={prompts[1]} />

      <PhotoCard
        uri={photos[1]}
        testID="discover-photo-1"
        onOpen={() => setViewerPhoto(photos[1])}
      />

      <InfoCard kicker="LIFESTYLE" Icon={Leaf} testID="discover-lifestyle">
        <View style={styles.lifestyleGrid}>
          {lifestyle.map((label) => {
            const I = LIFESTYLE_ICONS[label] ?? Sparkles;
            return (
              <View key={label} style={styles.lifestyleItem}>
                <I size={18} color={PURPLE} strokeWidth={2} />
                <Text style={styles.lifestyleText} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </InfoCard>

      <Prompt text={prompts[2]} />

      <PhotoCard
        uri={photos[2]}
        testID="discover-photo-2"
        onOpen={() => setViewerPhoto(photos[2])}
      />

      {alignedItems.length > 0 ? (
        <InfoCard
          kicker="WHAT WE ALIGN ON"
          Icon={HeartHandshake}
          testID="discover-align"
        >
          <View style={styles.lifestyleGrid}>
            {alignedItems.map((s) => {
              const I = ALIGN_ICONS[s.label] ?? Heart;
              return (
                <View key={s.label} style={styles.lifestyleItem}>
                  <I size={18} color={PURPLE} strokeWidth={2} />
                  <Text style={styles.lifestyleText} numberOfLines={2}>
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </InfoCard>
      ) : null}

      <StaticCard kicker="QUICK FACTS" Icon={Info} testID="discover-quick-facts">
        <View style={styles.factsRow}>
          <Fact value={height} label="Height" />
          <Fact value={build} label="Build" />
          <Fact value={education} label="Education" />
          <Fact value={family} label="Family" />
        </View>
      </StaticCard>

      <StaticCard
        kicker="PROFESSION & INCOME"
        Icon={Briefcase}
        testID="discover-profession-income"
      >
        <View style={styles.factsRow}>
          <FactWithIcon Icon={Briefcase} value={profession} label="Profession" />
          <FactWithIcon Icon={IndianRupee} value={income} label="Income" />
        </View>
      </StaticCard>

      <StaticCard
        kicker="LANGUAGES & RELIGION"
        Icon={LanguagesIcon}
        testID="discover-lang-religion"
      >
        <View style={styles.factsRow}>
          <FactWithIcon Icon={LanguagesIcon} value={languages} label="Languages" />
          <FactWithIcon Icon={Landmark} value={religion} label="Religion" />
        </View>
      </StaticCard>

      {/* Match-reason modal */}
      <Modal
        visible={showReason}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReason(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.reasonBackdrop}
          onPress={() => setShowReason(false)}
        >
          <Pressable style={styles.reasonCard} onPress={() => {}}>
            <View style={styles.reasonChip}>
              <Sparkles size={12} color="#FFF" strokeWidth={2.6} />
              <Text style={styles.reasonChipText}>
                {dimScore?.tier ?? profile.compatibility}
              </Text>
            </View>
            <Text style={styles.reasonTitle}>{reasonTitle}</Text>
            <Text style={styles.reasonBody}>{reason}</Text>
            <Pressable
              onPress={() => setShowReason(false)}
              style={({ pressed }) => [
                styles.reasonCloseBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.reasonCloseText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
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
          <TouchableOpacity
            testID="photo-viewer-close"
            onPress={() => setViewerPhoto(null)}
            style={styles.viewerClose}
            activeOpacity={0.8}
          >
            <X size={22} color="#FFF" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={1}
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
          </TouchableOpacity>
        </View>
      </Modal>
      {footer ? <View style={styles.footerSlot}>{footer}</View> : null}
    </View>
  );
}

// ──────────────────────────── helpers ────────────────────────────

function Prompt({ text }: { text: string }) {
  return (
    <Text style={styles.prompt} numberOfLines={2}>
      {text}
    </Text>
  );
}

function PhotoCard({
  uri,
  onOpen,
  testID,
}: {
  uri: string;
  onOpen?: () => void;
  testID?: string;
}) {
  return (
    <View style={styles.photoCardWrap}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onOpen}
        style={styles.photoCard}
        testID={testID}
      >
        <Image source={{ uri }} style={styles.photoImg} />
      </TouchableOpacity>
    </View>
  );
}

function InfoCard({
  kicker,
  Icon,
  children,
  testID,
}: {
  kicker: string;
  Icon: LucideIcon;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.infoCard} testID={testID}>
      <View style={styles.infoHeaderRow}>
        <Icon size={14} color={PURPLE} strokeWidth={2} />
        <Text style={styles.kicker}>{kicker}</Text>
      </View>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

function StaticCard({
  kicker,
  Icon,
  children,
  testID,
}: {
  kicker: string;
  Icon: LucideIcon;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View style={[styles.infoCard, styles.collapsibleCard]} testID={testID}>
      <View style={styles.infoHeaderRow}>
        <Icon size={14} color={PURPLE} strokeWidth={2} />
        <Text style={styles.kicker}>{kicker}</Text>
      </View>
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.factItem}>
      <Text style={styles.factValue} numberOfLines={2}>
        {value}
      </Text>
      <Text style={styles.factLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function FactWithIcon({
  Icon,
  value,
  label,
}: {
  Icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.factItem}>
      <View style={styles.factIconRow}>
        <Icon size={14} color={PURPLE} strokeWidth={2} />
        <Text style={styles.factValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
      <Text style={styles.factLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Identity
  identityRow: {
    paddingHorizontal: PAD_X,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  identityName: {
    fontSize: 28,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  identityNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: PURPLE,
    shadowColor: PURPLE,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  identityLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  identityLoc: { fontSize: 13, color: MUTED, fontWeight: "500" },
  refreshDot: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: LIGHT_PURPLE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  // Prompts
  prompt: {
    paddingHorizontal: PAD_X,
    marginTop: 24,
    marginBottom: 8,
    fontSize: 20,
    fontWeight: "600",
    color: TEXT,
    letterSpacing: -0.3,
  },

  // Photo card
  photoCardWrap: { paddingHorizontal: PAD_X, marginTop: 8 },
  photoCard: {
    width: CARD_W,
    height: Math.round(CARD_W * 1.0),
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: LIGHT_PURPLE,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  photoImg: { width: "100%", height: "100%" },
  footerSlot: { paddingHorizontal: PAD_X, paddingTop: 16 },

  // Info card
  infoCard: {
    marginTop: 16,
    marginHorizontal: PAD_X,
    backgroundColor: LIGHT_PURPLE,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  collapsibleCard: {
    backgroundColor: "#FFFFFF",
    borderColor: BORDER,
  },
  infoHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  kicker: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    color: PURPLE,
    textTransform: "uppercase",
  },
  cardBody: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
    color: TEXT,
  },

  // Lifestyle / align grid
  lifestyleGrid: { flexDirection: "row", flexWrap: "wrap" },
  lifestyleItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingRight: 8,
  },
  lifestyleText: {
    fontSize: 14,
    fontWeight: "500",
    color: TEXT,
    flexShrink: 1,
  },

  // Quick facts
  factsRow: { flexDirection: "row", flexWrap: "wrap" },
  factItem: {
    width: "50%",
    paddingVertical: 8,
    paddingRight: 8,
  },
  factIconRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  factValue: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT,
    flexShrink: 1,
  },
  factLabel: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "400",
    color: MUTED,
  },

  // Reason modal
  reasonBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  reasonCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  reasonChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: PURPLE,
  },
  reasonChipText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  reasonTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: TEXT,
    letterSpacing: -0.3,
  },
  reasonBody: { fontSize: 16, lineHeight: 24, color: TEXT, fontWeight: "400" },
  reasonCloseBtn: {
    marginTop: 8,
    alignSelf: "flex-end",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: PURPLE,
  },
  reasonCloseText: { color: "#FFF", fontSize: 14, fontWeight: "600" },

  // Photo viewer
  viewerRoot: { flex: 1, backgroundColor: "#000" },
  viewerBackdrop: { flex: 1, alignItems: "center", justifyContent: "center" },
  viewerImage: { width: SCREEN_W, height: SCREEN_H_FULL * 0.85 },
  viewerClose: {
    position: "absolute",
    top: 48,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
});
