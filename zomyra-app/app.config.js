/**
 * Dynamic config, layered **on top of** `app.json`.
 *
 * Expo reads `app.json` first and hands it to this function as `config`, so
 * everything static stays in the JSON where it is diffable and nothing here
 * has to restate it. Only one thing needs to be dynamic, and it is the reason
 * this file exists at all.
 *
 * ## Why the Google plugin cannot live in `app.json`
 *
 * `@react-native-google-signin/google-signin`'s config plugin has **two modes**,
 * chosen by whether it is given options (read its `withGoogleSignInRoot`):
 *
 * - **With `{ iosUrlScheme }`** — the standalone path. It appends one URL scheme
 *   to `Info.plist` and does nothing else. This is ours.
 * - **With no options** — the *Firebase* path. It applies the google-services
 *   Gradle plugin and expects `google-services.json` /
 *   `GoogleService-Info.plist` to exist. Those files are generated per package
 *   name from a Firebase project, which MIGRATION §2.1 gates behind O-2, so
 *   this path fails prebuild outright today.
 *
 * `npx expo install` writes the bare, option-less form into `app.json`, which is
 * the second one. It was removed for that reason — this is not a preference.
 *
 * The scheme itself is the iOS OAuth client ID reversed, so it is per-build
 * configuration rather than a constant, and MIGRATION §11 is explicit that
 * build-varying values do not belong hardcoded in a committed file.
 *
 * ## What happens when the IDs are not configured
 *
 * The plugin is **omitted entirely**, and that is deliberate rather than a
 * fallback. Autolinking is package-based, not plugin-based, so the native
 * module is still linked and the JS import still resolves — the only thing
 * missing is the `Info.plist` URL scheme, which is exactly the capability a
 * build with no client IDs genuinely does not have. Writing a placeholder
 * scheme instead would produce a build that looks configured and fails at the
 * consent screen.
 *
 * `src/auth/google.ts` refuses to call the SDK under the same condition, so the
 * JS and native halves cannot disagree about whether Google is available.
 *
 * @see MIGRATION.md §4 (O-19) for what has to be created in Google Cloud
 *      Console, and which of the three client IDs does what.
 */

/**
 * `123456-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.123456-abc`.
 *
 * Derived rather than configured separately: the two values are the same
 * string in two orders, and asking for both invites a build whose `Info.plist`
 * scheme belongs to a different client than the one the JS presents — which
 * surfaces only as a failed redirect on a real device.
 */
const GOOGLE_CLIENT_SUFFIX = ".apps.googleusercontent.com";

function iosUrlSchemeFrom(iosClientId) {
  const id = (iosClientId ?? "").trim();
  if (!id) return null;
  if (!id.endsWith(GOOGLE_CLIENT_SUFFIX)) {
    throw new Error(
      `[config] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is "${id}", which does not end in ` +
        `"${GOOGLE_CLIENT_SUFFIX}". That is the iOS OAuth client ID from Google Cloud ` +
        `Console — not the Web client ID, and not the reversed URL scheme.`,
    );
  }
  return `com.googleusercontent.apps.${id.slice(0, -GOOGLE_CLIENT_SUFFIX.length)}`;
}

module.exports = ({ config }) => {
  const iosUrlScheme = iosUrlSchemeFrom(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);

  return {
    ...config,
    plugins: iosUrlScheme
      ? [
          ...(config.plugins ?? []),
          ["@react-native-google-signin/google-signin", { iosUrlScheme }],
        ]
      : config.plugins,
  };
};
