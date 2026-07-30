/**
 * Chats list. Tap an item to open a conversation.
 */
import { Crown, Search } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { FloatingNav } from "@/src/components/nav/FloatingNav";
import { useChatStore } from "@/src/stores/chat-store";
import { colors, alpha, fontSize, fontWeight, radii, spacing } from "@/src/theme";
import { Touchable } from "@/src/components/ui";
import { NAV_CLEARANCE } from "@/src/constants";

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
        <Touchable
          testID="chats-search"
          style={[styles.searchBtn]}
        >
          <Search size={16} color={colors.text.muted} />
        </Touchable>
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
          contentContainerStyle={{ paddingHorizontal: spacing[2], paddingBottom: NAV_CLEARANCE }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Touchable
              feedback="highlight"
              testID={`chat-row-${item.id}`}
              onPress={() => router.push(`/chats/${item.id}` as never)}
              onLongPress={() => setPendingUnmatch(item.id)}
              style={[styles.row]}
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
                        <Crown size={9} color={colors.text.onBrand} strokeWidth={2.4} fill={colors.text.onBrand} />
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.time,
                      item.unread > 0 && { color: colors.brand.default, fontWeight: fontWeight.bold },
                    ]}
                  >
                    {item.time}
                  </Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text
                    style={[
                      styles.preview,
                      item.unread > 0 && { color: colors.text.primary },
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
            </Touchable>
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
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: { fontSize: fontSize.h2, fontWeight: fontWeight.bold, color: colors.text.primary, letterSpacing: -0.3 },
  subtitle: { marginTop: spacing[0.5], fontSize: fontSize.caption, color: colors.text.muted },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: alpha(colors.border.default, 0.6),
    backgroundColor: colors.surface.default,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radii.md,
  },
  avatar: { width: 48, height: 48, borderRadius: radii.full, backgroundColor: colors.surface.brand },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing[1.5], flex: 1, marginRight: spacing[1.5] },
  name: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text.primary, flexShrink: 1 },
  premiumDot: {
    width: 18,
    height: 18,
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
    alignItems: "center",
    justifyContent: "center",
  },
  time: { fontSize: fontSize.micro, color: colors.text.muted },
  rowBottom: { marginTop: spacing[0.5], flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  preview: { flex: 1, fontSize: fontSize.label, color: colors.text.muted, marginRight: spacing[1.5] },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: spacing[1],
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: colors.text.onBrand, fontSize: fontSize.nano, fontWeight: fontWeight.bold },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[8] },
  emptyTitle: { fontSize: fontSize.title, fontWeight: fontWeight.bold, color: colors.text.primary },
  emptySubtitle: {
    marginTop: spacing[1.5],
    maxWidth: 260,
    textAlign: "center",
    fontSize: fontSize.label,
    lineHeight: 19,
    color: colors.text.muted,
  },
});
