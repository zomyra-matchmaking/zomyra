/**
 * Profile screen — Zomyra "Your Profile".
 *
 * Sections:
 *   1. Header  — Zomyra kicker + "Your profile" + Settings cog
 *   2. Summary — avatar · name · city · profile-strength badge · verifications
 *   3. Actions — Edit Profile · Zomyra Premium (Best value) · Log out · Delete account
 *   4. Premium — purple-gradient hero card with 5 benefits + "See Premium Plans" CTA
 *   5. Logout modal (Cancel / Logout)
 *   6. Delete-account modal — Step 1 reason + Step 2 "type DELETE"
 */
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  CheckCircle2,
  ChevronRight,
  Crown,
  Eye,
  Headphones,
  LogOut,
  MapPin,
  Pencil,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FloatingNav } from "@/src/components/nav/FloatingNav";
import { useOnboardingStore } from "@/src/stores/onboarding-store";
import { useRequestsStore } from "@/src/stores/requests-store";

const PURPLE = "#5B2C6F";
const PURPLE_DEEP = "#3D1A4A";
const LIGHT_PURPLE = "#F4EAFB";
const BORDER = "#ECEAF7";
const TEXT = "#111827";
const MUTED = "#6B7280";
const DANGER = "#DC2626";
const DANGER_BG = "#FEE2E2";
const DANGER_BG_SOFT = "#FEF2F2";
const GOLD = "#F59E0B";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80&auto=format&fit=crop";

export default function ProfileScreen() {
  const router = useRouter();
  const onboarding = useOnboardingStore((s) => s.state);
  const reset = useOnboardingStore((s) => s.reset);
  const isPremium = useRequestsStore((s) => s.premium);

  const fullName = useMemo(() => {
    const first = (onboarding.firstName || "Riya").trim();
    const last = (onboarding.lastName || "Sharma").trim();
    return `${first} ${last}`.trim();
  }, [onboarding.firstName, onboarding.lastName]);
  const city = (onboarding.city || "Bangalore, India").trim();

  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const onLogout = () => {
    setShowLogout(false);
    reset();
    router.replace("/login" as never);
  };

  const onDeleteConfirmed = () => {
    setShowDelete(false);
    reset();
    router.replace("/login" as never);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        testID="profile-scroll"
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.kicker}>ZOMYRA</Text>
          <Text style={styles.title}>Your profile</Text>
        </View>

        {/* ── Summary ── */}
        <View style={styles.summary}>
          <View style={styles.avatarRing}>
            <Image source={{ uri: DEFAULT_AVATAR }} style={styles.avatar} />
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {fullName}
            </Text>
            {isPremium ? (
              <View testID="profile-premium-badge" style={styles.premiumDot}>
                <Crown size={11} color="#FFF" strokeWidth={2.4} fill="#FFF" />
              </View>
            ) : null}
          </View>
          <View style={styles.locRow}>
            <MapPin size={14} color={MUTED} strokeWidth={2} />
            <Text style={styles.locText}>{city}</Text>
          </View>
        </View>

        {/* ── Action cards ── */}
        <View style={styles.actionCard}>
          <ActionRow
            testID="profile-action-edit"
            Icon={Pencil}
            iconBg={LIGHT_PURPLE}
            iconColor={PURPLE}
            title="Edit profile"
            subtitle="Update your photos, details & preferences"
            onPress={() => router.push("/edit-profile" as never)}
          />
          <Divider />
          {!isPremium ? (
            <>
              <ActionRow
                testID="profile-action-premium"
                Icon={Crown}
                iconBg={LIGHT_PURPLE}
                iconColor={PURPLE}
                title="Zomyra Premium"
                subtitle="Unlock advanced features"
                rightBadgeText="Best value"
                onPress={() => router.push("/premium" as never)}
              />
              <Divider />
            </>
          ) : null}
          <ActionRow
            testID="profile-action-logout"
            Icon={LogOut}
            iconBg={DANGER_BG_SOFT}
            iconColor={DANGER}
            title="Log out"
            subtitle="Sign out from your account"
            onPress={() => setShowLogout(true)}
          />
          <Divider />
          <ActionRow
            testID="profile-action-delete"
            Icon={Trash2}
            iconBg={DANGER_BG_SOFT}
            iconColor={DANGER}
            title="Delete account"
            subtitle="Permanently delete your account"
            onPress={() => setShowDelete(true)}
            last
          />
        </View>

        {/* ── Premium upgrade card (hidden when user already has Premium) ── */}
        {!isPremium ? (
        <View style={styles.premiumCard}>
          <LinearGradient
            colors={[PURPLE, PURPLE_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumArt}
          >
            <View style={styles.premiumGlow} />
            <Crown size={64} color="#FFF" strokeWidth={1.2} fill="#E9D5FF" />
            <Sparkles
              size={14}
              color="#FFF"
              style={{ position: "absolute", top: 16, left: 16 }}
            />
            <Sparkles
              size={10}
              color="#FFF"
              style={{ position: "absolute", bottom: 18, right: 16, opacity: 0.7 }}
            />
            <Sparkles
              size={10}
              color="#FFF"
              style={{ position: "absolute", top: 36, right: 24, opacity: 0.6 }}
            />
          </LinearGradient>

          <View style={styles.premiumBody}>
            <Text style={styles.premiumTitle}>Upgrade to Zomyra Premium</Text>
            <Text style={styles.premiumSub}>
              Serious matches. Better connections.
            </Text>
            <View style={{ marginTop: 10, gap: 8 }}>
              <Benefit label="Unlimited connect requests" />
              <Benefit label="Advanced filters (Height, Income & more)" />
              <Benefit label="Better visibility in Discover" />
              <Benefit Icon={Eye} label="See who viewed your profile" comingSoon />
              <Benefit Icon={Headphones} label="Priority customer support" comingSoon />
            </View>
          </View>

          <Pressable
            testID="profile-see-plans"
            onPress={() => router.push("/premium" as never)}
            style={({ pressed }) => [
              styles.premiumCta,
              pressed && { transform: [{ scale: 0.985 }] },
            ]}
          >
            <LinearGradient
              colors={[PURPLE, PURPLE_DEEP]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumCtaGradient}
            >
              <Crown size={16} color={GOLD} strokeWidth={2} fill={GOLD} />
              <Text style={styles.premiumCtaText}>See Premium Plans</Text>
            </LinearGradient>
          </Pressable>
        </View>
        ) : null}
      </ScrollView>

      <FloatingNav />

      <LogoutDialog
        visible={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={onLogout}
      />
      <DeleteAccountDialog
        visible={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={onDeleteConfirmed}
      />
    </SafeAreaView>
  );
}

// ───────────────────────── helpers ─────────────────────────

function ActionRow({
  Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  onPress,
  rightBadgeText,
  testID,
  last,
}: {
  Icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  rightBadgeText?: string;
  testID?: string;
  last?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        last && { paddingBottom: 16 },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Icon size={20} color={iconColor} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {rightBadgeText ? (
        <View style={styles.bestValueBadge}>
          <Text style={styles.bestValueText}>{rightBadgeText}</Text>
        </View>
      ) : null}
      <ChevronRight size={18} color={MUTED} strokeWidth={2} />
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function Benefit({
  Icon = CheckCircle2,
  label,
  comingSoon,
}: {
  Icon?: LucideIcon;
  label: string;
  comingSoon?: boolean;
}) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        <Icon size={12} color="#FFF" strokeWidth={3} />
      </View>
      <Text style={styles.benefitText}>{label}</Text>
      {comingSoon ? (
        <Text style={styles.benefitCs}>Coming soon</Text>
      ) : null}
    </View>
  );
}

// ── Logout dialog ──
function LogoutDialog({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.dialogBackdrop} onPress={onCancel}>
        <Pressable style={styles.dialogCard} onPress={() => {}}>
          <View style={styles.dialogIconCircleDanger}>
            <LogOut size={22} color={DANGER} strokeWidth={2} />
          </View>
          <Text style={styles.dialogTitle}>Log out?</Text>
          <Text style={styles.dialogBody}>
            You'll be signed out of your Zomyra account on this device. You can
            sign back in anytime.
          </Text>
          <View style={styles.dialogActions}>
            <Pressable
              testID="logout-cancel"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.dialogCancel,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="logout-confirm"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.dialogDanger,
                pressed && { transform: [{ scale: 0.985 }] },
              ]}
            >
              <Text style={styles.dialogDangerText}>Log out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Delete account two-step dialog ──
const REASONS = [
  "Found my partner ❤️",
  "Not getting suitable matches",
  "Too expensive",
  "Too many inactive profiles",
  "Privacy concerns",
  "Other",
];

function DeleteAccountDialog({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const reset = () => {
    setStep(1);
    setReason(null);
    setFeedback("");
    setConfirmText("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const canContinue = reason !== null;
  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  // animate step transitions
  const fade = useState(() => new Animated.Value(1))[0];
  const animateTo = (next: 1 | 2) => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      Animated.timing(fade, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.dialogBackdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          testID="delete-backdrop"
        />
        <Animated.View
          style={[styles.deleteCard, { opacity: fade }]}
          testID="delete-card"
        >
          <View style={styles.deleteHeader}>
            <Text style={styles.deleteHeaderTitle}>
              {step === 1 ? "Delete account" : "Confirm account deletion"}
            </Text>
            <Pressable
              testID="delete-close"
              onPress={close}
              hitSlop={10}
              style={({ pressed }) => [
                styles.deleteCloseBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <X size={18} color={TEXT} strokeWidth={2.2} />
            </Pressable>
          </View>

          {step === 1 ? (
            <View>
              <View style={styles.warnBanner}>
                <View style={styles.warnIcon}>
                  <ShieldAlert size={16} color={DANGER} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.warnTitle}>This action cannot be undone</Text>
                  <Text style={styles.warnBody}>
                    All your data, matches and conversations will be permanently
                    deleted.
                  </Text>
                </View>
              </View>

              <Text style={styles.askTitle}>Why are you leaving Zomyra?</Text>
              <Text style={styles.askSub}>Your feedback helps us improve.</Text>

              <View style={{ marginTop: 10, gap: 8 }}>
                {REASONS.map((r) => {
                  const active = reason === r;
                  return (
                    <Pressable
                      key={r}
                      testID={`delete-reason-${r}`}
                      onPress={() => setReason(r)}
                      style={[styles.reasonRow, active && styles.reasonRowActive]}
                    >
                      <View style={[styles.radio, active && styles.radioActive]}>
                        {active ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text
                        style={[styles.reasonText, active && styles.reasonTextActive]}
                      >
                        {r}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.feedbackWrap}>
                <TextInput
                  testID="delete-feedback"
                  value={feedback}
                  onChangeText={(t) => setFeedback(t.slice(0, 200))}
                  placeholder="Tell us more (optional)"
                  placeholderTextColor={MUTED}
                  multiline
                  style={styles.feedbackInput}
                />
                <Text style={styles.feedbackCount}>{feedback.length}/200</Text>
              </View>

              <Pressable
                testID="delete-continue"
                disabled={!canContinue}
                onPress={() => animateTo(2)}
                style={({ pressed }) => [
                  styles.continueBtn,
                  canContinue ? styles.continueBtnActive : styles.continueBtnDisabled,
                  pressed && canContinue && { transform: [{ scale: 0.985 }] },
                ]}
              >
                <Text
                  style={[
                    styles.continueBtnText,
                    canContinue
                      ? styles.continueBtnTextActive
                      : styles.continueBtnTextDisabled,
                  ]}
                >
                  Continue
                </Text>
              </Pressable>
              <Text style={styles.continueHelper}>
                This helps us prevent accidental deletions.
              </Text>
            </View>
          ) : (
            <View>
              <View style={styles.trashIconCircle}>
                <Trash2 size={28} color={DANGER} strokeWidth={2} />
              </View>
              <Text style={styles.confirmTitle}>
                Type <Text style={{ color: DANGER, fontWeight: "800" }}>DELETE</Text>{" "}
                to permanently delete your account
              </Text>
              <View style={styles.deleteInputWrap}>
                <TextInput
                  testID="delete-input"
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder="Type DELETE here"
                  placeholderTextColor={MUTED}
                  autoCapitalize="characters"
                  style={styles.deleteInput}
                />
              </View>
              <Pressable
                testID="delete-confirm"
                disabled={!canDelete}
                onPress={onConfirm}
                style={({ pressed }) => [
                  styles.deleteCta,
                  canDelete ? styles.deleteCtaActive : styles.deleteCtaDisabled,
                  pressed && canDelete && { transform: [{ scale: 0.985 }] },
                ]}
              >
                <Trash2 size={18} color="#FFF" strokeWidth={2.4} />
                <Text style={styles.deleteCtaText}>Delete my account</Text>
              </Pressable>
              <View style={styles.lockNoteRow}>
                <View style={styles.lockNoteDot} />
                <Text style={styles.lockNote}>
                  Your account and all data will be permanently deleted.
                </Text>
              </View>
              <Pressable
                testID="delete-back"
                onPress={() => animateTo(1)}
                style={({ pressed }) => [
                  styles.backLink,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.backLinkText}>← Back</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────────────────────── styles ─────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { paddingBottom: 110 },

  // header
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    color: PURPLE,
  },
  title: {
    marginTop: 2,
    fontSize: 26,
    fontWeight: "800",
    color: TEXT,
    letterSpacing: -0.5,
  },

  // summary — compact
  summary: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 999,
    padding: 3,
    backgroundColor: LIGHT_PURPLE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  avatar: { width: "100%", height: "100%", borderRadius: 999 },
  nameRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT,
    letterSpacing: -0.4,
  },
  premiumDot: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PURPLE,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  locRow: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 4 },
  locText: { fontSize: 13, color: MUTED, fontWeight: "500" },

  // action card
  actionCard: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: "#FFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 15.5, fontWeight: "700", color: TEXT, letterSpacing: -0.2 },
  rowSubtitle: { marginTop: 2, fontSize: 12.5, color: MUTED, fontWeight: "500" },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginLeft: 68,
  },
  bestValueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: LIGHT_PURPLE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  bestValueText: { fontSize: 11, fontWeight: "800", color: PURPLE },

  // premium card
  premiumCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#FFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 14,
    gap: 12,
  },
  premiumArt: {
    width: 110,
    height: 170,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  premiumGlow: {
    position: "absolute",
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  premiumBody: { flex: 1, minWidth: 0 },
  premiumTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT,
    letterSpacing: -0.3,
  },
  premiumSub: { marginTop: 2, fontSize: 12, color: MUTED },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  benefitIcon: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { flex: 1, fontSize: 12.5, color: TEXT, fontWeight: "500", flexShrink: 1 },
  benefitCs: {
    fontSize: 10,
    color: MUTED,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  premiumCta: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 2,
    shadowColor: PURPLE,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  premiumCtaGradient: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  premiumCtaText: { color: "#FFF", fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },

  // shared dialog
  dialogBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  dialogIconCircleDanger: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: DANGER_BG,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  dialogTitle: { fontSize: 18, fontWeight: "800", color: TEXT, letterSpacing: -0.3 },
  dialogBody: {
    marginTop: 6,
    fontSize: 13.5,
    color: MUTED,
    textAlign: "center",
    lineHeight: 20,
  },
  dialogActions: { marginTop: 18, flexDirection: "row", gap: 10, width: "100%" },
  dialogCancel: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  dialogCancelText: { fontSize: 14, fontWeight: "700", color: TEXT },
  dialogDanger: {
    flex: 1.3,
    height: 48,
    borderRadius: 14,
    backgroundColor: DANGER,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: DANGER,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  dialogDangerText: { color: "#FFF", fontSize: 14, fontWeight: "800" },

  // delete account
  deleteCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  deleteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  deleteHeaderTitle: { fontSize: 17, fontWeight: "800", color: TEXT, letterSpacing: -0.3 },
  deleteCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: LIGHT_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  warnBanner: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: DANGER_BG_SOFT,
    borderWidth: 1,
    borderColor: DANGER_BG,
  },
  warnIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: DANGER_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  warnTitle: { fontSize: 13, fontWeight: "800", color: DANGER },
  warnBody: { marginTop: 2, fontSize: 12, color: "#7F1D1D", lineHeight: 17 },

  askTitle: { marginTop: 16, fontSize: 14.5, fontWeight: "800", color: TEXT },
  askSub: { marginTop: 2, fontSize: 12, color: MUTED },

  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFF",
  },
  reasonRowActive: { borderColor: PURPLE, backgroundColor: LIGHT_PURPLE },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: PURPLE },
  radioDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: PURPLE },
  reasonText: { fontSize: 13.5, fontWeight: "600", color: TEXT, flex: 1 },
  reasonTextActive: { color: PURPLE, fontWeight: "700" },

  feedbackWrap: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFF",
    padding: 12,
  },
  feedbackInput: {
    minHeight: 64,
    fontSize: 13.5,
    color: TEXT,
    textAlignVertical: "top",
  },
  feedbackCount: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: MUTED,
    fontWeight: "600",
  },

  continueBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnActive: { backgroundColor: DANGER },
  continueBtnDisabled: { backgroundColor: DANGER_BG_SOFT },
  continueBtnText: { fontSize: 14, fontWeight: "800" },
  continueBtnTextActive: { color: "#FFF" },
  continueBtnTextDisabled: { color: DANGER, opacity: 0.7 },
  continueHelper: {
    marginTop: 8,
    fontSize: 12,
    color: MUTED,
    textAlign: "center",
  },

  // Step 2
  trashIconCircle: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: DANGER_BG,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  confirmTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
    textAlign: "center",
    lineHeight: 22,
  },
  deleteInputWrap: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFF",
    paddingHorizontal: 14,
  },
  deleteInput: { height: 48, fontSize: 14, color: TEXT, fontWeight: "700" },

  deleteCta: {
    marginTop: 14,
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteCtaActive: { backgroundColor: "#EF4444" },
  deleteCtaDisabled: { backgroundColor: "#FCA5A5" },
  deleteCtaText: { color: "#FFF", fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },

  lockNoteRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  lockNoteDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: MUTED },
  lockNote: { fontSize: 11.5, color: MUTED, fontWeight: "500" },

  backLink: { marginTop: 10, alignSelf: "center", paddingVertical: 6, paddingHorizontal: 12 },
  backLinkText: { fontSize: 12.5, color: MUTED, fontWeight: "700" },
});
