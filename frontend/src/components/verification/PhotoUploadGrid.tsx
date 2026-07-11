/**
 * Photo upload grid — uses expo-image-picker. Drag-reorder is simplified to
 * tap-to-set-cover + tap-to-remove for the RN version. The data model still
 * mirrors web exactly (UploadedPhoto[] in order, [0] is cover).
 */
import { GripVertical, ImagePlus, Star, Trash2 } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { toast } from "@/src/components/ui/Toast";
import { MAX_PHOTOS, type UploadedPhoto } from "@/src/lib/verification/types";
import { uploadService } from "@/src/services/upload";
import { colors, radii } from "@/src/theme/colors";

type Props = {
  photos: UploadedPhoto[];
  onChange: (next: UploadedPhoto[]) => void;
};

export function PhotoUploadGrid({ photos, onChange }: Props) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const pick = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      // Per <handle_permissions_contract>: never dead-end the user. Either
      // re-prompt (if still possible) or guide them to settings.
      if (perm.canAskAgain) {
        toast.show("We need photo access to upload your pictures.");
      } else {
        toast.show("Photo access blocked. Opening Settings…");
        setTimeout(() => Linking.openSettings(), 600);
      }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.8,
    });
    if (result.canceled) return;
    const uploaded = await Promise.all(
      result.assets.map((a) => uploadService.uploadImage(a.uri)),
    );
    onChange([...photos, ...uploaded.map((u) => ({ id: u.id, uri: u.uri }))]);
  };

  const makeCover = (id: string) => {
    const idx = photos.findIndex((p) => p.id === id);
    if (idx <= 0) return;
    const next = [...photos];
    const [item] = next.splice(idx, 1);
    next.unshift(item);
    onChange(next);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    onChange(photos.filter((p) => p.id !== pendingDelete));
    setPendingDelete(null);
  };

  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] ?? null);

  return (
    <View>
      <View style={styles.grid}>
        {slots.map((slot, i) => {
          const isCover = i === 0 && !!slot;
          const isRequired = i < 3;
          return (
            <View key={slot?.id ?? `empty-${i}`} style={styles.cell}>
              {slot ? (
                <View style={styles.tile}>
                  <Image source={{ uri: slot.uri }} style={StyleSheet.absoluteFillObject} />
                  {isCover ? (
                    <View style={styles.coverChip}>
                      <Star size={10} color="#fff" strokeWidth={3} />
                      <Text style={styles.coverText}>COVER</Text>
                    </View>
                  ) : (
                    <Pressable
                      testID={`make-cover-${i}`}
                      onPress={() => makeCover(slot.id)}
                      style={styles.setCoverBtn}
                    >
                      <Text style={styles.setCoverText}>Set cover</Text>
                    </Pressable>
                  )}
                  <View style={styles.gripBadge}>
                    <GripVertical size={12} color={colors.mutedForeground} />
                  </View>
                  <Pressable
                    testID={`delete-photo-${i}`}
                    onPress={() => setPendingDelete(slot.id)}
                    style={styles.removeBtn}
                  >
                    <Trash2 size={14} color={colors.destructive} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  testID={`upload-slot-${i}`}
                  onPress={pick}
                  style={[styles.tile, styles.placeholder]}
                >
                  <ImagePlus size={20} color={colors.mutedForeground} />
                  <Text style={styles.placeholderLabel}>Photo {i + 1}</Text>
                  <Text style={styles.placeholderHint}>{isRequired ? "REQUIRED" : "OPTIONAL"}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      <Text style={styles.help}>
        Tap an empty slot to upload. Tap “Set cover” to make a photo your first photo.
      </Text>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove this photo?"
        description="This photo will be removed from your profile. You can re-upload it later."
        confirmLabel="Remove"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  cell: {
    width: "32%",
    aspectRatio: 3 / 4,
  },
  tile: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  placeholder: {
    borderStyle: "dashed",
    backgroundColor: "rgba(244,234,251,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  placeholderLabel: { fontSize: 11, fontWeight: "600", color: colors.mutedForeground },
  placeholderHint: {
    fontSize: 9.5,
    letterSpacing: 1,
    color: colors.mutedForeground,
  },
  coverChip: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  coverText: { color: "#fff", fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  setCoverBtn: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  setCoverText: { fontSize: 9.5, fontWeight: "700", color: colors.primary },
  gripBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  help: {
    marginTop: 12,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});

void radii;
