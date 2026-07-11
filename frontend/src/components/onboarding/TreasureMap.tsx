/**
 * Treasure-map intro screen for onboarding sections. RN port of the original
 * web TreasureMap.tsx — preserves the 3-node "Plot → Anchor → Love" journey
 * and animates the path filling in whenever the user advances a section.
 */
import { ArrowLeft, ArrowRight, Anchor, Compass, Heart } from "lucide-react-native";
import { useEffect, useRef, type ComponentType } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { colors, radii } from "@/src/theme/colors";

export type TreasureStepInfo = {
  step: 1 | 2 | 3;
  title: string;
  body: string;
  cta: string;
};

type NodeMeta = {
  label: string;
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  x: number;
  y: number;
};

const NODES: NodeMeta[] = [
  { label: "Plot", Icon: Compass, x: 40, y: 155 },
  { label: "Anchor", Icon: Anchor, x: 150, y: 95 },
  { label: "Love", Icon: Heart, x: 290, y: 55 },
];

const VIEW_W = 320;
const VIEW_H = 200;

// Approximate lengths of each segment for the stroke-dasharray trick.
// Slightly over-estimating ensures the dashed line fully reveals.
const SEG1_LENGTH = 220;
const SEG2_LENGTH = 220;

const AnimatedPath = Animated.createAnimatedComponent(Path);

function buildPath() {
  const [a, b, c] = NODES;
  const seg1 = `M ${a.x} ${a.y} C ${a.x + 20} ${a.y + 30}, ${b.x - 90} ${b.y + 80}, ${b.x - 30} ${b.y + 20} S ${b.x - 20} ${b.y - 40}, ${b.x} ${b.y}`;
  const seg2 = `M ${b.x} ${b.y} C ${b.x + 30} ${b.y + 60}, ${b.x + 60} ${b.y - 60}, ${b.x + 90} ${b.y - 20} S ${c.x - 10} ${c.y + 50}, ${c.x} ${c.y}`;
  return { seg1, seg2, full: `${seg1} ${seg2}` };
}

export function TreasureMap({
  info,
  onContinue,
  onBack,
}: {
  info: TreasureStepInfo;
  onContinue: () => void;
  onBack?: () => void;
}) {
  const { seg1, seg2, full } = buildPath();

  // Each segment uses its own animated offset (drawn length).
  const drawSeg1 = useRef(new Animated.Value(SEG1_LENGTH)).current;
  const drawSeg2 = useRef(new Animated.Value(SEG2_LENGTH)).current;
  const activeNodeScale = useRef(new Animated.Value(0.8)).current;
  // Subtle pulse around the active marker (clean, breathing effect).
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    // Reset segment offsets. For sections >= 2 the first segment must already
    // be fully drawn when the screen mounts — we only animate the *newly
    // unlocked* segment for the current section. For section 3 specifically
    // we want the seg1 fully drawn (no replay) and seg2 to animate.
    drawSeg1.setValue(info.step >= 2 ? (info.step === 2 ? SEG1_LENGTH : 0) : SEG1_LENGTH);
    drawSeg2.setValue(info.step >= 3 ? SEG2_LENGTH : SEG2_LENGTH);
    activeNodeScale.setValue(0.7);

    const sequence: Animated.CompositeAnimation[] = [];

    // Animate the newly-unlocked segment for THIS section only. Slower,
    // more elegant pacing (1600ms with cubic ease-out).
    if (info.step === 2) {
      sequence.push(
        Animated.timing(drawSeg1, {
          toValue: 0,
          duration: 1600,
          delay: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      );
    }
    if (info.step === 3) {
      sequence.push(
        Animated.timing(drawSeg2, {
          toValue: 0,
          duration: 1600,
          delay: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      );
    }

    Animated.parallel([
      Animated.sequence(sequence),
      Animated.spring(activeNodeScale, {
        toValue: 1,
        delay: 600,
        useNativeDriver: false,
        bounciness: 10,
      }),
    ]).start();

    // Gentle breathing pulse on the active marker — scale 1.0 → 1.08, opacity
    // 0.30 → 0. Subtle "alive" feel without flashing. Rebuilt each step so
    // it only animates the currently-active node and stops on advance.
    pulseScale.setValue(1);
    pulseOpacity.setValue(0.3);
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.45,
            duration: 1800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.3,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [info.step, drawSeg1, drawSeg2, activeNodeScale, pulseScale, pulseOpacity]);

  // Map the viewBox-coordinate nodes to overlay pixels.
  const mapWidth = 300;
  const mapHeight = (mapWidth / VIEW_W) * VIEW_H;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <ArrowLeft size={20} color={colors.foreground} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.main}>
        <View style={{ width: mapWidth, height: mapHeight }}>
          <Svg
            width={mapWidth}
            height={mapHeight}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          >
            {/* Faint dotted route is always present */}
            <Path
              d={full}
              fill="none"
              stroke="rgba(31,18,53,0.25)"
              strokeWidth={2}
              strokeDasharray="2 14"
              strokeLinecap="round"
            />
            {/* Seg1 is revealed by animating dashoffset from full length to 0 */}
            {info.step >= 2 ? (
              <AnimatedPath
                d={seg1}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={`${SEG1_LENGTH} ${SEG1_LENGTH}`}
                strokeDashoffset={drawSeg1}
              />
            ) : null}
            {info.step >= 3 ? (
              <AnimatedPath
                d={seg2}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={`${SEG2_LENGTH} ${SEG2_LENGTH}`}
                strokeDashoffset={drawSeg2}
              />
            ) : null}
          </Svg>
          {NODES.map((n, i) => {
            const stepNum = (i + 1) as 1 | 2 | 3;
            const state =
              stepNum < info.step ? "done" : stepNum === info.step ? "active" : "locked";
            const left = (n.x / VIEW_W) * mapWidth - 20;
            const top = (n.y / VIEW_H) * mapHeight - 20;
            return (
              <View key={n.label} style={[styles.nodeWrap, { left, top }]}>
                {/* Solid bg mask hides any dashed-route artifacts directly
                    under the marker so it always reads as a clean icon. */}
                <View style={styles.nodeMask} pointerEvents="none" />

                {/* Subtle breathing pulse ring — only on the active marker.
                    It stops automatically when this node is no longer active
                    (next step unmounts this element). */}
                {state === "active" ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.pulseRing,
                      {
                        opacity: pulseOpacity,
                        transform: [{ scale: pulseScale }],
                      },
                    ]}
                  />
                ) : null}

                <Animated.View
                  style={[
                    styles.nodeDot,
                    state === "active" && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      transform: [{ scale: activeNodeScale }],
                    },
                    state === "done" && {
                      backgroundColor: "rgba(91,44,111,0.15)",
                      borderColor: colors.primary,
                    },
                    state === "locked" && {
                      backgroundColor: colors.background,
                      borderColor: "rgba(31,18,53,0.20)",
                    },
                  ]}
                >
                  <n.Icon
                    size={18}
                    color={state === "active" ? "#fff" : state === "done" ? colors.primary : "rgba(31,18,53,0.4)"}
                    strokeWidth={2.2}
                  />
                </Animated.View>
                <Text
                  style={[
                    styles.nodeLabel,
                    state === "locked" && { color: "rgba(31,18,53,0.35)" },
                  ]}
                >
                  {n.label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ marginTop: 36, alignItems: "center", maxWidth: 340 }}>
          <Text style={styles.stepLabel}>STEP {info.step} OF 3</Text>
          <Text style={styles.title}>{info.title}</Text>
          <Text style={styles.body}>{info.body}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          testID="treasure-continue"
          onPress={onContinue}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.92 }]}
        >
          <Text style={styles.ctaText}>{info.cta}</Text>
          <ArrowRight size={16} color={colors.primaryForeground} strokeWidth={2.4} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 8 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  main: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeWrap: {
    position: "absolute",
    alignItems: "center",
    width: 40,
  },
  // Solid bg circle behind the node icon so any dashed route below the
  // marker is fully masked — keeps the marker reading as a clean icon.
  nodeMask: {
    position: "absolute",
    top: -4,
    left: -4,
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.background,
  },
  // Outer breathing ring used only on the active marker.
  pulseRing: {
    position: "absolute",
    top: -4,
    left: -4,
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "rgba(91,44,111,0.18)",
  },
  nodeDot: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.4,
    color: "rgba(31,18,53,0.75)",
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    color: colors.primary,
  },
  title: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  body: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  cta: {
    height: 52,
    borderRadius: radii.md + 1,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: "700",
  },
});
