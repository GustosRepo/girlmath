import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../components/GradientBackground';
import ScreenTransition from '../components/ScreenTransition';
import GradientCard from '../components/GradientCard';
import { COLORS, GRADIENTS } from '../utils/theme';
import { loadTreatBudget, saveTreatBudget, addTreatSpend } from '../utils/storage';
import { fmt$ } from '../utils/finance';
import { TreatYourselfBudget } from '../types';

export default function TreatYourselfScreen() {
  const navigation = useNavigation();
  const [budget, setBudget] = useState<TreatYourselfBudget>({ monthlyLimit: 100, spent: 0, periodStart: new Date().toISOString() });
  const [spendInput, setSpendInput] = useState('');
  const [spendNote, setSpendNote] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [editingLimit, setEditingLimit] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadTreatBudget().then(b => {
        setBudget(b);
        setLimitInput(String(b.monthlyLimit));
      });
      setSpendInput('');
      setSpendNote('');
      setJustConfirmed('');
    }, []),
  );

  const remaining = Math.max(0, budget.monthlyLimit - budget.spent);
  const pct = budget.monthlyLimit > 0 ? Math.min(budget.spent / budget.monthlyLimit, 1) : 0;

  const ringColor = pct < 0.5 ? '#22C55E' : pct < 0.8 ? '#F59E0B' : '#EF4444';

  const handleSpend = async () => {
    const amount = parseFloat(spendInput);
    if (!amount || amount <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = await addTreatSpend(amount);
    setBudget(updated);
    setJustConfirmed(`logged ${fmt$(amount)} 💅`);
    setSpendInput('');
    setSpendNote('');
    setTimeout(() => setJustConfirmed(''), 3000);
  };

  const handleSaveLimit = async () => {
    const val = parseFloat(limitInput);
    if (!val || val <= 0) return;
    const updated = { ...budget, monthlyLimit: val };
    setBudget(updated);
    await saveTreatBudget(updated);
    setEditingLimit(false);
  };

  const handleReset = async () => {
    const updated = { ...budget, spent: 0, periodStart: new Date().toISOString() };
    setBudget(updated);
    await saveTreatBudget(updated);
  };

  const vibeMessage = () => {
    if (pct === 0) return "untouched budget energy 👼 stay strong (or don't)";
    if (pct < 0.3) return "you're barely touching it — treat yourself a little more 👑";
    if (pct < 0.6) return "in your balanced era ✨ living your best life responsibly";
    if (pct < 0.8) return "getting a lil spendy but still within bounds 🌸";
    if (pct < 1) return "almost at the limit bestie… tread carefully 💀";
    return "treat budget is GONE. next period starts fresh 🫡";
  };

  return (
    <ScreenTransition>
      <GradientBackground>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backText}>‹ tools</Text>
            </TouchableOpacity>
            <Text style={styles.title}>🎀 treat yourself</Text>
            <Text style={styles.subtitle}>your guilt-free fun money 💅</Text>

            {/* Progress ring card */}
            <GradientCard>
              <View style={styles.ringContainer}>
                <View style={styles.ringOuter}>
                  <View style={[styles.ringFill, {
                    height: `${pct * 100}%` as any,
                    backgroundColor: ringColor,
                    opacity: 0.3,
                  }]} />
                  <View style={styles.ringInner}>
                    <Text style={[styles.ringPct, { color: ringColor }]}>{Math.round(pct * 100)}%</Text>
                    <Text style={styles.ringLabel}>used</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{fmt$(budget.spent)}</Text>
                  <Text style={styles.statLabel}>spent</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: remaining > 0 ? '#22C55E' : '#EF4444' }]}>
                    {fmt$(remaining)}
                  </Text>
                  <Text style={styles.statLabel}>remaining</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{fmt$(budget.monthlyLimit)}</Text>
                  <Text style={styles.statLabel}>limit</Text>
                </View>
              </View>

              <Text style={styles.vibeMsg}>{vibeMessage()}</Text>
            </GradientCard>

            {/* Log a spend */}
            <GradientCard>
              <Text style={styles.sectionTitle}>💸 log a treat spend</Text>
              <View style={styles.inputRow}>
                <Text style={styles.dollar}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={spendInput}
                  onChangeText={setSpendInput}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <TextInput
                style={styles.noteInput}
                value={spendNote}
                onChangeText={setSpendNote}
                placeholder="what was it? (optional)"
                placeholderTextColor={COLORS.textMuted}
              />
              {justConfirmed ? (
                <Text style={styles.confirmedText}>{justConfirmed}</Text>
              ) : (
                <TouchableOpacity onPress={handleSpend} activeOpacity={0.8}>
                  <LinearGradient
                    colors={GRADIENTS.button as [string, string, ...string[]]}
                    style={styles.logBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.logBtnText}>✨ log treat spend</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </GradientCard>

            {/* Edit limit */}
            <GradientCard>
              <Text style={styles.sectionTitle}>🎯 budget limit</Text>
              {editingLimit ? (
                <View style={styles.limitEditRow}>
                  <Text style={styles.dollar}>$</Text>
                  <TextInput
                    style={styles.limitInput}
                    value={limitInput}
                    onChangeText={setLimitInput}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleSaveLimit} style={styles.saveLimitBtn}>
                    <Text style={styles.saveLimitText}>save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setEditingLimit(true)} style={styles.limitDisplay}>
                  <Text style={styles.limitDisplayText}>{fmt$(budget.monthlyLimit)} per period</Text>
                  <Text style={styles.limitEditHint}>tap to change ✏️</Text>
                </TouchableOpacity>
              )}
            </GradientCard>

            {/* Reset */}
            <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
              <Text style={styles.resetText}>🔄 reset for new period</Text>
            </TouchableOpacity>

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
  ringContainer: { alignItems: 'center', marginBottom: 16 },
  ringOuter: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)', overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center' },
  ringFill: { position: 'absolute', bottom: 0, width: '100%' },
  ringInner: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  ringPct: { fontSize: 28, fontWeight: '900' },
  ringLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(0,0,0,0.1)' },
  vibeMsg: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, paddingHorizontal: 14, marginBottom: 10 },
  dollar: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '900', color: COLORS.textPrimary, paddingVertical: 10 },
  noteInput: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.textPrimary, marginBottom: 12 },
  confirmedText: { fontSize: 16, fontWeight: '800', color: '#22C55E', textAlign: 'center', paddingVertical: 12 },
  logBtn: { borderRadius: 20, paddingVertical: 14, alignItems: 'center' },
  logBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  limitEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  limitInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  saveLimitBtn: { backgroundColor: COLORS.pinkHot, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  saveLimitText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  limitDisplay: { alignItems: 'center', paddingVertical: 8 },
  limitDisplayText: { fontSize: 22, fontWeight: '900', color: COLORS.pinkHot },
  limitEditHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontStyle: 'italic' },
  resetBtn: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20 },
  resetText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
});
