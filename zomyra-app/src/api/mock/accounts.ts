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
 * ## The seeded accounts, and why the id is encoded in the token
 *
 * {@link SEEDED} is one identity per row of `resolveRootDestination`, so every
 * §9.1 destination is reachable by *signing in as someone*. Anything not in the
 * directory creates a fresh, incomplete account — no magic predicate, just "is
 * this identity in the directory".
 *
 * This state is module-scoped and dies with the JS context, exactly like
 * `session.ts`'s. The seeded accounts survive that because they are re-created
 * on every load; an account created by signing up does not. So the mock access
 * token carries its own `userId`, which lets `isAccessTokenValid` re-adopt the
 * *right* record after a reload rather than falling back to a placeholder —
 * without it, cold-starting as a seeded user would resolve to an incomplete
 * account and undo the very thing this file is for.
 *
 * **That difference is why the whole matrix is seeded rather than reached by
 * signing up and mutating.** A permutation walked across a cold start has to be
 * a fixture: only fixtures survive the restart, which is exactly the entry
 * condition the routing table is least verified in.
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
 * The rest of the matrix is in {@link SEEDED}. Any number not listed there is
 * treated as a new signup.
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

/** A `sensitive_data` acceptance already on file, at the current copy version. */
const SENSITIVE_DATA_ON_FILE: Consent = {
  consentType: "sensitive_data",
  version: 1,
  acceptedAt: "2026-07-01T09:15:00.000Z",
};

/** The FR-11a counterpart. Module 6 owns the screen that would record it. */
const BIOMETRIC_ON_FILE: Consent = {
  consentType: "biometric",
  version: 1,
  acceptedAt: "2026-07-01T09:22:00.000Z",
};

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
  consents: [SENSITIVE_DATA_ON_FILE, BIOMETRIC_ON_FILE],
};

/**
 * **One identity per row of `resolveRootDestination`.**
 *
 * The routing table branches `accountStatus` → consent → `profileComplete` →
 * `verificationStatus` → `discoveryMode`, and until this existed only two of
 * its eight destinations had a fixture: `/discover` ({@link RETURNING}) and
 * `/consent` (any unseeded number, via {@link freshAccount}). The other six were
 * reachable only by hand-editing this file between runs — which a `preview`
 * build cannot do, for the same reason the file exists at all.
 *
 * **Two of these are deliberately contradictory fixtures**, and that is their
 * whole job. `9000000006` is suspended *and* incomplete *and* unconsented, so it
 * proves the `accountStatus` early return really does precede the rest of the
 * table rather than merely being listed first. `9000000007` is banned *and*
 * otherwise a perfect `/discover` account, so it proves the same thing from the
 * other end — the row that would otherwise win is the one being beaten.
 */
const SEEDED: { phoneNumber: string; account: MockAccount }[] = [
  { phoneNumber: RETURNING_PHONE_NUMBER, account: RETURNING },

  /*
   * `/onboarding` — consented, still incomplete. Its reason for existing is
   * narrower than the others: FR-2a's *skip* path is the one thing the mock
   * could not demonstrate across a restart, because a consent recorded at
   * runtime dies with the directory (see `accountByUserId`). A seeded account
   * that already holds the consent survives the restart the same way the rest
   * of this table does, so "accepted once, never re-asked" becomes observable
   * on a cold start rather than only within a session.
   */
  {
    phoneNumber: "9000000001",
    account: {
      userId: "usr-consented",
      firstName: "Aarti",
      profileComplete: false,
      verificationStatus: "unverified",
      discoveryMode: null,
      accountStatus: "active",
      consents: [SENSITIVE_DATA_ON_FILE],
    },
  },

  /*
   * `/verify?entry=photos` — the row FE §8.1's table was missing (§12.6), and
   * the normal state of everyone between submitting API-7 and starting photos.
   */
  {
    phoneNumber: "9000000002",
    account: {
      userId: "usr-photos",
      firstName: "Neha",
      profileComplete: true,
      verificationStatus: "unverified",
      discoveryMode: null,
      accountStatus: "active",
      consents: [SENSITIVE_DATA_ON_FILE],
    },
  },

  /** `/verify?entry=pending` — work genuinely in flight server-side. */
  {
    phoneNumber: "9000000003",
    account: {
      userId: "usr-pending",
      firstName: "Priya",
      profileComplete: true,
      verificationStatus: "pending",
      discoveryMode: null,
      accountStatus: "active",
      consents: [SENSITIVE_DATA_ON_FILE, BIOMETRIC_ON_FILE],
    },
  },

  /** `/verify?entry=mismatch` — FR-12's selfie retry. */
  {
    phoneNumber: "9000000004",
    account: {
      userId: "usr-mismatch",
      firstName: "Sneha",
      profileComplete: true,
      verificationStatus: "mismatch",
      discoveryMode: null,
      accountStatus: "active",
      consents: [SENSITIVE_DATA_ON_FILE, BIOMETRIC_ON_FILE],
    },
  },

  /** `/discovery-mode` — FR-15a's one-time lens picker, `discoveryMode` null. */
  {
    phoneNumber: "9000000005",
    account: {
      userId: "usr-nomode",
      firstName: "Kavya",
      profileComplete: true,
      verificationStatus: "verified",
      discoveryMode: null,
      accountStatus: "active",
      consents: [SENSITIVE_DATA_ON_FILE, BIOMETRIC_ON_FILE],
    },
  },

  /**
   * `/blocked` via `suspended`, and **incomplete and unconsented with it**. On
   * the table's own order this account's next-best destination is `/consent`;
   * reaching the blocker instead is the O-4 early return doing its job.
   */
  {
    phoneNumber: "9000000006",
    account: {
      userId: "usr-suspended",
      firstName: "",
      profileComplete: false,
      verificationStatus: "unverified",
      discoveryMode: null,
      accountStatus: "suspended",
      consents: [],
    },
  },

  /**
   * `/blocked` via `banned`, from the opposite direction: everything else about
   * this account says `/discover`. It is {@link RETURNING} with one field
   * changed, so the only thing that can send it to the blocker is `accountStatus`.
   */
  {
    phoneNumber: "9000000007",
    account: {
      userId: "usr-banned",
      firstName: "Meera",
      profileComplete: true,
      verificationStatus: "verified",
      discoveryMode: "all",
      accountStatus: "banned",
      consents: [SENSITIVE_DATA_ON_FILE, BIOMETRIC_ON_FILE],
    },
  },

  /**
   * `/blocked` via `deleted` — FR-28's soft-delete grace window. Undifferentiated
   * from the other two on screen, which is O-4's decision, not an omission.
   */
  {
    phoneNumber: "9000000008",
    account: {
      userId: "usr-deleted",
      firstName: "Divya",
      profileComplete: true,
      verificationStatus: "verified",
      discoveryMode: "all",
      accountStatus: "deleted",
      consents: [SENSITIVE_DATA_ON_FILE, BIOMETRIC_ON_FILE],
    },
  },
];

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
 * Rebuilt on every module load, which is what makes {@link SEEDED} dependable
 * across reloads while signups are not.
 */
const byIdentity = new Map<MockIdentity, MockAccount>(
  SEEDED.map(({ phoneNumber, account }) => [phoneIdentity(phoneNumber), account]),
);
const byUserId = new Map<string, MockAccount>(
  SEEDED.map(({ account }) => [account.userId, account]),
);

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
 * any of {@link SEEDED}, whose consents are seeded above and so survive a reload
 * the same way the rest of those fixtures do. **`9000000001` is the fixture that
 * makes the skip path meaningful** — it is `profileComplete: false` with
 * `sensitive_data` already on file, so it is still *inside* the window where the
 * consent row is evaluated and yet must not be re-asked. {@link RETURNING} skips
 * the screen too, but trivially: `profileComplete: true` short-circuits the row
 * before `consents` is ever read, so it proves the gate, not the record.
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

/**
 * API-7's write half — the state change a successful submit makes.
 *
 * **Only `profileComplete` moves, and `verificationStatus` deliberately does
 * not.** The account lands on `profileComplete: true` + `unverified`, which is
 * the §8.1 row FE v1.47 found missing (§12.6) and the one every real user
 * occupies between submitting onboarding and starting photos. Setting anything
 * further here would skip the state the client most needs to route correctly
 * out of, and `9000000002` exists precisely to make it reachable as a fixture.
 *
 * The submitted profile itself is discarded: nothing in the mock reads a stored
 * profile back yet, and API-23 is Module 6's. Recording it would be inventing a
 * store no test exercises.
 */
export function completeOnboarding(userId: string): void {
  accountByUserId(userId).profileComplete = true;
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
