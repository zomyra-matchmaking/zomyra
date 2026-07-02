// Zomyra brand theme tokens — extracted from the original Tailwind config so
// every screen renders the same purple-forward identity in React Native.
export const colors = {
  // Surfaces
  background: "#FFFFFF",
  card: "#FFFFFF",
  secondary: "#F4EAFB", // soft lavender wash
  border: "#E8E1EF",
  borderSubtle: "#F0E9F5",

  // Text
  foreground: "#1F1235",
  foregroundMuted: "#7A6B89",
  mutedForeground: "#7A6B89",
  foregroundSubtle: "#A99DBA",

  // Brand
  primary: "#5B2C6F",
  primaryForeground: "#FFFFFF",
  primarySoft: "#8B5CF6",
  accent: "#C084FC",

  // Status
  success: "#10B981",
  warning: "#F59E0B",
  destructive: "#DC2626",
  destructiveForeground: "#FFFFFF",

  // Brand gradient
  gradientStart: "#7C3AED",
  gradientEnd: "#A855F7",

  // Chat bubbles
  chatMine: "#E7D9F5",
  chatMineText: "#1F1235",
  chatTheir: "#FFFFFF",
  chatTheirText: "#1F1F1F",
  chatTheirBorder: "#EEEEEE",

  // Black / overlays
  black: "#000000",
  overlay: "rgba(0,0,0,0.45)",
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const fonts = {
  // Plus Jakarta Sans is the brand font on web. For RN we fall back to system —
  // expo-font registration can be added later without code changes.
  regular: undefined as string | undefined,
};

export const shadows = {
  soft: {
    shadowColor: "#5B2C6F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  brand: {
    shadowColor: "#5B2C6F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
};
