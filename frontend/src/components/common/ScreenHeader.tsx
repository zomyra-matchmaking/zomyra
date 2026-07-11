import { ArrowLeft } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "@/src/theme/colors";

export function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable
        testID="screen-header-back"
        onPress={onBack}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
        hitSlop={8}
      >
        <ArrowLeft size={20} color={colors.foreground} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
});
