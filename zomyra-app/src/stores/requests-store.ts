import { create } from "zustand";
import { MOCK_PROFILES, type DiscoverProfile } from "@/src/lib/discover/mock";

export type ConnectionRequest = {
  id: string;
  receivedAt: string;
  profile: DiscoverProfile;
  teaser: string;
};

const TEASERS = [
  "You both value family, communication, and long-term commitment.",
  "Aligned on ambition, financial discipline, and family priorities.",
  "Shared values around kindness, learning, and a slower pace of life.",
  "Both want children and have similar household expectations.",
  "You both value independence, family relationships, and personal growth.",
  "Strong alignment on long-term intent and lifestyle pace.",
];

const RECEIVED = [
  "Just now", "5m ago", "1h ago", "3h ago", "Yesterday", "2d ago", "Mon", "Apr 12",
];

function buildRequests(): ConnectionRequest[] {
  const out: ConnectionRequest[] = [];
  for (let c = 0; c < 6; c++) {
    for (let i = 0; i < MOCK_PROFILES.length; i++) {
      const base = MOCK_PROFILES[i];
      const id = c === 0 ? `req-${base.id}` : `req-${base.id}-${c}`;
      out.push({
        id,
        profile: { ...base, id },
        receivedAt: RECEIVED[(c + i) % RECEIVED.length],
        teaser: TEASERS[(c + i) % TEASERS.length],
      });
    }
  }
  return out;
}

type RequestsState = {
  requests: ConnectionRequest[];
  premium: boolean;
  remove: (id: string) => void;
  setPremium: (v: boolean) => void;
};

export const useRequestsStore = create<RequestsState>((set) => ({
  requests: buildRequests(),
  premium: false,
  remove: (id) => set((s) => ({ requests: s.requests.filter((r) => r.id !== id) })),
  setPremium: (v) => set({ premium: v }),
}));
