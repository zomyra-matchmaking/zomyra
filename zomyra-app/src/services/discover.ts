import { fakeNetwork } from "./api";
import { MOCK_PROFILES, type DiscoverProfile } from "@/src/lib/discover/mock";

// Simple in-memory store for interests (in real app, this would be in backend)
const interests: { [userId: string]: string[] } = {};

export const discoverService = {
  async list(): Promise<DiscoverProfile[]> {
    return fakeNetwork(MOCK_PROFILES);
  },

  async pass(_profileId: string) {
    return fakeNetwork({ ok: true });
  },

  async connect(currentUserId: string, targetProfileId: string) {
    // Record the interest
    if (!interests[currentUserId]) {
      interests[currentUserId] = [];
    }
    interests[currentUserId].push(targetProfileId);

    // Check if it's a mutual match
    const isMatch = interests[targetProfileId]?.includes(currentUserId) || false;

    return fakeNetwork({ ok: true, isMatch });
  },

  // Get interests for testing/debugging
  getInterests() {
    return interests;
  },

  // Clear interests (for testing)
  clearInterests() {
    Object.keys(interests).forEach((key) => delete interests[key]);
  },
};
