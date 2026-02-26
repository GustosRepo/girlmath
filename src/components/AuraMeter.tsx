import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../utils/theme';
import { AuraLevel, SpendableResult } from '../types';

interface AuraMeterProps {
  /** Fallback: plain price (used when no money context) */
  price: number;
  /** If money context provided, use purchase-pct for aura */
  spendable?: SpendableResult;
}

function getAura(
  price: number,
  spendable?: SpendableResult,
): { level: AuraLevel; label: string; emoji: string; colors: string[]; fill: number } {
  // When we have money context, use % of spendable
  if (spendable) {
    const pct = spendable.purchasePct;
    if (spendable.perPeriod <= 0 || pct > 15)
      return { level: 'broke', label: 'broke aura', emoji: '💀', colors: GRADIENTS.auraBroke, fill: 1 };
    if (pct > 5)
      return { level: 'healing', label: 'healing era', emoji: '🫶', colors: GRADIENTS.auraHeal, fill: pct / 20 };
    return { level: 'glowing', label: 'financially glowing', emoji: '✨', colors: GRADIENTS.auraGlow, fill: pct / 20 };
  }

  // Fallback: simple price thresholds
  if (price <= 30)
    return { level: 'glowing', label: 'financially glowing', emoji: '✨', colors: GRADIENTS.auraGlow, fill: price / 150 };
  if (price <= 100)
    return { level: 'healing', label: 'healing era', emoji: '🫶', colors: GRADIENTS.auraHeal, fill: price / 150 };
  return { level: 'broke', label: 'broke aura', emoji: '💀', colors: GRADIENTS.auraBroke, fill: 1 };
}

export default function AuraMeter({ price, spendable }: AuraMeterProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const aura = getAura(price, spendable);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const fillPct = Math.max(Math.min(aura.fill, 1), 0.08);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💫 budget aura meter</Text>
      <View style={styles.barBackground}>
        <LinearGradient
          colors={aura.colors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.barFill, { width: `${fillPct * 100}%` }]}
        />
      </View>
      <Animated.Text style={[styles.label, { transform: [{ scale: pulseAnim }] }]}>
        {aura.emoji} {aura.label} {aura.emoji}
      </Animated.Text>
      {aura.level === 'glowing' && (
        <Image
          source={require('../../assets/smallprincesscat.png')}
          style={styles.princessCat}
        />
      )}
      {spendable && spendable.perPeriod > 0 && (
        <Text style={styles.pctNote}>
          this purchase = {spendable.purchasePct.toFixed(1)}% of your spendable
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'lowercase',
    marginBottom: 10,
  },
  barBackground: {
    width: '100%',
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: {
    height: '100%',
    borderRadius: 7,
  },
  label: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  princessCat: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
    marginTop: 8,
  },
  pctNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6,
    fontWeight: '600',
  },
});
