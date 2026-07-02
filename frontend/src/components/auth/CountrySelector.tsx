/**
 * Country picker — modal sheet, mirrors web CountrySelector.tsx behavior.
 */
import { Check, ChevronDown, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii } from "@/src/theme/colors";
import { COUNTRIES, type Country } from "@/src/lib/countries";

type Props = {
  value: Country;
  onChange: (c: Country) => void;
};

export function CountrySelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const insets = useSafeAreaInsets();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(s) || c.dial.includes(s) || c.code.toLowerCase().includes(s),
    );
  }, [q]);

  return (
    <>
      <Pressable
        testID="country-selector"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.flag}>{value.flag}</Text>
        <Text style={styles.dial}>{value.dial}</Text>
        <ChevronDown size={14} color={colors.mutedForeground} strokeWidth={2.4} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.grabber} />
            <Text style={styles.title}>Select country</Text>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.mutedForeground} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search country or code"
                placeholderTextColor={colors.mutedForeground}
                style={styles.searchInput}
                autoFocus
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => `${item.code}-${item.dial}`}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => {
                const selected = item.code === value.code && item.dial === value.dial;
                return (
                  <Pressable
                    testID={`country-${item.code}`}
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                      setQ("");
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && { backgroundColor: colors.secondary },
                    ]}
                  >
                    <Text style={styles.rowFlag}>{item.flag}</Text>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowDial}>{item.dial}</Text>
                    {selected ? <Check size={16} color={colors.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  flag: { fontSize: 20 },
  dial: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingHorizontal: 16,
    maxHeight: "80%",
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: 4,
  },
  title: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 17,
    fontWeight: "700",
    color: colors.foreground,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.foreground },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  rowFlag: { fontSize: 22 },
  rowName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.foreground },
  rowDial: { fontSize: 14, color: colors.mutedForeground },
});

void radii;
