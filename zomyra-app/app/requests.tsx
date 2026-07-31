/**
 * Requests — premium/free upsell, list of incoming connection requests.
 * Tapping a card opens the profile sheet with Accept/Decline.
 */
import { Check, Crown, Lock, Sparkles, UserPlus, X } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { ProfileView } from "@/src/components/discover/ProfileView";
import { MatchOverlay } from "@/src/components/discover/MatchOverlay";
import { FloatingNav } from "@/src/components/nav/FloatingNav";
import { toast } from "@/src/components/ui/Toast";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { addConversation } from "@/src/store/slices/chat-slice";
import { setPremium } from "@/src/store/slices/entitlement-slice";
import { removeRequest, type ConnectionRequest } from "@/src/store/slices/requests-slice";
import type { CompatibilityTier } from "@/src/lib/discover/mock";
import { colors, alpha, fontSize, fontWeight, radii, spacing } from "@/src/theme";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Button, Touchable } from "@/src/components/ui";
import { NAV_CLEARANCE } from "@/src/constants";

const TIER_COLOR: Record<CompatibilityTier, (typeof colors.tier)[keyof typeof colors.tier]> = {
  "Excellent Match": colors.tier.excellent,
  "Great Match": colors.tier.great,
  "Potential Match": colors.tier.potential,
};

export default function Requests() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const requests = useAppSelector((s) => s.requests.requests);
  const isPremium = useAppSelector((s) => s.entitlement.isPremium);

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
      dispatch(addConversation({
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
      }));
      dispatch(removeRequest(req.id));
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
    dispatch(removeRequest(id));
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
        <Touchable
          testID="toggle-premium"
          onPress={() => dispatch(setPremium(!isPremium))}
          style={[
            styles.premiumChip,
            isPremium
              ? { backgroundColor: alpha(colors.brand.default, 0.10), borderColor: alpha(colors.brand.default, 0.40) }
              : { backgroundColor: colors.surface.default, borderColor: colors.border.default },
          ]}
        >
          <Text style={{ color: isPremium ? colors.brand.default : colors.text.muted, fontWeight: fontWeight.bold, fontSize: fontSize.micro }}>
            {isPremium ? "Premium" : "Free"}
          </Text>
        </Touchable>
      </View>

      {requests.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          ListHeaderComponent={
            !isPremium ? <UpsellCard onUpgrade={() => dispatch(setPremium(true))} /> : null
          }
          contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: NAV_CLEARANCE, paddingTop: spacing[2] }}
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
          <ScrollView contentContainerStyle={{ paddingBottom: spacing[6] }}>
            <ProfileView
              profile={active.profile}
              footer={
                <View style={{ flexDirection: "row", gap: spacing[2] }}>
                  <Button
                    testID="request-decline"
                    label="Decline"
                    variant="ghost"
                    icon={X}
                    onPress={() => setPendingDecline(active.id)}
                    style={styles.sheetBtn}
                  />
                  <Button
                    testID="request-accept"
                    label={accepting ? "Accepting…" : "Accept"}
                    icon={Check}
                    loading={accepting}
                    onPress={() => accept(active)}
                    style={styles.sheetBtn}
                  />
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
      <View style={{ flexDirection: "row", gap: spacing[3] }}>
        <View style={styles.upsellIcon}>
          <Sparkles size={16} color={colors.brand.onBrand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.upsellTitle}>See who wants to connect with you</Text>
          <Text style={styles.upsellSubtitle}>
            Unlock Premium to view profiles and respond to requests.
          </Text>
        </View>
      </View>
      <Touchable
        testID="upgrade-premium"
        onPress={onUpgrade}
        style={[styles.upsellBtn]}
      >
        <Text style={styles.upsellBtnText}>Upgrade to Premium</Text>
      </Touchable>
    </View>
  );
}

function TierChip({ tier }: { tier: CompatibilityTier }) {
  const c = TIER_COLOR[tier];
  return (
    <View
      style={[
        styles.tierChip,
        { backgroundColor: c.surface, borderColor: c.border },
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
    <Touchable
      testID={`request-card-${request.id}`}
      onPress={onOpen}
      style={[styles.card]}
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
                <Crown size={9} color={colors.text.onBrand} strokeWidth={2.4} fill={colors.text.onBrand} />
              </View>
            ) : null}
          </View>
          <Text style={styles.cardTime}>{request.receivedAt}</Text>
        </View>
        <Text style={styles.cardLoc}>{p.location}</Text>
        <View style={{ marginTop: spacing[1.5] }}>
          <TierChip tier={p.compatibility} />
        </View>
        <Text style={styles.cardTeaser} numberOfLines={2}>
          {request.teaser}
        </Text>
      </View>
    </Touchable>
  );
}

function BlurredCard({ request }: { request: ConnectionRequest }) {
  return (
    <View style={styles.card}>
      <View style={[styles.cardAvatar, { backgroundColor: colors.surface.brand, alignItems: "center", justifyContent: "center" }]}>
        <Lock size={14} color={colors.text.onBrand} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ width: 96, height: 12, backgroundColor: alpha(colors.brand.strong, 0.12), borderRadius: radii.xs }} />
          <Text style={styles.cardTime}>{request.receivedAt}</Text>
        </View>
        <View style={{ marginTop: spacing[1.5], width: 64, height: 10, backgroundColor: alpha(colors.brand.strong, 0.08), borderRadius: radii.xs }} />
        <View style={{ marginTop: spacing[1.5] }}>
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
        <UserPlus size={28} color={colors.brand.default} />
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
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: { fontSize: fontSize.h2, fontWeight: fontWeight.bold, color: colors.text.primary, letterSpacing: -0.3 },
  subtitle: { marginTop: spacing[0.5], fontSize: fontSize.caption, color: colors.text.muted },
  premiumChip: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    borderWidth: 1,
  },
  upsell: {
    marginTop: spacing[1],
    marginBottom: spacing[1.5],
    padding: spacing[4],
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: alpha(colors.brand.default, 0.25),
    backgroundColor: alpha(colors.surface.brand, 0.45),
  },
  upsellIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.brand.default,
    alignItems: "center",
    justifyContent: "center",
  },
  upsellTitle: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text.primary, lineHeight: 18 },
  upsellSubtitle: { marginTop: spacing[1], fontSize: fontSize.caption, color: colors.text.muted, lineHeight: 16 },
  upsellBtn: {
    marginTop: spacing[3],
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.brand.default,
    alignItems: "center",
    justifyContent: "center",
  },
  upsellBtnText: { color: colors.text.onBrand, fontSize: fontSize.label, fontWeight: fontWeight.bold },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  cardAvatar: { width: 64, height: 64, borderRadius: radii.md },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing[1.5], flex: 1, marginRight: spacing[1.5] },
  cardName: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text.primary, flexShrink: 1 },
  premiumDot: {
    width: 18,
    height: 18,
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLoc: { marginTop: spacing[0.5], fontSize: fontSize.caption, color: colors.text.muted },
  cardTime: { fontSize: fontSize.nano, color: colors.text.muted },
  cardTeaser: { marginTop: spacing[1.5], fontSize: fontSize.caption, color: alpha(colors.brand.strong, 0.85), lineHeight: 17 },
  tierChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: radii.full,
    borderWidth: 1,
  },
  tierDot: { width: 5, height: 5, borderRadius: radii.full },
  tierText: { fontSize: fontSize.nano, fontWeight: fontWeight.bold },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[8] },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: radii["4xl"],
    backgroundColor: colors.surface.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { marginTop: spacing[5], fontSize: fontSize.title, fontWeight: fontWeight.bold, color: colors.text.primary },
  emptySubtitle: {
    marginTop: spacing[1.5],
    maxWidth: 260,
    textAlign: "center",
    fontSize: fontSize.label,
    lineHeight: 19,
    color: colors.text.muted,
  },
  sheetBtn: { flex: 1 },
});
