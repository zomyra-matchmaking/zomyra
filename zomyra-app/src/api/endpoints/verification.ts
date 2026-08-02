/**
 * Verification submit — API-11 (FE TDD §9.4).
 *
 * This endpoint exists in Module 2 because it is where the contract's easiest
 * mistake lives. Module 6 owns the screens.
 */
import { isRetryable, type ApiError } from "../errors";
import { api } from "../api";
import type { VerificationSubmitResponse } from "../contract";

export const verificationApi = api.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Multipart — the selfie file, nothing else. `Content-Type` is left unset
     * on purpose so fetch generates its own multipart boundary; setting it by
     * hand produces a body the backend cannot parse.
     *
     * **No retries.** A resubmission while a check is genuinely in flight is a
     * duplicate verification attempt (§9.4), and this layer cannot tell the two
     * apart from a status code alone — see {@link verificationOutcome}.
     */
    submitVerification: build.mutation<VerificationSubmitResponse, { selfie: FormData }>({
      query: ({ selfie }) => ({ url: "/verification/submit", method: "POST", body: selfie }),
      invalidatesTags: ["Me", "Verification"],
    }),
  }),
});

export const { useSubmitVerificationMutation } = verificationApi;

/**
 * What the UI should do with a verification attempt.
 *
 * The distinction MIGRATION §5 flags, in one place so no screen has to
 * rediscover it:
 *
 * - `200 { status: "pending" }` is a **success**. The check is genuinely still
 *   running server-side and the real result arrives by push (FR-11). Offering
 *   "Try again" here would fire a second, duplicate verification.
 * - A 5xx or a timeout is the **opposite**: nothing is in flight, so
 *   resubmitting is exactly the right response.
 *
 * Both feel like "it didn't finish" from the screen's point of view, which is
 * why they are resolved here rather than at each call site.
 */
export type VerificationOutcome =
  | { kind: "verified" }
  /** Face didn't match the profile photos — recapture the selfie (FR-12). */
  | { kind: "mismatch"; canRetry: true }
  /** In flight server-side. Hold the user; **never** offer manual retry. */
  | { kind: "pending"; canRetry: false }
  /** The request failed. `canRetry` distinguishes 5xx/timeout from a 400. */
  | { kind: "failed"; canRetry: boolean; error: ApiError };

export function verificationOutcome(
  result: { data?: VerificationSubmitResponse; error?: ApiError },
): VerificationOutcome {
  if (result.error) {
    return { kind: "failed", canRetry: isRetryable(result.error), error: result.error };
  }
  switch (result.data?.status) {
    case "verified":
      return { kind: "verified" };
    case "mismatch":
      return { kind: "mismatch", canRetry: true };
    default:
      return { kind: "pending", canRetry: false };
  }
}
