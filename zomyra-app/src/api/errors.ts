/**
 * The one error shape every endpoint in this app produces.
 *
 * **Branch on `code`, never on `message`** (BE TDD §7.1, MIGRATION §5). The
 * message is human-readable copy the backend is free to reword; the code is
 * the contract. `ApiErrorCode` is a closed union precisely so that a typo in a
 * branch is a compile error rather than a branch that silently never runs.
 */

/**
 * Every stable code named in FE TDD §9 or BE TDD §14, grouped by the endpoint
 * that raises it. Add to this list when an endpoint is added — and once O-11's
 * generated client lands, reconcile it against the served schema rather than
 * against the Word documents.
 */
export type ServerErrorCode =
  // API-1 · POST /auth/otp/request
  | "invalid_phone_number"
  | "rate_limited"
  | "sms_delivery_failed"
  // API-2 · POST /auth/otp/verify
  | "invalid_otp"
  | "otp_expired"
  | "too_many_attempts"
  // API-3 · POST /auth/google
  | "invalid_google_token"
  // API-4 · POST /auth/refresh
  | "refresh_token_invalid"
  /**
   * API-5 · `GET /app/version-check` — `?platform=` missing or not
   * `ios`/`android`. **Observed against staging on 2026-08-02**, not in either
   * TDD: `GET /v1/app/version-check` with no query returns
   * `400 invalid_platform`.
   *
   * `checkAppVersion` always sends a real platform, so the client should never
   * provoke it. It is listed because the union describes what the server can
   * send, not what we expect to receive — the same reason the generic codes at
   * the bottom of this list are here.
   */
  | "invalid_platform"
  // API-7 / API-24 / API-26 · submit + patch
  | "validation_error"
  | "already_submitted"
  | "immutable_field"
  // API-8 – API-10 · photos
  | "invalid_file"
  | "file_too_large"
  | "photo_not_found"
  | "below_minimum_required"
  | "invalid_order"
  // API-11 · verification
  | "invalid_image"
  | "already_verified"
  // API-14 / API-15 · interest
  | "cap_exceeded"
  | "profile_not_found"
  | "already_actioned"
  // API-17 / API-18 · requests
  | "request_not_found"
  | "not_premium"
  // API-20 / API-21 · chat
  | "conversation_unavailable"
  | "empty_message"
  // API-35 – API-37 · match / block / report
  | "match_not_found"
  | "user_not_found"
  | "already_blocked"
  // API-25 · discovery mode
  | "invalid_mode"
  // API-38 · GET /locations/cities — unrecognized `?state=` key (FE v1.44 §9.2,
  // BE v1.5 §14.2a). API-39 adds no codes of its own: it takes no parameters,
  // so it has nothing to reject.
  | "invalid_state"
  // API-28 · premium sync
  | "already_synced"
  // API-31 · push token
  | "invalid_token"
  /**
   * Account-status enforcement — BE v1.6 §9.9, added with O-4's resolution.
   *
   * Returned as **403 on every authenticated endpoint except `GET /me` and
   * `POST /auth/refresh`**, which are exempt precisely so a blocked client can
   * still find out why. The session is *not* revoked: tokens stay valid and
   * refresh keeps working, so this is emphatically **not** a 401 path and must
   * never be routed into the silent-refresh flow. `isRetryable` already
   * declines 403, which is correct — the answer will not change on a retry.
   *
   * The three are distinct server-side for support diagnostics only — FE §8.1
   * shows one undifferentiated blocker, so **nothing in the client should
   * branch on which**. They are listed separately because these are the codes
   * that arrive on the wire, not because the UI distinguishes them.
   */
  | "account_suspended"
  | "account_banned"
  | "account_deleted"
  /**
   * Generic codes the deployed backend returns that neither TDD enumerates —
   * **observed against staging on 2026-08-02**, not inferred:
   * `GET /v1/me` without a token → `401 unauthorized`; an unrouted path →
   * `404 not_found`; `POST /v1/auth/google` with Google unconfigured →
   * `503 service_unavailable`.
   *
   * Worth having even though no screen branches on them: without these,
   * `normalizeError` casts a code the server really sends into a type that
   * claims it cannot occur — the one thing a closed union exists to prevent.
   */
  | "unauthorized"
  | "not_found"
  | "service_unavailable";

/**
 * Codes this client synthesises when the failure never reached the backend, so
 * that a caller can branch uniformly instead of testing `typeof status`.
 */
export type ClientErrorCode =
  /** The request never completed — offline, DNS, TLS, connection reset. */
  | "network_error"
  /** Exceeded `API_TIMEOUT_MS`. Distinct from a `200 { status: "pending" }`. */
  | "timeout"
  /** A 2xx body that was not the JSON we expected. */
  | "parse_error"
  /** An HTTP error whose body carried no recognisable `error.code`. */
  | "unknown_error";

export type ApiErrorCode = ServerErrorCode | ClientErrorCode;

export type ApiError = {
  /** HTTP status, or 0 when the request never reached a server. */
  status: number;
  code: ApiErrorCode;
  /** Human-readable. For display only — never branch on it. */
  message: string;
  /** `error.details` from the envelope, verbatim. Shape varies by code. */
  details?: unknown;
  /** `X-Request-Id` from the response, for Sentry↔backend correlation (§10.2). */
  requestId?: string;
  /** Present on `rate_limited` / `too_many_attempts` (FE TDD §9.1). */
  retryAfterSeconds?: number;
};

/** Field-level errors carried by `validation_error` (FE TDD §9.2, §9.9). */
export type ValidationErrorDetails = { errors: { field: string; message: string }[] };

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "status" in value &&
    typeof (value as ApiError).code === "string"
  );
}

/** Narrowing helper so call sites read `if (errorHasCode(e, "cap_exceeded"))`. */
export function errorHasCode(value: unknown, ...codes: ApiErrorCode[]): boolean {
  return isApiError(value) && codes.includes(value.code);
}

/**
 * Display copy for anything that can land in an RTK Query `error` field.
 *
 * That field is `ApiError | SerializedError` — the second only appears when a
 * thrown exception escapes an `onQueryStarted` handler rather than the request
 * failing — so a call site cannot simply read `.message`.
 */
export function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  const message = (error as { message?: unknown } | undefined)?.message;
  return typeof message === "string" && message ? message : GENERIC_MESSAGE;
}

/** `validation_error` details, or `null` if this error is a different shape. */
export function validationErrors(error: unknown): ValidationErrorDetails["errors"] | null {
  if (!isApiError(error) || error.code !== "validation_error") return null;
  const details = error.details as Partial<ValidationErrorDetails> | undefined;
  return Array.isArray(details?.errors) ? details.errors : null;
}

/**
 * True when re-issuing the identical request is a sensible response to this
 * failure — i.e. nothing is in flight server-side and the input was not
 * rejected on its merits.
 *
 * This is the rule MIGRATION §5 warns is easy to get backwards. Note what is
 * *not* here: `200 { status: "pending" }` is a **success**, so it never reaches
 * this function at all. That asymmetry is the whole point — a pending
 * verification means the server is still working and a resubmission would
 * duplicate the attempt, whereas a 5xx means nothing is running and retrying
 * is exactly right (FE TDD §9.4). See `verificationOutcome()` in
 * `src/api/endpoints/verification.ts` for the success-side half of the rule.
 */
export function isRetryable(error: unknown): boolean {
  if (!isApiError(error)) return false;
  if (error.code === "network_error" || error.code === "timeout") return true;
  // 4xx is the server rejecting the request itself; sending it again produces
  // the same answer. 429 is the exception — it is a "not yet", not a "no".
  if (error.status === 429) return true;
  return error.status >= 500;
}

/**
 * Normalises anything a transport can hand back into an {@link ApiError}.
 *
 * Accepts RTK Query's `FetchBaseQueryError` union (numeric status with a body,
 * or one of the string-tagged client failures) because that is what both the
 * real `fetchBaseQuery` and the mock transport produce.
 */
export function normalizeError(raw: unknown, requestId?: string): ApiError {
  if (isApiError(raw)) {
    return requestId && !raw.requestId ? { ...raw, requestId } : raw;
  }

  const candidate = raw as { status?: unknown; data?: unknown; error?: unknown };
  const status = candidate?.status;

  if (status === "FETCH_ERROR") {
    return {
      status: 0,
      code: "network_error",
      message: "No connection. Check your network and try again.",
      requestId,
    };
  }
  if (status === "TIMEOUT_ERROR") {
    return {
      status: 0,
      code: "timeout",
      message: "That took too long. Please try again.",
      requestId,
    };
  }
  if (status === "PARSING_ERROR") {
    return { status: 0, code: "parse_error", message: GENERIC_MESSAGE, requestId };
  }

  const httpStatus = typeof status === "number" ? status : 0;
  const envelope = (candidate?.data as { error?: Partial<ApiError> } | undefined)?.error;

  if (envelope && typeof envelope.code === "string") {
    const details = envelope.details as { retryAfterSeconds?: number } | undefined;
    return {
      status: httpStatus,
      code: envelope.code as ApiErrorCode,
      message: typeof envelope.message === "string" ? envelope.message : GENERIC_MESSAGE,
      details: envelope.details,
      requestId,
      retryAfterSeconds:
        typeof envelope.retryAfterSeconds === "number"
          ? envelope.retryAfterSeconds
          : details?.retryAfterSeconds,
    };
  }

  return {
    status: httpStatus,
    code: httpStatus === 0 ? "network_error" : "unknown_error",
    message: GENERIC_MESSAGE,
    details: candidate?.data,
    requestId,
  };
}
