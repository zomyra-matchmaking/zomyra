/**
 * Edit Profile — a Discover-like read-out of the user's own profile where
 * every field is inline-editable. Uses the same card/photo layout that
 * Discover uses so the user sees exactly what their match will see.
 *
 * Data source: `useOnboardingStore` (already AsyncStorage-persisted, so any
 * edit auto-saves and survives reloads).
 *
 * Inline editors:
 *   - Text fields  → `<TextInput>` in place (name only — everything else that
 *                    looks like text is a catalogue key underneath)
 *   - Enum fields  → bottom-sheet picker fed by **API-39**, single- or
 *                    multi-select (build, education, income, profession, diet,
 *                    drinking, smoking, languages)
 *   - Location     → state picker (API-39) then city picker (**API-38**,
 *                    scoped to that state); the draft stores `cityId`
 *   - Photos       → expo-image-picker; stored as base64 data URIs in
 *                    `state.photos[]` (first slot acts as the hero photo)
 */
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Briefcase,
  Camera,
  CheckCircle2 as CheckCircleIcon,
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
  Trash2 as TrashIcon,
  UserRound,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGetCitiesQuery, type CatalogueOption, type OptionCategoryKey } from "@/src/api";
import { useOnboardingDraft } from "@/src/hooks/use-onboarding-draft";
import { useOnboardingOptions } from "@/src/hooks/use-onboarding-options";
import type { OnboardingState } from "@/src/lib/onboarding/types";
/*
 * **Every list on this screen is API-39's, not this file's** (FR-3b, FE §9.2).
 *
 * The prototype hardcoded `INCOME_OPTS`, `BUILD_OPTS` and their neighbours as
 * *display labels* and wrote them straight into the draft as though they were
 * keys. That is a second copy of the catalogue — the exact thing FR-3b exists to
 * prevent — and it drifts the moment the backend edits a list. All of them are
 * gone; `useOnboardingOptions` is the single source, as it is in the Onboarding
 * stack.
 *
 * **It is a separate call, and that is fine.** RTK Query keys `getOnboardingOptions`
 * by endpoint, so this screen's subscription shares one cached response with
 * onboarding's rather than refetching — but it does not *depend* on onboarding
 * having run, which matters because the draft is destroyed on submit (NFR-12)
 * and Edit Profile is reached long afterwards.
 *
 * ⚠️ **Still owed by Module 6, and both are real:**
 *
 * 1. **Pre-fill comes from the local draft, not from API-23.** After submit the
 *    draft is gone, so a returning user sees an empty form. This screen needs
 *    `GET /profile/me` to load and `PATCH /profile` to save; until then it edits
 *    client state that reaches no server.
 * 2. **`state` has no server-side home.** The city picker needs a state to scope
 *    API-38, and `state` is deliberately never submitted (O-16) — so once the
 *    draft is gone there is nothing to seed it from. Either API-23 returns the
 *    city's state alongside `cityId`, or the client needs a city→state lookup.
 *    Raised in docs/CONTRACT-QUESTIONS.md. Today the picker just starts at the
 *    state step, which is correct but re-asks a question the server knows.
 * 3. **FR-4's immutability rules** are not enforced here. The locked set was
 *    revised in O-24 (BE v1.15 / FE v1.54): it is now `{firstName, lastName,
 *    dateOfBirth, relationshipStatus}` — `relationshipStatus` joined it and
 *    `height` left it, so `PATCH /profile` now *accepts* `heightCm` and rejects
 *    the four. When enforcement lands, lock those four (not height), and show
 *    `relationshipStatus` as a read-only row (FR-27).
 */
import { colors, alpha, fontSize, fontWeight, radii, spacing } from "@/src/theme";
import { Touchable } from "@/src/components/ui";
import { isIOS } from "@/src/utils/platform";

const PLACEHOLDER_PHOTO =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900&q=80&auto=format&fit=crop";

/**
 * The sheet works in keys and renders labels, like every other FR-3b surface.
 *
 * ⚠️ **Nothing here is a snapshot, and that is the whole design.** This object is
 * built inside an `onPress` and then survives many renders — a multi-select sheet
 * stays open across taps, and API-38's city list arrives *after* the sheet opens.
 * Anything captured at open time (an option array, a loading flag, the draft)
 * freezes at its open-time value, so the sheet either never fills in or computes
 * the next pick from a stale array. The fix is uniform: the descriptor names
 * *where* data comes from, and every read happens at render with values passed in.
 *
 * - `source` is resolved to a live option list by the component each render.
 * - `selected` and `onPick` take the **current** draft as an argument.
 *
 * `selected` is an array even for single-select so one sheet covers both cases;
 * `multi` decides whether picking closes it.
 */
type PickerState = {
  title: string;
  source: { kind: "catalogue"; category: OptionCategoryKey } | { kind: "cities" };
  selected: (draft: OnboardingState) => readonly string[];
  multi?: boolean;
  empty?: string;
  onPick: (key: string, draft: OnboardingState) => void;
} | null;

export default function EditProfileScreen() {
  const router = useRouter();
  const { draft: state, set } = useOnboardingDraft();
  const { options, label } = useOnboardingOptions();

  const [picker, setPicker] = useState<PickerState>(null);

  /*
   * API-38 is state-scoped, so the fetch is driven by whichever state the draft
   * currently holds and skipped entirely when there isn't one. `cityLabel` reads
   * off the same response rather than storing a name in the draft — a stored
   * name is a second copy that goes stale when the backend renames a city.
   */
  const { data: citiesData, isFetching: citiesLoading } = useGetCitiesQuery(state.state, {
    skip: !state.state,
  });
  const cityOptions = useMemo<CatalogueOption[]>(
    () => (citiesData?.cities ?? []).map((c) => ({ key: c.id, label: c.name })),
    [citiesData],
  );
  const cityLabel = cityOptions.find((c) => c.key === state.cityId)?.label ?? "";

  /**
   * Open the sheet for a single-select catalogue-backed field. The draft key and
   * the API-39 category are passed separately because they are not always the
   * same word, and conflating them is how a screen ends up writing one field's
   * keys into another.
   */
  const openChoice = (
    title: string,
    category: OptionCategoryKey,
    field:
      | "build"
      | "education"
      | "incomeRange"
      | "profession"
      | "diet"
      | "drinking"
      | "smoking"
      | "fitness",
  ) =>
    setPicker({
      title,
      source: { kind: "catalogue", category },
      selected: (d) => [d[field]],
      onPick: (key) => set(field, key),
    });

  /*
   * The sheet's live data, recomputed every render — see `PickerState`. The city
   * branch is the one that moves under the sheet: tapping a state kicks off
   * API-38 and the list lands a moment later, so `pickerLoading` drives an
   * overlay spinner rather than the sheet opening empty and looking broken.
   */
  const pickerOptions: readonly CatalogueOption[] = !picker
    ? []
    : picker.source.kind === "cities"
      ? cityOptions
      : options(picker.source.category);
  const pickerLoading = picker?.source.kind === "cities" && citiesLoading;

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
        behavior={isIOS ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* ── Sticky header ── */}
        <View style={styles.header}>
          <Touchable
            testID="edit-back"
            onPress={() => router.back()}
            hitSlop={10}
            style={[styles.iconBtn]}
          >
            <ArrowLeft size={20} color={colors.text.primary} strokeWidth={2.2} />
          </Touchable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Touchable
            testID="edit-done"
            onPress={() => router.back()}
            hitSlop={10}
            style={[styles.doneBtn]}
          >
            <Text style={styles.doneText}>Done</Text>
          </Touchable>
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
                  placeholderTextColor={colors.text.muted}
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
              {/*
                * Two taps, not a text box: `cityId` is a closed set from API-38
                * (O-15/O-16) and API-38 is scoped by state, so the state has to
                * be chosen before there is a city list to choose from. Free text
                * here would write an id the backend cannot resolve.
                */}
              <View style={styles.identityLocRow}>
                <MapPin size={14} color={colors.text.muted} strokeWidth={2} />
                <Text
                  testID="edit-city"
                  style={[styles.identityLocInput, !cityLabel && { color: colors.text.muted }]}
                >
                  {cityLabel || "Add your city"}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Primary photo card (hero) ── */}
          <SectionCard kicker="PRIMARY PHOTO" Icon={Camera} testID="card-primary-photo">
            <Touchable
              testID="edit-primary-photo"
              onPress={() => pickPhoto(state.photos.length > 0 ? 0 : null)}
              style={[styles.heroPhotoWrap]}
            >
              <Image source={{ uri: photos[0] }} style={styles.heroPhoto} />
              <View style={styles.heroEditChip}>
                <Pencil size={14} color={colors.text.onBrand} strokeWidth={2.4} />
                <Text style={styles.heroEditText}>Change photo</Text>
              </View>
            </Touchable>
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
                    <Touchable
                      onPress={() => removePhoto(realIdx)}
                      style={[styles.photoTileDelete]}
                      hitSlop={6}
                    >
                      <TrashIcon size={13} color={colors.text.onBrand} strokeWidth={2.4} />
                    </Touchable>
                  </View>
                );
              })}
              <Touchable
                feedback="scale"
                testID="edit-add-photo"
                onPress={() => pickPhoto(null)}
                style={[styles.photoAdd]}
              >
                <Plus size={22} color={colors.brand.default} strokeWidth={2.4} />
                <Text style={styles.photoAddText}>Add photo</Text>
              </Touchable>
            </View>
          </SectionCard>

          {/* ── Location ── */}
          <SectionCard kicker="LOCATION" Icon={MapPin} testID="card-location">
            <PickField
              testID="edit-state"
              Icon={MapPin}
              label="State"
              value={label("state", state.state)}
              placeholder="Pick your state"
              onPress={() =>
                setPicker({
                  title: "State",
                  source: { kind: "catalogue", category: "state" },
                  selected: (d) => [d.state],
                  /*
                   * Same rule the Onboarding stack applies: a `cityId` is only
                   * valid under the state it came from, so changing state has to
                   * clear it. Guarded on inequality so re-picking the same state
                   * is a no-op rather than silently wiping a good answer.
                   */
                  onPick: (key, d) => {
                    if (key !== d.state) set("cityId", "");
                    set("state", key);
                  },
                })
              }
            />
            <Divider />
            <PickField
              testID="edit-city-row"
              Icon={MapPin}
              label="City"
              value={cityLabel}
              placeholder={state.state ? "Pick your city" : "Pick your state first"}
              onPress={() =>
                setPicker({
                  title: "City",
                  source: { kind: "cities" },
                  selected: (d) => [d.cityId],
                  empty: state.state
                    ? "No cities listed for that state yet."
                    : "Pick your state first.",
                  onPick: (id) => set("cityId", id),
                })
              }
            />
          </SectionCard>

          {/* ── Profession & Income ── */}
          <SectionCard kicker="PROFESSION & INCOME" Icon={Briefcase} testID="card-prof-income">
            <PickField
              testID="edit-profession"
              Icon={Briefcase}
              label="Profession"
              value={label("profession", state.profession)}
              placeholder="What you do"
              onPress={() => openChoice("Profession", "profession", "profession")}
            />
            <Divider />
            <PickField
              testID="edit-income"
              Icon={IndianRupee}
              label="Income range"
              value={label("incomeRange", state.incomeRange)}
              placeholder="Pick a range"
              onPress={() => openChoice("Income range", "incomeRange", "incomeRange")}
            />
          </SectionCard>

          {/* ── Lifestyle ── */}
          <SectionCard kicker="LIFESTYLE" Icon={Leaf} testID="card-lifestyle">
            <PickField
              Icon={Leaf}
              label="Diet"
              value={label("diet", state.diet)}
              placeholder="Vegetarian / Non-veg…"
              onPress={() => openChoice("Diet", "diet", "diet")}
            />
            <Divider />
            <PickField
              Icon={Wine}
              label="Drinking"
              value={label("drinking", state.drinking)}
              placeholder="How often you drink"
              onPress={() => openChoice("Drinking", "drinking", "drinking")}
            />
            <Divider />
            <PickField
              Icon={Cigarette}
              label="Smoking"
              value={label("smoking", state.smoking)}
              placeholder="How often you smoke"
              onPress={() => openChoice("Smoking", "smoking", "smoking")}
            />
            <Divider />
            <PickField
              testID="edit-fitness"
              Icon={Dumbbell}
              label="Fitness"
              value={label("fitness", state.fitness)}
              placeholder="How often you exercise"
              onPress={() => openChoice("Fitness", "fitness", "fitness")}
            />
          </SectionCard>

          {/* ── Quick facts ── */}
          <SectionCard kicker="QUICK FACTS" Icon={Info} testID="card-quick-facts">
            <PickField
              Icon={UserRound}
              label="Build"
              value={label("build", state.build)}
              placeholder="Pick body type"
              onPress={() => openChoice("Build", "build", "build")}
            />
            <Divider />
            <FieldRow Icon={Info} label="Height">
              <Text style={styles.fieldStatic}>{heightStr}</Text>
            </FieldRow>
            <Divider />
            <PickField
              Icon={GraduationCap}
              label="Education"
              value={label("education", state.education)}
              placeholder="Highest qualification"
              onPress={() => openChoice("Education", "education", "education")}
            />
          </SectionCard>

          {/* ── Languages ── */}
          <SectionCard kicker="LANGUAGES" Icon={LanguagesIcon} testID="card-languages">
            {/*
              * Was a comma-separated text box, which wrote whatever was typed
              * into an array the backend matches by key — "Hindi" instead of
              * "hindi", and any typo silently accepted. Multi-select over the
              * catalogue makes an invalid language unrepresentable.
              */}
            <PickField
              testID="edit-languages"
              Icon={LanguagesIcon}
              label="Languages"
              value={state.languages.map((k) => label("languages", k)).join(", ")}
              placeholder="Pick the languages you speak"
              onPress={() =>
                setPicker({
                  title: "Languages",
                  source: { kind: "catalogue", category: "languages" },
                  selected: (d) => d.languages,
                  multi: true,
                  // `d`, not the captured draft: this sheet stays open across
                  // taps, so the second toggle must see the first one's result.
                  onPick: (key, d) =>
                    set(
                      "languages",
                      d.languages.includes(key)
                        ? d.languages.filter((k) => k !== key)
                        : [...d.languages, key],
                    ),
                })
              }
            />
          </SectionCard>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Single-select bottom sheet ── */}
      <PickerSheet
        picker={picker}
        draft={state}
        options={pickerOptions}
        loading={!!pickerLoading}
        onClose={() => setPicker(null)}
      />
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
          <Icon size={13} color={colors.brand.default} strokeWidth={2.4} />
        </View>
        <Text style={styles.kickerText}>{kicker}</Text>
      </View>
      <View style={{ marginTop: spacing[3] }}>{children}</View>
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
        <Icon size={16} color={colors.brand.default} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={{ marginTop: spacing[0.5] }}>{children}</View>
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
    <Touchable
      testID={testID}
      onPress={onPress}
      style={[styles.fieldRow]}
    >
      <View style={styles.fieldIcon}>
        <Icon size={16} color={colors.brand.default} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text
          style={[
            styles.fieldStatic,
            !value && { color: colors.text.muted, fontWeight: fontWeight.medium },
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
      </View>
      <Pencil size={15} color={colors.text.muted} strokeWidth={2} />
    </Touchable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function PickerSheet({
  picker,
  draft,
  options,
  loading,
  onClose,
}: {
  picker: PickerState;
  draft: OnboardingState;
  /** Resolved by the parent this render — never captured when the sheet opened. */
  options: readonly CatalogueOption[];
  loading: boolean;
  onClose: () => void;
}) {
  // Bound to a const so the narrowing survives into the map callback below.
  const p = picker;
  const selected = p?.selected(draft) ?? [];
  return (
    <Modal
      visible={!!picker}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Touchable style={styles.sheetBackdrop} onPress={onClose} testID="picker-backdrop">
        <Touchable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetGrabber} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{picker?.title ?? ""}</Text>
            <Touchable onPress={onClose} hitSlop={8} style={styles.sheetClose}>
              <X size={18} color={colors.text.primary} strokeWidth={2.2} />
            </Touchable>
          </View>
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {/*
              * Three states, and the empty one is not an error: API-38's list is
              * scoped to a state that may not be chosen yet, so "nothing here"
              * needs a sentence saying which. Falling through to a blank sheet
              * reads as a broken screen.
              */}
            {loading ? (
              <View style={styles.sheetLoading} testID="picker-loading">
                <ActivityIndicator color={colors.brand.default} />
              </View>
            ) : !p || options.length === 0 ? (
              <Text style={styles.sheetNotice}>{p?.empty ?? "Nothing to choose from yet."}</Text>
            ) : (
              options.map((opt) => {
                const active = selected.includes(opt.key);
                return (
                  <Touchable
                    feedback="highlight"
                    key={opt.key}
                    // Keyed on the catalogue key, not the label: labels are
                    // free text the backend can reword, keys are the contract.
                    testID={`picker-opt-${opt.key}`}
                    onPress={() => {
                      p.onPick(opt.key, draft);
                      // Multi-select stays open so several can be ticked in one
                      // pass; single-select closing on pick is the whole gesture.
                      if (!p.multi) onClose();
                    }}
                    style={[styles.sheetItem, active && styles.sheetItemActive]}
                  >
                    <Text
                      style={[
                        styles.sheetItemText,
                        active && { color: colors.brand.default, fontWeight: fontWeight.bold },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {active ? <CheckCircleIcon size={18} color={colors.brand.default} strokeWidth={2.2} /> : null}
                  </Touchable>
                );
              })
            )}
          </ScrollView>
        </Touchable>
      </Touchable>
    </Modal>
  );
}

/* ════════════ styles ════════════ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.default },
  scroll: { paddingBottom: spacing[8] },

  // Header
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[1.5],
    paddingBottom: spacing[2.5],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: fontSize.title, fontWeight: fontWeight.extrabold, color: colors.text.primary, letterSpacing: -0.3 },
  doneBtn: {
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
  },
  doneText: { color: colors.text.onBrand, fontSize: fontSize.body, fontWeight: fontWeight.extrabold },

  // Identity
  identityRow: {
    marginHorizontal: spacing[4],
    marginTop: spacing[3.5],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2.5],
  },
  editableNameRow: { flexDirection: "row", alignItems: "baseline" },
  identityNameInput: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.extrabold,
    color: colors.text.primary,
    letterSpacing: -0.5,
    padding: spacing[0],
    minWidth: 60,
  },
  identityName: { fontSize: fontSize.h1, fontWeight: fontWeight.extrabold, color: colors.text.primary, letterSpacing: -0.5 },
  identityLocRow: { marginTop: spacing[0.5], flexDirection: "row", alignItems: "center", gap: spacing[1] },
  identityLocInput: {
    flex: 1,
    fontSize: fontSize.label,
    color: colors.text.primary,
    fontWeight: fontWeight.medium,
    padding: spacing[0],
  },
  identityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  identityChipText: { fontSize: fontSize.micro, fontWeight: fontWeight.bold, color: colors.brand.default },

  // Section card
  card: {
    marginHorizontal: spacing[4],
    marginTop: spacing[3.5],
    backgroundColor: colors.surface.default,
    borderRadius: radii["4xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[4],
    shadowColor: colors.shadow.default,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
  },
  kickerRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  kickerIcon: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  kickerText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.extrabold,
    letterSpacing: 1.5,
    color: colors.brand.default,
  },
  helper: { marginTop: spacing[2.5], fontSize: fontSize.caption, color: colors.text.muted, fontWeight: fontWeight.medium },
  helperRight: {
    marginTop: spacing[1.5],
    alignSelf: "flex-end",
    fontSize: fontSize.micro,
    color: colors.text.muted,
    fontWeight: fontWeight.semibold,
  },

  // Primary photo
  heroPhotoWrap: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: radii["2xl"],
    overflow: "hidden",
    backgroundColor: colors.surface.brand,
    position: "relative",
  },
  heroPhoto: { width: "100%", height: "100%" },
  heroEditChip: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: alpha(colors.text.primary, 0.85),
  },
  heroEditText: { color: colors.text.onBrand, fontSize: fontSize.caption, fontWeight: fontWeight.bold },

  // Photo grid
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2.5] },
  photoTile: {
    width: "48%",
    aspectRatio: 4 / 5,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.surface.brand,
    position: "relative",
  },
  photoTileImage: { width: "100%", height: "100%" },
  photoTileDelete: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: alpha(colors.text.primary, 0.85),
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    width: "48%",
    aspectRatio: 4 / 5,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderStyle: "dashed",
    backgroundColor: colors.surface.brand,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1.5],
  },
  photoAddText: { fontSize: fontSize.caption, fontWeight: fontWeight.bold, color: colors.brand.default },

  // Bio
  bioInput: {
    minHeight: 92,
    fontSize: fontSize.body,
    color: colors.text.primary,
    lineHeight: 21,
    textAlignVertical: "top",
    padding: spacing[0],
  },

  // Field rows
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[2.5],
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surface.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
    color: colors.text.muted,
    textTransform: "uppercase",
  },
  fieldInput: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    padding: spacing[0],
  },
  fieldStatic: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.text.primary },
  divider: { height: 1, backgroundColor: colors.border.default, marginVertical: spacing[1] },

  // Picker sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: alpha(colors.text.primary, 0.45),
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface.default,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[8],
  },
  sheetGrabber: {
    width: 36,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.border.default,
    alignSelf: "center",
    marginBottom: spacing[2.5],
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[1],
    paddingBottom: spacing[1.5],
  },
  sheetTitle: { fontSize: fontSize.title, fontWeight: fontWeight.extrabold, color: colors.text.primary, letterSpacing: -0.2 },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.surface.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
  },
  sheetItemActive: { backgroundColor: colors.surface.brand },
  // Holds the list's height while API-38 is in flight, so the sheet does not
  // snap open at spinner height and then jump when the cities land.
  sheetLoading: { paddingVertical: spacing[10], alignItems: "center", justifyContent: "center" },
  sheetNotice: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[5],
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.muted,
    textAlign: "center",
  },
  sheetItemText: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.text.primary },
});
