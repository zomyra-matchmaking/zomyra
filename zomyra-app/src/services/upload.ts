/**
 * Upload service abstraction. Currently we keep image picker URIs locally —
 * real persistence (Cloudinary / S3 / direct backend upload) plugs in here
 * by replacing `uploadImage()` without screen changes.
 */
import { fakeNetwork } from "./api";

export type UploadResult = {
  id: string;
  uri: string; // local URI for now; would be CDN URL in prod
};

export const uploadService = {
  async uploadImage(localUri: string): Promise<UploadResult> {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return fakeNetwork({ id, uri: localUri }, 300);
  },

  async deleteImage(_id: string) {
    return fakeNetwork({ ok: true }, 150);
  },
};
