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
import { colors, alpha, fontSize, fontWeight, radii } from "@/src/theme";
import { Touchable } from "@/src/components/ui";

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
        <Touchable
          testID="conversation-back"
          onPress={() => router.back()}
          style={[styles.headerBtn]}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={colors.text.primary} />
        </Touchable>
        <Touchable
          onPress={() => setProfileOpen(true)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
        >
          <Image source={{ uri: conversation.avatar }} style={styles.headerAvatar} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={styles.headerName} numberOfLines={1}>
                {conversation.name}
              </Text>
              {conversation.verified ? <BadgeCheck size={13} color={colors.brand.default} fill={colors.brand.default} /> : null}
            </View>
            <Text style={styles.headerSubtitle}>Active recently</Text>
          </View>
        </Touchable>
        <Touchable
          testID="conversation-more"
          onPress={() => setMenuOpen(true)}
          style={[styles.headerBtn]}
        >
          <MoreVertical size={18} color={colors.text.muted} />
        </Touchable>
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
                      ? { backgroundColor: colors.chat.mineSurface, borderBottomRightRadius: 4 }
                      : { backgroundColor: colors.chat.theirSurface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.chat.theirBorder },
                  ]}
                >
                  <Text style={[styles.bubbleText, { color: mine ? colors.chat.mineText : colors.chat.theirText }]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.bubbleTime, { color: mine ? colors.brand.muted : colors.text.muted }]}>{item.time}</Text>
                </View>
              </View>
            );
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.composer}>
          <View style={styles.inputWrap}>
            <Smile size={16} color={colors.text.muted} />
            <TextInput
              testID="message-input"
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              placeholderTextColor={colors.text.muted}
              style={styles.input}
              onSubmitEditing={send}
              returnKeyType="send"
            />
          </View>
          <Touchable
            feedback="scale"
            testID="message-send"
            onPress={send}
            disabled={!draft.trim()}
            style={[styles.sendBtn, !draft.trim() && { opacity: 0.4 }]}
          >
            <Send size={16} color={colors.text.onBrand} />
          </Touchable>
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
        <Touchable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menu}>
            <MenuItem label="View profile" onPress={() => { setMenuOpen(false); setProfileOpen(true); }} />
            <MenuItem label="Unmatch" destructive onPress={() => { setMenuOpen(false); setDialog("unmatch"); }} />
            <MenuItem label="Block" destructive onPress={() => { setMenuOpen(false); setDialog("block"); }} />
            <MenuItem label="Report" onPress={() => { setMenuOpen(false); setReportOpen(true); }} />
          </View>
        </Touchable>
      </Modal>

      {/* Report sheet */}
      <BottomSheet open={reportOpen} onClose={() => setReportOpen(false)} heightFraction={0.55}>
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={styles.reportTitle}>Report this person</Text>
          <Text style={styles.reportSubtitle}>Choose a reason. Our team reviews every report.</Text>
          <View style={{ marginTop: 12 }}>
            {REPORT_REASONS.map((r) => (
              <Touchable
                feedback="highlight"
                key={r}
                testID={`report-${r}`}
                onPress={() => {
                  setReportOpen(false);
                  toast.success(`Reported: ${r}. Our team will review.`);
                }}
                style={[styles.reportItem]}
              >
                <Text style={styles.reportItemText}>{r}</Text>
              </Touchable>
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
    <Touchable
      feedback="highlight"
      onPress={onPress}
      style={[styles.menuItem]}
    >
      <Text
        style={[
          styles.menuItemText,
          destructive && { color: colors.danger.default },
        ]}
      >
        {label}
      </Text>
    </Touchable>
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
    borderBottomColor: colors.border.subtle,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: { width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.surface.brand },
  headerName: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text.primary, flex: 1 },
  headerSubtitle: { fontSize: fontSize.micro, color: colors.text.muted },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.xl,
  },
  bubbleText: { fontSize: fontSize.body, lineHeight: 20 },
  bubbleTime: { marginTop: 2, fontSize: fontSize.nano, textAlign: "right" },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.surface.default,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background,
  },
  input: { flex: 1, fontSize: fontSize.body, color: colors.text.primary },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBackdrop: { flex: 1, backgroundColor: alpha(colors.overlay.base, 0.3), justifyContent: "flex-start", paddingTop: 60, alignItems: "flex-end", paddingRight: 8 },
  menu: {
    minWidth: 180,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.default,
    paddingVertical: 6,
    shadowColor: colors.shadow.default,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  menuItem: { paddingHorizontal: 14, paddingVertical: 11 },
  menuItemText: { fontSize: fontSize.body, color: colors.text.primary, fontWeight: fontWeight.semibold },
  reportTitle: { fontSize: fontSize.title, fontWeight: fontWeight.bold, color: colors.text.primary },
  reportSubtitle: { marginTop: 4, fontSize: fontSize.caption, color: colors.text.muted },
  reportItem: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: radii.md },
  reportItemText: { fontSize: fontSize.body, color: colors.text.primary, fontWeight: fontWeight.semibold },
});
