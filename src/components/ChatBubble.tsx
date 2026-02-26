import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../utils/theme';

interface ChatBubbleProps {
  message: string;
  emoji: string;
  reactions: string[];
}

export default function ChatBubble({ message, emoji, reactions }: ChatBubbleProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [message]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.headerRow}>
        <Text style={styles.sender}>💖 GirlMath</Text>
        <Text style={styles.headerEmoji}>{emoji}</Text>
      </View>
      <View style={styles.bubble}>
        <Text style={styles.sparkleTop}>✨ 💫 ✨</Text>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.sparkleBottom}>💖 🌟 💖</Text>
      </View>
      <View style={styles.reactionsRow}>
        {reactions.map((r, i) => (
          <View key={i} style={styles.reactionChip}>
            <Text style={styles.reactionText}>{r}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  sender: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.pinkHot,
    letterSpacing: 0.5,
  },
  headerEmoji: {
    fontSize: 16,
    marginLeft: 6,
  },
  bubble: {
    backgroundColor: COLORS.whiteTranslucent,
    borderRadius: 24,
    borderTopLeftRadius: 4,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.glassBorder,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
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
    marginTop: 8,
    paddingHorizontal: 4,
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
});
