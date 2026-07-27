/**
 * Range slider (two thumbs). Uses absolute touch position to track each
 * thumb so taps and drags both work correctly.
 */
import { useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "@/src/theme/colors";

type Props = {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  format?: (n: number) => string;
};

const THUMB = 26;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export default function RangeSlider({ min, max, step = 1, value, onChange, format }: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const containerRef = useRef<View>(null);
  const fmt = format ?? ((n: number) => String(n));
  const [lo, hi] = value;
  const valueRef = useRef<[number, number]>(value);
  valueRef.current = value;
  const draggingRef = useRef<"lo" | "hi" | null>(null);

  const xToValue = (x: number) => {
    const ratio = clamp(x / (widthRef.current || 1), 0, 1);
    const raw = min + ratio * (max - min);
    return Math.round(raw / step) * step;
  };

  const pageToLocal = (pageX: number) => pageX - trackPageXRef.current;

  // Decide which thumb to grab based on which is closer to the touch.
  const pickThumb = (pageX: number): "lo" | "hi" => {
    const local = pageToLocal(pageX);
    const xLo = ((valueRef.current[0] - min) / (max - min)) * (widthRef.current || 1);
    const xHi = ((valueRef.current[1] - min) / (max - min)) * (widthRef.current || 1);
    return Math.abs(local - xLo) <= Math.abs(local - xHi) ? "lo" : "hi";
  };

  const update = (pageX: number) => {
    const which = draggingRef.current;
    if (!which) return;
    const next = clamp(xToValue(pageToLocal(pageX)), min, max);
    const [curLo, curHi] = valueRef.current;
    if (which === "lo") onChange([Math.min(next, curHi - step), curHi]);
    else onChange([curLo, Math.max(next, curLo + step)]);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        draggingRef.current = pickThumb(e.nativeEvent.pageX);
        update(e.nativeEvent.pageX);
      },
      onPanResponderMove: (e) => update(e.nativeEvent.pageX),
      onPanResponderRelease: () => {
        draggingRef.current = null;
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    widthRef.current = w;
    containerRef.current?.measure((_x, _y, _w, _h, pageX) => {
      trackPageXRef.current = pageX;
    });
  };

  const xLo = ((lo - min) / (max - min)) * (width || 1);
  const xHi = ((hi - min) / (max - min)) * (width || 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Range</Text>
        <Text style={styles.value}>
          {fmt(lo)} <Text style={{ color: colors.mutedForeground }}>—</Text> {fmt(hi)}
        </Text>
      </View>
      <View
        ref={containerRef}
        style={styles.trackWrap}
        onLayout={onLayout}
        {...pan.panHandlers}
      >
        <View style={styles.track} />
        <View
          style={[
            styles.activeTrack,
            { left: xLo, right: Math.max(0, (width || 0) - xHi) },
          ]}
        />
        <View pointerEvents="none" style={[styles.thumb, { left: xLo - THUMB / 2 }]} />
        <View pointerEvents="none" style={[styles.thumb, { left: xHi - THUMB / 2 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8 },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: colors.mutedForeground,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  trackWrap: {
    marginTop: 18,
    height: 40,
    justifyContent: "center",
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.secondary,
  },
  activeTrack: {
    position: "absolute",
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
});
