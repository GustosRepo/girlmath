import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS, COLORS } from '../utils/theme';

interface GradientCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  colors?: readonly [string, string, ...string[]];
}

export default function GradientCard({ children, style, colors }: GradientCardProps) {
  return (
    <LinearGradient
      colors={colors ?? (GRADIENTS.card as [string, string, ...string[]])}
      style={[styles.card, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1.5,
    borderColor: COLORS.glassBorder,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
});
