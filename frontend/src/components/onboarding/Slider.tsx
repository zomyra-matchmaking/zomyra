/**
 * Single-thumb slider with smooth continuous drag.
 *
 * How this feels smooth:
 * - The thumb follows the finger continuously during drag (no jumping between
 *   discrete step positions).
 * - The value is snapped to the nearest step, but only reported to the parent
 *   when it CROSSES a step boundary (which throttles re-renders) or on release.
 * - On release, the thumb animates via spring to the snapped position.
 * - When the parent updates `value` (e.g. going back to a previous question),
 *   the thumb smoothly animates to the new position via spring.
 *
 * Internal thumb position is kept in an Animated.Value so we never call
 * `setState` during drag — that's what caused visible jank previously.
 */
import { useEffect, useRef, useState } from "react";
import {
  Animated,
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

  // Live thumb x-position in track-local pixels. Animated so we can update
  // without React re-renders (via setValue on every pan frame) AND spring to
  // snapped positions on release.
  const posX = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);
  const lastReportedValue = useRef<number>(value);

  const valueToX = (v: number, w: number) =>
    ((clamp(v, min, max) - min) / (max - min)) * w;

  const xToValue = (x: number, w: number) => {
    const ratio = clamp(x / (w || 1), 0, 1);
    const raw = min + ratio * (max - min);
    return clamp(Math.round(raw / step) * step, min, max);
  };

  // Sync internal position when parent value changes (e.g. navigation between
  // questions restoring saved answers). Skip during active drag so we don't
  // fight the user's finger.
  useEffect(() => {
    if (widthRef.current === 0) return;
    if (isDragging.current) return;
    const targetX = valueToX(value, widthRef.current);
    Animated.spring(posX, {
      toValue: targetX,
      friction: 8,
      tension: 120,
      useNativeDriver: false,
    }).start();
    lastReportedValue.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, width]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (e) => {
        isDragging.current = true;
        const localX = clamp(
          e.nativeEvent.pageX - trackPageXRef.current,
          0,
          widthRef.current,
        );
        posX.stopAnimation();
        posX.setValue(localX);
        const snapped = xToValue(localX, widthRef.current);
        if (snapped !== lastReportedValue.current) {
          lastReportedValue.current = snapped;
          onChange(snapped);
        }
      },

      onPanResponderMove: (e) => {
        const localX = clamp(
          e.nativeEvent.pageX - trackPageXRef.current,
          0,
          widthRef.current,
        );
        // Move thumb continuously — no snapping visually.
        posX.setValue(localX);
        // Only fire onChange when the snapped step actually changes.
        const snapped = xToValue(localX, widthRef.current);
        if (snapped !== lastReportedValue.current) {
          lastReportedValue.current = snapped;
          onChange(snapped);
        }
      },

      onPanResponderRelease: (e) => {
        const localX = clamp(
          e.nativeEvent.pageX - trackPageXRef.current,
          0,
          widthRef.current,
        );
        const snapped = xToValue(localX, widthRef.current);
        const snappedX = valueToX(snapped, widthRef.current);
        // Smoothly settle onto the exact snapped position.
        Animated.spring(posX, {
          toValue: snappedX,
          friction: 8,
          tension: 140,
          useNativeDriver: false,
        }).start(() => {
          isDragging.current = false;
        });
        if (snapped !== lastReportedValue.current) {
          lastReportedValue.current = snapped;
          onChange(snapped);
        }
        if (onComplete) onComplete(snapped);
      },

      onPanResponderTerminate: () => {
        isDragging.current = false;
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    widthRef.current = w;
    posX.setValue(valueToX(value, w));
    containerRef.current?.measure((_x, _y, _w, _h, pageX) => {
      trackPageXRef.current = pageX;
    });
  };

  return (
    <View
      ref={containerRef}
      style={styles.trackWrap}
      onLayout={onLayout}
      {...pan.panHandlers}
    >
      <View style={styles.track} />
      <Animated.View style={[styles.activeTrack, { width: posX }]} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            transform: [
              {
                translateX: posX.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-THUMB / 2, -THUMB / 2 + 1],
                  extrapolate: "extend",
                }),
              },
            ],
          },
        ]}
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
    left: 0,
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
