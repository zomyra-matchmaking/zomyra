/**
 * FE TDD §9.1's cold-start routing table, as one pure function.
 *
 * Kept out of the gate screen because the **order** is the part that is easy to
 * get wrong and impossible to see once it is interleaved with rendering. Two
 * orderings are load-bearing here and neither is obvious from the field names:
 *
 * 1. **The version check runs before any of this** (FR-30, §6.14) — an
 *    unsupported client may not be able to talk to the API safely at all, so it
 *    resolves before `GET /me` is even fired. That ordering lives in the gate
 *    itself, since it is about *when the request happens*; see `app/index.tsx`.
 * 2. **`accountStatus` is checked first, before the table below is consulted at
 *    all** (FE v1.45 §8.1, closing O-4). Not "checked alongside" and not
 *    "checked after": a suspended user with `profileComplete: false` must reach
 *    the blocker, not Onboarding. Writing it as an early return rather than a
 *    fifth column is deliberate — a column can be reordered by accident.
 * 3. **FR-2a's consent screen sits between the two** (Module 4). It comes after
 *    `accountStatus` — there is no point consenting to data collection on a
 *    banned account — and before `profileComplete`, because FR-2a places it
 *    *"before the Onboarding stack begins"*. Since FE v1.46 it reads
 *    `GET /me`'s `consents` array (API-40), so the table is a pure function of
 *    the server's answer again, with no client-side context threaded in.
 *
 * **Module 4 kept FR-1a here rather than at the auth screens.** API-2 and API-3
 * return `isNewAccount` and `profileComplete`, which looks like enough to route
 * on — but §9.1 also needs `verificationStatus` and `discoveryMode`, and
 * neither is in that response. A returning user can be mid-verification or yet
 * to pick a Discovery Mode, so an auth screen branching on `profileComplete`
 * would send them to Discover and the tabs guard would bounce them back out.
 * The auth screens navigate to `/` and this function answers, so there is one
 * copy of the table and it reads the fields it actually needs.
 */
import type { ConsentType, MeResponse } from "@/src/api";

/**
 * Where a launch lands. Strings rather than typed `Href` values so this stays a
 * plain data function; the gate does the navigating.
 */
export type RootDestination =
  /** Any non-`active` `accountStatus`. Full-screen, non-dismissible. */
  | "/blocked"
  /** FR-2a's one-time sensitive-data notice, before Onboarding can begin. */
  | "/consent"
  /** Onboarding stack, still mid-flow. */
  | "/onboarding"
  /** Photos + verification stack. Carries an `entry` param, see below. */
  | "/verify?entry=photos"
  | "/verify?entry=pending"
  | "/verify?entry=mismatch"
  /** FR-15a's one-time Discovery Mode picker. */
  | "/discovery-mode"
  /** An ordinary reopen. */
  | "/discover";

/**
 * Whether `GET /me` shows this consent type already on file.
 *
 * `consents` carries **one entry per type with its max version** (BE v1.7
 * §14.1), so presence is the whole question for FR-2a — it is recorded once and
 * never re-asked. **FR-11a is not the same shape**: Module 6 re-asks on every
 * fresh entry to Verification and must compare against its own rule rather than
 * reusing this helper as though absence were the only trigger.
 */
function hasConsent(me: MeResponse, consentType: ConsentType): boolean {
  return me.consents.some((c) => c.consentType === consentType);
}

export function resolveRootDestination(me: MeResponse): RootDestination {
  /*
   * O-4's resolution, and the reason it is an early return: any value other
   * than `active` — suspended, banned, or soft-deleted inside FR-28's grace
   * window — goes to one static blocker, deliberately undifferentiated between
   * the three causes. Nothing below this line runs for a blocked account.
   */
  if (me.accountStatus !== "active") return "/blocked";

  /*
   * FR-2a, and the ordering is the requirement: *"immediately after a new
   * account is created and **before the Onboarding stack begins**"*. Onboarding
   * is where religion, income and the lifestyle fields are actually asked for,
   * so consent has to gate the whole stack rather than the first screen of it.
   *
   * Gated on `profileComplete` as well, so it can never reappear for a finished
   * account — including one onboarded before API-40 existed, whose `consents`
   * array is legitimately empty and which would otherwise be sent to consent on
   * every launch forever.
   *
   * **The source of truth is the server** (`GET /me`'s `consents`, API-40).
   * Module 4 originally kept a persisted per-`userId` record client-side
   * because no endpoint existed; FE v1.46 / BE v1.7 added one, and the local
   * slice was deleted rather than kept alongside it — two records of who
   * consented can disagree, and only one of them is evidence.
   */
  if (!me.profileComplete && !hasConsent(me, "sensitive_data")) return "/consent";

  if (!me.profileComplete) return "/onboarding";

  switch (me.verificationStatus) {
    /*
     * ⚠️ **This row is not in FE §9.1's table.** The table lists
     * `false/—/—`, `true/pending`, `true/mismatch`, `true/verified/not set` and
     * `true/verified/set` — `true` + `unverified` is unlisted, yet it is the
     * normal state of someone who has just submitted API-7 and has not started
     * photos. It is not a gap in the product, only in the table: §3.2 puts
     * Photos and Verification at the end of the onboarding stack, and
     * `app/onboarding.tsx` already routes there itself on submit. Sending them
     * anywhere else would strand a half-finished signup. Raised in
     * docs/CONTRACT-QUESTIONS.md.
     */
    case "unverified":
      return "/verify?entry=photos";
    /** Work genuinely in flight server-side — a held screen, never a retry. */
    case "pending":
      return "/verify?entry=pending";
    /** FR-12's selfie retry. */
    case "mismatch":
      return "/verify?entry=mismatch";
    case "verified":
      /*
       * FR-15a: the one-time lens picker, shown the first time an account
       * clears verification and never again. `discoveryMode` being null is the
       * only thing that distinguishes "first time through" from an ordinary
       * reopen — which is why it must be read from `GET /me` on every launch
       * rather than from a local "have we shown this" flag.
       */
      return me.discoveryMode ? "/discover" : "/discovery-mode";
  }
}
