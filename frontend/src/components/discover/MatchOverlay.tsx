/**
 * MatchOverlay — Animated overlay shown when two users mutually express interest
 * Features: interlocking rings, floating hearts/sparkles, profile photos, action buttons
 */
import { useRouter } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const SCREEN = Dimensions.get("window");
const PURPLE = "#5B2C6F";

type Props = {
  visible: boolean;
  currentUserPhoto: string;
  matchedUserPhoto: string;
  matchedUserName: string;
  matchedUserId: string;
  onStartConversation: () => void;
  onKeepDiscovering: () => void;
};

export function MatchOverlay({
  visible,
  currentUserPhoto,
  matchedUserPhoto,
  matchedUserName,
  matchedUserId,
  onStartConversation,
  onKeepDiscovering,
}: Props) {
  const router = useRouter();

  // Animation values
  const overlayOpacity = useSharedValue(0);
  const ringsScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const photosScale = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(50);

  // Floating elements
  const heart1Opacity = useSharedValue(0);
  const heart1TranslateY = useSharedValue(0);
  const heart2Opacity = useSharedValue(0);
  const heart2TranslateY = useSharedValue(0);
  const heart3Opacity = useSharedValue(0);
  const heart3TranslateY = useSharedValue(0);
  
  const sparkle1Opacity = useSharedValue(0);
  const sparkle1Scale = useSharedValue(0);
  const sparkle2Opacity = useSharedValue(0);
  const sparkle2Scale = useSharedValue(0);
  const sparkle3Opacity = useSharedValue(0);
  const sparkle3Scale = useSharedValue(0);
  const sparkle4Opacity = useSharedValue(0);
  const sparkle4Scale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Haptic feedback
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        // Haptics not available
      }

      // Staggered entrance animation
      overlayOpacity.value = withTiming(1, { duration: 300 });
      
      setTimeout(() => {
        ringsScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      }, 100);
      
      setTimeout(() => {
        titleOpacity.value = withTiming(1, { duration: 400 });
      }, 300);
      
      setTimeout(() => {
        photosScale.value = withSpring(1, { damping: 10, stiffness: 80 });
      }, 500);
      
      setTimeout(() => {
        buttonsTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      }, 700);

      // Floating hearts animation
      setTimeout(() => {
        heart1Opacity.value = withSequence(
          withTiming(1, { duration: 400 }),
          withRepeat(
            withSequence(
              withTiming(0.7, { duration: 1000 }),
              withTiming(1, { duration: 1000 })
            ),
            -1
          )
        );
        heart1TranslateY.value = withRepeat(
          withTiming(-20, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      }, 800);

      setTimeout(() => {
        heart2Opacity.value = withSequence(
          withTiming(1, { duration: 400 }),
          withRepeat(
            withSequence(
              withTiming(0.6, { duration: 1200 }),
              withTiming(1, { duration: 1200 })
            ),
            -1
          )
        );
        heart2TranslateY.value = withRepeat(
          withTiming(-15, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      }, 900);

      setTimeout(() => {
        heart3Opacity.value = withSequence(
          withTiming(1, { duration: 400 }),
          withRepeat(
            withSequence(
              withTiming(0.8, { duration: 1100 }),
              withTiming(1, { duration: 1100 })
            ),
            -1
          )
        );
        heart3TranslateY.value = withRepeat(
          withTiming(-18, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      }, 1000);

      // Sparkles animation
      setTimeout(() => {
        sparkle1Opacity.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 500 }),
            withTiming(0, { duration: 500 })
          ),
          -1
        );
        sparkle1Scale.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 500 }),
            withTiming(1.2, { duration: 500 })
          ),
          -1
        );
      }, 600);

      setTimeout(() => {
        sparkle2Opacity.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 600 }),
            withTiming(0, { duration: 600 })
          ),
          -1
        );
        sparkle2Scale.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 600 }),
            withTiming(1.3, { duration: 600 })
          ),
          -1
        );
      }, 700);

      setTimeout(() => {
        sparkle3Opacity.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 550 }),
            withTiming(0, { duration: 550 })
          ),
          -1
        );
        sparkle3Scale.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 550 }),
            withTiming(1.1, { duration: 550 })
          ),
          -1
        );
      }, 800);

      setTimeout(() => {
        sparkle4Opacity.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 650 }),
            withTiming(0, { duration: 650 })
          ),
          -1
        );
        sparkle4Scale.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 650 }),
            withTiming(1.25, { duration: 650 })
          ),
          -1
        );
      }, 900);
    } else {
      // Reset animations
      overlayOpacity.value = 0;
      ringsScale.value = 0;
      titleOpacity.value = 0;
      photosScale.value = 0;
      buttonsTranslateY.value = 50;
      heart1Opacity.value = 0;
      heart2Opacity.value = 0;
      heart3Opacity.value = 0;
      sparkle1Opacity.value = 0;
      sparkle2Opacity.value = 0;
      sparkle3Opacity.value = 0;
      sparkle4Opacity.value = 0;
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const ringsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringsScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const photosStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photosScale.value }],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  // Floating hearts styles
  const heart1Style = useAnimatedStyle(() => ({
    opacity: heart1Opacity.value,
    transform: [{ translateY: heart1TranslateY.value }],
  }));

  const heart2Style = useAnimatedStyle(() => ({
    opacity: heart2Opacity.value,
    transform: [{ translateY: heart2TranslateY.value }],
  }));

  const heart3Style = useAnimatedStyle(() => ({
    opacity: heart3Opacity.value,
    transform: [{ translateY: heart3TranslateY.value }],
  }));

  // Sparkles styles
  const sparkle1Style = useAnimatedStyle(() => ({
    opacity: sparkle1Opacity.value,
    transform: [{ scale: sparkle1Scale.value }],
  }));

  const sparkle2Style = useAnimatedStyle(() => ({
    opacity: sparkle2Opacity.value,
    transform: [{ scale: sparkle2Scale.value }],
  }));

  const sparkle3Style = useAnimatedStyle(() => ({
    opacity: sparkle3Opacity.value,
    transform: [{ scale: sparkle3Scale.value }],
  }));

  const sparkle4Style = useAnimatedStyle(() => ({
    opacity: sparkle4Opacity.value,
    transform: [{ scale: sparkle4Scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="box-none">
      <View style={styles.content}>
          {/* Floating Hearts */}
          <Animated.View style={[styles.heart, styles.heart1, heart1Style]}>
            <Text style={styles.heartEmoji}>💜</Text>
          </Animated.View>
          <Animated.View style={[styles.heart, styles.heart2, heart2Style]}>
            <Text style={styles.heartEmoji}>💕</Text>
          </Animated.View>
          <Animated.View style={[styles.heart, styles.heart3, heart3Style]}>
            <Text style={styles.heartEmoji}>💗</Text>
          </Animated.View>

          {/* Sparkles */}
          <Animated.View style={[styles.sparkle, styles.sparkle1, sparkle1Style]}>
            <Text style={styles.sparkleEmoji}>✨</Text>
          </Animated.View>
          <Animated.View style={[styles.sparkle, styles.sparkle2, sparkle2Style]}>
            <Text style={styles.sparkleEmoji}>⭐</Text>
          </Animated.View>
          <Animated.View style={[styles.sparkle, styles.sparkle3, sparkle3Style]}>
            <Text style={styles.sparkleEmoji}>✨</Text>
          </Animated.View>
          <Animated.View style={[styles.sparkle, styles.sparkle4, sparkle4Style]}>
            <Text style={styles.sparkleEmoji}>💫</Text>
          </Animated.View>

          {/* Interlocking Rings Icon */}
          <Animated.View style={[styles.ringsContainer, ringsStyle]}>
            <View style={styles.rings}>
              <View style={[styles.ring, styles.ringLeft]} />
              <View style={[styles.ring, styles.ringRight]} />
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View style={titleStyle}>
            <Text style={styles.title}>It's mutual!</Text>
            <Text style={styles.subtitle}>
              You and {matchedUserName} have expressed{'\n'}interest in each other.
            </Text>
          </Animated.View>

          {/* Profile Photos */}
          <Animated.View style={[styles.photosContainer, photosStyle]}>
            <View style={styles.photoWrapper}>
              <Image
                source={{ uri: currentUserPhoto }}
                style={styles.photo}
              />
              <View style={styles.photoRing} />
            </View>
            <View style={[styles.photoWrapper, styles.photoWrapperRight]}>
              <Image
                source={{ uri: matchedUserPhoto }}
                style={styles.photo}
              />
              <View style={styles.photoRing} />
            </View>
          </Animated.View>

          {/* Profile Info Below Photos */}
          <Animated.View style={[styles.profileInfo, photosStyle]}>
            <Text style={styles.profileName}>{matchedUserName}, 29</Text>
            <Text style={styles.profileJob}>Senior Product Designer</Text>
            <Text style={styles.profileLocation}>Bengaluru</Text>
            
            <View style={styles.profileStats}>
              <View style={styles.stat}>
                <Text style={styles.statIcon}>📏</Text>
                <Text style={styles.statText}>5'10"</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statIcon}>💪</Text>
                <Text style={styles.statText}>Athletic</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statIcon}>💰</Text>
                <Text style={styles.statText}>₹24-30 LPA</Text>
              </View>
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View style={[styles.buttonsContainer, buttonsStyle]}>
            <Pressable
              style={styles.primaryButton}
              onPress={onStartConversation}
            >
              <MessageCircle size={20} color="#fff" strokeWidth={2.5} />
              <Text style={styles.primaryButtonText}>Start Conversation</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={onKeepDiscovering}
            >
              <Text style={styles.secondaryButtonText}>Keep Discovering</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(30, 35, 48, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  content: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 24,
  },
  // Interlocking rings
  ringsContainer: {
    marginBottom: 32,
  },
  rings: {
    width: 120,
    height: 80,
    position: "relative",
  },
  ring: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    borderColor: "#fff",
  },
  ringLeft: {
    left: 0,
    top: 5,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  // Profile Photos
  photosContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  photoWrapper: {
    position: "relative",
  },
  photoWrapperRight: {
    marginLeft: -30,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#fff",
  },
  photoRing: {
    display: "none",
  },
  // Profile Info
  profileInfo: {
    alignItems: "center",
    marginBottom: 32,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  profileJob: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 2,
  },
  profileLocation: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 12,
  },
  profileStats: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    fontSize: 14,
  },
  statText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.75)",
  },
  // Buttons
  buttonsContainer: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: PURPLE,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: PURPLE,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.1,
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    letterSpacing: 0.1,
  },
  // Floating elements
  heart: {
    position: "absolute",
  },
  heart1: {
    top: 120,
    left: 60,
  },
  heart2: {
    top: 180,
    right: 70,
  },
  heart3: {
    bottom: 280,
    right: 50,
  },
  heartEmoji: {
    fontSize: 32,
  },
  sparkle: {
    position: "absolute",
  },
  sparkle1: {
    top: 140,
    left: 40,
  },
  sparkle2: {
    top: 160,
    right: 50,
  },
  sparkle3: {
    bottom: 320,
    left: 60,
  },
  sparkle4: {
    bottom: 300,
    right: 70,
  },
  sparkleEmoji: {
    fontSize: 20,
  },
});
