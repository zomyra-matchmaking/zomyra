/**
 * Reusable onboarding primitives ported from web (OptionCard / OptionGrid / ChipGroup /
 * SearchableSelect / RangeDualSlider). Pure RN.
 */
import { Check, Search, X } from "lucide-react-native";
import { useMemo, useState, type ReactNode } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii } from "@/src/theme/colors";

/* ============ OptionCard ============ */
type OptionCardProps = {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  compact?: boolean;
};

export function OptionCard({ selected, onSelect, title, description, compact }: OptionCardProps) {
  return (
    <Pressable
      testID={`option-${title}`}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.optCard,
        compact ? styles.optCardCompact : null,
        selected ? styles.optCardSelected : null,
        pressed && { transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.optTitle, compact && { fontSize: 14 }]}>{title}</Text>
        {description ? <Text style={styles.optDesc}>{description}</Text> : null}
      </View>
      {selected ? (
        <View style={styles.optCheck}>
          <Check size={12} color={colors.primaryForeground} strokeWidth={3.5} />
        </View>
      ) : null}
    </Pressable>
  );
}

/* ============ OptionGrid (responsive chip-style grid) ============ */
export function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  compact,
}: {
  options: readonly T[];
  value: T | "";
  onChange: (v: T) => void;
  compact?: boolean;
}) {
  // Chips: content-based width, wraps, centered. Looks like Bumble/Hinge
  // tag-style chips instead of full-width buttons. Cards animate on select
  // (scale 0.97 on press, soft border/bg transition).
  void compact;
  return (
    <View style={styles.gridWrap}>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <Pressable
            key={opt}
            testID={`option-${opt}`}
            onPress={() => onChange(opt)}
            style={({ pressed }) => [
              styles.chipCard,
              selected && styles.chipCardSelected,
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.chipCardText, selected && styles.chipCardTextSelected]}
            >
              {opt}
            </Text>
            {selected ? (
              <View style={styles.chipCheck}>
                <Check size={10} color={colors.primaryForeground} strokeWidth={3.5} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ============ ChipGroup (multi-select) ============ */
export function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => {
        const selected = value.includes(opt);
        return (
          <Pressable
            key={opt}
            testID={`chip-${opt}`}
            onPress={() => toggle(opt)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ============ SearchableSelect (bottom-sheet search modal) ============ */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select",
  label,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const insets = useSafeAreaInsets();
  const filtered = useMemo(
    () =>
      q.trim()
        ? options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()))
        : options,
    [q, options],
  );
  return (
    <>
      <Pressable
        testID="searchable-select"
        onPress={() => setOpen(true)}
        style={styles.selectTrigger}
      >
        <Text
          style={[
            styles.selectText,
            !value && { color: colors.mutedForeground },
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Search size={16} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.selectBackdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.selectSheet, { paddingBottom: insets.bottom + 8 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.grabber} />
            <View style={styles.selectHead}>
              <Text style={styles.selectHeadTitle}>{label ?? "Select"}</Text>
              <Pressable onPress={() => setOpen(false)} testID="select-close">
                <Text style={{ color: colors.primary, fontWeight: "600" }}>Done</Text>
              </Pressable>
            </View>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.mutedForeground} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search…"
                placeholderTextColor={colors.mutedForeground}
                style={styles.searchInput}
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                      setQ("");
                    }}
                    style={({ pressed }) => [
                      styles.selectItem,
                      selected && { backgroundColor: colors.secondary },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectItemText,
                        selected && { color: colors.primary, fontWeight: "600" },
                      ]}
                    >
                      {item}
                    </Text>
                    {selected ? <Check size={16} color={colors.primary} /> : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={{ padding: 16, textAlign: "center", color: colors.mutedForeground }}>
                  No results
                </Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/* ============ Range dual-thumb slider (simple) ============ */
import RangeSliderImpl from "./RangeSlider";
export const RangeDualSlider = RangeSliderImpl;

const styles = StyleSheet.create({
  optCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optCardCompact: {
    paddingVertical: 11,
  },
  optCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.secondary,
  },
  optTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.foreground,
  },
  optDesc: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    color: colors.mutedForeground,
  },
  optCheck: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  // ---- Chip-style grid layout (content-based width, wrapped, centered) ----
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    width: "100%",
    justifyContent: "center",
  },
  chipCard: {
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  chipCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.secondary,
  },
  chipCardText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
    textAlign: "center",
  },
  chipCardTextSelected: {
    color: colors.primary,
  },
  chipCheck: {
    marginLeft: 8,
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.secondary,
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.foreground,
  },
  chipTextSelected: {
    color: colors.primary,
  },
  selectTrigger: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    fontSize: 15,
    color: colors.foreground,
    flex: 1,
  },
  selectBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  selectSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    maxHeight: "80%",
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: 4,
  },
  selectHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  selectHeadTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.foreground,
  },
  selectItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectItemText: {
    fontSize: 15,
    color: colors.foreground,
  },
});

// Silence unused import warnings; ReactNode kept for future extension.
const _u: ReactNode | null = null;
void _u;
void X;
