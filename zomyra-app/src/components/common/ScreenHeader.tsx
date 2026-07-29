import { ArrowLeft } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { colors, radii } from "@/src/theme";
import { Touchable } from "@/src/components/ui";

export function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.row}>
      <Touchable
        testID="screen-header-back"
        onPress={onBack}
        style={[styles.btn]}
        hitSlop={8}
      >
        <ArrowLeft size={20} color={colors.text.primary} strokeWidth={2.2} />
      </Touchable>
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
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
});
