/**
 * Consent text versioning, and the rule that keeps it honest.
 *
 * API-40 takes a `version` that FE v1.46 defines as *"the version of the
 * consent text the client actually displayed"*. That makes it a property of the
 * **copy**, not of the API or of the app build — which is why the constant
 * lives here, next to a statement of what version 1 says, rather than in
 * `contract.ts` next to the request type.
 *
 * ## The rule
 *
 * **Bump this whenever the meaning of the consent copy changes**, and only
 * then. Adding a data category, changing what it is used for, or changing who
 * it is shared with are bumps. Fixing a typo or re-wording for clarity is not.
 * A bump makes every existing acceptance older than the new version, which is
 * what lets the backend identify who must be re-asked.
 *
 * ⚠️ **What is still open is who owns the copy, not this mechanism** — see
 * MIGRATION §4, O-20. The text below was written by the frontend to satisfy
 * FR-2a's requirement that the categories be named plainly; it has not been
 * through legal review. If that review changes the wording materially, this
 * constant goes to 2 in the same commit.
 */

/**
 * Version of the FR-2a sensitive-data notice rendered by `app/consent.tsx`.
 *
 * **Version 1** names three categories — religion and community, income and
 * education, and lifestyle (diet, drinking, smoking) — states that profile data
 * is visible to matched users and not the open internet, and links to the full
 * privacy policy.
 */
export const SENSITIVE_DATA_CONSENT_VERSION = 1;

/**
 * Version of the FR-11a biometric notice. **Module 6 owns the screen** and
 * should set this the same way — beside the copy, bumped with its meaning.
 *
 * Deliberately not defined here yet: a constant with no copy behind it is a
 * number nobody can check, which is the exact failure O-20 describes.
 */
