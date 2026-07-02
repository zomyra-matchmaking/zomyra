/**
 * Onboarding flow — 3 sections (treasure map intros + question screens).
 * Each section uses OnboardingShell; intros use TreasureMap. Mirrors the
 * exact catalogue from the web app's onboarding.tsx.
 */
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { OnboardingShell } from "@/src/components/onboarding/OnboardingShell";
import {
  ChipGroup,
  OptionGrid,
  RangeDualSlider,
  SearchableSelect,
} from "@/src/components/onboarding/Primitives";
import { ScaleSlider } from "@/src/components/onboarding/ScaleSlider";
import { Slider } from "@/src/components/onboarding/Slider";
import { calcAge, DateWheel } from "@/src/components/onboarding/DateWheel";
import { TreasureMap, type TreasureStepInfo } from "@/src/components/onboarding/TreasureMap";
import { PersonalityChat } from "@/src/components/onboarding/PersonalityChat";
import {
  cmToImperial,
  HEIGHT_MAX_CM,
  HEIGHT_MIN_CM,
  INDIAN_CITIES,
  LANGUAGES,
  PROFESSIONS,
} from "@/src/lib/onboarding/data";
import { useOnboardingStore } from "@/src/stores/onboarding-store";
import { colors } from "@/src/theme/colors";
import type { OnboardingState } from "@/src/lib/onboarding/types";

type Section = 1 | 2 | 3;
type IntroScreen = { kind: "intro"; section: Section };
type ChatScreen = { kind: "chat"; section: 3 };
type Setter = <K extends keyof OnboardingState>(k: K, v: OnboardingState[K]) => void;
type RenderResult = {
  title: string;
  subtitle?: string;
  body: ReactNode;
  canNext: boolean;
  /** Hide the Continue button entirely (used in tandem with `autoAdvance`). */
  hideNext?: boolean;
};
type QuestionScreen = {
  kind: "q";
  section: Section;
  /**
   * When true, the question auto-advances ~250ms after the user picks an
   * option (no Continue tap needed). Use only for single-select questions.
   */
  autoAdvance?: boolean;
  render: (s: OnboardingState, set: Setter) => RenderResult;
};
type Screen = IntroScreen | QuestionScreen | ChatScreen;

const INTROS: Record<Section, TreasureStepInfo> = {
  1: {
    step: 1,
    title: "Plotting the Coordinates",
    body:
      "Let's start with you. A few personal details — name, age, where you live, who you're looking for. We use these to find people you'll genuinely click with.",
    cta: "Let's Begin",
  },
  2: {
    step: 2,
    title: "Setting Your Anchors",
    body:
      "Your non-negotiables. The things that matter most in a future home. Be honest — this saves both you and your matches time.",
    cta: "Continue Journey",
  },
  3: {
    step: 3,
    title: "Unlocking How You Love",
    body:
      "A few questions about how you love. Quick, intuitive questions that help our compatibility engine truly understand you.",
    cta: "Enter Final Stretch",
  },
};

const Q1: QuestionScreen[] = [
  {
    kind: "q", section: 1,
    render: (s, set) => ({
      title: "What's your name?",
      subtitle: "How you'd like to appear to your matches.",
      canNext: !!s.firstName.trim() && !!s.lastName.trim(),
      body: (
        <View style={{ gap: 12 }}>
          <NameField label="First name" value={s.firstName} onChange={(v) => set("firstName", v)} />
          <NameField label="Last name" value={s.lastName} onChange={(v) => set("lastName", v)} />
        </View>
      ),
    }),
  },
  {
    kind: "q", section: 1,
    render: (s, set) => {
      const age = calcAge(s.dob);
      return {
        title: "When were you born?",
        subtitle: "Spin the wheels to set your date of birth.",
        canNext: !!s.dob && (age ?? 0) >= 18,
        body: (
          <View style={{ alignItems: "center", gap: 16 }}>
            <DateWheel value={s.dob} onChange={(v) => set("dob", v)} />
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
              {age == null
                ? "Set your date of birth"
                : age < 18
                  ? "You must be at least 18"
                  : `Your current age is ${age}`}
            </Text>
          </View>
        ),
      };
    },
  },
  {
    kind: "q", section: 1, autoAdvance: true,
    render: (s, set) => ({
      title: "I am",
      canNext: !!s.gender,
      hideNext: !!s.gender,
      body: (
        <OptionGrid
          options={["Female", "Male", "Non-binary", "Prefer not to say"] as const}
          value={s.gender}
          onChange={(g) => {
            set("gender", g);
            // Auto-default partner gender to the conventional opposite.
            // The user can still change it later in their preferences.
            if (g === "Female") set("prefGender", "Male");
            else if (g === "Male") set("prefGender", "Female");
            else if (!s.prefGender) set("prefGender", g);
          }}
        />
      ),
    }),
  },
  {
    kind: "q", section: 1,
    render: (s, set) => ({
      title: "Which city do you live in?",
      canNext: !!s.city,
      body: (
        <SearchableSelect
          options={INDIAN_CITIES}
          value={s.city}
          onChange={(v) => set("city", v)}
          placeholder="Search your city"
          label="Choose city"
        />
      ),
    }),
  },
  {
    kind: "q", section: 1,
    render: (s, set) => {
      const cm = s.heightCm ?? 168;
      return {
        title: "How tall are you?",
        canNext: !!s.heightCm,
        body: (
          <View>
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <Text style={styles.bigValue}>{cmToImperial(cm)}</Text>
              <Text style={styles.smallValue}>{cm} cm</Text>
            </View>
            <Slider
              min={HEIGHT_MIN_CM}
              max={HEIGHT_MAX_CM}
              value={cm}
              onChange={(v) => set("heightCm", v)}
            />
            <View style={styles.rangeLabels}>
              <Text style={styles.rangeLabel}>{cmToImperial(HEIGHT_MIN_CM)}</Text>
              <Text style={styles.rangeLabel}>{cmToImperial(HEIGHT_MAX_CM)}</Text>
            </View>
          </View>
        ),
      };
    },
  },
  {
    kind: "q", section: 1, autoAdvance: true,
    render: (s, set) => ({
      title: "How would you describe your build?",
      canNext: !!s.bodyType,
      hideNext: !!s.bodyType,
      body: (
        <OptionGrid
          options={["Slim", "Average", "Athletic", "Curvy", "Plus Size", "Prefer Not To Say"] as const}
          value={s.bodyType}
          onChange={(v) => set("bodyType", v)}
          compact
        />
      ),
    }),
  },
  {
    kind: "q", section: 1, autoAdvance: true,
    render: (s, set) => ({
      title: "Your highest education?",
      canNext: !!s.education,
      hideNext: !!s.education,
      body: (
        <OptionGrid
          options={["High School", "Diploma", "Bachelor's Degree", "Master's Degree", "MBA", "PhD", "Other"] as const}
          value={s.education}
          onChange={(v) => set("education", v)}
          compact
        />
      ),
    }),
  },
  {
    kind: "q", section: 1,
    render: (s, set) => ({
      title: "What do you do?",
      canNext: !!s.profession,
      body: (
        <SearchableSelect
          options={PROFESSIONS}
          value={s.profession}
          onChange={(v) => set("profession", v)}
          placeholder="Search profession"
          label="Choose profession"
        />
      ),
    }),
  },
  {
    kind: "q", section: 1, autoAdvance: true,
    render: (s, set) => ({
      title: "Income range?",
      canNext: !!s.income,
      hideNext: !!s.income,
      body: (
        <OptionGrid
          options={["Under ₹5 LPA", "₹5–10 LPA", "₹10–20 LPA", "₹20–35 LPA", "₹35–50 LPA", "₹50 LPA+", "Prefer Not To Say"] as const}
          value={s.income}
          onChange={(v) => set("income", v)}
          compact
        />
      ),
    }),
  },
  {
    kind: "q", section: 1, autoAdvance: true,
    render: (s, set) => ({
      title: "Your diet?",
      canNext: !!s.diet,
      hideNext: !!s.diet,
      body: (
        <OptionGrid
          options={["Vegetarian", "Eggetarian", "Non-Vegetarian", "Vegan"] as const}
          value={s.diet}
          onChange={(v) => set("diet", v)}
          compact
        />
      ),
    }),
  },
  {
    kind: "q", section: 1, autoAdvance: true,
    render: (s, set) => ({
      title: "Do you drink?",
      canNext: !!s.drinking,
      hideNext: !!s.drinking,
      body: (
        <OptionGrid
          options={["Never", "Socially", "Occasionally", "Frequently"] as const}
          value={s.drinking}
          onChange={(v) => set("drinking", v)}
          compact
        />
      ),
    }),
  },
  {
    kind: "q", section: 1, autoAdvance: true,
    render: (s, set) => ({
      title: "Do you smoke?",
      canNext: !!s.smoking,
      hideNext: !!s.smoking,
      body: (
        <OptionGrid
          options={["Never", "Occasionally", "Frequently"] as const}
          value={s.smoking}
          onChange={(v) => set("smoking", v)}
          compact
        />
      ),
    }),
  },
  {
    kind: "q", section: 1, autoAdvance: true,
    render: (s, set) => ({
      title: "How active are you?",
      canNext: !!s.fitness,
      hideNext: !!s.fitness,
      body: (
        <OptionGrid
          options={["Not Important", "Moderately Active", "Active", "Fitness Enthusiast"] as const}
          value={s.fitness}
          onChange={(v) => set("fitness", v)}
          compact
        />
      ),
    }),
  },
  {
    kind: "q", section: 1,
    render: (s, set) => ({
      title: "Languages you speak?",
      subtitle: "Pick all that apply.",
      canNext: s.languages.length > 0,
      body: <ChipGroup options={LANGUAGES} value={s.languages} onChange={(v) => set("languages", v)} />,
    }),
  },
  {
    kind: "q", section: 1, autoAdvance: true,
    render: (s, set) => ({
      title: "What's your religion?",
      subtitle: "This helps us find matches who share your values.",
      canNext: !!s.religion,
      hideNext: !!s.religion,
      body: (
        <OptionGrid
          options={[
            "Hindu",
            "Muslim",
            "Christian",
            "Sikh",
            "Jain",
            "Buddhist",
            "Spiritual but not Religious",
            "Agnostic",
            "Atheist",
            "Prefer Not To Say",
          ] as const}
          value={s.religion}
          onChange={(v) => set("religion", v)}
          compact
        />
      ),
    }),
  },
  {
    kind: "q", section: 1, autoAdvance: true,
    render: (s, set) => ({
      title: "Your world",
      subtitle: "How does your family live?",
      canNext: !!s.familyStructure,
      hideNext: !!s.familyStructure,
      body: (
        <OptionGrid
          options={["Nuclear Family", "Joint Family", "Flexible"] as const}
          value={s.familyStructure}
          onChange={(v) => set("familyStructure", v)}
          compact
        />
      ),
    }),
  },
];

const Q2: QuestionScreen[] = [
  {
    kind: "q", section: 2,
    render: (s, set) => ({
      title: "Preferred age range?",
      canNext: true,
      body: (
        <RangeDualSlider
          min={18}
          max={70}
          value={s.prefAge}
          onChange={(v) => set("prefAge", v)}
          format={(n) => String(n)}
        />
      ),
    }),
  },
  {
    kind: "q", section: 2, autoAdvance: true,
    render: (s, set) => ({
      title: "Where should your match be?",
      canNext: !!s.prefLocation,
      hideNext: !!s.prefLocation,
      body: (
        <OptionGrid
          options={["Same City", "Same State", "Anywhere in India", "Open to International Matches"] as const}
          value={s.prefLocation}
          onChange={(v) => set("prefLocation", v)}
        />
      ),
    }),
  },
  { kind: "q", section: 2, autoAdvance: true, render: (s, set) => ({ title: "Do you want children in the future?", canNext: !!s.nnChildren, hideNext: !!s.nnChildren, body: <OptionGrid options={["Yes", "No", "Undecided"] as const} value={s.nnChildren} onChange={(v) => set("nnChildren", v)} /> }) },
  { kind: "q", section: 2, autoAdvance: true, render: (s, set) => ({ title: "Would you consider an interfaith marriage?", canNext: !!s.nnInterfaith, hideNext: !!s.nnInterfaith, body: <OptionGrid options={["Yes", "No", "Depends on the Person"] as const} value={s.nnInterfaith} onChange={(v) => set("nnInterfaith", v)} /> }) },
  { kind: "q", section: 2, autoAdvance: true, render: (s, set) => ({ title: "Comfortable marrying a smoker?", canNext: !!s.nnSmoker, hideNext: !!s.nnSmoker, body: <OptionGrid options={["Yes", "No", "Occasional Smoking Only"] as const} value={s.nnSmoker} onChange={(v) => set("nnSmoker", v)} /> }) },
  { kind: "q", section: 2, autoAdvance: true, render: (s, set) => ({ title: "Your future household?", canNext: !!s.nnHousehold, hideNext: !!s.nnHousehold, body: <OptionGrid options={["Vegetarian Household Only", "Flexible Household", "No Preference"] as const} value={s.nnHousehold} onChange={(v) => set("nnHousehold", v)} /> }) },
  { kind: "q", section: 2, autoAdvance: true, render: (s, set) => ({ title: "Would you relocate after marriage?", canNext: !!s.nnRelocation, hideNext: !!s.nnRelocation, body: <OptionGrid options={["Yes", "No", "Depends on Circumstances"] as const} value={s.nnRelocation} onChange={(v) => set("nnRelocation", v)} /> }) },
];

// Section 3 uses conversational chat UI instead of individual question screens
const SCREENS: Screen[] = [
  { kind: "intro", section: 1 }, ...Q1,
  { kind: "intro", section: 2 }, ...Q2,
  { kind: "intro", section: 3 }, { kind: "chat", section: 3 },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const state = useOnboardingStore((s) => s.state);
  const set = useOnboardingStore((s) => s.set);
  const stepIdx = useOnboardingStore((s) => s.stepIdx);
  const setStepIdx = useOnboardingStore((s) => s.setStepIdx);
  const completed = useOnboardingStore((s) => s.completed);
  const hasHydrated = useOnboardingStore((s) => s._hasHydrated);
  const markCompleted = useOnboardingStore((s) => s.markCompleted);

  // If the user previously finished onboarding and we land back here,
  // start fresh from step 0 (clear the completed flag).
  useEffect(() => {
    if (hasHydrated && completed) {
      setStepIdx(0);
    }
  }, [hasHydrated, completed, setStepIdx]);

  // Guard against an out-of-bounds index if SCREENS shrinks across versions.
  const idx = Math.min(Math.max(stepIdx, 0), SCREENS.length - 1);
  const screen = SCREENS[idx];

  const { sectionStepIdx, sectionTotal } = useMemo(() => {
    if (screen.kind === "intro") return { sectionStepIdx: -1, sectionTotal: 1 };
    const sec = screen.section;
    const allInSec = SCREENS.filter((s): s is QuestionScreen => s.kind === "q" && s.section === sec);
    const prior = SCREENS.slice(0, idx).filter(
      (s): s is QuestionScreen => s.kind === "q" && s.section === sec,
    ).length;
    return { sectionStepIdx: prior, sectionTotal: allInSec.length };
  }, [idx, screen]);

  const handleBack = () => {
    if (idx === 0) {
      router.replace("/login");
      return;
    }
    setStepIdx(Math.max(0, idx - 1));
  };

  const handleNext = () => {
    if (idx >= SCREENS.length - 1) {
      markCompleted();
      router.replace("/verify");
      return;
    }
    setStepIdx(idx + 1);
  };

  // Auto-advance helper for single-select questions: after the user taps
  // an option, give them ~250ms to see the selected state animate, then
  // advance to the next screen. We guard against the screen changing
  // mid-timeout by comparing the captured `idx` to the latest store value.
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);
  const scheduleAdvance = () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      handleNext();
    }, 250);
  };

  // Wrap `set` so single-select questions can fire auto-advance after the
  // option is committed. Multi-select / text-input screens keep using
  // the plain `set` (`autoAdvance` is false on those).
  const autoSet: typeof set = (k, v) => {
    set(k, v);
    if (screen.kind === "q" && screen.autoAdvance) {
      scheduleAdvance();
    }
  };

  // Wait for the persisted state to rehydrate before rendering so the
  // user always resumes on the correct step.
  if (!hasHydrated) {
    return <View style={{ flex: 1, backgroundColor: "#fff" }} />;
  }

  if (screen.kind === "intro") {
    return (
      <TreasureMap info={INTROS[screen.section]} onContinue={handleNext} onBack={handleBack} />
    );
  }

  if (screen.kind === "chat") {
    return (
      <PersonalityChat
        state={state}
        onUpdateScale={(id, value) => set("scales", { ...state.scales, [id]: value })}
        onComplete={handleNext}
        onBack={handleBack}
      />
    );
  }

  const r = screen.render(state, screen.autoAdvance ? autoSet : set);
  const isLast = idx === SCREENS.length - 1;
  // Auto-advance screens never need a Continue button — selecting an option
  // already advances the flow ~250ms later. Hide the button outright instead
  // of leaving it visible-but-disabled.
  const hideNext = screen.autoAdvance ? true : r.hideNext;
  return (
    <OnboardingShell
      step={sectionStepIdx}
      total={sectionTotal}
      title={r.title}
      subtitle={r.subtitle}
      onBack={handleBack}
      onNext={handleNext}
      canNext={r.canNext}
      hideNext={hideNext}
      nextLabel={isLast ? "Finish" : "Continue"}
      hideStepLabel
      transitionKey={idx}
    >
      {r.body}
    </OnboardingShell>
  );
}

function NameField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        maxLength={40}
        style={styles.fieldInput}
        placeholderTextColor={colors.mutedForeground}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.4,
    color: colors.mutedForeground,
    marginBottom: 6,
  },
  fieldInput: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    fontSize: 15,
    color: colors.foreground,
  },
  bigValue: { fontSize: 36, fontWeight: "700", color: colors.foreground, letterSpacing: -0.6 },
  smallValue: { marginTop: 4, fontSize: 12, color: colors.mutedForeground },
  rangeLabels: { marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  rangeLabel: { fontSize: 11, color: colors.mutedForeground },
  bioInput: {
    minHeight: 140,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    fontSize: 15,
    lineHeight: 22,
    color: colors.foreground,
    textAlignVertical: "top",
  },
  bioCount: {
    marginTop: 6,
    alignSelf: "flex-end",
    fontSize: 11,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
});
