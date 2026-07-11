export type CompatibilityTier = "Excellent Match" | "Great Match" | "Potential Match";

export type CompatibilityDimension = "all" | "lifestyle" | "personality" | "priorities";

export type DimensionScore = {
  score: number; // 0–100, used for ranking the feed
  tier: CompatibilityTier;
  reason: string; // explanation specific to this compatibility dimension
};

export type CompatibilitySignal = {
  kind: "match" | "warn";
  label: string;
};

export type DiscoverProfile = {
  id: string;
  name: string;
  age: number;
  location: string;
  height?: string;
  income?: string;
  build?: string;
  religion?: string;
  /** Whether this user is a Zomyra Premium subscriber. Surfaces a small crown badge next to the name. */
  premium?: boolean;
  compatibility: CompatibilityTier;
  matchReason: string;
  scores: Record<CompatibilityDimension, DimensionScore>;
  hero: string;
  gallery: string[];
  summary: string;
  lifestyle: string[];
  snapshot: CompatibilitySignal[];
  values: string[];
  facts: { label: string; value: string }[];
};

export const MOCK_PROFILES: DiscoverProfile[] = [
  {
    id: "riya-28",
    name: "Riya",
    age: 28,
    location: "Bangalore",
    height: "5'5\"",
    income: "₹20-30 LPA",
    build: "Athletic",
    religion: "Hindu",
    premium: true,
    compatibility: "Excellent Match",
    matchReason:
      "You both value personal growth while keeping family close. Your views on finances, parenting, and long-term goals are highly aligned — and while your social lifestyles differ slightly, your communication styles look beautifully complementary.",
    scores: {
      all: {
        score: 92,
        tier: "Excellent Match",
        reason:
          "Across the board — values, daily rhythms, and long-term goals — you're remarkably in sync. Strong family alignment with room for individual ambition.",
      },
      lifestyle: {
        score: 78,
        tier: "Great Match",
        reason:
          "Riya is vegetarian, a non-smoker, and a social drinker who treats mornings in Cubbon Park as sacred. Your weekend rhythms — outdoor walks, a slow brunch, friends in small doses — fit easily.",
      },
      personality: {
        score: 88,
        tier: "Great Match",
        reason:
          "Riya describes herself as a warm, expressive communicator who talks things through rather than letting them fester. You both lean into emotional support over quick fixes — a calm, complementary pairing.",
      },
      priorities: {
        score: 95,
        tier: "Excellent Match",
        reason:
          "Highly aligned on what matters most: both of you want children, share similar household expectations, and are open to relocation. Long-term life goals feel naturally in sync.",
      },
    },
    hero: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1200&q=80&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1000&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=1000&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1502323777036-f29e3972d82f?w=1000&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1000&q=80&auto=format&fit=crop",
    ],
    summary:
      "Product designer by day, amateur baker by weekend. I love long walks through Cubbon Park, sketching strangers at coffee shops, and an honest movie debate. Close to my family but fiercely independent — looking for someone who's kind, curious, and as into building a life as they are into building a career.",
    lifestyle: ["Vegetarian", "Non-Smoker", "Social Drinker", "Active Lifestyle", "Career Focused", "Family Oriented"],
    snapshot: [
      { kind: "match", label: "Both want children" },
      { kind: "match", label: "Similar household expectations" },
      { kind: "match", label: "Open to relocation" },
      { kind: "warn", label: "Different views on interfaith marriage" },
    ],
    values: ["Equal Partnership", "Open Communication", "Personal Growth", "Family First", "Shared Responsibilities"],
    facts: [
      { label: "Education", value: "M.Des" },
      { label: "Profession", value: "Senior Product Designer" },
      { label: "Languages", value: "English, Hindi, Kannada" },
      { label: "Family", value: "Nuclear · 1 sibling" },
      { label: "Intent", value: "Long-term, marriage" },
    ],
  },
  {
    id: "arjun-30",
    name: "Arjun",
    age: 30,
    location: "Mumbai",
    height: "5'11\"",
    income: "₹40-50 LPA",
    build: "Athletic",
    religion: "Hindu",
    premium: true,
    compatibility: "Great Match",
    matchReason:
      "You share a deep alignment on ambition, financial responsibility, and how you want to raise a family. You both describe yourselves as introverted but socially warm — a rare and complementary pairing.",
    scores: {
      all: {
        score: 85,
        tier: "Great Match",
        reason:
          "Strong alignment on ambition, financial discipline, and family planning. A few lifestyle and relocation nuances to talk through — but the core fits really well.",
      },
      lifestyle: {
        score: 72,
        tier: "Great Match",
        reason:
          "Arjun is a non-smoker, occasional drinker, and a runner who treats early bedtimes as non-negotiable. You'd share long weekend runs, cricket nights with close friends, and a love of unhurried mornings.",
      },
      personality: {
        score: 90,
        tier: "Excellent Match",
        reason:
          "You're both introverted-but-warm — meaningful one-on-one conversations come naturally, and you tend to be steady through ups and downs. Communication styles look beautifully aligned.",
      },
      priorities: {
        score: 78,
        tier: "Great Match",
        reason:
          "Aligned on ambition, financial discipline, and family planning. One area to discuss early: relocation preferences differ — Arjun is more rooted in Mumbai for now.",
      },
    },
    hero: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1200&q=80&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=1000&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=1000&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1463453091185-61582044d556?w=1000&q=80&auto=format&fit=crop",
    ],
    summary:
      "Engineer turned founder, runner, cricket nerd. I'm 80% introvert and 20% loud-laughs-with-friends, depending on the room. Big believer in early bedtimes, slow mornings, and showing up for the people I love. Looking for someone ambitious in their own way, who values honesty and a good chai conversation.",
    lifestyle: ["Eats Everything", "Non-Smoker", "Occasional Drinker", "Runner", "Career Focused", "Pet Lover"],
    snapshot: [
      { kind: "match", label: "Both want children" },
      { kind: "match", label: "Aligned on financial discipline" },
      { kind: "warn", label: "Different relocation preferences" },
      { kind: "match", label: "Similar household expectations" },
    ],
    values: ["Equal Partnership", "Honesty First", "Ambition", "Family First", "Financial Discipline"],
    facts: [
      { label: "Education", value: "B.Tech" },
      { label: "Profession", value: "Co-founder, SaaS" },
      { label: "Languages", value: "English, Hindi, Marathi" },
      { label: "Family", value: "Nuclear · Close-knit" },
      { label: "Intent", value: "Marriage in 1–2 years" },
    ],
  },
  {
    id: "ananya-27",
    name: "Ananya",
    age: 27,
    location: "Pune",
    height: "5'4\"",
    income: "₹12-18 LPA",
    build: "Slim",
    religion: "Hindu",
    compatibility: "Potential Match",
    matchReason:
      "You share core values around kindness, learning, and a slower pace of life. Your career paths look quite different, which could be a source of richness — or something worth talking through early.",
    scores: {
      all: {
        score: 68,
        tier: "Potential Match",
        reason:
          "Beautiful alignment on values and personality, with some real differences on career intensity and household expectations. Worth a few honest conversations early.",
      },
      lifestyle: {
        score: 82,
        tier: "Great Match",
        reason:
          "Ananya is vegetarian, non-smoker, and starts every morning with yoga. You'd share slow Sunday mornings, journaling rituals, and a love of unhurried weekends — daily rhythms feel quietly aligned.",
      },
      personality: {
        score: 88,
        tier: "Great Match",
        reason:
          "Ananya is gentle and thoughtful — she values kindness above being right. You'd both bring patience, curiosity, and a willingness to listen to disagreements. A calming, generous pairing.",
      },
      priorities: {
        score: 55,
        tier: "Potential Match",
        reason:
          "Open-minded on big topics like interfaith marriage, but career intensities and household expectations look quite different. Real differences worth surfacing early.",
      },
    },
    hero: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1200&q=80&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1000&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1496440737103-cd596325d314?w=1000&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1485290334039-a3c69043e517?w=1000&q=80&auto=format&fit=crop",
    ],
    summary:
      "Writer, yoga teacher, and chronic re-reader of Murakami. I journal every morning, take my chai with cardamom, and believe a slow Sunday is a holy thing. Spiritual but not preachy, open-minded but rooted in family. Looking for someone gentle, thoughtful, and curious about the world.",
    lifestyle: ["Vegetarian", "Non-Smoker", "Non-Drinker", "Yoga", "Creative", "Spiritual"],
    snapshot: [
      { kind: "match", label: "Open to interfaith marriage" },
      { kind: "warn", label: "Different household expectations" },
      { kind: "match", label: "Both want children" },
      { kind: "warn", label: "Different career intensity" },
    ],
    values: ["Open Communication", "Kindness", "Personal Growth", "Mindful Living"],
    facts: [
      { label: "Education", value: "MA, English Literature" },
      { label: "Profession", value: "Writer & Yoga Teacher" },
      { label: "Languages", value: "English, Hindi, Marathi" },
      { label: "Family", value: "Joint family" },
      { label: "Intent", value: "Long-term, marriage" },
    ],
  },
];
