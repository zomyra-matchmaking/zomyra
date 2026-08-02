/**
 * **The tab navigator — FR-20 / FE TDD §3.3.**
 *
 * What this replaces: `FloatingNav` was an absolutely-positioned bar calling
 * `router.push()`, so every tab tap pushed onto **one shared stack**. Tapping
 * Discover → Chats → Discover left three entries in history, none of the tabs
 * kept its scroll position or screen state, and history grew without bound for
 * as long as the app stayed open. FR-20 asks for the opposite: *"each tab
 * preserves its own state/stack; switching tabs does not reset scroll position
 * or push a new screen onto a shared stack."*
 *
 * ## Why each tab is a route **group**, not a directory
 *
 * `(discover)`, `(requests)`, `(chats)`, `(profile)` are groups, so they
 * contribute nothing to the URL: `app/(tabs)/(discover)/filters.tsx` is still
 * `/filters`. Every `href` in the app, every `zomyra://` deep link Module 11
 * will issue, and every typed route stays exactly what it was — the navigator
 * tree changed, the address space did not. Directories would have renamed
 * `/filters` to `/discover/filters` and `/edit-profile` to
 * `/profile/edit-profile` for no gain.
 *
 * ## §3.4 — what lives where, and why it is a placement rule not a preference
 *
 * Screen reachability is expressed by **file location**, so getting it wrong is
 * a structural bug rather than a styling one:
 *
 * | Screen | Location | §3.4 |
 * |---|---|---|
 * | Premium (FR-29) | **root** stack, `app/premium.tsx` | reachable from any tab, from any gated entry point |
 * | Match celebration (FR-21) | **root** stack, when Module 7 makes it a route | reachable from any tab — Discover *and* Requests can both trigger it |
 * | Filters (FR-24) | `(discover)/filters.tsx` | Discover tab only |
 * | Discovery Mode sheet (FR-15) | a component inside Discover | Discover tab only |
 * | Delete account (FR-28) | a dialog inside `(profile)/profile.tsx` | Profile tab only — no other entry point exists |
 *
 * ⚠️ **Module 7: the Match screen belongs at the root, beside `premium.tsx`.**
 * It is currently `MatchOverlay`, a component rendered inside Discover and
 * Requests separately. FR-21a wants one global listener owning a FIFO queue,
 * which only works above the tabs — putting it in the Discover stack would make
 * a match triggered from Requests unreachable.
 *
 * ## The bar itself
 *
 * `tabBar` renders `FloatingTabBar`, which keeps the pill design Module 1
 * tokenised. It is absolutely positioned and therefore out of flow, which is
 * what `NAV_CLEARANCE` in the four tab screens is padding for — the same
 * arrangement as before, now with real tab semantics behind it.
 */
import { Redirect, Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

import { FloatingTabBar } from "@/src/components/nav/FloatingTabBar";
import {
  LaunchError,
  LaunchPending,
  UpdateRequired,
} from "@/src/components/nav/LaunchScreens";
import { useLaunchGate } from "@/src/components/nav/use-launch-gate";

/**
 * The destination `resolveRootDestination` returns when nothing is wrong.
 * Anything else means this user does not belong in the tabs yet.
 */
const TABS_OK: string = "/discover";

/**
 * ⚠️ **The tabs are guarded, and this is not belt-and-braces — it is the only
 * thing standing between an unverified or blocked account and real user
 * content.** Two holes it closes, both confirmed on device rather than reasoned
 * about:
 *
 * 1. **Deep links skip `app/index.tsx` entirely.** `zomyra:///chats/<id>` —
 *    precisely what Module 11 will issue from a push notification — mounts the
 *    conversation without `/` ever rendering, so the version check,
 *    `accountStatus` and the whole §9.1 table were bypassed.
 * 2. **Forward navigation inside a session.** A `pending` user tapped through
 *    §9.1's "Held" verification screen → `/matching` → the Discovery Mode
 *    picker → Discover. FR-11 makes verification mandatory *before* matching,
 *    so that had to be blocked in the same session, not merely corrected on the
 *    next cold start.
 *
 * The guard re-uses `useLaunchGate`, so it cannot disagree with the root gate,
 * and it costs **no extra requests** — both queries are RTK Query hooks reading
 * the cache entries `/` already filled (or filling them itself, on a deep-link
 * cold start where `/` never ran).
 */
function TabsGuard() {
  const gate = useLaunchGate();

  /*
   * ⚠️ **While resolving, cover the navigator — do not replace it.**
   *
   * Returning `<LaunchPending />` alone here unmounts `<Tabs>`, and remounting
   * it starts at `initialRouteName`. The deep-linked route is simply lost:
   * `zomyra:///chats/<id>` on a cold start showed the conversation for a frame
   * and then slid to Discover, which is precisely the Module 11 push case this
   * guard exists to protect. Caught on the emulator; the settled-state deep
   * link had worked, which is what made it look fine.
   *
   * So the navigator stays mounted and keeps its route, and the loading state
   * sits on top of it. The tab screens do mount underneath and may fire their
   * own queries — for a blocked account those come back `403 account_*`, which
   * `base-query` already routes to the blocker, so the outcome is right either
   * way and nothing is ever visible.
   *
   * The other three states are terminal — they navigate away or block for the
   * rest of the launch — so unmounting is correct there.
   */
  if (gate.status === "pending") {
    return (
      <>
        <TabsNavigator />
        <View style={StyleSheet.absoluteFill}>
          <LaunchPending />
        </View>
      </>
    );
  }

  if (gate.status === "update-required") return <UpdateRequired storeUrl={gate.storeUrl} />;
  if (gate.status === "error") return <LaunchError onRetry={gate.retry} />;
  if (gate.status === "unauthenticated") return <Redirect href="/login" />;

  /*
   * `destination` is where §9.1 says this user belongs. `/discover` is its
   * "everything is in order" answer — and when that is the answer we must
   * render the tabs *as they are*, not redirect to Discover, or a deep link to
   * `/chats/<id>` would bounce a perfectly valid user off their own
   * conversation. Any other destination is a real reroute.
   */
  if (gate.destination !== TABS_OK) return <Redirect href={gate.destination} />;

  return <TabsNavigator />;
}

export default function TabsLayout() {
  return <TabsGuard />;
}

function TabsNavigator() {
  return (
    <Tabs
      // Discover is the app's home: `GET /me`'s routing table sends an ordinary
      // reopen to `/discover`, and it is the tab a deep link into Premium or a
      // Match should fall back behind.
      initialRouteName="(discover)"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      {/*
        Declared explicitly rather than left to file discovery so the on-screen
        order is stated in one place. This is the prototype's order, kept
        deliberately: §3.3's table lists the four tabs but is a listing of what
        each stack contains, not a specification of bar order, and reordering a
        nav bar is a design change nobody asked for.
      */}
      <Tabs.Screen name="(profile)" />
      <Tabs.Screen name="(discover)" />
      <Tabs.Screen name="(requests)" />
      <Tabs.Screen name="(chats)" />
    </Tabs>
  );
}
