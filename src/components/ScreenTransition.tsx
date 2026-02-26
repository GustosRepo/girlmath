import React, { useRef, useCallback } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Wraps a tab screen with a soft fade + slide-up on every focus.
 * Drop this around the outermost View/ScrollView of any screen.
 */
export default function ScreenTransition({ children, style }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useFocusEffect(
    useCallback(() => {
      // Reset instantly, then animate in
      fadeAnim.setValue(0);
      slideAnim.setValue(18);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, [])
  );

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
