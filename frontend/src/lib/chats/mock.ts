import type { CompatibilityTier, CompatibilitySignal, DiscoverProfile } from "@/src/lib/discover/mock";

export type ChatMessage = {
  id: string;
  text: string;
  time: string;
  from: "me" | "them";
};

export type ChatProfile = {
  age: number;
  city: string;
  category: CompatibilityTier;
  summary: string;
  photos: string[];
  lifestyle: string[];
  values: string[];
  snapshot: CompatibilitySignal[];
  facts: { label: string; value: string }[];
};

export type Conversation = {
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
  /** Whether this contact is a Zomyra Premium subscriber. */
  premium?: boolean;
  lastMessage: string;
  time: string;
  unread: number;
  messages: ChatMessage[];
  profile: ChatProfile;
};

const BASE: Conversation[] = [
  {
    id: "riya",
    name: "Riya Sharma",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80&auto=format&fit=crop",
    verified: true,
    premium: true,
    lastMessage: "Hope your week is going well",
    time: "8:45 PM",
    unread: 2,
    messages: [
      { id: "m1", from: "them", text: "Hey! Loved your travel photos.", time: "8:30 PM" },
      { id: "m2", from: "me", text: "Thank you! That was Coorg last December.", time: "8:33 PM" },
      { id: "m3", from: "them", text: "I've been wanting to go there forever.", time: "8:34 PM" },
      { id: "m4", from: "them", text: "Hope your week is going well", time: "8:45 PM" },
    ],
    profile: {
      age: 28,
      city: "Bangalore",
      category: "Excellent Match",
      summary:
        "You both value personal growth while maintaining strong family relationships. Views on finances, parenting and long-term goals are highly aligned.",
      photos: [
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1000&q=80&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1000&q=80&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=1000&q=80&auto=format&fit=crop",
      ],
      lifestyle: ["Vegetarian", "Non-Smoker", "Social Drinker", "Active"],
      values: ["Equal Partnership", "Open Communication", "Family First"],
      snapshot: [
        { kind: "match", label: "Both want children" },
        { kind: "match", label: "Similar household expectations" },
        { kind: "warn", label: "Different views on interfaith marriage" },
      ],
      facts: [
        { label: "Education", value: "M.Des, NID" },
        { label: "Profession", value: "Senior Product Designer" },
        { label: "Languages", value: "English, Hindi, Kannada" },
        { label: "Intent", value: "Long-term, marriage" },
      ],
    },
  },
  {
    id: "arjun",
    name: "Arjun Mehta",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80&auto=format&fit=crop",
    verified: true,
    premium: true,
    lastMessage: "Coffee this weekend?",
    time: "6:12 PM",
    unread: 0,
    messages: [
      { id: "m1", from: "me", text: "Your startup sounds exciting.", time: "5:50 PM" },
      { id: "m2", from: "them", text: "Thanks! Still early days.", time: "5:58 PM" },
      { id: "m3", from: "them", text: "Coffee this weekend?", time: "6:12 PM" },
    ],
    profile: {
      age: 30,
      city: "Mumbai",
      category: "Great Match",
      summary:
        "Strong alignment on ambition, financial discipline and family. Both describe yourselves as introverted but socially warm.",
      photos: [
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1000&q=80&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=1000&q=80&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=1000&q=80&auto=format&fit=crop",
      ],
      lifestyle: ["Eats Everything", "Non-Smoker", "Runner", "Pet Lover"],
      values: ["Honesty First", "Ambition", "Family First"],
      snapshot: [
        { kind: "match", label: "Aligned on financial discipline" },
        { kind: "match", label: "Both want children" },
        { kind: "warn", label: "Different relocation preferences" },
      ],
      facts: [
        { label: "Education", value: "B.Tech, IIT Bombay" },
        { label: "Profession", value: "Co-founder, SaaS" },
        { label: "Languages", value: "English, Hindi, Marathi" },
        { label: "Intent", value: "Marriage in 1–2 years" },
      ],
    },
  },
  {
    id: "ananya",
    name: "Ananya Iyer",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80&auto=format&fit=crop",
    verified: false,
    lastMessage: "That book recommendation was perfect",
    time: "Yesterday",
    unread: 0,
    messages: [
      { id: "m1", from: "me", text: "Try 'The Midnight Library' — easy read.", time: "Mon" },
      { id: "m2", from: "them", text: "That book recommendation was perfect", time: "Yesterday" },
    ],
    profile: {
      age: 27,
      city: "Pune",
      category: "Potential Match",
      summary:
        "Shared values around kindness, learning and a slower pace of life. Career paths differ — could be enriching or worth discussing early.",
      photos: [
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1000&q=80&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1000&q=80&auto=format&fit=crop",
      ],
      lifestyle: ["Vegetarian", "Non-Smoker", "Yoga", "Creative"],
      values: ["Kindness", "Mindful Living", "Open Communication"],
      snapshot: [
        { kind: "match", label: "Both want children" },
        { kind: "warn", label: "Different household expectations" },
      ],
      facts: [
        { label: "Education", value: "MA, English Literature" },
        { label: "Profession", value: "Writer & Yoga Teacher" },
        { label: "Languages", value: "English, Hindi, Marathi" },
        { label: "Intent", value: "Long-term, marriage" },
      ],
    },
  },
  {
    id: "kabir",
    name: "Kabir Rao",
    avatar:
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80&auto=format&fit=crop",
    verified: true,
    premium: true,
    lastMessage: "Haha noted",
    time: "Tue",
    unread: 1,
    messages: [
      { id: "m1", from: "them", text: "I'm terrible at small talk", time: "Tue" },
      { id: "m2", from: "me", text: "Same, let's skip to real questions.", time: "Tue" },
      { id: "m3", from: "them", text: "Haha noted", time: "Tue" },
    ],
    profile: {
      age: 31,
      city: "Delhi",
      category: "Great Match",
      summary:
        "Both value directness and curiosity. Aligned on long-term intent and lifestyle pace.",
      photos: [
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=1000&q=80&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1463453091185-61582044d556?w=1000&q=80&auto=format&fit=crop",
      ],
      lifestyle: ["Eats Everything", "Non-Smoker", "Cyclist"],
      values: ["Honesty First", "Curiosity", "Equal Partnership"],
      snapshot: [
        { kind: "match", label: "Aligned on long-term intent" },
        { kind: "match", label: "Similar pace of life" },
      ],
      facts: [
        { label: "Profession", value: "Architect" },
        { label: "Languages", value: "English, Hindi" },
        { label: "Intent", value: "Marriage" },
      ],
    },
  },
  {
    id: "meera",
    name: "Meera Kapoor",
    avatar:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&q=80&auto=format&fit=crop",
    verified: false,
    lastMessage: "Will share the playlist tonight",
    time: "Mon",
    unread: 0,
    messages: [
      { id: "m1", from: "them", text: "Will share the playlist tonight", time: "Mon" },
    ],
    profile: {
      age: 29,
      city: "Hyderabad",
      category: "Potential Match",
      summary:
        "Shared love for music and quiet weekends. Different career intensity worth discussing.",
      photos: [
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1000&q=80&auto=format&fit=crop",
      ],
      lifestyle: ["Vegetarian", "Non-Smoker", "Musician"],
      values: ["Creativity", "Kindness"],
      snapshot: [
        { kind: "match", label: "Shared creative interests" },
        { kind: "warn", label: "Different career intensity" },
      ],
      facts: [
        { label: "Profession", value: "Music Producer" },
        { label: "Languages", value: "English, Telugu" },
        { label: "Intent", value: "Long-term" },
      ],
    },
  },
];

const TIMES = ["Just now", "10:02 AM", "Yesterday", "Mon", "Sun", "Sat", "Apr 12", "Mar 30"];
function expand(base: Conversation[], copies: number): Conversation[] {
  const out: Conversation[] = [...base];
  for (let c = 1; c <= copies; c++) {
    for (const b of base) {
      out.push({
        ...b,
        id: `${b.id}-${c}`,
        time: TIMES[(c + b.id.length) % TIMES.length],
        unread: (c + b.id.length) % 4 === 0 ? (c + 1) % 5 : 0,
        lastMessage: b.lastMessage,
      });
    }
  }
  return out;
}

export const CONVERSATIONS: Conversation[] = expand(BASE, 3);

export function chatToDiscoverProfile(c: Conversation): DiscoverProfile {
  return {
    id: c.id,
    name: c.name.split(" ")[0],
    age: c.profile.age,
    location: c.profile.city,
    compatibility: c.profile.category,
    hero: c.profile.photos[0],
    gallery: c.profile.photos,
    summary: c.profile.summary,
    lifestyle: c.profile.lifestyle,
    snapshot: c.profile.snapshot,
    values: c.profile.values,
    facts: c.profile.facts,
  };
}

const FILLER = [
  "Sounds good",
  "How was your day?",
  "Haha, fair point.",
  "Let's plan something next weekend.",
  "Just wrapped up work.",
  "Reading something nice tonight.",
  "Will tell you over coffee",
  "Got it",
  "That's an interesting take.",
  "Same here actually.",
];

export function generateOlderMessages(
  beforeId: string,
  count: number,
  baseDayOffset: number,
): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (baseDayOffset + i) % FILLER.length;
    out.push({
      id: `older-${beforeId}-${baseDayOffset}-${i}`,
      from: i % 2 === 0 ? "them" : "me",
      text: FILLER[idx],
      time: `${9 + (i % 8)}:${String((i * 7) % 60).padStart(2, "0")} AM`,
    });
  }
  return out;
}
