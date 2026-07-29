// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Constraint C-4 (MIGRATION §1): components consume semantic tokens only.
// These rules make that mechanical rather than a convention someone has to
// remember — the prototype accumulated 281 hex literals and 13 rival local
// palettes precisely because nothing was stopping it.
const noRawColours = [
  'error',
  {
    selector:
      'Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
    message:
      'Raw hex colour. Use a semantic token from "@/src/theme" (C-4). If no token fits the role, add one to src/theme/colors.ts.',
  },
  {
    selector: 'Literal[value=/^rgba?\\(/]',
    message:
      'Raw rgba() colour. Use alpha(colors.x.y, 0.5) from "@/src/theme", so translucent values stay tied to the palette (C-4).',
  },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // Off for React Native. The rule ships with eslint-plugin-react and targets HTML,
      // where a bare apostrophe in JSX text is ambiguous. RN's <Text> does not decode HTML
      // entities, so applying its suggested fix would render a literal "&apos;" on screen.
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    // Everything that renders. src/theme/ is exempted below.
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': noRawColours,
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/theme/palette'],
              message:
                'src/theme/palette.ts is the private ramp layer. Import semantic tokens from "@/src/theme" instead (C-4, MIGRATION §10.3).',
            },
          ],
          paths: [
            {
              name: 'react-native',
              importNames: ['Pressable', 'TouchableOpacity', 'TouchableHighlight'],
              message:
                'Use <Touchable> from "@/src/components/ui". Press feedback is platform convention (iOS dims, Android ripples) and belongs in one file — resolved per call site it drifts, which is how the prototype ended up with 7 different press opacities and no Android ripple at all.',
            },
          ],
        },
      ],
    },
  },
  {
    // The theme is the one place colour values are allowed to exist.
    files: ['src/theme/**/*.ts'],
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-imports': 'off',
    },
  },
  {
    // The primitives are what everything else is built from, so they are the
    // one place allowed to touch RN's press and colour internals directly.
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
]);
