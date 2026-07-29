/**
 * Country picker — modal sheet, mirrors web CountrySelector.tsx behavior.
 */
import { Check, ChevronDown, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, fontSize, fontWeight } from "@/src/theme";
import { COUNTRIES, type Country } from "@/src/lib/countries";
import { Touchable } from "@/src/components/ui";

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
      <Touchable
        testID="country-selector"
        onPress={() => setOpen(true)}
        style={[styles.trigger]}
      >
        <Text style={styles.flag}>{value.flag}</Text>
        <Text style={styles.dial}>{value.dial}</Text>
        <ChevronDown size={14} color={colors.text.muted} strokeWidth={2.4} />
      </Touchable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Touchable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Touchable
            style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.grabber} />
            <Text style={styles.title}>Select country</Text>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.text.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search country or code"
                placeholderTextColor={colors.text.muted}
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
                  <Touchable
                    feedback="highlight"
                    testID={`country-${item.code}`}
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                      setQ("");
                    }}
                    style={[styles.row]}
                  >
                    <Text style={styles.rowFlag}>{item.flag}</Text>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowDial}>{item.dial}</Text>
                    {selected ? <Check size={16} color={colors.brand.default} /> : null}
                  </Touchable>
                );
              }}
            />
          </Touchable>
        </Touchable>
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
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.default,
  },
  flag: { fontSize: fontSize.subtitle },
  dial: { fontSize: fontSize.bodyLarge, fontWeight: fontWeight.semibold, color: colors.text.primary },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.scrim,
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
    borderRadius: radii.full,
    backgroundColor: colors.border.default,
    marginBottom: 4,
  },
  title: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 12,
    backgroundColor: colors.surface.default,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: fontSize.bodyLarge, color: colors.text.primary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  rowFlag: { fontSize: fontSize.h2 },
  rowName: { flex: 1, fontSize: fontSize.bodyLarge, fontWeight: fontWeight.semibold, color: colors.text.primary },
  rowDial: { fontSize: fontSize.body, color: colors.text.muted },
});

void radii;
