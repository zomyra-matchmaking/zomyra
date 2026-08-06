/**
 * Reusable onboarding primitives ported from web (OptionCard / OptionGrid / ChipGroup /
 * SearchableSelect / RangeDualSlider). Pure RN.
 */
import { Check, Search, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Dimensions, Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import type { CatalogueOption } from "@/src/api";
import { colors, radii, fontSize, fontWeight, spacing } from "@/src/theme";
import { Touchable } from "@/src/components/ui";
import { isIOS } from "@/src/utils/platform";

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
    <Touchable
      feedback="scale"
      testID={`option-${title}`}
      onPress={onSelect}
      style={[styles.optCard, compact ? styles.optCardCompact : null, selected ? styles.optCardSelected : null]}
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
    </Touchable>
  );
}

/**
 * ============ OptionGrid (responsive chip-style grid) ============
 *
 * **Module 5 changed these three primitives from `string[]` to
 * `CatalogueOption[]`**, and the change is FR-3b's whole shape in miniature:
 * what is *shown* and what is *stored* stopped being the same value. Before,
 * `value` was the label the user tapped; now it is the catalogue key behind it,
 * and the label only ever reaches the screen.
 *
 * The mistake this makes hard: nothing in the component can produce a label
 * where a key belongs, because `onChange` is fed from `option.key` and there is
 * no path from the rendered text back to the caller.
 *
 * ⚠️ **`testID`s are keyed on `key`, not on the label.** They were `option-Male`
 * and are now `option-male`. That is deliberate — a test fixed to a label breaks
 * the moment the backend rewords one, which under FR-3b it may do at any time
 * without a client release. Any Maestro flow written against the old ids needs
 * updating (none exist yet — FE §13's tooling is uninstalled, MIGRATION §12.7).
 */
export function OptionGrid({
  options,
  value,
  onChange,
  compact,
}: {
  options: readonly CatalogueOption[];
  value: string;
  onChange: (key: string) => void;
  compact?: boolean;
}) {
  // Chips: content-based width, wraps, centered. Looks like Bumble/Hinge
  // tag-style chips instead of full-width buttons. Cards animate on select
  // (scale 0.97 on press, soft border/bg transition).
  void compact;
  return (
    <View style={styles.gridWrap}>
      {options.map((opt) => {
        const selected = value === opt.key;
        return (
          <Touchable
            feedback="scale"
            key={opt.key}
            testID={`option-${opt.key}`}
            onPress={() => onChange(opt.key)}
            style={[styles.chipCard, selected && styles.chipCardSelected]}
          >
            <Text
              numberOfLines={1}
              style={[styles.chipCardText, selected && styles.chipCardTextSelected]}
            >
              {opt.label}
            </Text>
            {selected ? (
              <View style={styles.chipCheck}>
                <Check size={10} color={colors.brand.onBrand} strokeWidth={3.5} />
              </View>
            ) : null}
          </Touchable>
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
  options: readonly CatalogueOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((v) => v !== key) : [...value, key]);

  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => {
        const selected = value.includes(opt.key);
        return (
          <Touchable
            key={opt.key}
            testID={`chip-${opt.key}`}
            onPress={() => toggle(opt.key)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
          </Touchable>
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

/**
 * A type-to-filter picker over a catalogue category.
 *
 * ⚠️ **Two values, and conflating them is the bug this component exists to
 * prevent.** `value` is the committed **key** (`"swe"`); `q` is the **text in
 * the box**, which is a label while browsing and freely-typed garbage in
 * between. They are related only through `options` — never assume `q` is a
 * label, and never let `q` reach `onChange`. Selection happens exclusively by
 * tapping a suggestion, which carries a real `CatalogueOption` with it.
 *
 * A consequence worth stating: **typing an exact label and walking away selects
 * nothing.** That is intended. Free text is not a catalogue value (O-15 settled
 * that `city` is a closed set), so a value the user never picked from the list
 * must not be submittable.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select",
  label: _label,
}: {
  options: readonly CatalogueOption[];
  /** The committed catalogue **key**, or `""`. */
  value: string;
  onChange: (key: string) => void;
  placeholder?: string;
  label?: string;
}) {
  void _label; // silence unused
  const selectedLabel = useMemo(
    () => options.find((o) => o.key === value)?.label ?? "",
    [options, value],
  );
  const [q, setQ] = useState(selectedLabel);
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
    const showEvt = isIOS ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = isIOS ? "keyboardWillHide" : "keyboardDidHide";
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
  // If the parent value changes externally — onboarding "back" restoring an
  // answer, or the catalogue arriving after this mounted, which is the normal
  // case on a cold onboarding since API-39 is in flight while the first screens
  // render — resync the box to the selected option's label.
  useEffect(() => {
    setQ(selectedLabel);
  }, [selectedLabel]);

  const trimmed = q.trim();
  const shouldSearch = trimmed.length >= MIN_CHARS;

  const filtered = useMemo(() => {
    if (!shouldSearch) return [] as CatalogueOption[];
    // Suppress the panel once the input exactly matches the committed option's
    // label; otherwise it lingers on top of the input after selection.
    if (trimmed.toLowerCase() === selectedLabel.trim().toLowerCase()) return [];
    const needle = trimmed.toLowerCase();
    const starts: CatalogueOption[] = [];
    const contains: CatalogueOption[] = [];
    for (const o of options) {
      const l = o.label.toLowerCase();
      if (l.startsWith(needle)) starts.push(o);
      else if (l.includes(needle)) contains.push(o);
    }
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [shouldSearch, trimmed, options, selectedLabel]);

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

  const commit = (item: CatalogueOption) => {
    // Clear any pending blur so the panel doesn't disappear before we
    // finish reading the tap.
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    // The key goes up; the label goes in the box. This is the one place the two
    // are both in hand, which is why selection cannot happen anywhere else.
    onChange(item.key);
    setQ(item.label);
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
              ? { bottom: "100%", marginBottom: spacing[2] }
              : { top: "100%", marginTop: spacing[2] },
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
                const selected = item.key === value;
                return (
                  <Touchable
                    key={item.key}
                    testID={`suggestion-${item.key}`}
                    onPress={() => commit(item)}
                    feedback="highlight"
                    style={[
                      styles.suggestItem,
                      selected && styles.suggestItemSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.suggestItemText,
                        selected && styles.suggestItemTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {selected ? (
                      <Check size={16} color={colors.brand.default} />
                    ) : null}
                  </Touchable>
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
          <Touchable
            testID="searchable-select-clear"
            onPress={clear}
            hitSlop={8}
          >
            <X size={16} color={colors.text.muted} />
          </Touchable>
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
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  optCardCompact: {
    paddingVertical: spacing[3],
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
    marginTop: spacing[0.5],
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
    marginLeft: spacing[3],
  },
  // ---- Chip-style grid layout (content-based width, wrapped, centered) ----
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2.5],
    width: "100%",
    justifyContent: "center",
  },
  chipCard: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing[4.5],
    paddingVertical: spacing[3],
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
    marginLeft: spacing[2],
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
    gap: spacing[2],
    justifyContent: "center",
  },
  chip: {
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
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
    paddingHorizontal: spacing[4],
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
    gap: spacing[2.5],
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
    paddingHorizontal: spacing[3.5],
  },
  searchableInputWrapFocused: {
    borderColor: colors.brand.default,
    borderWidth: 2,
    paddingHorizontal: spacing[3],
  },
  searchableInput: {
    flex: 1,
    fontSize: fontSize.bodyLarge,
    color: colors.text.primary,
    // Compensate for the border-width jump between focused/blurred so text
    // doesn't jump on focus.
    paddingVertical: spacing[0],
  },
  searchableHelper: {
    marginTop: spacing[1.5],
    marginLeft: spacing[1],
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
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
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
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[4],
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
