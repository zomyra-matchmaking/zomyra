/**
 * Chats list. Tap an item to open a conversation.
 */
import { Crown, Search } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { FloatingNav } from "@/src/components/nav/FloatingNav";
import { useChatStore } from "@/src/stores/chat-store";
import { colors } from "@/src/theme/colors";

export default function ChatsList() {
  const router = useRouter();
  const conversations = useChatStore((s) => s.conversations);
  const unmatch = useChatStore((s) => s.unmatch);
  const [pendingUnmatch, setPendingUnmatch] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chats</Text>
          <Text style={styles.subtitle}>Your conversations</Text>
        </View>
        <Pressable
          testID="chats-search"
          style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.85 }]}
        >
          <Search size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            When you connect with someone, your conversations will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              testID={`chat-row-${item.id}`}
              onPress={() => router.push(`/chats/${item.id}` as never)}
              onLongPress={() => setPendingUnmatch(item.id)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.secondary }]}
            >
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.rowTop}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.premium ? (
                      <View testID={`chat-premium-${item.id}`} style={styles.premiumDot}>
                        <Crown size={9} color="#FFF" strokeWidth={2.4} fill="#FFF" />
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.time,
                      item.unread > 0 && { color: colors.primary, fontWeight: "700" },
                    ]}
                  >
                    {item.time}
                  </Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text
                    style={[
                      styles.preview,
                      item.unread > 0 && { color: colors.foreground },
                    ]}
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>
                  {item.unread > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unread}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      <FloatingNav />

      <ConfirmDialog
        open={pendingUnmatch !== null}
        title="Unmatch this person?"
        description="You will no longer be able to chat with each other."
        confirmLabel="Unmatch"
        destructive
        onCancel={() => setPendingUnmatch(null)}
        onConfirm={() => {
          if (pendingUnmatch) unmatch(pendingUnmatch);
          setPendingUnmatch(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground, letterSpacing: -0.3 },
  subtitle: { marginTop: 2, fontSize: 12, color: colors.mutedForeground },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(232,225,239,0.6)",
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 999, backgroundColor: colors.secondary },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, marginRight: 6 },
  name: { fontSize: 14.5, fontWeight: "700", color: colors.foreground, flexShrink: 1 },
  premiumDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  time: { fontSize: 11, color: colors.mutedForeground },
  rowBottom: { marginTop: 2, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  preview: { flex: 1, fontSize: 13, color: colors.mutedForeground, marginRight: 6 },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10.5, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  emptySubtitle: {
    marginTop: 6,
    maxWidth: 260,
    textAlign: "center",
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
});
