import { fakeNetwork } from "./api";
import type { Country } from "@/src/lib/countries";

export type AuthSession = {
  userId: string;
  phone: string;
  dial: string;
};

/**
 * Mocked phone auth. Replace with Firebase / Twilio / your backend later by
 * swapping these two functions. Any 6-digit OTP is accepted as valid.
 */
export const authService = {
  async sendOtp(country: Country, phone: string) {
    return fakeNetwork({ ok: true, dial: country.dial, phone }, 700);
  },

  async verifyOtp(dial: string, phone: string, code: string): Promise<AuthSession> {
    if (!/^\d{6}$/.test(code)) {
      throw new Error("Enter the 6-digit code we sent you.");
    }
    return fakeNetwork(
      { userId: `user-${phone}`, phone, dial },
      900,
    );
  },

  async resendOtp(dial: string, phone: string) {
    return fakeNetwork({ ok: true, dial, phone }, 700);
  },
};
