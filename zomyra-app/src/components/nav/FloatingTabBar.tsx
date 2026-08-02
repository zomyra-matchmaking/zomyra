/**
 * The bottom tab bar — the pill design from the prototype, now driven by real
 * tab navigation (FR-20).
 *
 * **What changed, and it is the whole point of Module 3's nav work.** This was
 * `FloatingNav`, which called `router.push(item.path)` on every tap. That put
 * all four tabs on **one shared stack**: no per-tab state, no scroll
 * restoration, and history that grew for as long as the app stayed open. It is
 * now a `tabBar` renderer for `<Tabs>`, so navigation is `navigation.emit` +
 * `navigation.navigate` against four independent stacks and the framework owns
 * state preservation.
 *
 * The *look* is unchanged on purpose — Module 1 tokenised it and verified it on
 * both platforms, so there was no reason to redraw it while changing what it
 * does underneath.
 *
 * ⚠️ **Absolutely positioned, so it does not consume layout height.** The four
 * tab screens pad their scroll content by `NAV_CLEARANCE` to clear it. If this
 * ever moves into normal flow, that padding becomes a double gap in four
 * screens at once.
 */
import { type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { HeartHandshake, MessageCircle, UserRound, Users } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGetCountsQuery } from "@/src/api";
import { Touchable } from "@/src/components/ui";
import { colors, fontSize, fontWeight, radii, spacing } from "@/src/theme";

type Item = {
  /** Must match the route-group name in `app/(tabs)/`. */
  name: string;
  key: "profile" | "discover" | "requests" | "chats";
  label: string;
};

const ITEMS: Item[] = [
  { name: "(profile)", key: "profile", label: "Profile" },
  { name: "(discover)", key: "discover", label: "People" },
  { name: "(requests)", key: "requests", label: "Requests" },
  { name: "(chats)", key: "chats", label: "Chats" },
];

const ICONS = {
  profile: UserRound,
  discover: Users,
  requests: HeartHandshake,
  chats: MessageCircle,
} as const;

const BADGE_CAP = 99;

/**
 * True when the focused tab has pushed something on top of its own root.
 *
 * The bar is a root-level affordance: it belongs on Discover, Requests, Chats
 * and Profile, not on the screens they push. Found on the Android emulator
 * rather than reasoned about — the bar was sitting **on top of the chat
 * composer**, because a real `<Tabs>` renders its bar over every screen in
 * every tab stack, whereas the old `FloatingNav` was rendered by the four root
 * screens individually and so never appeared on a detail screen.
 *
 * The four roots are also the only screens that pad by `NAV_CLEARANCE`; Filters,
 * Edit Profile, Personality Test and the conversation do not, which is
 * independent confirmation that none of them ever expected a bar over them.
 */
function isNestedRoute(state: BottomTabBarProps["state"]): boolean {
  const focused = state.routes[state.index];
  const nested = focused?.state;
  return typeof nested?.index === "number" && nested.index > 0;
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  /*
   * API-34 (FE §9.13). Low-stakes by contract: if it fails the badges simply do
   * not update this cycle — no error UI, no retry, and nothing about the tab
   * bar depends on it resolving. `data` is undefined until it does, which is
   * why both counts fall back to 0 rather than to a spinner.
   *
   * This replaces reading `s.requests.requests.length`, which counted rows in a
   * mock array: it could only ever report what the client had already loaded,
   * so a request arriving while the user sat on Discover was invisible. It also
   * only ever badged Requests — §9.13 returns unread messages too, and Chats
   * had no badge at all.
   */
  const { data: counts } = useGetCountsQuery();

  const badgeFor = (key: Item["key"]): number => {
    if (key === "requests") return counts?.pendingRequestsCount ?? 0;
    if (key === "chats") return counts?.unreadMessagesCount ?? 0;
    return 0;
  };

  // After the hooks, never before — an early return above `useGetCountsQuery`
  // would change the hook order between a root and a pushed screen.
  if (isNestedRoute(state)) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingBottom: insets.bottom + spacing[1.5] }]}
    >
      <View style={styles.bar} accessibilityRole="tablist">
        {ITEMS.map((item) => {
          const routeIndex = state.routes.findIndex((route) => route.name === item.name);
          const route = state.routes[routeIndex];
          if (!route) return null;

          const focused = state.index === routeIndex;
          const color = focused ? colors.brand.default : colors.text.muted;
          const Icon = ICONS[item.key];
          const count = badgeFor(item.key);
          const badgeText = count > BADGE_CAP ? `${BADGE_CAP}+` : String(count);

          const onPress = () => {
            /*
             * The standard tab-press contract, and each half matters:
             *
             * - `emit` with `canPreventDefault` lets a screen intercept its own
             *   tab press (scroll-to-top is the usual one) by calling
             *   `preventDefault`.
             * - `navigate`, not `push` — this is exactly the line that used to
             *   be `router.push`. Re-selecting the focused tab pops its stack
             *   back to the root, which is why Filters sits *inside* the
             *   Discover stack rather than beside it.
             */
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Touchable
              key={route.key}
              testID={`tab-${item.key}`}
              onPress={onPress}
              style={styles.item}
              accessibilityRole="tab"
              // NFR-6: the icon carries the meaning, so the label has to be
              // spoken. The count goes into the label rather than being left as
              // a floating number a screen reader reads out of context — hence
              // the badge view itself being hidden from the tree below.
              accessibilityLabel={count > 0 ? `${item.label}, ${badgeText} new` : item.label}
              accessibilityState={{ selected: focused }}
            >
              <View style={styles.iconWrap}>
                <Icon size={20} color={color} strokeWidth={focused ? 2.4 : 2} />
                {count > 0 ? (
                  <View style={styles.badge} importantForAccessibility="no-hide-descendants">
                    <Text style={styles.badgeText}>{badgeText}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, { color }]}>{item.label}</Text>
            </Touchable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: spacing[4],
  },
  bar: {
    width: "100%",
    maxWidth: 340,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.surface.default,
    borderWidth: 1,
    borderColor: colors.border.default,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: spacing[1.5],
    shadowColor: colors.shadow.default,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[0.5],
    paddingVertical: spacing[1],
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: fontSize.nano, fontWeight: fontWeight.semibold, letterSpacing: -0.1 },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: spacing[1],
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.border.onBrand,
  },
  badgeText: { color: colors.text.onBrand, fontSize: fontSize.nano, fontWeight: fontWeight.bold },
});
