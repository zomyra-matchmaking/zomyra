import { Image, StyleSheet, Text } from "react-native";

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

export function Wordmark({ fontSize = 28 }: { fontSize?: number }) {
  return (
    <Text
      style={[
        styles.text,
        { fontSize, color: "#7C3AED" },
      ]}
    >
      Zomyra
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: "800",
    letterSpacing: -0.4,
    // Strip any baseline padding the platform might add so the wordmark
    // sits exactly next to the logo glyph (centered with it horizontally).
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
