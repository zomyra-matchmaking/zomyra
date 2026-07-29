/**
 * Photo upload grid — uses expo-image-picker. Cover is implicitly the first
 * photo (photos[0]). Non-first photos cannot be promoted to cover here;
 * if the user wants a different cover they can delete and re-upload in the
 * desired order.
 */
import { GripVertical, ImagePlus, Star, Trash2 } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Linking, StyleSheet, Text, View } from "react-native";

import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { toast } from "@/src/components/ui/Toast";
import { MAX_PHOTOS, type UploadedPhoto } from "@/src/lib/verification/types";
import { uploadService } from "@/src/services/upload";
import { colors, radii, alpha, fontSize, fontWeight } from "@/src/theme";
import { Touchable } from "@/src/components/ui";

// Short, warm, matrimony-appropriate prompts shown on the empty upload
// slots. Each hints at what kind of photo would work well for that slot.
const SLOT_PROMPTS = [
  "The real me",
  "Chai talks and long drives",
  "Family is everything",
  "Weekend vibes",
  "A moment I'm proud of",
  "Where I feel most me",
] as const;

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
          const prompt = SLOT_PROMPTS[i] ?? `Photo ${i + 1}`;
          return (
            <View key={slot?.id ?? `empty-${i}`} style={styles.cell}>
              {slot ? (
                <View style={styles.tile}>
                  <Image source={{ uri: slot.uri }} style={StyleSheet.absoluteFillObject} />
                  {isCover ? (
                    <View style={styles.coverChip}>
                      <Star size={10} color={colors.text.onBrand} strokeWidth={3} />
                      <Text style={styles.coverText}>COVER</Text>
                    </View>
                  ) : null}
                  <View style={styles.gripBadge}>
                    <GripVertical size={12} color={colors.text.muted} />
                  </View>
                  <Touchable
                    testID={`delete-photo-${i}`}
                    onPress={() => setPendingDelete(slot.id)}
                    style={styles.removeBtn}
                  >
                    <Trash2 size={14} color={colors.danger.default} />
                  </Touchable>
                </View>
              ) : (
                <Touchable
                  testID={`upload-slot-${i}`}
                  onPress={pick}
                  style={[styles.tile, styles.placeholder]}
                >
                  <ImagePlus size={20} color={colors.text.muted} />
                  <Text style={styles.placeholderLabel} numberOfLines={2}>
                    {prompt}
                  </Text>
                  <Text style={styles.placeholderHint}>{isRequired ? "REQUIRED" : "OPTIONAL"}</Text>
                </Touchable>
              )}
            </View>
          );
        })}
      </View>

      <Text style={styles.help}>
        Tap an empty slot to upload a photo.
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
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.surface.brand,
    borderWidth: 1,
    borderColor: colors.border.default,
    position: "relative",
  },
  placeholder: {
    borderStyle: "dashed",
    backgroundColor: alpha(colors.surface.brand, 0.5),
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  placeholderLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.semibold,
    color: colors.text.muted,
    textAlign: "center",
    lineHeight: 14,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  placeholderHint: {
    fontSize: fontSize.nano,
    letterSpacing: 1,
    color: colors.text.muted,
    marginTop: 2,
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
    borderRadius: radii.full,
    backgroundColor: colors.brand.default,
  },
  coverText: { color: colors.text.onBrand, fontSize: fontSize.nano, fontWeight: fontWeight.bold, letterSpacing: 0.8 },
  gripBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: alpha(colors.text.onBrand, 0.85),
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: alpha(colors.text.onBrand, 0.95),
    alignItems: "center",
    justifyContent: "center",
  },
  help: {
    marginTop: 12,
    fontSize: fontSize.caption,
    color: colors.text.muted,
  },
});

void radii;
