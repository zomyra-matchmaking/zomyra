/**
 * DualRangeSlider — minimal two-thumb slider used by the Height premium filter.
 *
 * Pure React Native primitives + PanResponder, no extra deps. Reports the
 * current range via `onChange(low, high)` while dragging.
 */
import { useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, fontSize, fontWeight, radii } from "@/src/theme";

const THUMB = 26;

type Props = {
  min: number;
  max: number;
  step?: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  format?: (v: number) => string;
};

export function DualRangeSlider({
  min,
  max,
  step = 1,
  low,
  high,
  onChange,
  format,
}: Props) {
  const [trackW, setTrackW] = useState(0);
  const lowRef = useRef(low);
  const highRef = useRef(high);
  lowRef.current = low;
  highRef.current = high;

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackW(e.nativeEvent.layout.width);
  };

  const pxToValue = (px: number): number => {
    if (trackW <= 0) return min;
    const ratio = Math.max(0, Math.min(1, px / trackW));
    const raw = min + ratio * (max - min);
    return Math.round(raw / step) * step;
  };
  const valueToPx = (v: number): number => {
    if (trackW <= 0) return 0;
    const ratio = (v - min) / (max - min);
    return Math.max(0, Math.min(trackW, ratio * trackW));
  };

  // Persist starting values across a single drag.
  const dragStart = useRef<{ low: number; high: number }>({ low, high });

  const lowResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStart.current = { low: lowRef.current, high: highRef.current };
        },
        onPanResponderMove: (_e, gesture) => {
          const startPx = valueToPx(dragStart.current.low);
          const next = pxToValue(startPx + gesture.dx);
          const clamped = Math.min(next, highRef.current - step);
          onChange(Math.max(min, clamped), highRef.current);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackW, min, max, step],
  );

  const highResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStart.current = { low: lowRef.current, high: highRef.current };
        },
        onPanResponderMove: (_e, gesture) => {
          const startPx = valueToPx(dragStart.current.high);
          const next = pxToValue(startPx + gesture.dx);
          const clamped = Math.max(next, lowRef.current + step);
          onChange(lowRef.current, Math.min(max, clamped));
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackW, min, max, step],
  );

  const lowPx = valueToPx(low);
  const highPx = valueToPx(high);
  const fmt = format ?? ((v: number) => String(v));

  return (
    <View>
      <View style={styles.valuesRow}>
        <View style={styles.valuePill}>
          <Text style={styles.valueText}>{fmt(low)}</Text>
        </View>
        <Text style={styles.dash}>—</Text>
        <View style={styles.valuePill}>
          <Text style={styles.valueText}>{fmt(high)}</Text>
        </View>
      </View>

      <View
        style={styles.trackHost}
        onLayout={onLayout}
        testID="dual-slider-track"
      >
        <View style={styles.track} />
        {trackW > 0 ? (
          <View
            style={[
              styles.trackFilled,
              { left: lowPx, width: Math.max(0, highPx - lowPx) },
            ]}
          />
        ) : null}

        {trackW > 0 ? (
          <View
            testID="dual-slider-thumb-low"
            style={[styles.thumb, { left: lowPx - THUMB / 2 }]}
            {...lowResponder.panHandlers}
          />
        ) : null}
        {trackW > 0 ? (
          <View
            testID="dual-slider-thumb-high"
            style={[styles.thumb, { left: highPx - THUMB / 2 }]}
            {...highResponder.panHandlers}
          />
        ) : null}
      </View>

      <View style={styles.minMaxRow}>
        <Text style={styles.minMaxText}>{fmt(min)}</Text>
        <Text style={styles.minMaxText}>{fmt(max)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  valuesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  valuePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  valueText: { fontSize: fontSize.bodyLarge, fontWeight: fontWeight.bold, color: colors.brand.default, letterSpacing: -0.2 },
  dash: { color: colors.text.muted, fontWeight: fontWeight.bold },

  trackHost: {
    height: THUMB,
    justifyContent: "center",
    position: "relative",
  },
  track: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.border.default,
  },
  trackFilled: {
    position: "absolute",
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
  },
  thumb: {
    position: "absolute",
    top: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: radii.full,
    backgroundColor: colors.surface.default,
    borderWidth: 2,
    borderColor: colors.brand.default,
    shadowColor: colors.shadow.default,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  minMaxRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  minMaxText: { fontSize: fontSize.caption, color: colors.text.primary, fontWeight: fontWeight.medium },
});
