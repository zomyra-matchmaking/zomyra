/**
 * In-progress verification capture — the photos picked and the selfie taken
 * before anything is submitted.
 *
 * **Not persisted, on purpose.** These are `file://` URIs from the image
 * picker, which the OS may reclaim between launches, so a persisted copy would
 * rehydrate into broken references. NFR-11 points the same way: binary and
 * image data never enter persisted storage.
 *
 * `submittedAt` is a local marker only. The authoritative state is
 * `verificationStatus` from `GET /me`, which is what survives a reinstall and
 * what the routing table reads. Module 6 replaces this slice's submit path with
 * API-11 and the upload-progress hook from FE TDD §4.6.
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { defaultVerificationState, type UploadedPhoto } from "@/src/lib/verification/types";

const verificationSlice = createSlice({
  name: "verification",
  initialState: defaultVerificationState,
  reducers: {
    setVerificationPhotos(state, action: PayloadAction<UploadedPhoto[]>) {
      state.photos = action.payload;
    },
    setSelfieUri(state, action: PayloadAction<string | null>) {
      state.selfieUri = action.payload;
    },
    markVerificationSubmitted(state) {
      state.submittedAt = new Date().toISOString();
    },
    resetVerification() {
      return defaultVerificationState;
    },
  },
});

export const {
  setVerificationPhotos,
  setSelfieUri,
  markVerificationSubmitted,
  resetVerification,
} = verificationSlice.actions;

export const verificationReducer = verificationSlice.reducer;
