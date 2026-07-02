/**
 * Edit Profile — a Discover-like read-out of the user's own profile where
 * every field is inline-editable. Uses the same card/photo layout that
 * Discover uses so the user sees exactly what their match will see.
 *
 * Data source: `useOnboardingStore` (already AsyncStorage-persisted, so any
 * edit auto-saves and survives reloads).
 *
 * Inline editors:
 *   - Text fields  → `<TextInput>` in place (bio, name, city, profession, languages)
 *   - Enum fields  → bottom-sheet single-select picker (build, education,
 *                    income, diet, drinking, smoking, fitness)
 *   - Photos       → expo-image-picker; stored as base64 data URIs in
 *                    `state.photos[]` (first slot acts as the hero photo)
 */
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Briefcase,
  Camera,
  CheckCircle2,
  Cigarette,
  Dumbbell,
  GraduationCap,
  IndianRupee,
  Info,
  Languages as LanguagesIcon,
  Leaf,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useMemo, useState, type ReactNode } from "react";
import {
  Alert,
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

import { useOnboardingStore } from "@/src/stores/onboarding-store";
import type {
  BodyType,
  Diet,
  Drinking,
  Education,
  Fitness,
  IncomeRange,
  Smoking,
} from "@/src/lib/onboarding/types";

// Design tokens — match Discover so the screens feel related.
const PURPLE = "#5B2C6F";
const LIGHT_PURPLE = "#F5F3FF";
const BORDER = "#ECEAF7";
const TEXT = "#111827";
const MUTED = "#6B7280";

// Option lists (mirror onboarding types.ts)
const BUILD_OPTS: BodyType[] = ["Slim", "Average", "Athletic", "Curvy", "Plus Size", "Prefer Not To Say"];
const EDUCATION_OPTS: Education[] = ["High School", "Diploma", "Bachelor's Degree", "Master's Degree", "MBA", "PhD", "Other"];
const INCOME_OPTS: IncomeRange[] = ["Under ₹5 LPA", "₹5–10 LPA", "₹10–20 LPA", "₹20–35 LPA", "₹35–50 LPA", "₹50 LPA+", "Prefer Not To Say"];
const DIET_OPTS: Diet[] = ["Vegetarian", "Eggetarian", "Non-Vegetarian", "Vegan"];
const DRINK_OPTS: Drinking[] = ["Never", "Socially", "Occasionally", "Frequently"];
const SMOKE_OPTS: Smoking[] = ["Never", "Occasionally", "Frequently"];
const FITNESS_OPTS: Fitness[] = ["Not Important", "Moderately Active", "Active", "Fitness Enthusiast"];

const PLACEHOLDER_PHOTO =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900&q=80&auto=format&fit=crop";

type PickerOption = string;
type PickerState = {
  title: string;
  options: readonly PickerOption[];
  current: string;
  onPick: (v: PickerOption) => void;
} | null;

export default function EditProfileScreen() {
  const router = useRouter();
  const state = useOnboardingStore((s) => s.state);
  const set = useOnboardingStore((s) => s.set);

  const [picker, setPicker] = useState<PickerState>(null);

  const photos = state.photos.length > 0 ? state.photos : [PLACEHOLDER_PHOTO];

  const age = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(state.dob)) return null;
    const [y, m, d] = state.dob.split("-").map(Number);
    const t = new Date();
    let a = t.getFullYear() - y;
    if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) a--;
    return a;
  }, [state.dob]);

  const heightStr = state.heightCm
    ? `${Math.floor(state.heightCm / 30.48)}'${Math.round((state.heightCm % 30.48) / 2.54)}"`
    : "—";

  /* ───────── photo picker ───────── */
  const pickPhoto = async (replaceIdx: number | null) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo access to upload photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      const b64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const next = [...state.photos];
      if (replaceIdx === null) {
        next.push(b64);
      } else {
        next[replaceIdx] = b64;
      }
      set("photos", next);
    } catch (err) {
      Alert.alert("Couldn't load photo", String((err as Error)?.message ?? err));
    } finally {
      setPhotoIdxToReplace(null);
    }
  };

  const removePhoto = (idx: number) => {
    const next = state.photos.filter((_, i) => i !== idx);
    set("photos", next);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* ── Sticky header ── */}
        <View style={styles.header}>
          <Pressable
            testID="edit-back"
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
          >
            <ArrowLeft size={20} color={TEXT} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Pressable
            testID="edit-done"
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          testID="edit-profile-scroll"
        >
          {/* ── Identity row (name, age, city) ── */}
          <View style={styles.identityRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.editableNameRow}>
                <TextInput
                  testID="edit-firstName"
                  value={state.firstName}
                  onChangeText={(t) => set("firstName", t)}
                  placeholder="First name"
                  placeholderTextColor={MUTED}
                  style={[
                    styles.identityNameInput,
                    // Size the input to its content so ", age" sits inline.
                    // Clamp to a sensible range to avoid jitter on tiny / huge names.
                    {
                      width: Math.max(
                        72,
                        Math.min(220, (state.firstName.length || 8) * 15 + 8),
                      ),
                    },
                  ]}
                />
                {age != null ? <Text style={styles.identityName}>, {age}</Text> : null}
              </View>
              <View style={styles.identityLocRow}>
                <MapPin size={14} color={MUTED} strokeWidth={2} />
                <TextInput
                  testID="edit-city"
                  value={state.city}
                  onChangeText={(t) => set("city", t)}
                  placeholder="Add your city"
                  placeholderTextColor={MUTED}
                  style={styles.identityLocInput}
                />
              </View>
            </View>
          </View>

          {/* ── Primary photo card (hero) ── */}
          <SectionCard kicker="PRIMARY PHOTO" Icon={Camera} testID="card-primary-photo">
            <Pressable
              testID="edit-primary-photo"
              onPress={() => pickPhoto(state.photos.length > 0 ? 0 : null)}
              style={({ pressed }) => [styles.heroPhotoWrap, pressed && { opacity: 0.95 }]}
            >
              <Image source={{ uri: photos[0] }} style={styles.heroPhoto} />
              <View style={styles.heroEditChip}>
                <Pencil size={14} color="#FFF" strokeWidth={2.4} />
                <Text style={styles.heroEditText}>Change photo</Text>
              </View>
            </Pressable>
            <Text style={styles.helper}>
              This is the first photo people see in Discover. Make it count.
            </Text>
          </SectionCard>

          {/* ── More photos ── */}
          <SectionCard kicker="MORE PHOTOS" Icon={Camera} testID="card-photos">
            <View style={styles.photoGrid}>
              {state.photos.slice(1).map((src, i) => {
                const realIdx = i + 1;
                return (
                  <View key={`${realIdx}-${src.slice(-12)}`} style={styles.photoTile}>
                    <Image source={{ uri: src }} style={styles.photoTileImage} />
                    <Pressable
                      onPress={() => removePhoto(realIdx)}
                      style={({ pressed }) => [
                        styles.photoTileDelete,
                        pressed && { opacity: 0.85 },
                      ]}
                      hitSlop={6}
                    >
                      <Trash2 size={13} color="#FFF" strokeWidth={2.4} />
                    </Pressable>
                  </View>
                );
              })}
              <Pressable
                testID="edit-add-photo"
                onPress={() => pickPhoto(null)}
                style={({ pressed }) => [
                  styles.photoAdd,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Plus size={22} color={PURPLE} strokeWidth={2.4} />
                <Text style={styles.photoAddText}>Add photo</Text>
              </Pressable>
            </View>
          </SectionCard>

          {/* ── Profession & Income ── */}
          <SectionCard kicker="PROFESSION & INCOME" Icon={Briefcase} testID="card-prof-income">
            <FieldRow Icon={Briefcase} label="Profession">
              <TextInput
                testID="edit-profession"
                value={state.profession}
                onChangeText={(t) => set("profession", t)}
                placeholder="What you do"
                placeholderTextColor={MUTED}
                style={styles.fieldInput}
              />
            </FieldRow>
            <Divider />
            <PickField
              testID="edit-income"
              Icon={IndianRupee}
              label="Income range"
              value={state.income}
              placeholder="Pick a range"
              onPress={() =>
                setPicker({
                  title: "Income range",
                  options: INCOME_OPTS,
                  current: state.income,
                  onPick: (v) => set("income", v as IncomeRange),
                })
              }
            />
          </SectionCard>

          {/* ── Lifestyle ── */}
          <SectionCard kicker="LIFESTYLE" Icon={Leaf} testID="card-lifestyle">
            <PickField
              Icon={Leaf}
              label="Diet"
              value={state.diet}
              placeholder="Vegetarian / Non-veg…"
              onPress={() =>
                setPicker({
                  title: "Diet",
                  options: DIET_OPTS,
                  current: state.diet,
                  onPick: (v) => set("diet", v as Diet),
                })
              }
            />
            <Divider />
            <PickField
              Icon={Wine}
              label="Drinking"
              value={state.drinking}
              placeholder="How often you drink"
              onPress={() =>
                setPicker({
                  title: "Drinking",
                  options: DRINK_OPTS,
                  current: state.drinking,
                  onPick: (v) => set("drinking", v as Drinking),
                })
              }
            />
            <Divider />
            <PickField
              Icon={Cigarette}
              label="Smoking"
              value={state.smoking}
              placeholder="How often you smoke"
              onPress={() =>
                setPicker({
                  title: "Smoking",
                  options: SMOKE_OPTS,
                  current: state.smoking,
                  onPick: (v) => set("smoking", v as Smoking),
                })
              }
            />
            <Divider />
            <PickField
              Icon={Dumbbell}
              label="Fitness"
              value={state.fitness}
              placeholder="How active you are"
              onPress={() =>
                setPicker({
                  title: "Fitness level",
                  options: FITNESS_OPTS,
                  current: state.fitness,
                  onPick: (v) => set("fitness", v as Fitness),
                })
              }
            />
          </SectionCard>

          {/* ── Quick facts ── */}
          <SectionCard kicker="QUICK FACTS" Icon={Info} testID="card-quick-facts">
            <PickField
              Icon={UserRound}
              label="Build"
              value={state.bodyType}
              placeholder="Pick body type"
              onPress={() =>
                setPicker({
                  title: "Build",
                  options: BUILD_OPTS,
                  current: state.bodyType,
                  onPick: (v) => set("bodyType", v as BodyType),
                })
              }
            />
            <Divider />
            <FieldRow Icon={Info} label="Height">
              <Text style={styles.fieldStatic}>{heightStr}</Text>
            </FieldRow>
            <Divider />
            <PickField
              Icon={GraduationCap}
              label="Education"
              value={state.education}
              placeholder="Highest qualification"
              onPress={() =>
                setPicker({
                  title: "Education",
                  options: EDUCATION_OPTS,
                  current: state.education,
                  onPick: (v) => set("education", v as Education),
                })
              }
            />
          </SectionCard>

          {/* ── Languages ── */}
          <SectionCard kicker="LANGUAGES" Icon={LanguagesIcon} testID="card-languages">
            <FieldRow Icon={LanguagesIcon} label="Languages">
              <TextInput
                testID="edit-languages"
                value={state.languages.join(", ")}
                onChangeText={(t) =>
                  set(
                    "languages",
                    t.split(",").map((s) => s.trim()).filter(Boolean),
                  )
                }
                placeholder="English, Hindi…"
                placeholderTextColor={MUTED}
                style={styles.fieldInput}
              />
            </FieldRow>
          </SectionCard>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Single-select bottom sheet ── */}
      <PickerSheet picker={picker} onClose={() => setPicker(null)} />
    </SafeAreaView>
  );
}

/* ════════════ helpers ════════════ */

function SectionCard({
  kicker,
  Icon,
  children,
  testID,
}: {
  kicker: string;
  Icon: LucideIcon;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.kickerRow}>
        <View style={styles.kickerIcon}>
          <Icon size={13} color={PURPLE} strokeWidth={2.4} />
        </View>
        <Text style={styles.kickerText}>{kicker}</Text>
      </View>
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

function FieldRow({
  Icon,
  label,
  children,
}: {
  Icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldIcon}>
        <Icon size={16} color={PURPLE} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={{ marginTop: 2 }}>{children}</View>
      </View>
    </View>
  );
}

function PickField({
  Icon,
  label,
  value,
  placeholder,
  onPress,
  testID,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.fieldRow, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.fieldIcon}>
        <Icon size={16} color={PURPLE} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text
          style={[
            styles.fieldStatic,
            !value && { color: MUTED, fontWeight: "500" },
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
      </View>
      <Pencil size={15} color={MUTED} strokeWidth={2} />
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function PickerSheet({
  picker,
  onClose,
}: {
  picker: PickerState;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={!!picker}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose} testID="picker-backdrop">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetGrabber} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{picker?.title ?? ""}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.sheetClose}>
              <X size={18} color={TEXT} strokeWidth={2.2} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {picker?.options.map((opt) => {
              const active = picker.current === opt;
              return (
                <Pressable
                  key={opt}
                  testID={`picker-opt-${opt}`}
                  onPress={() => {
                    picker.onPick(opt);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.sheetItem,
                    active && styles.sheetItemActive,
                    pressed && !active && { backgroundColor: "#FAF8FE" },
                  ]}
                >
                  <Text
                    style={[
                      styles.sheetItemText,
                      active && { color: PURPLE, fontWeight: "700" },
                    ]}
                  >
                    {opt}
                  </Text>
                  {active ? <CheckCircle2 size={18} color={PURPLE} strokeWidth={2.2} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ════════════ styles ════════════ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { paddingBottom: 32 },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: "#FFFFFF",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: LIGHT_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: TEXT, letterSpacing: -0.3 },
  doneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PURPLE,
  },
  doneText: { color: "#FFF", fontSize: 14, fontWeight: "800" },

  // Identity
  identityRow: {
    marginHorizontal: 16,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editableNameRow: { flexDirection: "row", alignItems: "baseline" },
  identityNameInput: {
    fontSize: 26,
    fontWeight: "800",
    color: TEXT,
    letterSpacing: -0.5,
    padding: 0,
    minWidth: 60,
  },
  identityName: { fontSize: 26, fontWeight: "800", color: TEXT, letterSpacing: -0.5 },
  identityLocRow: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 4 },
  identityLocInput: {
    flex: 1,
    fontSize: 13.5,
    color: TEXT,
    fontWeight: "500",
    padding: 0,
  },
  identityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: LIGHT_PURPLE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  identityChipText: { fontSize: 11, fontWeight: "700", color: PURPLE },

  // Section card
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
  },
  kickerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  kickerIcon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: LIGHT_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  kickerText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: PURPLE,
  },
  helper: { marginTop: 10, fontSize: 12, color: MUTED, fontWeight: "500" },
  helperRight: {
    marginTop: 6,
    alignSelf: "flex-end",
    fontSize: 11,
    color: MUTED,
    fontWeight: "600",
  },

  // Primary photo
  heroPhotoWrap: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: LIGHT_PURPLE,
    position: "relative",
  },
  heroPhoto: { width: "100%", height: "100%" },
  heroEditChip: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.85)",
  },
  heroEditText: { color: "#FFF", fontSize: 12.5, fontWeight: "700" },

  // Photo grid
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoTile: {
    width: "48%",
    aspectRatio: 4 / 5,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: LIGHT_PURPLE,
    position: "relative",
  },
  photoTileImage: { width: "100%", height: "100%" },
  photoTileDelete: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    width: "48%",
    aspectRatio: 4 / 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BORDER,
    borderStyle: "dashed",
    backgroundColor: LIGHT_PURPLE,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  photoAddText: { fontSize: 12.5, fontWeight: "700", color: PURPLE },

  // Bio
  bioInput: {
    minHeight: 92,
    fontSize: 14,
    color: TEXT,
    lineHeight: 21,
    textAlignVertical: "top",
    padding: 0,
  },

  // Field rows
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: LIGHT_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: MUTED,
    textTransform: "uppercase",
  },
  fieldInput: {
    fontSize: 14.5,
    fontWeight: "600",
    color: TEXT,
    padding: 0,
  },
  fieldStatic: { fontSize: 14.5, fontWeight: "600", color: TEXT },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 4 },

  // Picker sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  sheetGrabber: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: BORDER,
    alignSelf: "center",
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: TEXT, letterSpacing: -0.2 },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: LIGHT_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 14,
  },
  sheetItemActive: { backgroundColor: LIGHT_PURPLE },
  sheetItemText: { fontSize: 14.5, fontWeight: "600", color: TEXT },
});
