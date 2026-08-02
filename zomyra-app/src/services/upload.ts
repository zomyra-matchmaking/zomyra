/**
 * ⚠️ **Still a stub.** The last survivor of `src/services/` — Module 2 deleted
 * `api.ts`, `auth.ts` and `discover.ts`, whose callers now go through the RTK
 * Query layer in `src/api/`.
 *
 * This one stays because photo upload is deliberately *not* an RTK Query
 * endpoint: FE TDD §4.6 puts it behind a hook wrapping
 * `expo-file-system/legacy`'s `createUploadTask`, since API-8 and API-11 need a
 * progress bar (FR-9) and `fetch` cannot report upload progress. Module 6 owns
 * building that, along with compression and the moderation result.
 *
 * Today it returns the local file URI unchanged, exactly as the prototype did.
 */

const UPLOAD_DELAY_MS = 300;
const DELETE_DELAY_MS = 150;

export type UploadResult = {
  id: string;
  /** Local URI for now; a signed CDN URL once API-8 is real. */
  uri: string;
};

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const uploadService = {
  async uploadImage(localUri: string): Promise<UploadResult> {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return delay({ id, uri: localUri }, UPLOAD_DELAY_MS);
  },

  async deleteImage(_id: string) {
    return delay({ ok: true }, DELETE_DELAY_MS);
  },
};
