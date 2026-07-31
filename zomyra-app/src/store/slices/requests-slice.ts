/**
 * Inbound connection requests.
 *
 * ⚠️ **Still mock data.** This is a port of `src/stores/requests-store.ts`, not
 * a rebuild: the list is generated locally from `MOCK_PROFILES` and never
 * leaves the device. It stays client state for now so the Requests screen keeps
 * working, but requests are *server* state — Module 8 replaces this slice with
 * API-16 / API-17 / API-18 in the RTK Query cache, and this file goes away.
 *
 * The premium flag that used to live here moved to `entitlement-slice.ts`.
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

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
  "Just now",
  "5m ago",
  "1h ago",
  "3h ago",
  "Yesterday",
  "2d ago",
  "Mon",
  "Apr 12",
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

export type RequestsState = { requests: ConnectionRequest[] };

const initialState: RequestsState = { requests: buildRequests() };

const requestsSlice = createSlice({
  name: "requests",
  initialState,
  reducers: {
    removeRequest(state, action: PayloadAction<string>) {
      state.requests = state.requests.filter((r) => r.id !== action.payload);
    },
  },
});

export const { removeRequest } = requestsSlice.actions;

export const requestsReducer = requestsSlice.reducer;
