// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

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
]);
