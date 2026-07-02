import { create } from "zustand";
import { defaultVerificationState, type VerificationState, type UploadedPhoto } from "@/src/lib/verification/types";

type VerificationStore = {
  state: VerificationState;
  setPhotos: (photos: UploadedPhoto[]) => void;
  setSelfie: (uri: string | null) => void;
  submit: () => void;
  reset: () => void;
};

export const useVerificationStore = create<VerificationStore>((set) => ({
  state: defaultVerificationState,
  setPhotos: (photos) => set((s) => ({ state: { ...s.state, photos } })),
  setSelfie: (uri) => set((s) => ({ state: { ...s.state, selfieUri: uri } })),
  submit: () => set((s) => ({ state: { ...s.state, submittedAt: new Date().toISOString() } })),
  reset: () => set({ state: defaultVerificationState }),
}));
