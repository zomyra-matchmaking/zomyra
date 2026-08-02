/**
 * Auth endpoints — API-1 and API-2 (FE TDD §9.1).
 *
 * API-4 (`POST /auth/refresh`) is deliberately **not** an endpoint here: it is
 * called from inside the base query, behind the shared in-flight promise, and
 * exposing it as a hook would invite a screen to call it directly and break the
 * single-refresh guarantee (MIGRATION §5).
 *
 * Module 4 owns the auth *screens*; this file owns the calls they make.
 */
import { setTokens } from "@/src/auth/tokens";
import { signedIn } from "@/src/store/slices/session-slice";

import { api } from "../api";
import type {
  AuthSessionResponse,
  OtpRequestBody,
  OtpRequestResponse,
  OtpVerifyBody,
} from "../contract";

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    /** API-1. Errors: `invalid_phone_number`, `rate_limited`, `sms_delivery_failed`. */
    requestOtp: build.mutation<OtpRequestResponse, OtpRequestBody>({
      query: (body) => ({ url: "/auth/otp/request", method: "POST", body }),
      extraOptions: { skipAuth: true },
    }),

    /** API-2. Errors: `invalid_otp`, `otp_expired`, `too_many_attempts`. */
    verifyOtp: build.mutation<AuthSessionResponse, OtpVerifyBody>({
      query: (body) => ({ url: "/auth/otp/verify", method: "POST", body }),
      extraOptions: { skipAuth: true },
      // Tokens reach the keychain here rather than in the screen, so every
      // future sign-in path (Google, API-3) lands them the same way and no
      // screen ever holds a token in component state.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        dispatch(signedIn({}));
      },
    }),
  }),
});

export const { useRequestOtpMutation, useVerifyOtpMutation } = authApi;
