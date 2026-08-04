/**
 * The mock backend's user records.
 *
 * ## Why this exists, when a constant `GET /me` had been enough
 *
 * Until Module 4 the mock answered `GET /me` with one hardcoded incomplete
 * account and `POST /auth/otp/verify` with a hardcoded `isNewAccount: true`.
 * That was sufficient while nothing branched on either. Three things now do,
 * and none of them can be exercised against a constant:
 *
 * - **FR-1a** has two outcomes — an existing account goes straight to Discover,
 *   a new one into Onboarding. A mock that only ever returns `isNewAccount:
 *   true` can demonstrate exactly one of them.
 * - **FR-2a**'s consent screen is *once per account*. Proving "never again"
 *   needs the same account to be signable-into twice.
 * - **O-18(a)**'s deep-link race is only observable for a user the tabs guard
 *   lets through, i.e. one whose §9.1 destination is `/discover`. With an
 *   incomplete account the guard reroutes and the bug and the fix look
 *   identical.
 *
 * The alternative — hand-editing `handlers.ts` before each test, which is what
 * Module 3's log suggests — does not survive into a `preview` build, where the
 * bundle is baked at build time and there is no Fast Refresh to edit it back.
 *
 * ## The seeded account, and why the id is encoded in the token
 *
 * {@link RETURNING_PHONE_NUMBER} is a fully set-up returning user. Everything
 * else creates a fresh, incomplete one — no magic predicate, just "is this
 * identity in the directory".
 *
 * This state is module-scoped and dies with the JS context, exactly like
 * `session.ts`'s. The seeded account survives that because it is re-created on
 * every load; an account created by signing up does not. So the mock access
 * token carries its own `userId`, which lets `isAccessTokenValid` re-adopt the
 * *right* record after a reload rather than falling back to a placeholder —
 * without it, cold-starting as the returning user would resolve to an
 * incomplete account and undo the very thing this file is for.
 */
import type {
  AccountStatus,
  Consent,
  DiscoveryMode,
  MeResponse,
  VerificationStatus,
} from "../contract";

/**
 * Sign in with this number to get the fully set-up returning account:
 * onboarded, verified, Discovery Mode chosen — §9.1's `/discover` row, and
 * therefore the only identity that can reach a tab.
 *
 * Any other number is treated as a new signup.
 */
const RETURNING_PHONE_NUMBER = "9000000000";

export type MockAccount = {
  userId: string;
  firstName: string;
  profileComplete: boolean;
  verificationStatus: VerificationStatus;
  discoveryMode: DiscoveryMode | null;
  accountStatus: AccountStatus;
  /**
   * API-40. Server-side truth for what has been accepted, which is why the
   * client reads it off `GET /me` instead of tracking it locally (§12.5).
   */
  consents: Consent[];
};

/** `phone:<number>` or `google:<sub>` — the two identity kinds API-3's note keeps apart. */
export type MockIdentity = string;

export const phoneIdentity = (phoneNumber: string): MockIdentity => `phone:${phoneNumber}`;
export const googleIdentity = (sub: string): MockIdentity => `google:${sub}`;

const RETURNING: MockAccount = {
  userId: "usr-returning",
  firstName: "Riya",
  profileComplete: true,
  verificationStatus: "verified",
  discoveryMode: "all",
  accountStatus: "active",
  /**
   * Both on file: a fully set-up user reached Discover, so they cleared FR-2a
   * and FR-11a on the way. This is what makes the mock exercise the *skip*
   * path — neither consent screen should re-appear for this account.
   */
  consents: [
    { consentType: "sensitive_data", version: 1, acceptedAt: "2026-07-01T09:15:00.000Z" },
    { consentType: "biometric", version: 1, acceptedAt: "2026-07-01T09:22:00.000Z" },
  ],
};

function freshAccount(userId: string): MockAccount {
  return {
    userId,
    firstName: "",
    profileComplete: false,
    verificationStatus: "unverified",
    discoveryMode: null,
    accountStatus: "active",
    /** Nothing accepted yet — FR-2a has not been shown at this point. */
    consents: [],
  };
}

/**
 * Rebuilt on every module load, which is what makes {@link RETURNING_PHONE_NUMBER}
 * dependable across reloads while signups are not.
 */
const byIdentity = new Map<MockIdentity, MockAccount>([
  [phoneIdentity(RETURNING_PHONE_NUMBER), RETURNING],
]);
const byUserId = new Map<string, MockAccount>([[RETURNING.userId, RETURNING]]);

let nextUserId = 0;

export type ResolvedAccount = { account: MockAccount; isNewAccount: boolean };

/** Find the account for an identity, or create one. API-2 and API-3's shared half. */
export function resolveAccount(identity: MockIdentity): ResolvedAccount {
  const existing = byIdentity.get(identity);
  if (existing) return { account: existing, isNewAccount: false };

  nextUserId += 1;
  const account = freshAccount(`usr-${nextUserId}`);
  byIdentity.set(identity, account);
  byUserId.set(account.userId, account);
  return { account, isNewAccount: true };
}

/**
 * The record behind a live session. Falls back to a fresh account rather than
 * returning null: a token re-adopted from the keychain after a reload may name
 * a signup this JS context never saw, and a real backend would still have that
 * user — it just would not have finished onboarding either.
 *
 * ⚠️ **This is why a *newly recorded* consent does not survive a cold start in
 * mock mode, and it is a limitation of the mock rather than a client bug.** The
 * directory above is module-scoped, so a restart rebuilds it; the client's token
 * is in the keychain and does not. `usr-3` therefore comes back as a *fresh*
 * account with `consents: []` and the FR-2a screen shows again. Against a real
 * backend the row is in Postgres and the screen is skipped — which is the whole
 * point of API-40 and the one part of it a mock cannot demonstrate.
 *
 * What *is* demonstrable here: recording a consent and being routed onward
 * within the session (the `Me` invalidation round trip), and the skip path via
 * {@link RETURNING_PHONE_NUMBER}, whose consents are seeded above and so survive
 * a reload the same way the rest of that fixture does.
 */
export function accountByUserId(userId: string): MockAccount {
  const found = byUserId.get(userId);
  if (found) return found;
  const account = freshAccount(userId);
  byUserId.set(userId, account);
  return account;
}

/**
 * API-40's write half. **Append, never replace** — BE §6.1's `user_consents` is
 * append-only and `GET /me` projects the max version per type, so a mock that
 * overwrote would hide the one bug worth catching here: a client that records
 * version 2 and then reads back version 1.
 */
export function recordConsent(userId: string, consent: Consent): void {
  accountByUserId(userId).consents.push(consent);
}

/** API-6's response, projected from a record rather than hardcoded. */
export function meResponse(account: MockAccount): MeResponse {
  return {
    userId: account.userId,
    firstName: account.firstName,
    profileComplete: account.profileComplete,
    verificationStatus: account.verificationStatus,
    discoveryMode: account.discoveryMode,
    accountStatus: account.accountStatus,
    isPremium: false,
    /*
     * ⚠️ **Copied, not handed out by reference — this was a real crash.**
     *
     * Returning `account.consents` directly put the mock's *own* array into the
     * RTK Query cache, and Immer freezes cached state in development. The next
     * `POST /consents` then tried to `push` onto a frozen array and threw
     * `cannot add a new property`, surfacing as an error on the consent screen.
     *
     * The general rule this is an instance of: **a mock stands in for a server,
     * and a server never hands a caller a live reference to its own storage.**
     * Any handler returning a mutable structure from this file should copy it.
     */
    consents: [...account.consents],
  };
}
