import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../components/GradientBackground';
import ScreenTransition from '../components/ScreenTransition';
import GradientCard from '../components/GradientCard';
import { COLORS, GRADIENTS } from '../utils/theme';
import { loadState } from '../utils/storage';
import { computeSpendable, fmt$ } from '../utils/finance';
import { MoneyContext } from '../types';
import { LinearGradient } from 'expo-linear-gradient';

const DEFAULT_CTX: MoneyContext = {
  payFrequency: 'biweekly',
  payAmount: 0,
  rent: 0,
  carNote: 0,
  billsTotal: 0,
  savingsGoalPct: 10,
};

type Verdict = 'yes' | 'kinda' | 'no' | null;

interface Result {
  verdict: Verdict;
  headline: string;
  detail: string;
  emoji: string;
  color: string;
}

function getResult(price: number, spendablePeriod: number, monthlyIncome: number): Result {
  if (spendablePeriod <= 0) {
    // No money context — use rough heuristics
    if (price < 20) return { verdict: 'yes', headline: 'yeah, treat yourself', detail: "it's under $20 — that's pocket change bestie", emoji: '✅', color: '#22C55E' };
    if (price < 100) return { verdict: 'kinda', headline: 'probably fine honestly', detail: "not a huge amount but make sure rent is covered first 👀", emoji: '🤔', color: '#F59E0B' };
    return { verdict: 'no', headline: 'set up your money context first', detail: 'go to Bills tab → enter your income & bills for a real answer ✨', emoji: '📋', color: '#6B7280' };
  }

  const pct = (price / spendablePeriod) * 100;

  if (pct <= 5) return {
    verdict: 'yes',
    headline: 'yes queen, you can afford it 👑',
    detail: `this is only ${pct.toFixed(1)}% of your spendable this period — barely a blip`,
    emoji: '✅',
    color: '#22C55E',
  };
  if (pct <= 15) return {
    verdict: 'yes',
    headline: 'yeah, manageable tbh',
    detail: `${pct.toFixed(1)}% of your spendable — tight but doable if nothing else comes up`,
    emoji: '🟡',
    color: '#84CC16',
  };
  if (pct <= 30) return {
    verdict: 'kinda',
    headline: 'technically yes but bestie…',
    detail: `${pct.toFixed(1)}% of your spendable — you CAN but you might regret it`,
    emoji: '😬',
    color: '#F59E0B',
  };
  if (pct <= 60) return {
    verdict: 'no',
    headline: 'girlie this is a lot',
    detail: `${pct.toFixed(1)}% of your spendable — this will hurt. wait a period or two? 💀`,
    emoji: '🚨',
    color: '#EF4444',
  };
  return {
    verdict: 'no',
    headline: 'absolutely not right now',
    detail: `${pct.toFixed(1)}% of your spendable — this is more than half your free money. not today 🙅‍♀️`,
    emoji: '💀',
    color: '#DC2626',
  };
}

export default function CanIAffordItScreen() {
  const navigation = useNavigation();
  const [priceInput, setPriceInput] = useState('');
  const [moneyCtx, setMoneyCtx] = useState<MoneyContext>(DEFAULT_CTX);
  const [result, setResult] = useState<Result | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadState().then(s => { if (s.moneyContext) setMoneyCtx(s.moneyContext); });
      setResult(null);
      setPriceInput('');
    }, []),
  );

  const check = () => {
    const price = parseFloat(priceInput);
    if (!price || price <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const spendable = moneyCtx.payAmount > 0
      ? computeSpendable(moneyCtx, price, 0)
      : null;
    setResult(getResult(price, spendable?.perPeriod ?? 0, moneyCtx.payAmount));
  };

  const hasContext = moneyCtx.payAmount > 0;
  const spendable = hasContext ? computeSpendable(moneyCtx, parseFloat(priceInput) || 0, 0) : null;

  return (
    <ScreenTransition>
      <GradientBackground>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backText}>‹ tools</Text>
            </TouchableOpacity>
            <Text style={styles.title}>🤔 can i afford it?</Text>
            <Text style={styles.subtitle}>no judgment, just math ✨</Text>

            {!hasContext && (
              <GradientCard>
                <Text style={styles.hintText}>
                  💡 for a real answer, set up your income & bills in the Bills tab first.
                  right now using general vibes only 👀
                </Text>
              </GradientCard>
            )}

            {hasContext && (
              <GradientCard>
                <Text style={styles.contextLabel}>your spendable per period</Text>
                <Text style={styles.contextValue}>
                  {fmt$(computeSpendable(moneyCtx, 0, 0).perPeriod)}
                </Text>
                <Text style={styles.contextSub}>after rent, bills & savings goal</Text>
              </GradientCard>
            )}

            <GradientCard>
              <Text style={styles.inputLabel}>💰 how much is it?</Text>
              <View style={styles.priceRow}>
                <Text style={styles.dollar}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  value={priceInput}
                  onChangeText={t => { setPriceInput(t); setResult(null); }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={check}
                />
              </View>

              <TouchableOpacity onPress={check} activeOpacity={0.8} style={{ marginTop: 12 }}>
                <LinearGradient
                  colors={GRADIENTS.button as [string, string, ...string[]]}
                  style={styles.checkBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.checkBtnText}>🔮 check the vibe</Text>
                </LinearGradient>
              </TouchableOpacity>
            </GradientCard>

            {result && (
              <GradientCard>
                <View style={[styles.verdictBadge, { backgroundColor: result.color + '20', borderColor: result.color }]}>
                  <Text style={styles.verdictEmoji}>{result.emoji}</Text>
                  <Text style={[styles.verdictHeadline, { color: result.color }]}>{result.headline}</Text>
                </View>
                <Text style={styles.verdictDetail}>{result.detail}</Text>

                {hasContext && spendable && parseFloat(priceInput) > 0 && (
                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownItem}>
                      <Text style={styles.breakdownValue}>{fmt$(parseFloat(priceInput))}</Text>
                      <Text style={styles.breakdownLabel}>purchase</Text>
                    </View>
                    <Text style={styles.breakdownDiv}>÷</Text>
                    <View style={styles.breakdownItem}>
                      <Text style={styles.breakdownValue}>{fmt$(spendable.perPeriod)}</Text>
                      <Text style={styles.breakdownLabel}>spendable</Text>
                    </View>
                    <Text style={styles.breakdownDiv}>=</Text>
                    <View style={styles.breakdownItem}>
                      <Text style={[styles.breakdownValue, { color: result.color }]}>
                        {spendable.purchasePct.toFixed(1)}%
                      </Text>
                      <Text style={styles.breakdownLabel}>of budget</Text>
                    </View>
                  </View>
                )}
              </GradientCard>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </GradientBackground>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  back: { marginBottom: 8 },
  backText: { color: COLORS.whiteTranslucent, fontSize: 16, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.white, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  subtitle: { fontSize: 14, color: COLORS.whiteTranslucent, textAlign: 'center', marginBottom: 20, letterSpacing: 1.5 },
  hintText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, textAlign: 'center', fontStyle: 'italic' },
  contextLabel: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', fontWeight: '600' },
  contextValue: { fontSize: 32, fontWeight: '900', color: COLORS.pinkHot, textAlign: 'center', marginVertical: 4 },
  contextSub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontStyle: 'italic' },
  inputLabel: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4 },
  dollar: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginRight: 4 },
  priceInput: { flex: 1, fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, paddingVertical: 10 },
  checkBtn: { borderRadius: 20, paddingVertical: 14, alignItems: 'center' },
  checkBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  verdictBadge: { borderRadius: 16, borderWidth: 2, paddingVertical: 16, paddingHorizontal: 16, alignItems: 'center', marginBottom: 12 },
  verdictEmoji: { fontSize: 36, marginBottom: 6 },
  verdictHeadline: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  verdictDetail: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, textAlign: 'center' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8 },
  breakdownItem: { alignItems: 'center', minWidth: 70 },
  breakdownValue: { fontSize: 16, fontWeight: '900', color: COLORS.textPrimary },
  breakdownLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  breakdownDiv: { fontSize: 20, color: COLORS.textMuted, fontWeight: '800' },
});
