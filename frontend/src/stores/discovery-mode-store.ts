/**
 * Discovery Mode store — persists the user's one-time "which lens do you want
 * to see matches through?" selection so we can default the Discover feed and
 * skip the picker on subsequent launches.
 */
import { create } from "zustand";

import type { CompatibilityDimension } from "@/src/lib/discover/mock";
import { storage } from "@/src/utils/storage";

const STORAGE_KEY = "zomyra.discovery-mode.v1";

type DiscoveryModeStore = {
  mode: CompatibilityDimension | null;
  _hasHydrated: boolean;
  setMode: (m: CompatibilityDimension) => void;
  clear: () => void;
};

export const useDiscoveryModeStore = create<DiscoveryModeStore>((set) => ({
  mode: null,
  _hasHydrated: false,
  setMode: (mode) => {
    set({ mode });
    void storage.setItem(STORAGE_KEY, mode);
  },
  clear: () => {
    set({ mode: null });
    void storage.removeItem(STORAGE_KEY);
  },
}));

// Hydrate once on first import.
(async () => {
  const raw = await storage.getItem<string>(STORAGE_KEY, "");
  const isValid =
    raw === "all" || raw === "personality" || raw === "lifestyle" || raw === "priorities";
  useDiscoveryModeStore.setState({
    mode: isValid ? (raw as CompatibilityDimension) : null,
    _hasHydrated: true,
  });
})();
