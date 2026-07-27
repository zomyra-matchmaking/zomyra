export type UploadedPhoto = {
  id: string;
  uri: string; // local file URI from expo-image-picker (or remote URL after upload)
};

export type VerificationState = {
  photos: UploadedPhoto[];
  selfieUri: string | null;
  submittedAt: string | null;
};

export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 6;

export const VERIFICATION_STORAGE_KEY = "zomyra.verification.v1";

export const defaultVerificationState: VerificationState = {
  photos: [],
  selfieUri: null,
  submittedAt: null,
};
