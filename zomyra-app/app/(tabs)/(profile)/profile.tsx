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
  CheckCircle2 as CheckCircleIcon,
  ChevronRight,
  Crown,
  Eye,
  Headphones,
  Heart,
  LogOut,
  MapPin,
  Pencil,
  ShieldAlert,
  Sparkles,
  Trash2 as TrashIcon,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Animated, Easing, Image, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { signOut } from "@/src/auth/sign-out";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { resetOnboarding } from "@/src/store/slices/onboarding-slice";
import { colors, alpha, fontSize, fontWeight, radii, spacing } from "@/src/theme";
import { Touchable } from "@/src/components/ui";
import { NAV_CLEARANCE } from "@/src/constants";
import { isIOS } from "@/src/utils/platform";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80&auto=format&fit=crop";

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const onboarding = useAppSelector((s) => s.onboarding.draft);
  const reset = () => dispatch(resetOnboarding());
  const isPremium = useAppSelector((s) => s.entitlement.isPremium);

  const fullName = useMemo(() => {
    const first = (onboarding.firstName || "Riya").trim();
    const last = (onboarding.lastName || "Sharma").trim();
    return `${first} ${last}`.trim();
  }, [onboarding.firstName, onboarding.lastName]);
  /*
   * ⚠️ **Placeholder, and more obviously so since Module 5.** The draft holds a
   * `cityId` now, not a city name (O-16) — the *name* is denormalized onto
   * API-23's `/profile/me` response (`cityName`), which this screen does not
   * fetch yet. Rendering the raw id would be worse than the existing hardcoded
   * fallback, so it keeps the fallback until **Module 6** wires API-23 and this
   * whole header reads from the server rather than from the onboarding draft.
   */
  const city = "Bangalore, India";

  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // `signOut` clears the keychain and, via the store listener, the RTK Query
  // cache. Before Module 2 wired it, "Log out" only reset the onboarding draft
  // and navigated — the access and refresh tokens stayed on the device and the
  // session slice still said `authenticated` (NFR-2).
  const onLogout = () => {
    setShowLogout(false);
    reset();
    void signOut(dispatch);
    router.replace("/login" as never);
  };

  // Same token clearing. The rest of FR-28 — API-27, the reason picker, the
  // grace window — is Module 12's; this only stops the tokens outliving the
  // account locally.
  const onDeleteConfirmed = () => {
    setShowDelete(false);
    reset();
    void signOut(dispatch);
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
                <Crown size={11} color={colors.text.onBrand} strokeWidth={2.4} fill={colors.text.onBrand} />
              </View>
            ) : null}
          </View>
          <View style={styles.locRow}>
            <MapPin size={14} color={colors.text.muted} strokeWidth={2} />
            <Text style={styles.locText}>{city}</Text>
          </View>
        </View>

        {/* ── Action cards ── */}
        <View style={styles.actionCard}>
          <ActionRow
            testID="profile-action-edit"
            Icon={Pencil}
            iconBg={colors.surface.brand}
            iconColor={colors.brand.default}
            title="Edit profile"
            subtitle="Update your photos, details & preferences"
            onPress={() => router.push("/edit-profile" as never)}
          />
          <Divider />
          <ActionRow
            testID="profile-action-personality"
            Icon={Heart}
            iconBg={colors.surface.brand}
            iconColor={colors.brand.default}
            title="Personality test"
            subtitle="Retake the conversational test to refresh your matches"
            onPress={() => router.push("/personality-test" as never)}
          />
          <Divider />
          {!isPremium ? (
            <>
              <ActionRow
                testID="profile-action-premium"
                Icon={Crown}
                iconBg={colors.surface.brand}
                iconColor={colors.brand.default}
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
            iconBg={colors.danger.surface}
            iconColor={colors.danger.default}
            title="Log out"
            subtitle="Sign out from your account"
            onPress={() => setShowLogout(true)}
          />
          <Divider />
          <ActionRow
            testID="profile-action-delete"
            Icon={TrashIcon}
            iconBg={colors.danger.surface}
            iconColor={colors.danger.default}
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
            colors={colors.gradient.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumArt}
          >
            <View style={styles.premiumGlow} />
            <Crown size={64} color={colors.text.onBrand} strokeWidth={1.2} fill={colors.surface.brandStrong} />
            <Sparkles
              size={14}
              color={colors.text.onBrand}
              style={{ position: "absolute", top: 16, left: 16 }}
            />
            <Sparkles
              size={10}
              color={colors.text.onBrand}
              style={{ position: "absolute", bottom: 18, right: 16, opacity: 0.7 }}
            />
            <Sparkles
              size={10}
              color={colors.text.onBrand}
              style={{ position: "absolute", top: 36, right: 24, opacity: 0.6 }}
            />
          </LinearGradient>

          <View style={styles.premiumBody}>
            <Text style={styles.premiumTitle}>Upgrade to Zomyra Premium</Text>
            <Text style={styles.premiumSub}>
              Serious matches. Better connections.
            </Text>
            <View style={{ marginTop: spacing[2.5], gap: spacing[2] }}>
              <Benefit label="Unlimited connect requests" />
              <Benefit label="Advanced filters (Height, Income & more)" />
              <Benefit label="Better visibility in Discover" />
              <Benefit Icon={Eye} label="See who viewed your profile" comingSoon />
              <Benefit Icon={Headphones} label="Priority customer support" comingSoon />
            </View>
          </View>

          <Touchable
            feedback="scale"
            testID="profile-see-plans"
            onPress={() => router.push("/premium" as never)}
            style={[styles.premiumCta]}
          >
            <LinearGradient
              colors={colors.gradient.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumCtaGradient}
            >
              <Crown size={16} color={colors.premium.onDark} strokeWidth={2} fill={colors.premium.onDark} />
              <Text style={styles.premiumCtaText}>See Premium Plans</Text>
            </LinearGradient>
          </Touchable>
        </View>
        ) : null}
      </ScrollView>


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
    <Touchable
      testID={testID}
      onPress={onPress}
      style={[styles.row, last && { paddingBottom: spacing[4] }]}
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
      <ChevronRight size={18} color={colors.text.muted} strokeWidth={2} />
    </Touchable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function Benefit({
  Icon = CheckCircleIcon,
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
        <Icon size={12} color={colors.text.onBrand} strokeWidth={3} />
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
      <Touchable style={styles.dialogBackdrop} onPress={onCancel}>
        <Touchable style={styles.dialogCard} onPress={() => {}}>
          <View style={styles.dialogIconCircleDanger}>
            <LogOut size={22} color={colors.danger.default} strokeWidth={2} />
          </View>
          <Text style={styles.dialogTitle}>Log out?</Text>
          <Text style={styles.dialogBody}>
            You'll be signed out of your Zomyra account on this device. You can
            sign back in anytime.
          </Text>
          <View style={styles.dialogActions}>
            <Touchable
              testID="logout-cancel"
              onPress={onCancel}
              style={[styles.dialogCancel]}
            >
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </Touchable>
            <Touchable
              feedback="scale"
              testID="logout-confirm"
              onPress={onConfirm}
              style={[styles.dialogDanger]}
            >
              <Text style={styles.dialogDangerText}>Log out</Text>
            </Touchable>
          </View>
        </Touchable>
      </Touchable>
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
        behavior={isIOS ? "padding" : "height"}
        style={styles.dialogBackdrop}
      >
        <Touchable
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
            <Touchable
              testID="delete-close"
              onPress={close}
              hitSlop={10}
              style={[styles.deleteCloseBtn]}
            >
              <X size={18} color={colors.text.primary} strokeWidth={2.2} />
            </Touchable>
          </View>

          {step === 1 ? (
            /*
              Scrollable because this card is the tallest content in the app that
              has to share the screen with a keyboard: six reason rows, a warning
              banner and a 200-character free-text field (FR-28). With the
              `KeyboardAvoidingView` above now set to "height" on Android
              (MIGRATION §6, Module 3), the backdrop shrinks to the space above
              the keyboard and the card no longer fits — verified on the
              emulator, where the header and the Continue button were both
              clipped off-screen. `maxHeight` on the card plus this scroll view
              is what lets it shrink instead of overflow.
            */
            <ScrollView
              style={styles.deleteScroll}
              contentContainerStyle={styles.deleteScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.warnBanner}>
                <View style={styles.warnIcon}>
                  <ShieldAlert size={16} color={colors.danger.default} strokeWidth={2} />
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

              <View style={{ marginTop: spacing[2.5], gap: spacing[2] }}>
                {REASONS.map((r) => {
                  const active = reason === r;
                  return (
                    <Touchable
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
                    </Touchable>
                  );
                })}
              </View>

              <View style={styles.feedbackWrap}>
                <TextInput
                  testID="delete-feedback"
                  value={feedback}
                  onChangeText={(t) => setFeedback(t.slice(0, 200))}
                  placeholder="Tell us more (optional)"
                  placeholderTextColor={colors.text.muted}
                  multiline
                  style={styles.feedbackInput}
                />
                <Text style={styles.feedbackCount}>{feedback.length}/200</Text>
              </View>

              <Touchable
                feedback="scale"
                testID="delete-continue"
                disabled={!canContinue}
                onPress={() => animateTo(2)}
                style={[styles.continueBtn, canContinue ? styles.continueBtnActive : styles.continueBtnDisabled]}
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
              </Touchable>
              <Text style={styles.continueHelper}>
                This helps us prevent accidental deletions.
              </Text>
            </ScrollView>
          ) : (
            <View>
              <View style={styles.trashIconCircle}>
                <TrashIcon size={28} color={colors.danger.default} strokeWidth={2} />
              </View>
              <Text style={styles.confirmTitle}>
                Type <Text style={{ color: colors.danger.default, fontWeight: fontWeight.extrabold }}>DELETE</Text>{" "}
                to permanently delete your account
              </Text>
              <View style={styles.deleteInputWrap}>
                <TextInput
                  testID="delete-input"
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder="Type DELETE here"
                  placeholderTextColor={colors.text.muted}
                  autoCapitalize="characters"
                  style={styles.deleteInput}
                />
              </View>
              <Touchable
                feedback="scale"
                testID="delete-confirm"
                disabled={!canDelete}
                onPress={onConfirm}
                style={[styles.deleteCta, canDelete ? styles.deleteCtaActive : styles.deleteCtaDisabled]}
              >
                <TrashIcon size={18} color={colors.text.onBrand} strokeWidth={2.4} />
                <Text style={styles.deleteCtaText}>Delete my account</Text>
              </Touchable>
              <View style={styles.lockNoteRow}>
                <View style={styles.lockNoteDot} />
                <Text style={styles.lockNote}>
                  Your account and all data will be permanently deleted.
                </Text>
              </View>
              <Touchable
                testID="delete-back"
                onPress={() => animateTo(1)}
                style={[styles.backLink]}
              >
                <Text style={styles.backLinkText}>← Back</Text>
              </Touchable>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────────────────────── styles ─────────────────────────

// Row dividers start past the leading icon tile so they align with the text
// column rather than spanning the full card. Icon (44) + its gutter (24).
const ROW_ICON_INSET = 68;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.default },
  scroll: { paddingBottom: NAV_CLEARANCE },

  // header
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  kicker: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.extrabold,
    letterSpacing: 2,
    color: colors.brand.default,
  },
  title: {
    marginTop: spacing[0.5],
    fontSize: fontSize.h1,
    fontWeight: fontWeight.extrabold,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },

  // summary — compact
  summary: {
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    padding: spacing[1],
    backgroundColor: colors.surface.brand,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  avatar: { width: "100%", height: "100%", borderRadius: radii.full },
  nameRow: {
    marginTop: spacing[2.5],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1.5],
  },
  name: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.extrabold,
    color: colors.text.primary,
    letterSpacing: -0.4,
  },
  premiumDot: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand.default,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  locRow: { marginTop: spacing[0.5], flexDirection: "row", alignItems: "center", gap: spacing[1] },
  locText: { fontSize: fontSize.label, color: colors.text.muted, fontWeight: fontWeight.medium },

  // action card
  actionCard: {
    marginHorizontal: spacing[4],
    marginTop: spacing[1],
    backgroundColor: colors.surface.default,
    borderRadius: radii["4xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
    shadowColor: colors.shadow.default,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: fontSize.bodyLarge, fontWeight: fontWeight.bold, color: colors.text.primary, letterSpacing: -0.2 },
  rowSubtitle: { marginTop: spacing[0.5], fontSize: fontSize.caption, color: colors.text.muted, fontWeight: fontWeight.medium },
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginLeft: ROW_ICON_INSET,
  },
  bestValueBadge: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  bestValueText: { fontSize: fontSize.micro, fontWeight: fontWeight.extrabold, color: colors.brand.default },

  // premium card
  premiumCard: {
    marginHorizontal: spacing[4],
    marginTop: spacing[3.5],
    backgroundColor: colors.surface.default,
    borderRadius: radii["4xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
    shadowColor: colors.shadow.default,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing[3.5],
    gap: spacing[3],
  },
  premiumArt: {
    width: 110,
    height: 170,
    borderRadius: radii["2xl"],
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
    backgroundColor: alpha(colors.text.onBrand, 0.05),
  },
  premiumBody: { flex: 1, minWidth: 0 },
  premiumTitle: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.extrabold,
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  premiumSub: { marginTop: spacing[0.5], fontSize: fontSize.caption, color: colors.text.muted },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  benefitIcon: {
    width: 18,
    height: 18,
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { flex: 1, fontSize: fontSize.caption, color: colors.text.primary, fontWeight: fontWeight.medium, flexShrink: 1 },
  benefitCs: {
    fontSize: fontSize.nano,
    color: colors.text.muted,
    fontWeight: fontWeight.bold,
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    borderRadius: radii.full,
    backgroundColor: colors.surface.subtle,
  },
  premiumCta: {
    width: "100%",
    borderRadius: radii.xl,
    overflow: "hidden",
    marginTop: spacing[0.5],
    shadowColor: colors.brand.default,
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
    gap: spacing[2],
  },
  premiumCtaText: { color: colors.text.onBrand, fontSize: fontSize.title, fontWeight: fontWeight.extrabold, letterSpacing: -0.2 },

  // shared dialog
  dialogBackdrop: {
    flex: 1,
    backgroundColor: alpha(colors.text.primary, 0.45),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[6],
  },
  dialogCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface.default,
    borderRadius: radii["4xl"],
    padding: spacing[6],
    alignItems: "center",
    shadowColor: colors.shadow.default,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  dialogIconCircleDanger: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.danger.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[3],
  },
  dialogTitle: { fontSize: fontSize.heading, fontWeight: fontWeight.extrabold, color: colors.text.primary, letterSpacing: -0.3 },
  dialogBody: {
    marginTop: spacing[1.5],
    fontSize: fontSize.label,
    color: colors.text.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  dialogActions: { marginTop: spacing[4.5], flexDirection: "row", gap: spacing[2.5], width: "100%" },
  dialogCancel: {
    flex: 1,
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.default,
  },
  dialogCancelText: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text.primary },
  dialogDanger: {
    flex: 1.3,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.danger.default,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.danger.default,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  dialogDangerText: { color: colors.text.onBrand, fontSize: fontSize.body, fontWeight: fontWeight.extrabold },

  // delete account
  deleteCard: {
    width: "100%",
    maxWidth: 380,
    // Never taller than the space the keyboard leaves. `flexShrink` is the
    // load-bearing half: RN defaults it to 0, so inside the centred backdrop
    // the card would keep its content height and spill off both ends rather
    // than honour `maxHeight`. See the ScrollView note in the step-1 body.
    maxHeight: "100%",
    flexShrink: 1,
    backgroundColor: colors.surface.default,
    borderRadius: radii["4xl"],
    padding: spacing[4.5],
    shadowColor: colors.shadow.default,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  // `flexGrow: 0` so a short card still hugs its content rather than stretching
  // to the full available height; `flexShrink: 1` so it *can* give way when the
  // keyboard leaves less room than the content wants. RN defaults `flexShrink`
  // to 0, which is why `maxHeight` on the card alone did nothing — the card was
  // capped but its only child refused to shrink, so it overflowed instead.
  deleteScroll: { flexGrow: 0, flexShrink: 1 },
  deleteScrollContent: { paddingBottom: spacing[1] },
  deleteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[3],
  },
  deleteHeaderTitle: { fontSize: fontSize.title, fontWeight: fontWeight.extrabold, color: colors.text.primary, letterSpacing: -0.3 },
  deleteCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
    alignItems: "center",
    justifyContent: "center",
  },

  warnBanner: {
    flexDirection: "row",
    gap: spacing[2.5],
    padding: spacing[3],
    borderRadius: radii.xl,
    backgroundColor: colors.danger.surface,
    borderWidth: 1,
    borderColor: colors.danger.surfaceStrong,
  },
  warnIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.danger.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  warnTitle: { fontSize: fontSize.label, fontWeight: fontWeight.extrabold, color: colors.danger.default },
  warnBody: { marginTop: spacing[0.5], fontSize: fontSize.caption, color: colors.danger.textStrong, lineHeight: 17 },

  askTitle: { marginTop: spacing[4], fontSize: fontSize.body, fontWeight: fontWeight.extrabold, color: colors.text.primary },
  askSub: { marginTop: spacing[0.5], fontSize: fontSize.caption, color: colors.text.muted },

  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2.5],
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[3],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  reasonRowActive: { borderColor: colors.brand.default, backgroundColor: colors.surface.brand },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.border.neutralStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.brand.default },
  radioDot: { width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.brand.default },
  reasonText: { fontSize: fontSize.label, fontWeight: fontWeight.semibold, color: colors.text.primary, flex: 1 },
  reasonTextActive: { color: colors.brand.default, fontWeight: fontWeight.bold },

  feedbackWrap: {
    marginTop: spacing[3],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
    padding: spacing[3],
  },
  feedbackInput: {
    minHeight: 64,
    fontSize: fontSize.label,
    color: colors.text.primary,
    textAlignVertical: "top",
  },
  feedbackCount: {
    alignSelf: "flex-end",
    fontSize: fontSize.micro,
    color: colors.text.muted,
    fontWeight: fontWeight.semibold,
  },

  continueBtn: {
    marginTop: spacing[3.5],
    height: 48,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnActive: { backgroundColor: colors.danger.default },
  continueBtnDisabled: { backgroundColor: colors.danger.surface },
  continueBtnText: { fontSize: fontSize.body, fontWeight: fontWeight.extrabold },
  continueBtnTextActive: { color: colors.text.onBrand },
  continueBtnTextDisabled: { color: colors.danger.default, opacity: 0.7 },
  continueHelper: {
    marginTop: spacing[2],
    fontSize: fontSize.caption,
    color: colors.text.muted,
    textAlign: "center",
  },

  // Step 2
  trashIconCircle: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.danger.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing[1.5],
  },
  confirmTitle: {
    marginTop: spacing[3.5],
    fontSize: fontSize.title,
    fontWeight: fontWeight.extrabold,
    color: colors.text.primary,
    textAlign: "center",
    lineHeight: 22,
  },
  deleteInputWrap: {
    marginTop: spacing[3.5],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
    paddingHorizontal: spacing[3.5],
  },
  deleteInput: { height: 48, fontSize: fontSize.body, color: colors.text.primary, fontWeight: fontWeight.bold },

  deleteCta: {
    marginTop: spacing[3.5],
    height: 50,
    borderRadius: radii.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  deleteCtaActive: { backgroundColor: colors.danger.default },
  deleteCtaDisabled: { backgroundColor: colors.danger.border },
  deleteCtaText: { color: colors.text.onBrand, fontSize: fontSize.bodyLarge, fontWeight: fontWeight.extrabold, letterSpacing: -0.2 },

  lockNoteRow: {
    marginTop: spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1.5],
  },
  lockNoteDot: { width: 6, height: 6, borderRadius: radii.full, backgroundColor: colors.text.muted },
  lockNote: { fontSize: fontSize.micro, color: colors.text.muted, fontWeight: fontWeight.medium },

  backLink: { marginTop: spacing[2.5], alignSelf: "center", paddingVertical: spacing[1.5], paddingHorizontal: spacing[3] },
  backLinkText: { fontSize: fontSize.caption, color: colors.text.muted, fontWeight: fontWeight.bold },
});
