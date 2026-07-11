# Zomyra — React Native Migration (Phase 1)

## What was migrated
The existing Zomyra web app (React + Vite + TanStack Router + Tailwind + Radix + Vaul + Sonner) was migrated to a clean React Native (Expo SDK 54) codebase.

## Stack
- **Expo Router** for file-based navigation (replaces TanStack Router)
- **TypeScript**
- **React Query** for data layer
- **Zustand** for stores (chats, requests/premium, onboarding, verification)
- **React Native Reanimated** + **Animated** API for transitions
- **react-native-svg** for treasure-map path rendering
- **expo-image-picker** for photo & selfie capture
- **StyleSheet** throughout (no NativeWind, no CSS)
- **lucide-react-native** for icons (replaces lucide-react)

## Screens
| Route | Source web file | Status |
|---|---|---|
| `/` (Splash) | `routes/index.tsx` | ✅ |
| `/login` | `routes/login.tsx` | ✅ |
| `/phone` | `routes/phone.tsx` | ✅ |
| `/otp` | `routes/otp.tsx` | ✅ |
| `/onboarding` (3-section / 38-screen flow) | `routes/onboarding.tsx` | ✅ |
| `/matching` | `routes/matching.tsx` | ✅ |
| `/verify` (photos + selfie + submitted) | `routes/verify.tsx` | ✅ |
| `/discover` | `routes/discover.tsx` | ✅ |
| `/requests` (premium upsell + accept/decline) | `routes/requests.tsx` | ✅ |
| `/chats` (list + long-press unmatch) | `routes/chats.index.tsx` | ✅ |
| `/profile` (placeholder) | `routes/profile.tsx` | ✅ |
| `/chats/[id]` (conversation + profile sheet + report) | `routes/chats.$id.tsx` | ✅ |

## Architecture
```
app/                              # Expo Router screens
src/
  components/
    auth/         CountrySelector
    brand/        Logo, Wordmark
    common/       ScreenHeader
    discover/     ProfileView
    nav/          FloatingNav
    onboarding/   OnboardingShell, Primitives, Slider, RangeSlider, ScaleSlider, DateWheel, TreasureMap
    ui/           BottomSheet, ConfirmDialog, Toast
    verification/ PhotoUploadGrid
  lib/            chats/, discover/, onboarding/, verification/, countries.ts
  services/       api, auth, discover, upload         (mock; swappable)
  stores/         chat-store, requests-store, onboarding-store, verification-store
  theme/          colors, radii, spacing, shadows
```

## Web → RN Replacements
| Web | React Native |
|---|---|
| `<div>` `<span>` `<button>` | `<View>` `<Text>` `<Pressable>` / `<TouchableOpacity>` |
| `<input>` | `<TextInput>` |
| Tailwind classes | `StyleSheet.create()` + `src/theme/colors.ts` |
| `lucide-react` | `lucide-react-native` |
| `vaul` Drawer | Custom `BottomSheet` (Modal + Animated) |
| Radix Dialog / AlertDialog | `ConfirmDialog` (Modal) |
| `sonner` toast | In-app `Toast` host |
| `react-day-picker` / native scroll wheel | Custom `DateWheel` (3-column scroll-snap RN ScrollViews) |
| Radix Slider (single + dual) | Custom `Slider` + `RangeSlider` (PanResponder) |
| `localStorage` | `@/src/utils/storage` (AsyncStorage) — stores use in-memory by default |
| File input + FileReader | `expo-image-picker` (gallery + camera) |
| `Link`, `useNavigate` | `useRouter` from `expo-router` |
| TanStack Query | TanStack Query (kept) |

## API Abstraction
Every screen reads through services in `src/services/`. To attach a real backend:
- Swap `services/auth.ts` → Firebase / Twilio / your endpoint
- Swap `services/discover.ts` → REST/GraphQL fetch
- Swap `services/upload.ts` → Cloudinary / S3 / direct upload
No screen changes required.

## Verified flows
- Splash → Login → Phone → OTP (any 6 digits) → Onboarding intro 1 → questions … intro 2 → … intro 3 → Verify → Matching → Discover tabs
- Tab navigation: Profile / Discover / Requests / Chats
- Discover Pass/Connect cycles MOCK_PROFILES
- Requests: Free shows blurred cards + upsell; Premium opens profile sheet with Accept/Decline
- Chats list → Conversation: send message, long-press to unmatch, More menu (View profile, Unmatch, Block, Report)

## Files needing manual intervention (none blocking)
- **Selfie capture**: web version used `getUserMedia` for a live in-browser overlay. RN version uses `ImagePicker.launchCameraAsync` (native camera). The custom oval-pose overlay UI was therefore removed since native camera owns the framing. Restore by integrating `expo-camera` + custom overlay if needed.
- **Photo drag-reorder**: web version used HTML5 drag-and-drop. RN version uses tap-"Set cover" + tap-trash for reorder/delete. Restore with `react-native-draggable-flatlist` if needed.
- **Chat row swipe-to-unmatch**: web used a custom swipe row. RN version uses long-press → unmatch dialog (simpler & native). Restore with `react-native-gesture-handler` `Swipeable` if needed.
