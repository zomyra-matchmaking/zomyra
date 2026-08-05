/**
 * What is left of the prototype's bundled reference data.
 *
 * **`INDIAN_CITIES`, `PROFESSIONS` and `LANGUAGES` were deleted by Module 5** —
 * FR-3b makes all three backend-driven (API-38 for cities, API-39 for the other
 * two), and a client-side copy is the exact thing that requirement forbids: a
 * second list that can silently disagree with the one the backend matches on.
 * Their replacements are `src/api/mock/catalogue.ts` (the mock *server's* data)
 * and, in production, the real endpoints.
 *
 * **What stays is not a catalogue.** `HEIGHT_MIN_CM` / `HEIGHT_MAX_CM` are a
 * slider's bounds and `cmToImperial` is a unit conversion — neither is a set of
 * choices the backend could sensibly own, and §12.3 says so explicitly. O-6
 * still questions whether the *Discover filter's* bounds should match these;
 * that is Module 7's screen, not this constant.
 */
export function cmToImperial(cm: number) {
  const totalInches = Math.round(cm / 2.54);
  const ft = Math.floor(totalInches / 12);
  const inch = totalInches % 12;
  return `${ft}'${inch}"`;
}

export const HEIGHT_MIN_CM = 137;
export const HEIGHT_MAX_CM = 213;
