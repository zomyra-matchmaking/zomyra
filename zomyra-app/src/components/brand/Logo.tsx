import { Image, StyleSheet, Text } from "react-native";
import { colors, fontSize, fontWeight, letterSpacing } from "@/src/theme";

type LogoProps = {
  size?: number;
};

const LOGO_SRC = require("../../../assets/images/zomyra-logo.png");

export function Logo({ size = 56 }: LogoProps) {
  return (
    <Image
      source={LOGO_SRC}
      style={{ width: size, height: size, resizeMode: "contain" }}
      accessible
      accessibilityLabel="Zomyra"
    />
  );
}

export function Wordmark({ size = fontSize.display }: { size?: number }) {
  return (
    <Text
      style={[
        styles.text,
        // The wordmark is the brand purple, same as the mark beside it.
        // It used to be #7C3AED — one of the four rival purples §10.1 records.
        { fontSize: size, color: colors.brand.default },
      ]}
    >
      Zomyra
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: fontWeight.extrabold,
    letterSpacing: letterSpacing.tight,
    // Strip any baseline padding the platform might add so the wordmark
    // sits exactly next to the logo glyph (centered with it horizontally).
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
