/**
 * Reusable onboarding primitives ported from web (OptionCard / OptionGrid / ChipGroup /
 * SearchableSelect / RangeDualSlider). Pure RN.
 */
import { Check, Search, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, radii, fontSize, fontWeight } from "@/src/theme";

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
        <Text style={[styles.optTitle, compact && { fontSize: fontSize.body }]}>{title}</Text>
        {description ? <Text style={styles.optDesc}>{description}</Text> : null}
      </View>
      {selected ? (
        <View style={styles.optCheck}>
          <Check size={12} color={colors.brand.onBrand} strokeWidth={3.5} />
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
                <Check size={10} color={colors.brand.onBrand} strokeWidth={3.5} />
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

/* ============ SearchableSelect (inline autosuggest) ============
 * UX:
 * - Renders directly on the screen (NO modal / bottom sheet).
 * - Tap the input → keyboard opens.
 * - Type at least MIN_CHARS characters → filtered suggestions appear in
 *   a floating panel.
 * - **Smart placement**: the panel is shown BELOW the input by default;
 *   if the keyboard leaves too little room below (< MIN_PANEL_HEIGHT),
 *   the panel flips ABOVE the input so the keyboard never covers it.
 * - Tap a suggestion → value committed, panel closes, keyboard dismisses.
 *
 * The `label` prop is unused now (kept for API compat).
 */
const MIN_CHARS = 3;
const MAX_SUGGESTIONS = 6;
// Minimum room below the input we need to still prefer the "below"
// placement. Roughly ~4 rows @ 45px per suggestion + a bit of breathing
// room. If we can't get at least this much below the input (once the
// keyboard is showing), we flip the panel to above.
const MIN_PANEL_HEIGHT = 200;

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select",
  label: _label,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  void _label; // silence unused
  const [q, setQ] = useState(value);
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Smart placement plumbing ──────────────────────────────────
  // Measure the input's absolute Y position on the screen and combine
  // with the keyboard height to decide whether "below" or "above" fits.
  const inputWrapRef = useRef<View>(null);
  const [inputTop, setInputTop] = useState(0);
  const [inputH, setInputH] = useState(52);
  const [kbHeight, setKbHeight] = useState(0);
  const screenH = Dimensions.get("window").height;

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKbHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Re-measure the input's position whenever it's focused (keyboard opens
  // → viewport may resize on Android with adjustResize) or the keyboard
  // height changes.
  useEffect(() => {
    if (!focused) return;
    // A tiny delay lets any keyboard-driven layout shift settle first.
    const t = setTimeout(() => {
      inputWrapRef.current?.measureInWindow((_x, y, _w, h) => {
        if (typeof y === "number") setInputTop(y);
        if (typeof h === "number" && h > 0) setInputH(h);
      });
    }, 60);
    return () => clearTimeout(t);
  }, [focused, kbHeight]);

  // ─── Search / filter ───────────────────────────────────────────
  // If the parent value changes externally (e.g. onboarding "back" restoring
  // an answer), keep the input in sync.
  useEffect(() => {
    setQ(value);
  }, [value]);

  const trimmed = q.trim();
  const shouldSearch = trimmed.length >= MIN_CHARS;

  const filtered = useMemo(() => {
    if (!shouldSearch) return [] as string[];
    // Suppress the panel once the input exactly matches a committed value;
    // otherwise it lingers on top of the input after selection.
    if (trimmed.toLowerCase() === value.trim().toLowerCase()) return [];
    const needle = trimmed.toLowerCase();
    const starts: string[] = [];
    const contains: string[] = [];
    for (const o of options) {
      const l = o.toLowerCase();
      if (l.startsWith(needle)) starts.push(o);
      else if (l.includes(needle)) contains.push(o);
    }
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [shouldSearch, trimmed, options, value]);

  const showPanel = focused && shouldSearch;

  // Decide placement based on real geometry:
  //   spaceBelow = screenHeight - keyboardHeight - inputBottom
  //   spaceAbove = inputTop
  // Prefer "below" (Google-like). Flip to "above" only when the keyboard
  // eats so much space below the input that we can't fit MIN_PANEL_HEIGHT
  // AND there is more room above than below.
  const spaceBelow = Math.max(
    0,
    screenH - kbHeight - (inputTop + inputH) - 8, // -8 for a small gap
  );
  const spaceAbove = Math.max(0, inputTop - 8);
  const placeAbove =
    spaceBelow < MIN_PANEL_HEIGHT && spaceAbove > spaceBelow;
  // Cap the panel's height to whichever side we chose so it never overflows.
  const panelMaxHeight = Math.max(
    120,
    Math.min(280, placeAbove ? spaceAbove : spaceBelow),
  );

  const commit = (item: string) => {
    // Clear any pending blur so the panel doesn't disappear before we
    // finish reading the tap.
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    onChange(item);
    setQ(item);
    setFocused(false);
    Keyboard.dismiss();
  };

  const handleFocus = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setFocused(true);
  };

  const handleBlur = () => {
    // Small delay so a tap on a suggestion below/above the input registers
    // before we tear down the panel.
    blurTimer.current = setTimeout(() => {
      setFocused(false);
      blurTimer.current = null;
    }, 180);
  };

  const clear = () => {
    setQ("");
    onChange("");
  };

  return (
    <View style={styles.searchableWrap}>
      {/* Suggestions panel — placement flips between above and below based
          on how much room the keyboard leaves. */}
      {showPanel ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.suggestPanel,
            placeAbove
              ? { bottom: "100%", marginBottom: 8 }
              : { top: "100%", marginTop: 8 },
            { maxHeight: panelMaxHeight },
          ]}
        >
          {filtered.length === 0 ? (
            <View style={styles.suggestEmpty}>
              <Text style={styles.suggestEmptyText}>
                No matches for &ldquo;{trimmed}&rdquo;
              </Text>
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: panelMaxHeight }}
              // When placed above the input we render bottom-up so the
              // top-ranked match sits closest to the input. When placed
              // below, the natural top-down order does the same thing.
              contentContainerStyle={
                placeAbove ? { flexDirection: "column-reverse" } : undefined
              }
            >
              {filtered.map((item) => {
                const selected = item === value;
                return (
                  <Pressable
                    key={item}
                    testID={`suggestion-${item}`}
                    onPress={() => commit(item)}
                    style={({ pressed }) => [
                      styles.suggestItem,
                      selected && styles.suggestItemSelected,
                      pressed && styles.suggestItemPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.suggestItemText,
                        selected && styles.suggestItemTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {selected ? (
                      <Check size={16} color={colors.brand.default} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : null}

      {/* The input itself */}
      <View
        ref={inputWrapRef}
        onLayout={() => {
          // Fire an initial measurement so the placement math has real
          // numbers even before the keyboard opens.
          inputWrapRef.current?.measureInWindow((_x, y, _w, h) => {
            if (typeof y === "number") setInputTop(y);
            if (typeof h === "number" && h > 0) setInputH(h);
          });
        }}
        style={[
          styles.searchableInputWrap,
          focused && styles.searchableInputWrapFocused,
        ]}
      >
        <Search size={16} color={colors.text.muted} />
        <TextInput
          testID="searchable-select-input"
          value={q}
          onChangeText={setQ}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.text.muted}
          style={styles.searchableInput}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="done"
        />
        {q.length > 0 ? (
          <Pressable
            testID="searchable-select-clear"
            onPress={clear}
            hitSlop={8}
          >
            <X size={16} color={colors.text.muted} />
          </Pressable>
        ) : null}
      </View>

      {/* Helper line below the input — visible only while typing before
          they've hit the 3-char threshold. */}
      {focused && !shouldSearch && q.length > 0 ? (
        <Text style={styles.searchableHelper}>
          Keep typing… (at least {MIN_CHARS} letters)
        </Text>
      ) : null}
    </View>
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
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  optCardCompact: {
    paddingVertical: 11,
  },
  optCardSelected: {
    borderColor: colors.brand.default,
    borderWidth: 2,
    backgroundColor: colors.surface.brand,
  },
  optTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  optDesc: {
    marginTop: 2,
    fontSize: fontSize.label,
    lineHeight: 17,
    color: colors.text.muted,
  },
  optCheck: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
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
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  chipCardSelected: {
    borderColor: colors.brand.default,
    borderWidth: 2,
    backgroundColor: colors.surface.brand,
  },
  chipCardText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    textAlign: "center",
  },
  chipCardTextSelected: {
    color: colors.brand.default,
  },
  chipCheck: {
    marginLeft: 8,
    width: 16,
    height: 16,
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
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
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  chipSelected: {
    borderColor: colors.brand.default,
    borderWidth: 2,
    backgroundColor: colors.surface.brand,
  },
  chipText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  chipTextSelected: {
    color: colors.brand.default,
  },
  selectTrigger: {
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    fontSize: fontSize.bodyLarge,
    color: colors.text.primary,
    flex: 1,
  },
  // ─── Inline autosuggest ─────────────────────────────────────────
  searchableWrap: {
    position: "relative",
    // Ensure the floating suggestions panel isn't clipped by any parent
    // container that inadvertently has hidden overflow.
    overflow: "visible",
    zIndex: 10,
  },
  searchableInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
    paddingHorizontal: 14,
  },
  searchableInputWrapFocused: {
    borderColor: colors.brand.default,
    borderWidth: 2,
    paddingHorizontal: 13,
  },
  searchableInput: {
    flex: 1,
    fontSize: fontSize.bodyLarge,
    color: colors.text.primary,
    // Compensate for the border-width jump between focused/blurred so text
    // doesn't jump on focus.
    paddingVertical: 0,
  },
  searchableHelper: {
    marginTop: 6,
    marginLeft: 4,
    fontSize: fontSize.caption,
    color: colors.text.muted,
  },
  // Floating suggestions panel. Absolute-positioned relative to the wrap.
  // The `top` / `bottom` and `maxHeight` are set inline so the component
  // can flip the panel between below-input (default) and above-input based
  // on how much space the keyboard leaves.
  suggestPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: colors.surface.default,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    // Subtle shadow so the panel looks like it floats over the screen.
    shadowColor: colors.shadow.default,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
    overflow: "hidden",
    zIndex: 20,
  },
  suggestScroll: {
    // Height is capped inline via `maxHeight` based on live geometry.
  },
  suggestItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  suggestItemPressed: {
    backgroundColor: colors.surface.brand,
  },
  suggestItemSelected: {
    backgroundColor: colors.surface.brand,
  },
  suggestItemText: {
    fontSize: fontSize.bodyLarge,
    color: colors.text.primary,
  },
  suggestItemTextSelected: {
    color: colors.brand.default,
    fontWeight: fontWeight.semibold,
  },
  suggestEmpty: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  suggestEmptyText: {
    fontSize: fontSize.label,
    color: colors.text.muted,
    textAlign: "center",
  },
});

// Silence unused import warnings; ReactNode kept for future extension.
const _u: ReactNode | null = null;
void _u;
void X;
