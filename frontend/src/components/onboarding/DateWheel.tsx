/**
 * Lightweight RN date picker — three wheel-like columns (Day / Month / Year).
 *
 * Snap + selection model:
 *   - The visually-highlighted item is driven by a LOCAL `centerIndex` that
 *     updates on every scroll frame (the item currently aligned with the
 *     center band). This guarantees only ONE item is ever highlighted, and
 *     it's always the one in the band — no "previous selected stays bold
 *     while a new one becomes centered" double-highlight.
 *   - `onChange` to the parent only fires when the scroll comes to rest
 *     (momentum-end / drag-end + a web fallback debounce on idle scroll).
 *   - A subtle selection haptic fires whenever the centered index changes
 *     while scrolling (iOS picker feel).
 */
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";

const ITEM_H = 40;
const VISIBLE = 5;
const PAD = Math.floor(VISIBLE / 2);

function Wheel({
  values,
  selectedIndex,
  onChange,
  width,
}: {
  values: (string | number)[];
  selectedIndex: number;
  onChange: (i: number) => void;
  width: number;
}) {
  const ref = useRef<ScrollView>(null);
  const lastEmitted = useRef(selectedIndex);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserScrolling = useRef(false);

  // Live "currently centered" index — this is what gets highlighted.
  // Initialized to the parent's selectedIndex; updated on every scroll frame.
  const [centerIndex, setCenterIndex] = useState(selectedIndex);

  // If the parent updates `selectedIndex` externally (e.g. day clamped from
  // 31 → 30 when the user spins month to Feb), scroll to that value and
  // sync our local centerIndex. We skip this sync while the user is
  // actively scrolling so we don't fight the gesture.
  useEffect(() => {
    if (selectedIndex === lastEmitted.current) return;
    if (isUserScrolling.current) return;
    ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: true });
    lastEmitted.current = selectedIndex;
    setCenterIndex(selectedIndex);
  }, [selectedIndex]);

  const updateCenter = (y: number) => {
    const i = Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM_H)));
    if (i !== centerIndex) {
      setCenterIndex(i);
      // Subtle selection haptic on every value change while scrolling.
      // Wrapped in try/catch because Haptics is a no-op on web and
      // can throw on some Android devices without vibrator support.
      if (Platform.OS !== "web") {
        Haptics.selectionAsync().catch(() => {});
      }
    }
  };

  const commit = (y: number) => {
    const i = Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM_H)));
    if (i !== lastEmitted.current) {
      lastEmitted.current = i;
      onChange(i);
    }
  };

  return (
    <View style={[styles.wheelWrap, { width, height: ITEM_H * VISIBLE }]}>
      {/* Center selection band — purely cosmetic; the actual highlighted
          value is driven by `centerIndex` below. */}
      <View pointerEvents="none" style={styles.band} />

      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        snapToAlignment="start"
        decelerationRate={Platform.OS === "ios" ? "normal" : "fast"}
        // High event throttle so `updateCenter` runs on every frame and
        // the highlighted text + haptic feel tight and "alive".
        scrollEventThrottle={16}
        bounces={false}
        overScrollMode="never"
        contentOffset={{ x: 0, y: selectedIndex * ITEM_H }}
        onScrollBeginDrag={() => {
          isUserScrolling.current = true;
        }}
        onMomentumScrollBegin={() => {
          isUserScrolling.current = true;
        }}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          updateCenter(y);
          // Web fallback: native ScrollView on web doesn't reliably fire
          // momentum events, so we commit after a short idle.
          if (Platform.OS === "web") {
            if (idleTimer.current) clearTimeout(idleTimer.current);
            idleTimer.current = setTimeout(() => {
              commit(y);
              isUserScrolling.current = false;
            }, 140);
          }
        }}
        onScrollEndDrag={(e) => {
          commit(e.nativeEvent.contentOffset.y);
        }}
        onMomentumScrollEnd={(e) => {
          commit(e.nativeEvent.contentOffset.y);
          isUserScrolling.current = false;
        }}
      >
        <View style={{ height: ITEM_H * PAD }} />
        {values.map((v, i) => (
          <View
            key={`${String(v)}-${i}`}
            style={[styles.item, { height: ITEM_H }]}
          >
            <Text
              style={[
                styles.itemText,
                i === centerIndex && styles.itemTextActive,
              ]}
            >
              {String(v)}
            </Text>
          </View>
        ))}
        <View style={{ height: ITEM_H * PAD }} />
      </ScrollView>
    </View>
  );
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const NOW = new Date();
const MAX_YEAR = NOW.getFullYear() - 18;
const MIN_YEAR = NOW.getFullYear() - 80;
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MAX_YEAR - i);

function daysIn(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

export function calcAge(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const mDiff = today.getMonth() + 1 - m;
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) age--;
  return age;
}

function parse(iso: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return { day: d, month: m, year: y };
  }
  return { day: 1, month: 1, year: MAX_YEAR - 7 };
}

function format(day: number, month: number, year: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function DateWheel({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const { day, month, year } = parse(value);
  const days = Array.from({ length: daysIn(month, year) }, (_, i) => i + 1);
  const yearIdx = YEARS.indexOf(year);
  const [hasInitialized, setHasInitialized] = useState(!!value);

  // When mounted with no value, commit the visible defaults so the rest of the
  // form sees a real DOB and "Continue" enables without forcing the user to
  // spin the wheels.
  useEffect(() => {
    if (!hasInitialized && !value) {
      onChange(format(day, month, year));
      setHasInitialized(true);
    }
  }, [hasInitialized, value, day, month, year, onChange]);

  const setPart = (part: "d" | "m" | "y", v: number) => {
    let nd = day, nm = month, ny = year;
    if (part === "d") nd = v;
    if (part === "m") nm = v;
    if (part === "y") ny = v;
    const max = daysIn(nm, ny);
    if (nd > max) nd = max;
    onChange(format(nd, nm, ny));
  };

  return (
    <View style={styles.row}>
      <Wheel
        values={days}
        selectedIndex={day - 1}
        onChange={(i) => setPart("d", days[i])}
        width={72}
      />
      <Wheel
        values={MONTHS}
        selectedIndex={month - 1}
        onChange={(i) => setPart("m", i + 1)}
        width={84}
      />
      <Wheel
        values={YEARS}
        selectedIndex={yearIdx >= 0 ? yearIdx : 0}
        onChange={(i) => setPart("y", YEARS[i])}
        width={96}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", gap: 10 },
  wheelWrap: {
    position: "relative",
  },
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    top: ITEM_H * PAD,
    height: ITEM_H,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(91,44,111,0.25)",
    backgroundColor: "rgba(91,44,111,0.05)",
    borderRadius: 12,
    zIndex: 1,
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 16,
    color: "rgba(122,107,137,0.6)",
  },
  itemTextActive: {
    color: colors.foreground,
    fontWeight: "700",
  },
});
