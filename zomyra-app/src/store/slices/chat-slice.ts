/**
 * Conversation list.
 *
 * ⚠️ **Still mock data**, ported unchanged from `src/stores/chat-store.ts`.
 * Chat is server state plus an Ably realtime channel (FE TDD §9.8, §6.8);
 * Module 9 replaces this slice with API-19 / API-20 / API-21, cursor
 * pagination and temp-id reconciliation, and deletes it.
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { CONVERSATIONS, type Conversation } from "@/src/lib/chats/mock";

export type ChatState = { conversations: Conversation[] };

const initialState: ChatState = { conversations: [...CONVERSATIONS] };

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    unmatchConversation(state, action: PayloadAction<string>) {
      state.conversations = state.conversations.filter((c) => c.id !== action.payload);
    },
    addConversation(state, action: PayloadAction<Conversation>) {
      const incoming = action.payload;
      state.conversations = [
        incoming,
        ...state.conversations.filter((c) => c.id !== incoming.id),
      ];
    },
  },
});

export const { unmatchConversation, addConversation } = chatSlice.actions;

export const chatReducer = chatSlice.reducer;
