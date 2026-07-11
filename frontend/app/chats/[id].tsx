/**
 * Conversation screen. Header → profile sheet, message list, composer.
 */
import { ArrowLeft, BadgeCheck, MoreVertical, Send, Smile } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";

import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { ProfileView } from "@/src/components/discover/ProfileView";
import { toast } from "@/src/components/ui/Toast";
import { chatToDiscoverProfile, type ChatMessage } from "@/src/lib/chats/mock";
import { useChatStore, useConversation } from "@/src/stores/chat-store";
import { colors } from "@/src/theme/colors";

const REPORT_REASONS = ["Fake profile", "Inappropriate behavior", "Harassment", "Spam", "Other"];

export default function Conversation() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversation = useConversation(id ?? "");
  const unmatch = useChatStore((s) => s.unmatch);

  const [messages, setMessages] = useState<ChatMessage[]>(() => conversation?.messages ?? []);
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [dialog, setDialog] = useState<"unmatch" | "block" | null>(null);

  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (!conversation) {
      router.replace("/chats");
    }
  }, [conversation, router]);

  const profile = useMemo(
    () => (conversation ? chatToDiscoverProfile(conversation) : null),
    [conversation],
  );

  if (!conversation || !profile) return null;

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${prev.length + 1}`,
        from: "me",
        text,
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      },
    ]);
    setDraft("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const confirmUnmatch = () => {
    setDialog(null);
    setProfileOpen(false);
    router.replace("/chats");
    setTimeout(() => unmatch(conversation.id), 250);
  };

  const confirmBlock = () => {
    setDialog(null);
    setProfileOpen(false);
    router.replace("/chats");
    setTimeout(() => {
      unmatch(conversation.id);
      toast.success(`${conversation.name.split(" ")[0]} has been blocked`);
    }, 250);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable
          testID="conversation-back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={colors.foreground} />
        </Pressable>
        <Pressable
          onPress={() => setProfileOpen(true)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
        >
          <Image source={{ uri: conversation.avatar }} style={styles.headerAvatar} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={styles.headerName} numberOfLines={1}>
                {conversation.name}
              </Text>
              {conversation.verified ? <BadgeCheck size={13} color={colors.primary} fill={colors.primary} /> : null}
            </View>
            <Text style={styles.headerSubtitle}>Active recently</Text>
          </View>
        </Pressable>
        <Pressable
          testID="conversation-more"
          onPress={() => setMenuOpen(true)}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
        >
          <MoreVertical size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 4 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const mine = item.from === "me";
            const prev = messages[index - 1];
            const grouped = prev && prev.from === item.from;
            return (
              <View
                style={{
                  marginTop: grouped ? 2 : 8,
                  alignItems: mine ? "flex-end" : "flex-start",
                }}
              >
                <View
                  style={[
                    styles.bubble,
                    mine
                      ? { backgroundColor: colors.chatMine, borderBottomRightRadius: 4 }
                      : { backgroundColor: colors.chatTheir, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.chatTheirBorder },
                  ]}
                >
                  <Text style={[styles.bubbleText, { color: mine ? colors.chatMineText : colors.chatTheirText }]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.bubbleTime, { color: mine ? "#6B4A8A" : "#8A8A8A" }]}>{item.time}</Text>
                </View>
              </View>
            );
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.composer}>
          <View style={styles.inputWrap}>
            <Smile size={16} color={colors.mutedForeground} />
            <TextInput
              testID="message-input"
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              placeholderTextColor={colors.mutedForeground}
              style={styles.input}
              onSubmitEditing={send}
              returnKeyType="send"
            />
          </View>
          <Pressable
            testID="message-send"
            onPress={send}
            disabled={!draft.trim()}
            style={({ pressed }) => [styles.sendBtn, !draft.trim() && { opacity: 0.4 }, pressed && draft.trim() && { transform: [{ scale: 0.96 }] }]}
          >
            <Send size={16} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Profile bottom sheet */}
      <BottomSheet open={profileOpen} onClose={() => setProfileOpen(false)}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <ProfileView profile={profile} />
        </ScrollView>
      </BottomSheet>

      {/* More menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menu}>
            <MenuItem label="View profile" onPress={() => { setMenuOpen(false); setProfileOpen(true); }} />
            <MenuItem label="Unmatch" destructive onPress={() => { setMenuOpen(false); setDialog("unmatch"); }} />
            <MenuItem label="Block" destructive onPress={() => { setMenuOpen(false); setDialog("block"); }} />
            <MenuItem label="Report" onPress={() => { setMenuOpen(false); setReportOpen(true); }} />
          </View>
        </Pressable>
      </Modal>

      {/* Report sheet */}
      <BottomSheet open={reportOpen} onClose={() => setReportOpen(false)} heightFraction={0.55}>
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={styles.reportTitle}>Report this person</Text>
          <Text style={styles.reportSubtitle}>Choose a reason. Our team reviews every report.</Text>
          <View style={{ marginTop: 12 }}>
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r}
                testID={`report-${r}`}
                onPress={() => {
                  setReportOpen(false);
                  toast.success(`Reported: ${r}. Our team will review.`);
                }}
                style={({ pressed }) => [styles.reportItem, pressed && { backgroundColor: colors.secondary }]}
              >
                <Text style={styles.reportItemText}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </BottomSheet>

      <ConfirmDialog
        open={dialog === "unmatch"}
        title="Unmatch this person?"
        description="You will no longer be able to chat or see each other in your matches."
        confirmLabel="Unmatch"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={confirmUnmatch}
      />
      <ConfirmDialog
        open={dialog === "block"}
        title="Block this person?"
        description="They will no longer be able to contact you or see your profile."
        confirmLabel="Block"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={confirmBlock}
      />
    </SafeAreaView>
  );
}

function MenuItem({
  label,
  destructive,
  onPress,
}: {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.secondary }]}
    >
      <Text
        style={[
          styles.menuItemText,
          destructive && { color: colors.destructive },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.secondary },
  headerName: { fontSize: 14.5, fontWeight: "700", color: colors.foreground, flex: 1 },
  headerSubtitle: { fontSize: 11, color: colors.mutedForeground },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTime: { marginTop: 2, fontSize: 10, textAlign: "right" },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.card,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.background,
  },
  input: { flex: 1, fontSize: 14, color: colors.foreground },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-start", paddingTop: 60, alignItems: "flex-end", paddingRight: 8 },
  menu: {
    minWidth: 180,
    borderRadius: 14,
    backgroundColor: colors.card,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  menuItem: { paddingHorizontal: 14, paddingVertical: 11 },
  menuItemText: { fontSize: 14, color: colors.foreground, fontWeight: "600" },
  reportTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  reportSubtitle: { marginTop: 4, fontSize: 12.5, color: colors.mutedForeground },
  reportItem: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 },
  reportItemText: { fontSize: 14, color: colors.foreground, fontWeight: "600" },
});
