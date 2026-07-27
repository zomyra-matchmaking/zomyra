import { StyleSheet, Text, View } from "react-native";

import { Slider } from "./Slider";
import { colors } from "@/src/theme/colors";

type Props = {
  value: number;
  onChange: (v: number) => void;
  left: string;
  right: string;
};

export function ScaleSlider({ value, onChange, left, right }: Props) {
  return (
    <View style={{ paddingHorizontal: 8 }}>
      <View style={styles.dots}>
        {[1, 2, 3, 4, 5].map((n) => (
          <View
            key={n}
            style={[
              styles.dot,
              value === n && { backgroundColor: colors.primary, transform: [{ scale: 1.6 }] },
            ]}
          />
        ))}
      </View>
      <View style={{ marginTop: 18 }}>
        <Slider min={1} max={5} step={1} value={value} onChange={onChange} />
      </View>
      <View style={styles.labels}>
        <Text style={[styles.labelText, { textAlign: "left" }]}>{left}</Text>
        <Text style={[styles.labelText, { textAlign: "right" }]}>{right}</Text>
      </View>
      <Text style={styles.valueText}>Tap or drag to choose</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(31,18,53,0.15)",
  },
  labels: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  labelText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.mutedForeground,
    maxWidth: "45%",
    lineHeight: 16,
  },
  valueText: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
