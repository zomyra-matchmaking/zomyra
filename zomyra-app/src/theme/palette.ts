/**
 * PRIVATE colour ramps. Layer 1 of the two-layer token system (MIGRATION §10.3).
 *
 * ⛔ Only `src/theme/colors.ts` may import this file. Screens and components
 * consume the semantic tokens in `colors.ts` instead — that is constraint C-4,
 * and it is what keeps a theme change a one-file edit. `eslint.config.js`
 * enforces the boundary; it is not an honour system.
 *
 * Steps follow the Tailwind convention (50 lightest → 950 darkest) purely
 * because that numbering is universally legible, not because these are
 * Tailwind's colours. Where they *are* Tailwind's, it is deliberate and noted.
 */

/**
 * Brand purple, anchored so that **900 is the delivered logo artwork exactly**
 * (`#5B2C70`, the single fill in `assets/brand/zomyra-lockup.svg` — MIGRATION §10.1).
 *
 * The brand is dark: hsl(281.5, 43.6%, 30.6%), 10.30:1 on white. It belongs at
 * 900, not 600 — numbering it 600 would leave no room beneath it. Every other
 * step is generated from that hue with a Tailwind-shaped lightness curve, and
 * saturation eased toward the light end so the tints read as a wash.
 *
 * Contrast on `#FFFFFF`, computed 2026-07-29:
 *   50 1.09 · 100 1.17 · 200 1.44 · 300 1.92 · 400 2.89 · 500 4.44
 *   600 6.35 · 700 8.15 · 800 9.33 · 900 10.30 · 950 14.41
 * → **600 and darker pass AA as text.** 500 is UI/large-text only.
 */
const purple = {
  50: "#F9F4FA",
  100: "#F2EAF6",
  200: "#E3D1EB",
  300: "#D0B0DD",
  400: "#B686CB",
  500: "#9F5CBC",
  600: "#8641A4",
  700: "#703689",
  800: "#64307B",
  900: "#5B2C70",
  950: "#3C1C4A",
} as const;

/**
 * Neutrals — **Tailwind's default gray ramp, kept verbatim on purpose.**
 *
 * MIGRATION §3's provenance note: this app was a Vite/React/Tailwind web
 * project before Emergent converted it to React Native, and the conversion
 * inlined Tailwind's greys into every screen. Adopting the same ramp makes the
 * migration an exact substitution rather than a re-design — `#111827` was
 * always gray-900 and always meant "primary text".
 *
 * Contrast on white: 400 2.50 · 500 4.83 · 600 7.56 · 900 17.74.
 * → **500 is the AA floor for text.** 400 is for disabled controls only.
 */
const gray = {
  50: "#F9FAFB",
  100: "#F3F4F6",
  200: "#E5E7EB",
  300: "#D1D5DB",
  400: "#9CA3AF",
  500: "#6B7280",
  600: "#4B5563",
  700: "#374151",
  800: "#1F2937",
  900: "#111827",
  950: "#030712",
} as const;

/**
 * Premium gold — Tailwind amber, already the ramp the prototype reached for
 * (`#F59E0B` amber-500, `#B45309` amber-700, `#FEF3C7` amber-100).
 *
 * Contrast on white: 500 2.15 · 600 3.19 · 700 5.02 · 800 7.09.
 * → gold **text** on white needs 700; gold **icons** on white need 600.
 * 500 survives only on the purple gradient, where it has plenty of contrast.
 */
const amber = {
  50: "#FFFBEB",
  100: "#FEF3C7",
  200: "#FDE68A",
  300: "#FCD34D",
  400: "#FBBF24",
  500: "#F59E0B",
  600: "#D97706",
  700: "#B45309",
  800: "#92400E",
  900: "#78350F",
  950: "#451A03",
} as const;

/** Destructive — Tailwind red. 600 is 4.83:1 on white (AA). */
const red = {
  50: "#FEF2F2",
  100: "#FEE2E2",
  200: "#FECACA",
  300: "#FCA5A5",
  400: "#F87171",
  500: "#EF4444",
  600: "#DC2626",
  700: "#B91C1C",
  800: "#991B1B",
  900: "#7F1D1D",
  950: "#450A0A",
} as const;

/**
 * Success — Tailwind emerald. Note 500 is only 2.54:1 on white, so the
 * familiar `#10B981` is a **fill/dot colour, never text**; success text is 700.
 */
const emerald = {
  50: "#ECFDF5",
  100: "#D1FAE5",
  200: "#A7F3D0",
  300: "#6EE7B7",
  400: "#34D399",
  500: "#10B981",
  600: "#059669",
  700: "#047857",
  800: "#065F46",
  900: "#064E3B",
  950: "#022C22",
} as const;

/** Absolutes. Not part of any ramp; used for scrims, shadows and pure surfaces. */
const base = {
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const palette = { purple, gray, amber, red, emerald, ...base } as const;
