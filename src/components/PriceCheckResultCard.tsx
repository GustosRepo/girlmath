import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS } from '../utils/theme';
import { PriceCheckResult, PriceVerdict } from '../types';

const verdictConfig: Record<PriceVerdict, { label: string; emoji: string; color: string; cat: any }> = {
  steal: { label: 'STEAL 🔥', emoji: '🤑', color: '#34D399', cat: require('../../assets/smallhappyshoppingbagv3.png') },
  fair: { label: 'Fair price', emoji: '👍', color: COLORS.textSecondary, cat: require('../../assets/smallcatshoppingbagv2.png') },
  overpriced: { label: 'Overpriced', emoji: '😬', color: '#F87171', cat: require('../../assets/smalldevilcat.png') },
};

interface PriceCheckResultCardProps {
  result: PriceCheckResult;
}

export default function PriceCheckResultCard({ result }: PriceCheckResultCardProps) {
  const vc = verdictConfig[result.verdict];

  return (
    <View style={styles.container}>
      {/* Verdict */}
      <View style={[styles.verdictBadge, { backgroundColor: vc.color + '22' }]}>
        <Image source={vc.cat} style={styles.verdictCat} />
        <Text style={[styles.verdictText, { color: vc.color }]}>
          {vc.label}
        </Text>
      </View>

      {/* Range */}
      <Text style={styles.range}>
        price range: ${result.range.low.toFixed(2)} – ${result.range.high.toFixed(2)}
      </Text>

      {/* Options */}
      {result.topOptions.map((opt, i) => (
        <View key={i} style={styles.optionRow}>
          <Text style={styles.storeName}>🏪 {opt.store}</Text>
          <View style={styles.optionRight}>
            <Text style={styles.optionPrice}>${opt.price.toFixed(2)}</Text>
            {opt.note ? <Text style={styles.optionNote}>{opt.note}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
    gap: 8,
  },
  verdictCat: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  range: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 10,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  optionRight: {
    alignItems: 'flex-end',
  },
  optionPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  optionNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
