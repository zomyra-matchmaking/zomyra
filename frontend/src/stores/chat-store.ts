import { create } from "zustand";
import { CONVERSATIONS, type Conversation } from "@/src/lib/chats/mock";

type ChatState = {
  conversations: Conversation[];
  unmatch: (id: string) => void;
  add: (c: Conversation) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  conversations: [...CONVERSATIONS],
  unmatch: (id) =>
    set((s) => ({ conversations: s.conversations.filter((c) => c.id !== id) })),
  add: (c) =>
    set((s) => ({
      conversations: [c, ...s.conversations.filter((x) => x.id !== c.id)],
    })),
}));

export function useConversation(id: string) {
  return useChatStore((s) => s.conversations.find((c) => c.id === id));
}
