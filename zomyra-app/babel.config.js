/**
 * Added by Module 5.5 for the test runner.
 *
 * `babel-preset-expo` is exactly the preset Metro already applies by default
 * when no `babel.config.js` is present, so declaring it explicitly here is a
 * no-op for every production build. What it adds is a config that `jest-expo`
 * can find: the runner transforms test and source files through Babel, and this
 * gives it the same JSX handling, Flow/TS stripping and `EXPO_PUBLIC_*` inlining
 * the app is written against, rather than a bare fallback that understands none
 * of it.
 */
module.exports = function babel(api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
