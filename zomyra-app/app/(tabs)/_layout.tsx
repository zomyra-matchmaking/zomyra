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
import { Tabs } from "expo-router";

import { FloatingTabBar } from "@/src/components/nav/FloatingTabBar";

export default function TabsLayout() {
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
