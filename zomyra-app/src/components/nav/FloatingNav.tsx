/**
 * Floating bottom nav — premium / matrimony refresh.
 * Icons: User, Users, HeartHandshake, MessageCircle (lucide).
 */
import { HeartHandshake, MessageCircle, UserRound, Users } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";

import { useRequestsStore } from "@/src/stores/requests-store";
import { colors, fontSize, fontWeight, radii, spacing } from "@/src/theme";
import { Touchable } from "@/src/components/ui";

type Item = {
  key: "profile" | "discover" | "requests" | "chats";
  label: string;
  path: string;
};

const ITEMS: Item[] = [
  { key: "profile", label: "Profile", path: "/profile" },
  { key: "discover", label: "People", path: "/discover" },
  { key: "requests", label: "Requests", path: "/requests" },
  { key: "chats", label: "Chats", path: "/chats" },
];

export function FloatingNav() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const insets = useSafeAreaInsets();
  const requestCount = useRequestsStore((s) => s.requests.length);
  const badgeText = requestCount > 99 ? "99+" : String(requestCount);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingBottom: insets.bottom + 6 }]}
    >
      <View style={styles.bar}>
        {ITEMS.map((item) => {
          const active = isActive(item.path);
          const color = active ? colors.brand.default : colors.text.muted;
          const stroke = active ? 2.4 : 2;

          let Icon = UserRound;
          if (item.key === "discover") Icon = Users;
          else if (item.key === "requests") Icon = HeartHandshake;
          else if (item.key === "chats") Icon = MessageCircle;

          return (
            <Touchable
              key={item.key}
              testID={`tab-${item.key}`}
              onPress={() => router.push(item.path as never)}
              style={styles.item}
            >
              <View style={styles.iconWrap}>
                <Icon size={20} color={color} strokeWidth={stroke} />
                {item.key === "requests" && requestCount > 0 ? (
                  <View style={styles.badge}>
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

void colors.surface.brand;
