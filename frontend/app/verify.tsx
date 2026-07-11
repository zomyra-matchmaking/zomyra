/**
 * Photos + verification selfie flow. Steps:
 *   0 upload, 1 intro, 2 selfie instructions, 3/4 review, 5 submitted.
 */
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera, Check, Clock, ImagePlus, ShieldCheck, Sun, UserCircle2, X } from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { OnboardingShell } from "@/src/components/onboarding/OnboardingShell";
import { PhotoUploadGrid } from "@/src/components/verification/PhotoUploadGrid";
import { MIN_PHOTOS } from "@/src/lib/verification/types";
import { useVerificationStore } from "@/src/stores/verification-store";
import { colors } from "@/src/theme/colors";

const TOTAL = 6;

export default function VerifyScreen() {
  const router = useRouter();
  const state = useVerificationStore((s) => s.state);
  const setPhotos = useVerificationStore((s) => s.setPhotos);
  const setSelfie = useVerificationStore((s) => s.setSelfie);
  const submit = useVerificationStore((s) => s.submit);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const goBack = () => {
    if (step === 0) {
      router.replace("/onboarding");
      return;
    }
    setStep((i) => Math.max(0, i - 1));
  };
  const goNext = () => setStep((i) => Math.min(TOTAL - 1, i + 1));

  const captureSelfie = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      cameraType: ImagePicker.CameraType.front,
      quality: 0.85,
    });
    if (result.canceled) return;
    setSelfie(result.assets[0].uri);
    setStep(4); // jump to review
  };

  if (step === 0) {
    const enough = state.photos.length >= MIN_PHOTOS;
    const canContinue = enough;
    return (
      <OnboardingShell
        step={0}
        total={TOTAL}
        title="Add your photos"
        subtitle="Choose photos that best represent you. Your first photo will be shown as your cover."
        onBack={goBack}
        onNext={goNext}
        canNext={canContinue}
        nextLabel="Continue to Verification"
      >
        <PhotoUploadGrid photos={state.photos} onChange={setPhotos} />
        {!enough ? (
          <Text style={styles.helperText}>
            Please upload at least {MIN_PHOTOS} photos to continue. ({state.photos.length}/{MIN_PHOTOS})
          </Text>
        ) : null}
      </OnboardingShell>
    );
  }

  if (step === 1) {
    return (
      <OnboardingShell
        step={1}
        total={TOTAL}
        title="Verify your identity"
        subtitle="We verify every profile to help keep Zomyra safe, authentic, and free from fake accounts."
        onBack={goBack}
        onNext={goNext}
        canNext
        nextLabel="Start Verification"
      >
        <View style={styles.shieldWrap}>
          <View style={styles.shieldCircle}>
            <ShieldCheck size={28} color="#fff" />
          </View>
        </View>
        <View style={{ marginTop: 24, gap: 8 }}>
          {[
            "Better visibility in search",
            "A safer community for everyone",
          ].map((t) => (
            <View key={t} style={styles.benefitRow}>
              <View style={styles.benefitCheck}>
                <Check size={12} color={colors.primary} strokeWidth={3} />
              </View>
              <Text style={styles.benefitText}>{t}</Text>
            </View>
          ))}
        </View>
        <View style={styles.calloutBox}>
          <Text style={styles.calloutText}>
            Your verification selfie is only used for identity verification and will never be shown publicly.
          </Text>
        </View>
      </OnboardingShell>
    );
  }

  if (step === 2) {
    return (
      <OnboardingShell
        step={2}
        total={TOTAL}
        title="Take a verification selfie"
        subtitle="Follow the pose shown below so we can confirm you're the same person in your profile photos."
        onBack={goBack}
        onNext={captureSelfie}
        canNext
        nextLabel="Open Camera"
      >
        <View style={styles.poseWrap}>
          <View style={styles.poseFrame}>
            <View style={styles.poseHead} />
            <View style={styles.poseShoulders} />
          </View>
        </View>
        <View style={styles.tipsGrid}>
          {[
            { Icon: Sun, t: "Good lighting" },
            { Icon: UserCircle2, t: "Full face visible" },
            { Icon: X, t: "No sunglasses" },
            { Icon: X, t: "No hats or filters" },
          ].map((x) => (
            <View key={x.t} style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <x.Icon size={14} color={colors.primary} />
              </View>
              <Text style={styles.tipText}>{x.t}</Text>
            </View>
          ))}
        </View>
      </OnboardingShell>
    );
  }

  if (step === 3 || step === 4) {
    return (
      <OnboardingShell
        step={4}
        total={TOTAL}
        title="Does this look good?"
        subtitle="Make sure your face is clearly visible before continuing."
        onBack={() => setStep(2)}
        onNext={async () => {
          setSubmitting(true);
          await new Promise((r) => setTimeout(r, 900));
          submit();
          setSubmitting(false);
          setStep(5);
        }}
        canNext={!!state.selfieUri}
        nextLabel="Use This Selfie"
        loading={submitting}
      >
        <View style={{ alignItems: "center" }}>
          <View style={styles.selfiePreview}>
            {state.selfieUri ? (
              <Image source={{ uri: state.selfieUri }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <ImagePlus size={28} color={colors.mutedForeground} />
            )}
          </View>
          <Pressable
            testID="retake-selfie"
            onPress={() => {
              setSelfie(null);
              setStep(2);
              captureSelfie();
            }}
            style={({ pressed }) => [styles.retakeBtn, pressed && { opacity: 0.9 }]}
          >
            <Camera size={16} color={colors.foreground} />
            <Text style={styles.retakeText}>Retake Selfie</Text>
          </Pressable>
        </View>
      </OnboardingShell>
    );
  }

  // step 5: submitted
  return (
    <OnboardingShell
      step={5}
      total={TOTAL}
      title="Verification submitted"
      subtitle="We're reviewing your profile."
      onBack={goBack}
      onNext={() => router.replace("/matching")}
      canNext
      nextLabel="Discover your matches"
    >
      <View style={styles.shieldWrap}>
        <View style={styles.successCircle}>
          <Check size={28} color="#fff" strokeWidth={2.5} />
        </View>
      </View>
      <View style={styles.statusList}>
        <StatusRow done label="Photos uploaded" />
        <StatusRow done label="Verification selfie submitted" />
        <StatusRow pending label="Identity verification in progress" />
      </View>
      <View style={styles.calloutBox}>
        <Clock size={14} color={colors.mutedForeground} />
        <Text style={[styles.calloutText, { flex: 1, marginLeft: 6 }]}>
          Verification is usually completed within a few hours and always within 24 hours.
        </Text>
      </View>
    </OnboardingShell>
  );
}

function StatusRow({ label, done, pending }: { label: string; done?: boolean; pending?: boolean }) {
  return (
    <View style={styles.statusRow}>
      <View
        style={[
          styles.statusDot,
          done && { backgroundColor: colors.primary },
          pending && { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
        ]}
      >
        {done ? (
          <Check size={12} color="#fff" strokeWidth={3.5} />
        ) : (
          <Clock size={10} color={colors.mutedForeground} />
        )}
      </View>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{done ? "Complete" : pending ? "In progress" : ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  helperText: { marginTop: 12, fontSize: 13, fontWeight: "600", color: colors.mutedForeground },
  shieldWrap: { alignItems: "center" },
  shieldCircle: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  benefitCheck: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { fontSize: 14, fontWeight: "600", color: colors.foreground, flex: 1 },
  calloutBox: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(244,234,251,0.6)",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  calloutText: { fontSize: 13, lineHeight: 19, color: colors.mutedForeground },
  poseWrap: { alignItems: "center" },
  poseFrame: {
    width: 128,
    height: 168,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
    overflow: "hidden",
  },
  poseHead: {
    position: "absolute",
    top: 28,
    left: "50%",
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(91,44,111,0.7)",
    backgroundColor: colors.card,
  },
  poseShoulders: {
    position: "absolute",
    bottom: -16,
    left: "50%",
    marginLeft: -56,
    width: 112,
    height: 64,
    borderTopLeftRadius: 56,
    borderTopRightRadius: 56,
    borderWidth: 2,
    borderColor: "rgba(91,44,111,0.6)",
    backgroundColor: colors.card,
  },
  tipsGrid: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    width: "48.5%",
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  selfiePreview: {
    width: 180,
    height: 240,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  retakeBtn: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  retakeText: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  statusList: {
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusDot: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  statusLabel: { fontSize: 14, fontWeight: "600", color: colors.foreground, flex: 1 },
  statusValue: { fontSize: 12, fontWeight: "600", color: colors.mutedForeground },
});
