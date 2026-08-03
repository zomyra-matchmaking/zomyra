/**
 * A seconds countdown, used by both auth screens.
 *
 * Three of Module 4's requirements are the same shape — FR-1a's 30-second
 * resend cooldown, API-1's `rate_limited` `retryAfterSeconds`, and API-2's
 * `too_many_attempts` (15 minutes, per BE §14.1) — so they share one
 * implementation rather than three timers that round differently.
 *
 * ⚠️ **It counts to a deadline, not by decrementing.** The obvious version —
 * `setInterval(() => setLeft((s) => s - 1), 1000)` — is wrong in two ways that
 * both bite exactly here. It drifts, because a 1000ms interval is a floor and
 * not a promise; and while the app is backgrounded the timer is throttled or
 * suspended, so a user who backgrounds the app for the full 15 minutes of a
 * `too_many_attempts` lockout comes back to a counter that barely moved. A
 * deadline is re-read from the clock on every tick, so backgrounding costs
 * nothing and the number is right the moment the screen is visible again.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const secondsUntil = (deadline: number) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

export type Countdown = {
  /** Seconds remaining, 0 when idle or finished. */
  secondsLeft: number;
  /** Start (or restart) the countdown. A non-positive value clears it. */
  start: (seconds: number) => void;
  /** Stop immediately — e.g. `otp_expired`, which should re-enable Resend now. */
  clear: () => void;
};

export function useCountdown(initialSeconds = 0): Countdown {
  const deadlineRef = useRef(initialSeconds > 0 ? Date.now() + initialSeconds * 1000 : 0);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    deadlineRef.current ? secondsUntil(deadlineRef.current) : 0,
  );

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft(secondsUntil(deadlineRef.current)), 500);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) {
      deadlineRef.current = 0;
      setSecondsLeft(0);
      return;
    }
    deadlineRef.current = Date.now() + seconds * 1000;
    setSecondsLeft(seconds);
  }, []);

  const clear = useCallback(() => start(0), [start]);

  return { secondsLeft, start, clear };
}

/** `95` → `"01:35"`. Minutes are not dropped below 60s, so the width never jumps. */
export function formatCountdown(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
