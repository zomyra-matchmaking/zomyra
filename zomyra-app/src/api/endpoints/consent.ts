/**
 * API-40 — `POST /consents` (FE v1.46 §9.2, BE v1.7 §14.2b).
 *
 * Records an FR-2a or FR-11a acceptance as a durable, append-only row. Before
 * v1.46 the consent screens were **only** a client-side navigation gate: BE
 * v1.7 is blunt that the timestamp columns an earlier revision added "were
 * never actually written by anything and never read back", so nothing anywhere
 * could prove consent had been obtained.
 *
 * **Called immediately on each accept, never batched into API-7.** A user who
 * accepts and then abandons onboarding still needs the record — and API-7 fires
 * at the *end* of Plot/Anchor/Love, which would record the consent after the
 * data it was meant to gate had already been collected.
 *
 * **It invalidates `Me`**, which is the whole mechanism: `GET /me`'s `consents`
 * array is the source of truth for what has been accepted, so the refetch is
 * what makes `resolveRootDestination` stop returning `/consent`. Without the
 * invalidation the client would have recorded consent server-side and still be
 * looking at a stale array saying it had not.
 */
import { CLIENT_PLATFORM } from "@/src/config/device";

import { api } from "../api";
import type { ConsentType, ConsentWireBody } from "../contract";

/**
 * What a *caller* provides. `platform` is deliberately absent: it is a property
 * of the runtime, not a decision any screen makes, so the endpoint fills it in
 * below and neither the FR-2a nor the FR-11a call site can forget it.
 */
export type RecordConsentBody = {
  consentType: ConsentType;
  /**
   * The version of the consent **text the client actually displayed** — not a
   * version of the API or of this client. See `SENSITIVE_DATA_CONSENT_VERSION`
   * in `src/lib/consent.ts`, which is defined beside the copy it describes.
   */
  version: number;
};

/** API-40's response. `recorded` is always `true` on a 200; the row is new. */
export type RecordConsentResponse = { recorded: true; acceptedAt: string };

export const consentApi = api.injectEndpoints({
  endpoints: (build) => ({
    /**
     * API-40. Errors: `400 validation_error` (unknown type, missing version,
     * unknown platform).
     *
     * `platform` is added here rather than by the caller — see
     * {@link RecordConsentBody}. The backend asked for it because a consent
     * record is a legal artifact and a blank platform column weakens it, and
     * because it cannot be derived server-side: `X-App-Version` carries only a
     * version string (owner's decision, 2026-08-06 — CONTRACT-QUESTIONS §11).
     */
    recordConsent: build.mutation<RecordConsentResponse, RecordConsentBody>({
      query: (body) => ({
        url: "/consents",
        method: "POST",
        body: { ...body, platform: CLIENT_PLATFORM } satisfies ConsentWireBody,
      }),
      invalidatesTags: ["Me"],
    }),
  }),
});

export const { useRecordConsentMutation } = consentApi;
