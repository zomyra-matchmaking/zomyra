/**
 * Fixtures for API-39 and API-38 — the reference data the real endpoints would
 * serve, and do not (both `404` on staging as of 2026-08-05, MIGRATION §12.8).
 *
 * ## These are the backend's lists, standing in for the backend
 *
 * FR-3b's whole point is that the client hardcodes no choice lists. That is a
 * statement about `src/`, and this file does not break it: it is the *mock
 * server's* data, sitting behind the base query in the same place a Postgres
 * table sits in production. Nothing outside `src/api/mock/` imports it, and the
 * screens read it through API-39 exactly as they will read the real thing.
 *
 * The distinction is easy to lose, so it is worth stating what would break it:
 * a screen importing `CATALOGUE` directly, or a `key` here leaking into a
 * client-side conditional. Both are FR-3b violations; a list of values living
 * in this file is not.
 *
 * ## Where the values came from
 *
 * The labels are the prototype's own lists (`src/lib/onboarding/data.ts` and the
 * hardcoded arrays that were in `app/onboarding.tsx`), which is what makes the
 * migration observable: the flow looks identical to before while sourcing every
 * option over the wire. The **keys are invented here** and are certain to differ
 * from the backend's — they are `snake_case` slugs of the labels, chosen because
 * a wrong-looking key in a submitted payload is easier to spot than a plausible
 * one. Nothing in the client depends on their spelling.
 *
 * ⚠️ **`profession` is deliberately short.** FE §9.2 specifies a curated
 * 100–200 entry shortlist; there are ~40 here. Enough to exercise the
 * searchable picker, not a claim to be the real list.
 */
import type { CatalogueOption, City, OptionCategoryKey } from "../contract";

const opts = (...pairs: [string, string][]): CatalogueOption[] =>
  pairs.map(([key, label]) => ({ key, label }));

/**
 * `languages` carries the **`other`** key FE §9.2 requires — the one escape
 * hatch in the catalogue-driven set, which reveals a free-text field and is
 * submitted alongside `languagesOther`. It is last in the list on purpose.
 */
export const CATALOGUE: { key: OptionCategoryKey; values: CatalogueOption[] }[] = [
  {
    key: "gender",
    values: opts(
      ["female", "Female"],
      ["male", "Male"],
      ["non_binary", "Non-binary"],
      ["undisclosed", "Prefer not to say"],
    ),
  },
  {
    key: "state",
    values: opts(
      ["mh", "Maharashtra"],
      ["dl", "Delhi"],
      ["ka", "Karnataka"],
      ["tn", "Tamil Nadu"],
      ["gj", "Gujarat"],
      ["wb", "West Bengal"],
      ["tg", "Telangana"],
      ["rj", "Rajasthan"],
      ["up", "Uttar Pradesh"],
      ["kl", "Kerala"],
    ),
  },
  {
    key: "build",
    values: opts(
      ["slim", "Slim"],
      ["average", "Average"],
      ["athletic", "Athletic"],
      ["curvy", "Curvy"],
      ["plus_size", "Plus Size"],
      ["undisclosed", "Prefer Not To Say"],
    ),
  },
  {
    key: "education",
    values: opts(
      ["high_school", "High School"],
      ["diploma", "Diploma"],
      ["bachelors", "Bachelor's Degree"],
      ["masters", "Master's Degree"],
      ["mba", "MBA"],
      ["phd", "PhD"],
      ["other", "Other"],
    ),
  },
  {
    key: "profession",
    values: opts(
      ["swe", "Software Engineer"],
      ["doctor", "Doctor"],
      ["dentist", "Dentist"],
      ["nurse", "Nurse"],
      ["pharmacist", "Pharmacist"],
      ["ca", "Chartered Accountant"],
      ["banker", "Banker"],
      ["financial_analyst", "Financial Analyst"],
      ["lawyer", "Lawyer"],
      ["teacher", "Teacher"],
      ["professor", "Professor"],
      ["researcher", "Researcher"],
      ["civil_servant", "Civil Servant"],
      ["defence", "Defence Services"],
      ["police", "Police Services"],
      ["architect", "Architect"],
      ["civil_engineer", "Civil Engineer"],
      ["mechanical_engineer", "Mechanical Engineer"],
      ["electrical_engineer", "Electrical Engineer"],
      ["data_scientist", "Data Scientist"],
      ["product_manager", "Product Manager"],
      ["designer", "Designer"],
      ["marketing", "Marketing Professional"],
      ["sales", "Sales Professional"],
      ["hr", "HR Professional"],
      ["consultant", "Consultant"],
      ["entrepreneur", "Entrepreneur"],
      ["family_business", "Family Business"],
      ["farmer", "Farmer"],
      ["journalist", "Journalist"],
      ["artist", "Artist"],
      ["musician", "Musician"],
      ["chef", "Chef"],
      ["pilot", "Pilot"],
      ["merchant_navy", "Merchant Navy"],
      ["hospitality", "Hospitality"],
      ["real_estate", "Real Estate"],
      ["student", "Student"],
      ["homemaker", "Homemaker"],
      ["other", "Other"],
    ),
  },
  {
    key: "incomeRange",
    values: opts(
      ["lt_5", "Under ₹5 LPA"],
      ["5_10", "₹5–10 LPA"],
      ["10_20", "₹10–20 LPA"],
      ["20_35", "₹20–35 LPA"],
      ["35_50", "₹35–50 LPA"],
      ["gt_50", "₹50 LPA+"],
      ["undisclosed", "Prefer Not To Say"],
    ),
  },
  {
    key: "religion",
    values: opts(
      ["hindu", "Hindu"],
      ["muslim", "Muslim"],
      ["christian", "Christian"],
      ["sikh", "Sikh"],
      ["jain", "Jain"],
      ["buddhist", "Buddhist"],
      ["spiritual", "Spiritual but not Religious"],
      ["agnostic", "Agnostic"],
      ["atheist", "Atheist"],
      ["undisclosed", "Prefer Not To Say"],
    ),
  },
  {
    key: "languages",
    values: opts(
      ["hindi", "Hindi"],
      ["english", "English"],
      ["marathi", "Marathi"],
      ["gujarati", "Gujarati"],
      ["punjabi", "Punjabi"],
      ["bengali", "Bengali"],
      ["tamil", "Tamil"],
      ["telugu", "Telugu"],
      ["kannada", "Kannada"],
      ["malayalam", "Malayalam"],
      ["odia", "Odia"],
      ["assamese", "Assamese"],
      ["urdu", "Urdu"],
      ["other", "Other"],
    ),
  },
  {
    key: "diet",
    values: opts(
      ["vegetarian", "Vegetarian"],
      ["eggetarian", "Eggetarian"],
      ["non_vegetarian", "Non-Vegetarian"],
      ["vegan", "Vegan"],
    ),
  },
  {
    key: "drinking",
    values: opts(
      ["never", "Never"],
      ["socially", "Socially"],
      ["occasionally", "Occasionally"],
      ["frequently", "Frequently"],
    ),
  },
  {
    key: "smoking",
    values: opts(
      ["never", "Never"],
      ["occasionally", "Occasionally"],
      ["frequently", "Frequently"],
    ),
  },
  /**
   * The one category the real API-39 does **not** serve yet
   * (CONTRACT-QUESTIONS §9). Values are the prototype's own six, verbatim.
   */
  {
    key: "fitness",
    values: opts(
      ["daily", "Daily"],
      ["3_5_weekly", "3–5 times a week"],
      ["1_2_weekly", "1–2 times a week"],
      ["few_monthly", "A few times a month"],
      ["rarely", "Rarely"],
      ["never", "Never"],
    ),
  },
  {
    key: "familyType",
    values: opts(
      ["nuclear", "Nuclear Family"],
      ["joint", "Joint Family"],
      ["flexible", "Flexible"],
    ),
  },

  // ---- Anchor ------------------------------------------------------------
  {
    key: "matchLocationPreference",
    values: opts(
      ["same_city", "Same City"],
      ["same_state", "Same State"],
      ["anywhere_india", "Anywhere in India"],
      ["international", "Open to International Matches"],
    ),
  },
  {
    key: "childrenPreference",
    values: opts(["yes", "Yes"], ["no", "No"], ["undecided", "Undecided"]),
  },
  {
    key: "interfaithStance",
    values: opts(["yes", "Yes"], ["no", "No"], ["depends", "Depends on the Person"]),
  },
  {
    key: "smokingPartnerComfort",
    values: opts(["yes", "Yes"], ["no", "No"], ["occasional_only", "Occasional Smoking Only"]),
  },
  {
    key: "householdPreference",
    values: opts(
      ["vegetarian_only", "Vegetarian Household Only"],
      ["flexible", "Flexible Household"],
      ["no_preference", "No Preference"],
    ),
  },
  {
    key: "relocationWillingness",
    values: opts(["yes", "Yes"], ["no", "No"], ["depends", "Depends on Circumstances"]),
  },

  /*
   * FR-15/FR-15a. Served by API-39 per FE §9.2, and the **keys are fixed
   * contract** — `DiscoveryMode` in `contract.ts` explains why this one
   * category is not free to grow: the four modes are wired into the matching
   * engine's sub-scores. The catalogue supplies the labels only.
   */
  {
    key: "discoveryMode",
    values: opts(
      ["all", "Show me everyone"],
      ["compatibility", "Compatibility"],
      ["lifestyle", "Lifestyle"],
      ["marriage_goals", "Marriage Goals"],
    ),
  },
];

/**
 * API-38's table, keyed by the `state` catalogue key.
 *
 * Two properties matter more than the contents. **Every state key in the
 * catalogue above has an entry** — a state that returns an empty city list is a
 * dead end the user cannot back out of, and is exactly the shape of bug O-15
 * describes from the other side. And **city ids are globally unique, not
 * per-state** (`mh-mumbai`, not `mumbai`), because `cityId` is submitted alone
 * with no state beside it (O-16) — an id that only means something in the
 * context of a state would be unresolvable on the backend.
 */
export const CITIES_BY_STATE: Record<string, City[]> = {
  mh: city("mh", "Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad", "Solapur", "Kolhapur"),
  dl: city("dl", "New Delhi", "Dwarka", "Rohini", "Saket", "Karol Bagh"),
  ka: city("ka", "Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi"),
  tn: city("tn", "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"),
  gj: city("gj", "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Gandhinagar"),
  wb: city("wb", "Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol"),
  tg: city("tg", "Hyderabad", "Warangal", "Nizamabad", "Karimnagar"),
  rj: city("rj", "Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"),
  up: city("up", "Lucknow", "Kanpur", "Noida", "Varanasi", "Agra", "Prayagraj"),
  kl: city("kl", "Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam"),
};

function city(state: string, ...names: string[]): City[] {
  return names.map((name) => ({
    id: `${state}-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
  }));
}
