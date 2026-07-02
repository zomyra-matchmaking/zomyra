/**
 * Single-thumb slider with proper touch tracking. Tapping anywhere on the
 * track jumps the thumb to that position; dragging moves it. Works on both
 * native (PanResponder) and web.
 */
import { useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from "react-native";

import { colors } from "@/src/theme/colors";

type Props = {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (n: number) => void;
  onComplete?: (n: number) => void;
};

const THUMB = 28;
const TRACK_HEIGHT = 44;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function Slider({ min, max, step = 1, value, onChange, onComplete }: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const containerRef = useRef<View>(null);

  const xToValue = (x: number) => {
    const ratio = clamp(x / (widthRef.current || 1), 0, 1);
    const raw = min + ratio * (max - min);
    return Math.round(raw / step) * step;
  };

  // Convert a page-space X into local track-space X.
  const pageToLocal = (pageX: number) => pageX - trackPageXRef.current;

  const update = (pageX: number) => {
    const next = clamp(xToValue(pageToLocal(pageX)), min, max);
    onChange(next);
    return next;
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => update(e.nativeEvent.pageX),
      onPanResponderMove: (e) => update(e.nativeEvent.pageX),
      onPanResponderRelease: (e) => {
        const finalValue = update(e.nativeEvent.pageX);
        if (onComplete) {
          onComplete(finalValue);
        }
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    widthRef.current = w;
    // Record the absolute X of the track so we can convert pageX → local X.
    containerRef.current?.measure((_x, _y, _w, _h, pageX) => {
      trackPageXRef.current = pageX;
    });
  };

  const x = ((value - min) / (max - min)) * (width || 1);

  return (
    <View
      ref={containerRef}
      style={styles.trackWrap}
      onLayout={onLayout}
      {...pan.panHandlers}
    >
      <View style={styles.track} />
      <View style={[styles.activeTrack, { width: x }]} />
      <View
        pointerEvents="none"
        style={[styles.thumb, { left: x - THUMB / 2 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  trackWrap: {
    height: TRACK_HEIGHT,
    justifyContent: "center",
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.secondary,
  },
  activeTrack: {
    position: "absolute",
    left: 0,
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
