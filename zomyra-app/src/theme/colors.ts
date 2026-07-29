/**
 * SEMANTIC colour tokens — layer 2, the public surface (MIGRATION §10.3).
 *
 * Everything outside `src/theme/` imports from here (or from `@/src/theme`).
 * Tokens are named for the **role** they play, never for their value, so a
 * palette change stays a one-file edit: constraint C-4.
 *
 * Light theme only (C-3). There is no dark variant and no `useColorScheme`
 * branching anywhere in the app.
 *
 * ## Accessibility (NFR-6a)
 * Every token below that can carry **text** meets WCAG AA (≥4.5:1) against
 * `background`. Tokens that cannot are named so they cannot be mistaken for
 * text colours (`…Dot`, `…Fill`, `border.*`, `surface.*`) or are documented
 * exemptions (`text.disabled`, exempt under WCAG 1.4.3).
 */
import { palette } from "./palette";

/**
 * Applies an alpha channel to a token, so translucent values stay tied to the
 * palette instead of being re-typed as raw `rgba(...)` strings.
 *
 * The prototype had 50+ hand-written rgba literals, and three of them —
 * `rgba(91,44,111,…)` — were the stray `#5B2C6F` purple in disguise, invisible
 * to any search for the hex form. `alpha(colors.brand.default, 0.15)` cannot
 * drift that way.
 */
export const alpha = (hex: string, opacity: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity})`;
};

export const colors = {
  /** Page background. The app is white-backed throughout (C-3). */
  background: palette.white,

  surface: {
    /** Cards, sheets, nav bars — anything sitting on `background`. */
    default: palette.white,
    /** Neutral inset: list wells, skeletons, disabled fields. */
    subtle: palette.gray[100],
    /** A step darker than `subtle` — progress-bar tracks, neutral fills. */
    muted: palette.gray[200],
    /** Disabled brand CTA. Keeps the lavender cast rather than going grey. */
    disabled: palette.purple[200],
    /** The lavender wash used for selected chips, info panels, quiz cards. */
    brand: palette.purple[50],
    /** A step up from `brand`, for the selected state of a brand surface. */
    brandStrong: palette.purple[100],
    /** Dark brand panel — premium hero, match overlay. Pair with `text.onBrand`. */
    inverse: palette.purple[900],
    /** Backdrop behind full-bleed media, where black is the correct answer. */
    media: palette.black,
  },

  border: {
    /** Default hairline: card edges, dividers, unselected chips. */
    default: palette.purple[100],
    /** Barely-there rule between rows inside a single card. */
    subtle: palette.purple[50],
    /** Emphasis: focused inputs, selected outlines. */
    strong: palette.purple[200],
    /** Non-brand rule, for neutral chrome that should not read as purple. */
    neutral: palette.gray[200],
    /** Neutral rule with emphasis — input outlines, segmented controls. */
    neutralStrong: palette.gray[300],
    /** Rule drawn on a photo or a brand fill. */
    onBrand: palette.white,
  },

  text: {
    /** Headings and body copy. 17.74:1. */
    primary: palette.gray[900],
    /** Supporting copy that is still fully readable. 7.56:1. */
    secondary: palette.gray[600],
    /** Captions, metadata, placeholder labels. 4.83:1 — the AA floor. */
    muted: palette.gray[500],
    /**
     * Disabled controls only. 2.50:1, i.e. **below AA on purpose** — WCAG
     * 1.4.3 exempts inactive components. Never use it for live text.
     */
    disabled: palette.gray[400],
    /** Brand-coloured text and icons on a light background. 10.30:1. */
    brand: palette.purple[900],
    /** Interactive brand text — links, inline actions. 6.35:1. */
    link: palette.purple[600],
    /** Text on `surface.inverse`, `brand.default` or a photo scrim. */
    onBrand: palette.white,
  },

  brand: {
    /**
     * **The** Zomyra purple: the single fill in the delivered logo artwork.
     * Reconciles the four purples the prototype shipped — `#5B2C6F`,
     * `#5B2C70`, `#7C3AED` and `#1F1235` (MIGRATION §10.1).
     */
    default: palette.purple[900],
    /** The darker end of the brand gradient. */
    strong: palette.purple[950],
    /** Lighter brand for secondary actions and active icons. AA as text. */
    muted: palette.purple[600],
    /** Content placed on `brand.default`. */
    onBrand: palette.white,
  },

  /** Brand gradient stops, in order. Feed straight to `<LinearGradient colors>`. */
  gradient: {
    brand: [palette.purple[900], palette.purple[950]] as const,
  },

  premium: {
    /** Gold on a dark/gradient background — the crown on the premium hero. */
    onDark: palette.amber[500],
    /** Gold icons on white. 3.19:1, clearing WCAG 1.4.11's 3:1 for non-text. */
    icon: palette.amber[600],
    /** Gold text on white. 5.02:1 — AA. */
    text: palette.amber[700],
    /** Gold text on `premium.surface`. */
    textStrong: palette.amber[800],
    surface: palette.amber[100],
    border: palette.amber[200],
  },

  success: {
    /** Dots, fills and check icons — **not** text (2.54:1). */
    fill: palette.emerald[500],
    /** Success copy. 5.48:1 — AA. */
    text: palette.emerald[700],
    surface: palette.emerald[50],
  },

  danger: {
    /** Destructive actions and error text alike. 4.83:1 — AA. */
    default: palette.red[600],
    /** Content on a `danger.default` fill. */
    onDanger: palette.white,
    /** Error copy sitting on `danger.surface`, where 600 is too light. */
    textStrong: palette.red[900],
    /** Tinted background for a destructive row. */
    surface: palette.red[50],
    surfaceStrong: palette.red[100],
    border: palette.red[300],
  },

  /**
   * Third-party brand colours. These are fixed by their owner's brand
   * guidelines and are not ours to re-theme — they live here so that the
   * "no raw hex" rule stays absolute and the exception is visible.
   */
  external: {
    /** Google red, for the "Continue with Google" mark (FR-1). */
    google: "#EA4335",
  },

  chat: {
    /** Outgoing bubble — brand-tinted. */
    mineSurface: palette.purple[200],
    mineText: palette.gray[900],
    /** Incoming bubble — white with a hairline, so it lifts off the wall. */
    theirSurface: palette.white,
    theirText: palette.gray[900],
    theirBorder: palette.gray[200],
  },

  /**
   * Compatibility tiers (FR-6). Each has a decorative `dot`/`surface`/`border`
   * plus a `text` step dark enough to pass AA — the prototype already split
   * these correctly in `app/requests.tsx`; this makes the split a token.
   */
  tier: {
    excellent: {
      dot: palette.purple[500],
      surface: palette.purple[50],
      border: palette.purple[200],
      text: palette.purple[700],
    },
    great: {
      dot: palette.emerald[500],
      surface: palette.emerald[50],
      border: palette.emerald[200],
      text: palette.emerald[700],
    },
    potential: {
      dot: palette.amber[500],
      surface: palette.amber[50],
      border: palette.amber[200],
      text: palette.amber[700],
    },
  },

  overlay: {
    /** Modal scrim. */
    scrim: alpha(palette.gray[900], 0.45),
    /** Heavier scrim for full-screen takeovers. */
    scrimStrong: alpha(palette.black, 0.62),
    /**
     * The black scrims are built from. Only ever used via `alpha()` — a bare
     * `overlay.base` is an opaque black rectangle.
     */
    base: palette.black,
  },

  /**
   * Shadow colour for the inline elevation scattered through the screens.
   * New work should reach for the `shadows` presets below instead.
   */
  shadow: {
    default: palette.black,
  },
} as const;

export const shadows = {
  /** Resting elevation for cards. */
  soft: {
    shadowColor: palette.purple[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  /** Raised brand element — primary buttons, the floating nav. */
  brand: {
    shadowColor: palette.purple[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  /** Neutral card lift, where a purple cast would look wrong. */
  card: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;
