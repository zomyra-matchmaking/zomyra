/**
 * Filters screen — inline accordion design.
 *
 *  - Basic Filters: Age (range slider), Location/Religion/Diet/Smoking (multi-select chips)
 *  - Premium Filters: same chip multi-select once user has Premium; otherwise
 *    tap routes to /premium.
 *
 * Tapping a row expands it in place (no bottom-sheet popup) — the picker
 * lives directly under the row label, Hinge / Bumble style.
 */
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronUp,
  Cigarette,
  Crown,
  GraduationCap,
  Heart,
  Home,
  IndianRupee,
  Landmark,
  Languages as LanguagesIcon,
  Leaf,
  Lock,
  MapPin,
  Ruler,
  User,
  Wine,
  type LucideIcon,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DualRangeSlider } from "@/src/components/discover/DualRangeSlider";
import {
  FILTER_OPTIONS,
  useDiscoverFilters,
  type MultiFilterKey,
} from "@/src/stores/discover-filters-store";
import { useRequestsStore } from "@/src/stores/requests-store";

const PURPLE = "#5B2C6F";
const LIGHT_PURPLE = "#F5F3FF";
const BORDER = "#ECEAF7";
const TEXT = "#111827";
const MUTED = "#6B7280";
const GOLD = "#F59E0B";

type RowKey = "age" | "height" | MultiFilterKey;

type Row = {
  key: RowKey;
  label: string;
  Icon: LucideIcon;
  premium?: boolean;
};

const BASIC_ROWS: Row[] = [
  { key: "age", label: "Age", Icon: Calendar },
  { key: "location", label: "Location", Icon: MapPin },
  { key: "religion", label: "Religion", Icon: Landmark },
  { key: "diet", label: "Diet", Icon: Leaf },
  { key: "smoking", label: "Smoking", Icon: Cigarette },
];

const PREMIUM_ROWS: Row[] = [
  { key: "height", label: "Height", Icon: Ruler, premium: true },
  { key: "build", label: "Build", Icon: User, premium: true },
  { key: "education", label: "Education", Icon: GraduationCap, premium: true },
  { key: "profession", label: "Profession", Icon: Briefcase, premium: true },
  { key: "income", label: "Income Range", Icon: IndianRupee, premium: true },
  { key: "family", label: "Family Type", Icon: Home, premium: true },
  { key: "children", label: "Children", Icon: Heart, premium: true },
  { key: "language", label: "Language", Icon: LanguagesIcon, premium: true },
  { key: "drinking", label: "Drinking", Icon: Wine, premium: true },
];

export default function FiltersScreen() {
  const router = useRouter();
  const filters = useDiscoverFilters();
  const isPremium = useRequestsStore((s) => s.premium);
  const [expanded, setExpanded] = useState<RowKey | null>(null);

  const toggleExpand = (key: RowKey, locked: boolean) => {
    if (locked) {
      router.push("/premium" as never);
      return;
    }
    setExpanded((cur) => (cur === key ? null : key));
  };

  const summaryOf = (key: RowKey): string => {
    if (key === "age") {
      const [lo, hi] = filters.age;
      return `${lo}–${hi} yrs`;
    }
    if (key === "height") {
      const [lo, hi] = filters.height;
      return `${lo}–${hi} cm`;
    }
    const arr = filters[key] as string[];
    if (arr.length === 0) return "Any";
    if (arr.length <= 2) return arr.join(", ");
    return `${arr[0]} +${arr.length - 1}`;
  };

  const renderEditor = (row: Row): ReactNode => {
    if (row.key === "age") {
      const [lo, hi] = filters.age;
      return (
        <View style={styles.editor}>
          <DualRangeSlider
            min={18}
            max={70}
            low={lo}
            high={hi}
            onChange={(l, h) => filters.setAge([l, h])}
            format={(v) => String(v)}
          />
        </View>
      );
    }
    if (row.key === "height") {
      const [lo, hi] = filters.height;
      return (
        <View style={styles.editor}>
          <DualRangeSlider
            min={140}
            max={210}
            low={lo}
            high={hi}
            onChange={(l, h) => filters.setHeight([l, h])}
            format={(v) => `${v} cm`}
          />
        </View>
      );
    }
    const opts = FILTER_OPTIONS[row.key];
    const selected = filters[row.key] as string[];
    return (
      <View style={styles.editor}>
        <View style={styles.chipWrap}>
          {opts.map((opt) => {
            const active = selected.includes(opt);
            return (
              <Pressable
                key={opt}
                testID={`filter-chip-${row.key}-${opt}`}
                onPress={() => filters.toggle(row.key, opt)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {selected.length > 0 ? (
          <Pressable
            testID={`filter-clear-${row.key}`}
            onPress={() => filters.clear(row.key)}
            style={({ pressed }) => [
              styles.clearChip,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.clearChipText}>Clear all</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const renderRow = (row: Row, last: boolean) => {
    const locked = !!row.premium && !isPremium;
    const isOpen = expanded === row.key;
    return (
      <View key={row.key}>
        <Pressable
          testID={`filters-row-${row.key}`}
          onPress={() => toggleExpand(row.key, locked)}
          style={[
            styles.row,
            !last && !isOpen && styles.rowDivider,
            isOpen && styles.rowOpen,
          ]}
        >
          <View style={styles.rowIcon}>
            <row.Icon size={18} color={PURPLE} strokeWidth={2} />
          </View>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <View style={{ flex: 1 }} />
          {locked ? (
            <View style={styles.lockBadge}>
              <Lock size={11} color={GOLD} strokeWidth={2.4} />
              <Text style={styles.lockText}>Premium</Text>
            </View>
          ) : (
            <>
              <Text
                style={[
                  styles.rowValue,
                  summaryOf(row.key) !== "Any" && styles.rowValueSet,
                ]}
                numberOfLines={1}
              >
                {summaryOf(row.key)}
              </Text>
              {isOpen ? (
                <ChevronUp size={18} color={MUTED} strokeWidth={2} />
              ) : (
                <ChevronDown size={18} color={MUTED} strokeWidth={2} />
              )}
            </>
          )}
        </Pressable>
        {isOpen && !locked ? renderEditor(row) : null}
        {isOpen && !last ? <View style={styles.dividerLine} /> : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="filters-back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <ArrowLeft size={22} color={TEXT} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Filters</Text>
        <Pressable
          testID="filters-reset"
          onPress={filters.reset}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>BASIC FILTERS</Text>
        <View style={styles.card}>
          {BASIC_ROWS.map((row, i) => renderRow(row, i === BASIC_ROWS.length - 1))}
        </View>

        <View style={styles.premiumTitleRow}>
          <Text style={styles.sectionTitle}>PREMIUM FILTERS</Text>
          <Crown size={14} color={GOLD} strokeWidth={2} fill={GOLD} />
          {isPremium ? (
            <View style={styles.unlockedPill}>
              <Text style={styles.unlockedPillText}>Unlocked</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.card}>
          {PREMIUM_ROWS.map((row, i) => renderRow(row, i === PREMIUM_ROWS.length - 1))}
        </View>
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
  headerBtn: {
    minWidth: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: TEXT, letterSpacing: -0.2 },
  resetText: { fontSize: 14, fontWeight: "700", color: PURPLE },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    color: PURPLE,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 10,
  },
  premiumTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 28,
    marginBottom: 10,
  },
  unlockedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: LIGHT_PURPLE,
    borderWidth: 1,
    borderColor: BORDER,
    marginLeft: 4,
  },
  unlockedPillText: { fontSize: 10, fontWeight: "800", color: PURPLE, letterSpacing: 0.3 },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFF",
  },
  rowOpen: { backgroundColor: "#FBF8FE" },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: BORDER },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: LIGHT_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 16, fontWeight: "600", color: TEXT },
  rowValue: { fontSize: 13.5, color: MUTED, fontWeight: "500", maxWidth: 160 },
  rowValueSet: { color: PURPLE, fontWeight: "700" },

  editor: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    backgroundColor: "#FBF8FE",
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFF",
  },
  chipActive: { borderColor: PURPLE, backgroundColor: LIGHT_PURPLE },
  chipText: { fontSize: 13, fontWeight: "600", color: TEXT },
  chipTextActive: { color: PURPLE, fontWeight: "700" },
  clearChip: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: BORDER,
  },
  clearChipText: { fontSize: 12, fontWeight: "700", color: MUTED },
  dividerLine: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },

  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  lockText: { fontSize: 11, fontWeight: "700", color: "#92400E" },
});
