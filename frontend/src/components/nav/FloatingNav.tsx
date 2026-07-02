/**
 * Floating bottom nav — premium / matrimony refresh.
 * Icons: User, Users, HeartHandshake, MessageCircle (lucide).
 */
import { HeartHandshake, MessageCircle, UserRound, Users } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";

import { useRequestsStore } from "@/src/stores/requests-store";

const PURPLE = "#5B2C6F";
const MUTED = "#6B7280";
const BORDER = "#ECEAF7";
const LIGHT_PURPLE = "#F5F3FF";

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
      style={[styles.host, { paddingBottom: insets.bottom + 8 }]}
    >
      <View style={styles.bar}>
        {ITEMS.map((item) => {
          const active = isActive(item.path);
          const color = active ? PURPLE : MUTED;
          const stroke = active ? 2.4 : 2;

          let Icon = UserRound;
          if (item.key === "discover") Icon = Users;
          else if (item.key === "requests") Icon = HeartHandshake;
          else if (item.key === "chats") Icon = MessageCircle;

          return (
            <Pressable
              key={item.key}
              testID={`tab-${item.key}`}
              onPress={() => router.push(item.path as never)}
              style={styles.item}
            >
              <View style={styles.iconWrap}>
                <Icon size={22} color={color} strokeWidth={stroke} />
                {item.key === "requests" && requestCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeText}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, { color }]}>{item.label}</Text>
            </Pressable>
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
    paddingHorizontal: 16,
  },
  bar: {
    width: "100%",
    maxWidth: 372,
    height: 68,
    borderRadius: 24,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 11, fontWeight: "600" },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
});

void LIGHT_PURPLE;
