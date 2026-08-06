/**
 * Public entry point for the data layer.
 *
 * Screens import from `@/src/api` — never from `base-query`, `mock/` or an
 * endpoint file's internals. Importing every endpoint module here is also what
 * makes the injected endpoints exist: `injectEndpoints` runs as a side effect
 * of the module being loaded, so an endpoint file nobody imports produces
 * hooks that are `undefined` at runtime.
 */
export { api } from "./api";

export * from "./contract";
export {
  errorHasCode,
  errorMessage,
  isApiError,
  isRetryable,
  normalizeError,
  validationErrors,
  type ApiError,
  type ApiErrorCode,
} from "./errors";

export {
  sessionAdopted,
  useGoogleSignInMutation,
  useRequestOtpMutation,
  useVerifyOtpMutation,
} from "./endpoints/auth";
export { useCheckAppVersionQuery, useGetMeQuery, useLazyGetMeQuery } from "./endpoints/session";
export { useGetDiscoverFeedQuery } from "./endpoints/discover";
export { useGetCountsQuery } from "./endpoints/counts";
export {
  useRecordConsentMutation,
  type RecordConsentBody,
  type RecordConsentResponse,
} from "./endpoints/consent";
export {
  useGetCitiesQuery,
  useGetOnboardingOptionsQuery,
  useSubmitOnboardingMutation,
} from "./endpoints/onboarding";
export {
  useSubmitVerificationMutation,
  verificationOutcome,
  type VerificationOutcome,
} from "./endpoints/verification";
