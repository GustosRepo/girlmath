import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { SPARKLE_CHARS } from '../utils/theme';

const { width, height } = Dimensions.get('window');
const SPARKLE_COUNT = 12;

interface Sparkle {
  char: string;
  x: number;
  y: number;
  size: number;
  anim: Animated.Value;
  delay: number;
}

function createSparkles(): Sparkle[] {
  return Array.from({ length: SPARKLE_COUNT }, (_, i) => ({
    char: SPARKLE_CHARS[i % SPARKLE_CHARS.length],
    x: Math.random() * width,
    y: Math.random() * height,
    size: 12 + Math.random() * 14,
    anim: new Animated.Value(0),
    delay: Math.random() * 3000,
  }));
}

export default function SparkleOverlay() {
  const sparkles = useRef(createSparkles()).current;

  useEffect(() => {
    sparkles.forEach((s) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(s.delay),
          Animated.timing(s.anim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(s.anim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ]),
      ).start();
    });
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {sparkles.map((s, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.sparkle,
            {
              left: s.x,
              top: s.y,
              fontSize: s.size,
              opacity: s.anim,
              transform: [
                {
                  scale: s.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.2],
                  }),
                },
              ],
            },
          ]}
        >
          {s.char}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  sparkle: {
    position: 'absolute',
  },
});
