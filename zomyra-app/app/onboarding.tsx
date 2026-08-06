/**
 * The Onboarding stack — Plot / Anchor / Love, then API-7 (FE TDD §3.2, §6.2).
 *
 * Three sections, each opening on a `TreasureMap` intro and then walking one
 * question per screen. What Module 5 changed is not the shape of that flow but
 * where every answer comes from and where it goes.
 *
 * ## Every choice list is API-39's now (FR-3b)
 *
 * The prototype hardcoded ~15 arrays of display labels inline. All of them are
 * gone: `useOnboardingOptions()` supplies `{ key, label }` pairs and the draft
 * stores **keys**. The `render` signature carries the catalogue rather than each
 * screen reaching for the hook, so a question cannot accidentally source options
 * from anywhere else.
 *
 * ## The city question became two screens (FR-3a)
 *
 * State is picked first, then city — because API-38 is `?state=<key>`-scoped and
 * there is no way to ask for a city without one. The state key itself is
 * **never submitted** (O-16): it exists to scope the fetch and to filter the
 * cached list. Splitting them is not a UX preference, it is what the endpoint's
 * shape requires.
 *
 * ## Loading is blocking, and deliberately so
 *
 * FR-3b calls for the *shared* default loading state while the catalogue is in
 * flight, and this screen holds the whole stack behind it rather than letting
 * individual questions render empty grids. Two reasons: an option grid with no
 * options is indistinguishable from a broken screen, and `stepIdx` is persisted
 * — a user who advanced past a silently-empty question would have that skip
 * restored on the next launch, having answered nothing.
 *
 * ## What submitting does, and does not, decide
 *
 * `handleSubmit` fires API-7 once at the end and then navigates to **`/`**, not
 * to `/verify`. The mutation invalidates `Me`, `resolveRootDestination` re-reads
 * it and returns the photos step itself. Hardcoding `/verify` here would be a
 * second copy of a §9.1 row that could disagree with the server — the identical
 * reasoning that keeps FR-1a out of the auth screens and consent's accept
 * handler pointed at `/`.
 *
 * NFR-16 is applied here too: §12.7 records `/onboarding` and `/verify` as the
 * two authenticated surfaces the tab shell's call cannot reach, because the gate
 * *replaces* the tabs to get here. This is Module 5's half; Module 6 owes
 * `/verify`.
 */
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import {
  errorHasCode,
  errorMessage,
  useGetCitiesQuery,
  useSubmitOnboardingMutation,
  type CatalogueOption,
  type OptionCategoryKey,
} from "@/src/api";
import { OnboardingShell } from "@/src/components/onboarding/OnboardingShell";
import {
  ChipGroup,
  OptionGrid,
  RangeDualSlider,
  SearchableSelect,
} from "@/src/components/onboarding/Primitives";
import { Slider } from "@/src/components/onboarding/Slider";
import { calcAge, DateWheel } from "@/src/components/onboarding/DateWheel";
import { TreasureMap, type TreasureStepInfo } from "@/src/components/onboarding/TreasureMap";
import { PersonalityQuiz } from "@/src/components/onboarding/PersonalityQuiz";
import { Input, LoadingScreen } from "@/src/components/ui";
import { useOnboardingDraft } from "@/src/hooks/use-onboarding-draft";
import { useOnboardingOptions } from "@/src/hooks/use-onboarding-options";
import { useScreenCaptureBlock } from "@/src/hooks/use-screen-capture-block";
import { cmToImperial, HEIGHT_MAX_CM, HEIGHT_MIN_CM } from "@/src/lib/onboarding/data";
import { buildSubmitBody, isSubmittable, OTHER_LANGUAGE_KEY } from "@/src/lib/onboarding/submit";
import type { OnboardingState } from "@/src/lib/onboarding/types";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { draftSubmitted, setStepIdx } from "@/src/store/slices/onboarding-slice";
import { colors, fontSize, fontWeight, radii, spacing } from "@/src/theme";

type Section = 1 | 2 | 3;
type Setter = <K extends keyof OnboardingState>(k: K, v: OnboardingState[K]) => void;

/**
 * What a question screen is handed.
 *
 * `options` rather than the raw catalogue index so a screen states which
 * category it wants and gets a list — there is no way to reach a category
 * without naming it, and no way to reach anything that is not a category.
 */
type RenderCtx = {
  options: (category: OptionCategoryKey) => CatalogueOption[];
  /** API-38's list for the currently chosen state, already in catalogue shape. */
  cities: CatalogueOption[];
  citiesLoading: boolean;
};

type RenderResult = {
  title: string;
  subtitle?: string;
  body: ReactNode;
  canNext: boolean;
  /** Hide the Continue button entirely (used in tandem with `autoAdvance`). */
  hideNext?: boolean;
};

type IntroScreen = { kind: "intro"; section: Section };
type ChatScreen = { kind: "chat"; section: 3 };
type QuestionScreen = {
  kind: "q";
  section: Section;
  /**
   * Stable identifier for this question, used as its testID
   * (`onboarding-step-<id>`) — Module 5.5b's testID convention.
   *
   * **Required, and deliberately not the array index.** M5-044 records that
   * `SCREENS` both shrank and grew during Module 5, so a positional id would
   * silently come to name a different question and an E2E flow would answer the
   * wrong one while still passing. For `choice()` screens this is the draft
   * field key verbatim, which is the same string the answer is stored under.
   */
  id: string;
  /**
   * When true, the question auto-advances ~250ms after the user picks an
   * option (no Continue tap needed). Use only for single-select questions.
   */
  autoAdvance?: boolean;
  render: (s: OnboardingState, set: Setter, ctx: RenderCtx) => RenderResult;
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

/**
 * A single-select question over one catalogue category — the shape most of Plot
 * and all of Anchor take.
 *
 * `field` is constrained to the draft's string-valued keys so the setter cannot
 * be pointed at `languages` or `partnerAgeRange`, where a bare key would be the
 * wrong type entirely.
 */
type ChoiceField = {
  [K in keyof OnboardingState]: OnboardingState[K] extends string ? K : never;
}[keyof OnboardingState];

function choice(
  section: Section,
  category: OptionCategoryKey,
  field: ChoiceField,
  copy: { title: string; subtitle?: string },
): QuestionScreen {
  return {
    kind: "q",
    section,
    id: field,
    autoAdvance: true,
    render: (s, set, ctx) => ({
      ...copy,
      canNext: !!s[field],
      hideNext: !!s[field],
      body: (
        <OptionGrid
          options={ctx.options(category)}
          value={s[field]}
          onChange={(key) => set(field, key)}
          compact
        />
      ),
    }),
  };
}

const Q1: QuestionScreen[] = [
  {
    kind: "q", section: 1,
    id: "name",
    render: (s, set) => ({
      title: "What's your name?",
      subtitle: "How you'd like to appear to your matches.",
      canNext: !!s.firstName.trim() && !!s.lastName.trim(),
      body: (
        <View style={{ gap: spacing[3] }}>
          <NameField
            testID="onboarding-first-name"
            label="First name"
            value={s.firstName}
            onChange={(v) => set("firstName", v)}
          />
          <NameField
            testID="onboarding-last-name"
            label="Last name"
            value={s.lastName}
            onChange={(v) => set("lastName", v)}
          />
        </View>
      ),
    }),
  },
  {
    kind: "q", section: 1,
    id: "dob",
    render: (s, set) => {
      const age = calcAge(s.dob);
      return {
        title: "When were you born?",
        subtitle: "Spin the wheels to set your date of birth.",
        canNext: !!s.dob && (age ?? 0) >= 18,
        body: (
          <View style={{ alignItems: "center", gap: spacing[4] }}>
            <DateWheel value={s.dob} onChange={(v) => set("dob", v)} />
            <Text style={{ fontSize: fontSize.label, color: colors.text.muted }}>
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
  choice(1, "gender", "gender", { title: "I am" }),

  /*
   * FR-3a's two halves. State first because API-38 cannot be called without it;
   * changing state **clears `cityId`**, since a city id from Maharashtra is not
   * a valid answer once the user says they live in Karnataka. Leaving it would
   * submit a city in a state the user does not live in — a wrong profile that
   * validates cleanly, which is the worst kind.
   */
  {
    kind: "q", section: 1, autoAdvance: true,
    id: "state",
    render: (s, set, ctx) => ({
      title: "Which state do you live in?",
      subtitle: "We'll narrow the city list down next.",
      canNext: !!s.state,
      hideNext: !!s.state,
      body: (
        <SearchableSelect
          options={ctx.options("state")}
          value={s.state}
          onChange={(key) => {
            if (key !== s.state) set("cityId", "");
            set("state", key);
          }}
          placeholder="Search your state"
        />
      ),
    }),
  },
  {
    kind: "q", section: 1,
    id: "city",
    render: (s, set, ctx) => ({
      title: "Which city do you live in?",
      // O-15's client-visible half: the curated list may genuinely not contain
      // the user's town. Saying the list is limited is more honest than an
      // empty picker, and there is no free-text fallback by design — `cityId`
      // is a closed set (FE v1.42, O-15).
      subtitle: ctx.citiesLoading
        ? "Loading cities…"
        : ctx.cities.length === 0
          ? "We don't have cities listed for that state yet. Go back and pick another."
          : "Pick the closest city to you.",
      canNext: !!s.cityId,
      body: (
        <SearchableSelect
          options={ctx.cities}
          value={s.cityId}
          onChange={(id) => set("cityId", id)}
          placeholder="Search your city"
        />
      ),
    }),
  },

  {
    kind: "q", section: 1,
    id: "height",
    render: (s, set) => {
      const cm = s.heightCm ?? 168;
      return {
        title: "How tall are you?",
        canNext: !!s.heightCm,
        body: (
          <View>
            <View style={{ alignItems: "center", marginBottom: spacing[5] }}>
              <Text style={styles.bigValue}>{cmToImperial(cm)}</Text>
              <Text style={styles.smallValue}>{cm} cm</Text>
            </View>
            <Slider
              testID="onboarding-height-slider"
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
  choice(1, "build", "build", { title: "How would you describe your build?" }),
  choice(1, "education", "education", { title: "Your highest education?" }),
  {
    kind: "q", section: 1,
    id: "profession",
    render: (s, set, ctx) => ({
      title: "What do you do?",
      canNext: !!s.profession,
      body: (
        <SearchableSelect
          options={ctx.options("profession")}
          value={s.profession}
          onChange={(key) => set("profession", key)}
          placeholder="Search profession"
        />
      ),
    }),
  },
  choice(1, "incomeRange", "incomeRange", { title: "Income range?" }),
  choice(1, "diet", "diet", { title: "Your diet?" }),
  choice(1, "drinking", "drinking", { title: "Do you drink?" }),
  choice(1, "smoking", "smoking", { title: "Do you smoke?" }),
  choice(1, "fitness", "fitness", {
    title: "How often do you exercise or stay physically active?",
  }),

  /*
   * FR-3b's one free-text escape hatch. The extra input appears only while
   * `other` is selected, and deselecting it **clears the text** — API-7 rejects
   * `languagesOther` arriving without the `other` key just as firmly as the
   * reverse, so a leftover string is a 400 rather than dead weight.
   */
  {
    kind: "q", section: 1,
    id: "languages",
    render: (s, set, ctx) => {
      const usesOther = s.languages.includes(OTHER_LANGUAGE_KEY);
      return {
        title: "Languages you speak?",
        subtitle: "Pick all that apply.",
        canNext: s.languages.length > 0 && (!usesOther || !!s.languagesOther.trim()),
        body: (
          <View style={{ gap: spacing[4] }}>
            <ChipGroup
              options={ctx.options("languages")}
              value={s.languages}
              onChange={(next) => {
                if (!next.includes(OTHER_LANGUAGE_KEY)) set("languagesOther", "");
                set("languages", next);
              }}
            />
            {usesOther ? (
              <Input
                testID="onboarding-languages-other"
                value={s.languagesOther}
                onChangeText={(t) => set("languagesOther", t)}
                placeholder="Which other language(s)?"
                maxLength={120}
              />
            ) : null}
          </View>
        ),
      };
    },
  },
  choice(1, "religion", "religion", {
    title: "What's your religion?",
    subtitle: "This helps us find matches who share your values.",
  }),
  choice(1, "familyType", "familyType", {
    title: "Your world",
    subtitle: "How does your family live?",
  }),
  {
    kind: "q", section: 1,
    id: "bio",
    render: (s, set) => ({
      title: "About you",
      subtitle: "Write a short intro your matches will see on your profile.",
      canNext: true,
      body: (
        <View>
          <Input
            testID="onboarding-bio"
            value={s.bio}
            onChangeText={(t) => set("bio", t)}
            placeholder="I love long walks, weekend hikes, and honest conversations over coffee…"
            multiline
            rows={6}
            maxLength={500}
            showCount
          />
        </View>
      ),
    }),
  },
];

const Q2: QuestionScreen[] = [
  {
    kind: "q", section: 2,
    id: "partnerAgeRange",
    render: (s, set) => ({
      title: "Preferred age range in partner?",
      canNext: true,
      body: (
        <RangeDualSlider
          min={18}
          max={70}
          value={s.partnerAgeRange}
          onChange={(v) => set("partnerAgeRange", v)}
          format={(n) => String(n)}
        />
      ),
    }),
  },
  choice(2, "matchLocationPreference", "matchLocationPreference", {
    title: "Where should your match be?",
  }),
  choice(2, "childrenPreference", "childrenPreference", {
    title: "Do you want children in the future?",
  }),
  choice(2, "interfaithStance", "interfaithStance", {
    title: "Would you consider an interfaith marriage?",
  }),
  choice(2, "smokingPartnerComfort", "smokingPartnerComfort", {
    title: "Comfortable marrying a smoker?",
  }),
  choice(2, "householdPreference", "householdPreference", { title: "Your future household?" }),
  choice(2, "relocationWillingness", "relocationWillingness", {
    title: "Would you relocate after marriage?",
  }),
];

// Section 3 uses conversational chat UI instead of individual question screens
const SCREENS: Screen[] = [
  { kind: "intro", section: 1 }, ...Q1,
  { kind: "intro", section: 2 }, ...Q2,
  { kind: "intro", section: 3 }, { kind: "chat", section: 3 },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { draft: state, set } = useOnboardingDraft();
  const stepIdx = useAppSelector((s) => s.onboarding.stepIdx);
  const completed = useAppSelector((s) => s.onboarding.completed);

  // NFR-16 — the surface §12.7 records as uncovered. See the file note.
  useScreenCaptureBlock();

  const { options, isLoading, isError, refetch, missingCategories } = useOnboardingOptions();
  const [submitOnboarding, { isLoading: isSubmitting }] = useSubmitOnboardingMutation();

  /*
   * API-38 is fetched only once a state has been chosen — `skip` is what makes
   * "the first time a given state is selected" true rather than aspirational.
   * Re-selecting a state already fetched is answered from the cache entry keyed
   * on that state string; no request goes out (see `getCities`).
   */
  const { data: citiesData, isFetching: citiesLoading } = useGetCitiesQuery(state.state, {
    skip: !state.state,
  });
  const cities = useMemo<CatalogueOption[]>(
    () => (citiesData?.cities ?? []).map((c) => ({ key: c.id, label: c.name })),
    [citiesData],
  );

  // If the user previously finished onboarding and we land back here,
  // start fresh from step 0. No hydration guard is needed any more: the
  // persisted slices rehydrate behind `PersistGate` before this screen mounts
  // (see app/_layout.tsx).
  useEffect(() => {
    if (completed) {
      dispatch(setStepIdx(0));
    }
  }, [completed, dispatch]);

  // Guard against an out-of-bounds index if SCREENS shrinks across versions. It
  // is not hypothetical: Module 5 briefly removed the `fitness` question before
  // the owner restored it, so a `stepIdx` persisted by one of those builds can
  // point past the end of a later, shorter list.
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

  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * API-7 — one call, at the end (FE §9.2).
   *
   * The three outcomes are genuinely different actions, not three error
   * messages:
   *
   * - **Success** → clear the draft (NFR-12) and hand routing back to §9.1.
   * - **`409 already_submitted`** → *also* clear the draft and route on. This is
   *   a stale local draft resubmitted after onboarding finished elsewhere; the
   *   server's state is the correct one and showing an error would strand the
   *   user on a flow they have already completed. Treating it as a failure is
   *   the obvious wrong move here.
   * - **Anything else** → keep the draft and stay put. FE §9.2's own note is
   *   that a failed submit loses nothing, because the payload is rebuilt from
   *   the persisted slice on retry.
   */
  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    try {
      await submitOnboarding(buildSubmitBody(state)).unwrap();
      dispatch(draftSubmitted());
      router.replace("/");
    } catch (err) {
      if (errorHasCode(err, "already_submitted")) {
        dispatch(draftSubmitted());
        router.replace("/");
        return;
      }
      // Inline rather than a toast: the user is mid-form and the message needs to
      // persist next to the Finish button they are about to press again.
      setSubmitError(errorMessage(err));
    }
  }, [dispatch, router, state, submitOnboarding]);

  const handleBack = () => {
    if (idx === 0) {
      router.replace("/login");
      return;
    }
    dispatch(setStepIdx(Math.max(0, idx - 1)));
  };

  const handleNext = useCallback(() => {
    if (idx >= SCREENS.length - 1) {
      void handleSubmit();
      return;
    }
    dispatch(setStepIdx(idx + 1));
  }, [dispatch, handleSubmit, idx]);

  // Auto-advance helper for single-select questions: after the user taps
  // an option, give them ~250ms to see the selected state animate, then
  // advance to the next screen.
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
  const autoSet: Setter = (k, v) => {
    set(k, v);
    if (screen.kind === "q" && screen.autoAdvance) {
      scheduleAdvance();
    }
  };

  /*
   * FR-3b's shared loading state, holding the whole stack rather than each
   * question. See the file note for why this blocks rather than degrades.
   */
  if (isLoading) {
    return <LoadingScreen label="Getting things ready…" />;
  }

  if (isError || missingCategories.length > 0) {
    return (
      <OnboardingShell
        step={0}
        total={1}
        title="We couldn't load your options"
        subtitle={
          isError
            ? "Check your connection and try again — nothing you've filled in is lost."
            : // A 200 that is short a category is a backend problem, not a network
              // one, and telling the two apart matters to whoever gets the report.
              `Some questions are unavailable right now (${missingCategories.join(", ")}).`
        }
        onBack={handleBack}
        onNext={() => void refetch()}
        canNext
        nextLabel="Try again"
        hideStepLabel
      >
        <View />
      </OnboardingShell>
    );
  }

  if (screen.kind === "intro") {
    return (
      <TreasureMap info={INTROS[screen.section]} onContinue={handleNext} onBack={handleBack} />
    );
  }

  if (screen.kind === "chat") {
    return (
      <PersonalityQuiz
        state={state}
        onUpdateScale={(id, value) => set("scales", { ...state.scales, [id]: value })}
        onComplete={handleNext}
        onBack={handleBack}
      />
    );
  }

  const ctx: RenderCtx = { options, cities, citiesLoading };
  const r = screen.render(state, screen.autoAdvance ? autoSet : set, ctx);
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
      // The last screen additionally needs the whole draft to be valid — a
      // per-screen `canNext` cannot see a question answered and then invalidated
      // by a later edit (changing state clears `cityId`, for one).
      canNext={r.canNext && (!isLast || isSubmittable(state))}
      hideNext={hideNext}
      loading={isSubmitting}
      nextLabel={isLast ? "Finish" : "Continue"}
      hideStepLabel
      transitionKey={idx}
      stepId={screen.id}
    >
      {r.body}
      {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
    </OnboardingShell>
  );
}

function NameField({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID?: string;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        maxLength={40}
        style={styles.fieldInput}
        placeholderTextColor={colors.text.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.4,
    color: colors.text.muted,
    marginBottom: spacing[1.5],
  },
  fieldInput: {
    height: 48,
    paddingHorizontal: spacing[4],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
    fontSize: fontSize.bodyLarge,
    color: colors.text.primary,
  },
  bigValue: { fontSize: fontSize.displayXl, fontWeight: fontWeight.bold, color: colors.text.primary, letterSpacing: -0.6 },
  smallValue: { marginTop: spacing[1], fontSize: fontSize.caption, color: colors.text.muted },
  rangeLabels: { marginTop: spacing[2], flexDirection: "row", justifyContent: "space-between" },
  rangeLabel: { fontSize: fontSize.micro, color: colors.text.muted },
  submitError: {
    marginTop: spacing[4],
    fontSize: fontSize.label,
    color: colors.danger.default,
    textAlign: "center",
  },
});
