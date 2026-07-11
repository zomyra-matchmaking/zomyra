/**
 * Requests — premium/free upsell, list of incoming connection requests.
 * Tapping a card opens the profile sheet with Accept/Decline.
 */
import { Check, Crown, Lock, Sparkles, UserPlus, X } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { ProfileView } from "@/src/components/discover/ProfileView";
import { MatchOverlay } from "@/src/components/discover/MatchOverlay";
import { FloatingNav } from "@/src/components/nav/FloatingNav";
import { toast } from "@/src/components/ui/Toast";
import { useRequestsStore, type ConnectionRequest } from "@/src/stores/requests-store";
import { useChatStore } from "@/src/stores/chat-store";
import type { CompatibilityTier } from "@/src/lib/discover/mock";
import { colors } from "@/src/theme/colors";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";

const TIER_COLOR: Record<CompatibilityTier, { dot: string; bg: string; text: string; border: string }> = {
  "Excellent Match": { dot: "#8B5CF6", bg: "rgba(139,92,246,0.10)", text: "#6D28D9", border: "rgba(139,92,246,0.25)" },
  "Great Match": { dot: "#10B981", bg: "rgba(16,185,129,0.10)", text: "#047857", border: "rgba(16,185,129,0.25)" },
  "Potential Match": { dot: "#F59E0B", bg: "rgba(245,158,11,0.12)", text: "#B45309", border: "rgba(245,158,11,0.30)" },
};

export default function Requests() {
  const router = useRouter();
  const requests = useRequestsStore((s) => s.requests);
  const isPremium = useRequestsStore((s) => s.premium);
  const setPremium = useRequestsStore((s) => s.setPremium);
  const removeRequest = useRequestsStore((s) => s.remove);
  const addChat = useChatStore((s) => s.add);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingDecline, setPendingDecline] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  // Match overlay state
  const [showMatchOverlay, setShowMatchOverlay] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<any>(null);

  const active = requests.find((r) => r.id === activeId) ?? null;

  const accept = (req: ConnectionRequest) => {
    setAccepting(true);
    setTimeout(() => {
      addChat({
        id: req.profile.id,
        name: req.profile.name,
        avatar: req.profile.hero,
        verified: true,
        lastMessage: "You connected — say hi",
        time: "Just now",
        unread: 0,
        messages: [],
        profile: {
          age: req.profile.age,
          city: req.profile.location,
          category: req.profile.compatibility,
          summary: req.profile.summary,
          photos: [req.profile.hero, ...req.profile.gallery],
          lifestyle: req.profile.lifestyle,
          values: req.profile.values,
          snapshot: req.profile.snapshot,
          facts: req.profile.facts,
        },
      });
      removeRequest(req.id);
      setAccepting(false);
      setActiveId(null);
      
      // Show match overlay
      setMatchedProfile(req.profile);
      setShowMatchOverlay(true);
    }, 500);
  };

  const handleStartConversation = () => {
    setShowMatchOverlay(false);
    if (matchedProfile) {
      router.push(`/chats/${matchedProfile.id}` as never);
    }
  };

  const handleKeepDiscovering = () => {
    setShowMatchOverlay(false);
    setMatchedProfile(null);
  };

  const decline = (id: string) => {
    removeRequest(id);
    setPendingDecline(null);
    setActiveId(null);
    toast.show("Request declined");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Requests</Text>
          <Text style={styles.subtitle}>People who want to connect with you</Text>
        </View>
        <Pressable
          testID="toggle-premium"
          onPress={() => setPremium(!isPremium)}
          style={[
            styles.premiumChip,
            isPremium
              ? { backgroundColor: "rgba(91,44,111,0.10)", borderColor: "rgba(91,44,111,0.40)" }
              : { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={{ color: isPremium ? colors.primary : colors.mutedForeground, fontWeight: "700", fontSize: 11 }}>
            {isPremium ? "Premium" : "Free"}
          </Text>
        </Pressable>
      </View>

      {requests.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          ListHeaderComponent={!isPremium ? <UpsellCard onUpgrade={() => setPremium(true)} /> : null}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) =>
            isPremium ? (
              <PremiumCard request={item} onOpen={() => setActiveId(item.id)} />
            ) : (
              <BlurredCard request={item} />
            )
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      <FloatingNav />

      <BottomSheet open={!!active} onClose={() => setActiveId(null)}>
        {active ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <ProfileView
              profile={active.profile}
              footer={
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    testID="request-decline"
                    onPress={() => setPendingDecline(active.id)}
                    style={({ pressed }) => [styles.sheetBtn, styles.sheetBtnGhost, pressed && { opacity: 0.9 }]}
                  >
                    <X size={16} color={colors.foreground} />
                    <Text style={styles.sheetBtnGhostText}>Decline</Text>
                  </Pressable>
                  <Pressable
                    testID="request-accept"
                    onPress={() => accept(active)}
                    disabled={accepting}
                    style={({ pressed }) => [styles.sheetBtn, styles.sheetBtnPrimary, pressed && { opacity: 0.92 }]}
                  >
                    <Check size={16} color={colors.primaryForeground} />
                    <Text style={styles.sheetBtnPrimaryText}>
                      {accepting ? "Accepting…" : "Accept"}
                    </Text>
                  </Pressable>
                </View>
              }
            />
          </ScrollView>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={pendingDecline !== null}
        title="Decline request?"
        description="This request will be removed."
        confirmLabel="Decline"
        destructive
        onCancel={() => setPendingDecline(null)}
        onConfirm={() => pendingDecline && decline(pendingDecline)}
      />

      {/* Match Overlay */}
      {matchedProfile && (
        <MatchOverlay
          visible={showMatchOverlay}
          currentUserPhoto="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400"
          matchedUserPhoto={matchedProfile.hero}
          matchedUserName={matchedProfile.name}
          matchedUserId={matchedProfile.id}
          onStartConversation={handleStartConversation}
          onKeepDiscovering={handleKeepDiscovering}
        />
      )}
    </SafeAreaView>
  );
}

function UpsellCard({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <View style={styles.upsell}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={styles.upsellIcon}>
          <Sparkles size={16} color={colors.primaryForeground} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.upsellTitle}>See who wants to connect with you</Text>
          <Text style={styles.upsellSubtitle}>
            Unlock Premium to view profiles and respond to requests.
          </Text>
        </View>
      </View>
      <Pressable
        testID="upgrade-premium"
        onPress={onUpgrade}
        style={({ pressed }) => [styles.upsellBtn, pressed && { opacity: 0.92 }]}
      >
        <Text style={styles.upsellBtnText}>Upgrade to Premium</Text>
      </Pressable>
    </View>
  );
}

function TierChip({ tier }: { tier: CompatibilityTier }) {
  const c = TIER_COLOR[tier];
  return (
    <View
      style={[
        styles.tierChip,
        { backgroundColor: c.bg, borderColor: c.border },
      ]}
    >
      <View style={[styles.tierDot, { backgroundColor: c.dot }]} />
      <Text style={[styles.tierText, { color: c.text }]}>{tier}</Text>
    </View>
  );
}

function PremiumCard({ request, onOpen }: { request: ConnectionRequest; onOpen: () => void }) {
  const p = request.profile;
  return (
    <Pressable
      testID={`request-card-${request.id}`}
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]}
    >
      <Image source={{ uri: p.hero }} style={styles.cardAvatar} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName} numberOfLines={1}>
              {p.name}, {p.age}
            </Text>
            {p.premium ? (
              <View testID={`request-premium-${request.id}`} style={styles.premiumDot}>
                <Crown size={9} color="#FFF" strokeWidth={2.4} fill="#FFF" />
              </View>
            ) : null}
          </View>
          <Text style={styles.cardTime}>{request.receivedAt}</Text>
        </View>
        <Text style={styles.cardLoc}>{p.location}</Text>
        <View style={{ marginTop: 6 }}>
          <TierChip tier={p.compatibility} />
        </View>
        <Text style={styles.cardTeaser} numberOfLines={2}>
          {request.teaser}
        </Text>
      </View>
    </Pressable>
  );
}

function BlurredCard({ request }: { request: ConnectionRequest }) {
  return (
    <View style={styles.card}>
      <View style={[styles.cardAvatar, { backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }]}>
        <Lock size={14} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ width: 96, height: 12, backgroundColor: "rgba(31,18,53,0.12)", borderRadius: 6 }} />
          <Text style={styles.cardTime}>{request.receivedAt}</Text>
        </View>
        <View style={{ marginTop: 6, width: 64, height: 10, backgroundColor: "rgba(31,18,53,0.08)", borderRadius: 6 }} />
        <View style={{ marginTop: 6 }}>
          <TierChip tier={request.profile.compatibility} />
        </View>
        <Text style={styles.cardTeaser} numberOfLines={2}>
          {request.teaser}
        </Text>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <UserPlus size={28} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No requests yet</Text>
      <Text style={styles.emptySubtitle}>
        When someone sends you a connection request, it will appear here.
      </Text>
    </View>
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
  premiumChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  upsell: {
    marginTop: 4,
    marginBottom: 6,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(91,44,111,0.25)",
    backgroundColor: "rgba(244,234,251,0.45)",
  },
  upsellIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  upsellTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground, lineHeight: 18 },
  upsellSubtitle: { marginTop: 4, fontSize: 12, color: colors.mutedForeground, lineHeight: 16 },
  upsellBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  upsellBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cardAvatar: { width: 64, height: 64, borderRadius: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, marginRight: 6 },
  cardName: { fontSize: 14, fontWeight: "700", color: colors.foreground, flexShrink: 1 },
  premiumDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLoc: { marginTop: 2, fontSize: 12, color: colors.mutedForeground },
  cardTime: { fontSize: 10.5, color: colors.mutedForeground },
  cardTeaser: { marginTop: 6, fontSize: 12, color: "rgba(31,18,53,0.85)", lineHeight: 17 },
  tierChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierDot: { width: 5, height: 5, borderRadius: 999 },
  tierText: { fontSize: 10, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { marginTop: 20, fontSize: 17, fontWeight: "700", color: colors.foreground },
  emptySubtitle: {
    marginTop: 6,
    maxWidth: 260,
    textAlign: "center",
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  sheetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  sheetBtnGhost: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  sheetBtnGhostText: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  sheetBtnPrimary: { backgroundColor: colors.primary },
  sheetBtnPrimaryText: { fontSize: 13, fontWeight: "700", color: colors.primaryForeground },
});
