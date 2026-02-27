import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../utils/theme';

interface ChatBubbleProps {
  message: string;
  emoji: string;
  reactions: string[];
  itemName?: string;
  price?: number;
}

export default function ChatBubble({ message, emoji, reactions, itemName, price }: ChatBubbleProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shotRef = useRef<ViewShot>(null);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [message]);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const uri = await (shotRef.current as any)?.capture?.();
      if (uri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your GirlMath justification 💅',
        });
      }
    } catch {
      // Fallback: shouldn't happen but fail silently
    }
  };

  const priceText = price ? `$${price}` : '';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Capturable card with gradient background */}
      <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
        <LinearGradient
          colors={GRADIENTS.background as [string, string, ...string[]]}
          style={styles.shotWrap}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Branding header */}
          <Text style={styles.brandHeader}>💖 GirlMath</Text>
          {itemName ? (
            <Text style={styles.itemLabel}>{itemName} {priceText ? `· ${priceText}` : ''}</Text>
          ) : null}

          {/* The bubble */}
          <View style={styles.bubble}>
            <Text style={styles.sparkleTop}>✨ 💫 ✨</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.sparkleBottom}>💖 🌟 💖</Text>
          </View>

          {/* Reactions */}
          <View style={styles.reactionsRow}>
            {reactions.map((r, i) => (
              <View key={i} style={styles.reactionChip}>
                <Text style={styles.reactionText}>{r}</Text>
              </View>
            ))}
          </View>

          {/* Footer watermark */}
          <Text style={styles.watermark}>girlmath app · your bestie for bad financial decisions 💅</Text>
        </LinearGradient>
      </ViewShot>

      {/* Share button (outside the screenshot area) */}
      <TouchableOpacity onPress={handleShare} style={styles.shareButton} activeOpacity={0.7}>
        <Text style={styles.shareText}>📤 share this justification</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  shotWrap: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
  },
  brandHeader: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 4,
    textShadowColor: 'rgba(192,132,252,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  bubble: {
    backgroundColor: COLORS.whiteTranslucent,
    borderRadius: 24,
    borderTopLeftRadius: 4,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.glassBorder,
  },
  sparkleTop: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 8,
    letterSpacing: 4,
  },
  message: {
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  sparkleBottom: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 10,
    letterSpacing: 4,
  },
  reactionsRow: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'center',
    gap: 8,
  },
  reactionChip: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  reactionText: {
    fontSize: 18,
  },
  watermark: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  shareButton: {
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  shareText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.pinkHot,
    letterSpacing: 0.3,
  },
});
