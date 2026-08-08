#!/usr/bin/env bash
#
# M5-042 — does the real API-7 accept `plot.fitness`?
#
# The client asks a required "How often do you exercise…" question and sends the
# answer as `plot.fitness`. CONTRACT-QUESTIONS §9 records that the backend has no
# such field. API-7's validator is **whitelist-based** — that is established, not
# guessed: on 2026-08-06 a nested `partnerAgeRange` came back as
# `anchor.property partnerAgeRange should not exist` rather than being ignored.
# So the likely answer is a 400, and this script is what settles it.
#
# ⚠️ Step 3 is a real mutation against staging. API-7 completes a profile, and a
# second submit on the same account will almost certainly 409. **Use a throwaway
# account's token**, not your own.
#
# Usage:
#   TOKEN='eyJ…' ./scripts/probe-fitness.sh
set -uo pipefail

BASE="${BASE:-https://zomyra-staging.duckdns.org/v1}"
: "${TOKEN:?Set TOKEN to a staging access token — see the note at the bottom}"

AUTH=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")
say() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

# ---------------------------------------------------------------------------
say "1. API-39 — does the catalogue serve a 'fitness' category at all?"
# If it does, the backend is further along than CONTRACT-QUESTIONS §9 records
# and the client's mock category can be dropped.
curl -sS "${AUTH[@]}" "$BASE/onboarding/options" -w '\nHTTP %{http_code}\n' \
  | tee /tmp/zomyra-options.json \
  | python3 -c 'import json,sys
raw=sys.stdin.read().rsplit("HTTP",1)[0]
try: d=json.loads(raw)
except Exception: print(raw[:400]); sys.exit()
cats=[c.get("key") for c in (d.get("categories") or d.get("options") or [])]
print("categories:", ", ".join(filter(None,cats)) or "(unrecognised shape, see /tmp/zomyra-options.json)")
print("fitness served:", "YES" if "fitness" in cats else "NO")'

# ---------------------------------------------------------------------------
say "2. A valid cityId (API-38) — cityId is an FK, an invented one 400s on its own"
curl -sS "${AUTH[@]}" "$BASE/locations/cities?state=ka" -w '\nHTTP %{http_code}\n' | head -c 600
echo
read -r -p "Paste a cityId from above (or Enter to use 'ka-bengaluru'): " CITY_ID
CITY_ID="${CITY_ID:-ka-bengaluru}"

# ---------------------------------------------------------------------------
# One body, emitted with and without `plot.fitness`. Everything else is held
# identical so the only variable is the field under test.
body() {
  python3 - "$CITY_ID" "$1" <<'PY'
import json, sys
city, mode = sys.argv[1], sys.argv[2]
plot = {
    "firstName": "Ada", "lastName": "Lovelace",
    "dateOfBirth": "1995-06-15",           # ISO YYYY-MM-DD
    "gender": "female", "build": "athletic",
    "education": "bachelors", "profession": "swe",
    "incomeRange": "lt_5", "religion": "hindu",
    "languages": ["hindi", "english"],     # no "other" → no languagesOther
    "diet": "vegetarian", "drinking": "never", "smoking": "never",
    "fitness": "3_5_weekly",               # ← the field under test
    "familyType": "nuclear",
    "cityId": city, "heightCm": 168,
    "bio": "Curious about people, mathematics and long walks.",
}
if mode == "without":
    plot.pop("fitness")
questions = ["household_vision","decision_making","finances","career_priorities",
             "parenting","conflict_resolution","emotional_support","weekend_lifestyle",
             "friendships","personal_growth","traditions","social_expectations"]
print(json.dumps({
    "plot": plot,
    "anchor": {
        "partnerAgeMin": 25, "partnerAgeMax": 35,   # validator bounds: 21..100
        "matchLocationPreference": "same_city", "childrenPreference": "yes",
        "interfaithStance": "yes", "smokingPartnerComfort": "no",
        "householdPreference": "flexible", "relocationWillingness": "yes",
    },
    "love": {"quizVersion": 1,
             "quizAnswers": [{"questionId": q, "sliderValue": 3} for q in questions]},
}))
PY
}

say "3. API-7 WITH plot.fitness — the actual question"
body with | curl -sS "${AUTH[@]}" -X POST "$BASE/onboarding/submit" \
  --data @- -w '\nHTTP %{http_code}\n'

say "4. API-7 WITHOUT plot.fitness — the control"
# Run this only if step 3 returned 400. It separates "fitness is rejected" from
# "this body is wrong for some other reason", which is the whole point of having
# a control. Needs a *second* throwaway token if step 3 actually succeeded.
body without | curl -sS "${AUTH[@]}" -X POST "$BASE/onboarding/submit" \
  --data @- -w '\nHTTP %{http_code}\n'

cat <<'NOTE'

== How to read this ==
  3 → 200/201            fitness is accepted (or silently dropped). Confirm by
                         reading it back on GET /v1/me — accepted and ignored
                         are different answers and only the read-back separates them.
  3 → 400 "…fitness should not exist"   whitelist rejection. Client must gate the
                         key until the backend adds the column.
  3 → 400, 4 → 200/201   confirms fitness is the cause.
  3 → 400, 4 → 400       the body is wrong for some other reason; fix that first,
                         the fitness question is still unanswered.
NOTE
