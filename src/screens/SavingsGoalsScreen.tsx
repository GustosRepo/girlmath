import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Share, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../components/GradientBackground';
import ScreenTransition from '../components/ScreenTransition';
import GradientCard from '../components/GradientCard';
import { COLORS } from '../utils/theme';
import { loadSavingsGoals, saveSavingsGoals, contributeToGoal, loadSavingsJar } from '../utils/storage';
import { fmt$ } from '../utils/finance';
import { SavingsGoal } from '../types';

const GOAL_EMOJIS = ['🎯','✈️','👜','💄','👟','🎪','🎶','📱','🏖️','🛋️','🐾','🎀','💻','🌸','⌚'];

function daysUntilDeadline(deadline: string): number {
  return Math.max(0, Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / 86400000,
  ));
}

function estimatedDate(remaining: number, weeklyAvg: number): string | null {
  if (weeklyAvg <= 0 || remaining <= 0) return null;
  const weeksNeeded = Math.ceil(remaining / weeklyAvg);
  const d = new Date();
  d.setDate(d.getDate() + weeksNeeded * 7);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SavingsGoalsScreen() {
  const navigation = useNavigation();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [jarTotal, setJarTotal] = useState(0);
  const [weeklyJarAvg, setWeeklyJarAvg] = useState(0);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalEmoji, setGoalEmoji] = useState('🎯');

  // Contribute
  const [contributeId, setContributeId] = useState<string | null>(null);
  const [contributeAmt, setContributeAmt] = useState('');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [gs, jar] = await Promise.all([loadSavingsGoals(), loadSavingsJar()]);
        setGoals(gs);
        const total = jar.reduce((s, e) => s + e.price, 0);
        setJarTotal(total);
        // Weekly average: jar entries in last 4 weeks / 4
        const fourWeeksAgo = Date.now() - 28 * 86400000;
        const recent = jar.filter(e => new Date(e.timestamp).getTime() > fourWeeksAgo)
          .reduce((s, e) => s + e.price, 0);
        setWeeklyJarAvg(recent / 4);
      })();
    }, []),
  );

  const handleAddGoal = async () => {
    const target = parseFloat(goalTarget);
    if (!goalName.trim() || target <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newGoal: SavingsGoal = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      name: goalName.trim(),
      emoji: goalEmoji,
      targetAmount: target,
      savedAmount: 0,
      deadline: goalDeadline || undefined,
      createdAt: new Date().toISOString(),
      isComplete: false,
    };
    const updated = [...goals, newGoal];
    setGoals(updated);
    await saveSavingsGoals(updated);
    setShowAdd(false);
    setGoalName('');
    setGoalTarget('');
    setGoalDeadline('');
    setGoalEmoji('🎯');
  };

  const handleContribute = async (goalId: string) => {
    const amt = parseFloat(contributeAmt);
    if (amt <= 0 || isNaN(amt)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = await contributeToGoal(goalId, amt);
    setGoals(updated);
    setContributeId(null);
    setContributeAmt('');
    const goal = updated.find(g => g.id === goalId);
    if (goal?.isComplete) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDelete = (goalId: string) => {
    Alert.alert('delete goal?', 'this cannot be undone', [
      { text: 'cancel', style: 'cancel' },
      {
        text: 'delete', style: 'destructive',
        onPress: async () => {
          const updated = goals.filter(g => g.id !== goalId);
          setGoals(updated);
          await saveSavingsGoals(updated);
        },
      },
    ]);
  };

  const handleShare = async () => {
    const active = goals.filter(g => !g.isComplete);
    const done = goals.filter(g => g.isComplete);
    const lines = [
      '✨ my girl math savings goals ✨',
      '',
      ...(active.length > 0 ? [
        '🎯 working toward:',
        ...active.map(g => `  ${g.emoji} ${g.name} — ${fmt$(g.savedAmount)} / ${fmt$(g.targetAmount)} (${Math.round(g.savedAmount / g.targetAmount * 100)}%)`),
        '',
      ] : []),
      ...(done.length > 0 ? [
        '✅ manifested:',
        ...done.map(g => `  ${g.emoji} ${g.name} — ${fmt$(g.targetAmount)} achieved 🏆`),
        '',
      ] : []),
      `jar total saved: ${fmt$(jarTotal)} 🫙`,
      '',
      'girl math AI 💸',
    ];
    await Share.share({ message: lines.join('\n') });
  };

  return (
    <ScreenTransition>
      <GradientBackground>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>‹ back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🎯 savings goals</Text>
          <Text style={styles.subtitle}>set a goal, skip a thing, get there ✨</Text>

          {/* Jar balance pill */}
          <GradientCard>
            <View style={styles.jarRow}>
              <Text style={styles.jarEmoji}>🫙</Text>
              <View style={styles.jarInfo}>
                <Text style={styles.jarLabel}>savings jar balance</Text>
                <Text style={styles.jarAmt}>{fmt$(jarTotal)}</Text>
              </View>
              {goals.length > 0 && (
                <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.8}>
                  <Text style={styles.shareBtnText}>share 📤</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.jarHint}>allocate your skipped-purchase savings toward goals below ✨</Text>
          </GradientCard>

          {/* Goals list */}
          {goals.map(goal => {
            const pct = goal.targetAmount > 0 ? Math.min(1, goal.savedAmount / goal.targetAmount) : 0;
            const remaining = goal.targetAmount - goal.savedAmount;
            const eta = estimatedDate(remaining, weeklyJarAvg);
            const isContributing = contributeId === goal.id;
            return (
              <GradientCard key={goal.id}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                  <View style={styles.goalInfo}>
                    <View style={styles.goalTitleRow}>
                      <Text style={[styles.goalName, goal.isComplete && styles.goalNameDone]}>
                        {goal.name}
                      </Text>
                      {goal.isComplete && <Text style={styles.doneBadge}>✅ done</Text>}
                    </View>
                    <Text style={styles.goalAmts}>
                      {fmt$(goal.savedAmount)} / {fmt$(goal.targetAmount)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(goal.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Progress bar */}
                <View style={styles.progressTrack}>
                  <View style={[
                    styles.progressFill,
                    {
                      width: `${pct * 100}%` as any,
                      backgroundColor: goal.isComplete ? '#22C55E' : '#C084FC',
                    },
                  ]} />
                </View>
                <View style={styles.progressMeta}>
                  <Text style={styles.progressPct}>{Math.round(pct * 100)}% there</Text>
                  {!goal.isComplete && remaining > 0 && (
                    <Text style={styles.progressRemaining}>{fmt$(remaining)} to go</Text>
                  )}
                </View>

                {/* Deadline & ETA */}
                {goal.deadline && !goal.isComplete && (
                  <Text style={styles.deadlineText}>
                    🗓️ {daysUntilDeadline(goal.deadline)} days until deadline
                  </Text>
                )}
                {eta && !goal.isComplete && (
                  <Text style={styles.etaText}>📈 at your current saving pace: ~{eta}</Text>
                )}

                {/* Contribute row */}
                {!goal.isComplete && (
                  isContributing ? (
                    <View style={styles.contributeRow}>
                      <TextInput
                        style={styles.contributeInput}
                        placeholder="amount"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="decimal-pad"
                        value={contributeAmt}
                        onChangeText={setContributeAmt}
                      />
                      <TouchableOpacity onPress={() => handleContribute(goal.id)} style={styles.contributeConfirmBtn} activeOpacity={0.8}>
                        <Text style={styles.contributeConfirmText}>add 💸</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setContributeId(null); setContributeAmt(''); }} style={styles.cancelBtn}>
                        <Text style={styles.cancelBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => { setContributeId(goal.id); setContributeAmt(''); }}
                      style={styles.contributeBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.contributeBtnText}>+ add savings 🫙</Text>
                    </TouchableOpacity>
                  )
                )}

                {goal.isComplete && (
                  <Text style={styles.completeMsg}>
                    you manifested this bestie 🏆 queen behavior
                  </Text>
                )}
              </GradientCard>
            );
          })}

          {/* Add goal form */}
          {showAdd ? (
            <GradientCard>
              <Text style={styles.addTitle}>new goal ✨</Text>

              {/* Emoji picker */}
              <View style={styles.emojiRow}>
                {GOAL_EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => setGoalEmoji(e)}
                    style={[styles.emojiBtn, goalEmoji === e && styles.emojiBtnActive]}
                  >
                    <Text style={styles.emojiChar}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="what are you saving for? (e.g. Coachella 2027 🎪)"
                placeholderTextColor={COLORS.textMuted}
                value={goalName}
                onChangeText={setGoalName}
              />
              <TextInput
                style={styles.input}
                placeholder="target amount"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                value={goalTarget}
                onChangeText={setGoalTarget}
              />
              <TextInput
                style={styles.input}
                placeholder="deadline (optional, e.g. 2027-01-01)"
                placeholderTextColor={COLORS.textMuted}
                value={goalDeadline}
                onChangeText={setGoalDeadline}
              />

              <View style={styles.formBtns}>
                <TouchableOpacity onPress={handleAddGoal} style={styles.saveBtn} activeOpacity={0.8}>
                  <Text style={styles.saveBtnText}>save goal 🎯</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.cancelFormBtn}>
                  <Text style={styles.cancelFormText}>cancel</Text>
                </TouchableOpacity>
              </View>
            </GradientCard>
          ) : (
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(true); }}
              style={styles.addBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.addBtnText}>+ new goal ✨</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </GradientBackground>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  back: { marginBottom: 8 },
  backText: { color: COLORS.whiteTranslucent, fontSize: 16, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.white, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  subtitle: { fontSize: 13, color: COLORS.whiteTranslucent, textAlign: 'center', marginBottom: 20, letterSpacing: 1 },
  // jar
  jarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  jarEmoji: { fontSize: 32 },
  jarInfo: { flex: 1 },
  jarLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  jarAmt: { fontSize: 22, fontWeight: '900', color: COLORS.textSecondary },
  jarHint: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 8 },
  shareBtn: { backgroundColor: 'rgba(192,132,252,0.2)', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1.5, borderColor: COLORS.textSecondary },
  shareBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary },
  // goal card
  goalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  goalEmoji: { fontSize: 26, marginTop: 2 },
  goalInfo: { flex: 1 },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  goalName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  goalNameDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  doneBadge: { backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6, fontSize: 11, fontWeight: '800', color: '#22C55E' },
  goalAmts: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '800' },
  progressTrack: { height: 10, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 5 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressPct: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '800' },
  progressRemaining: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  deadlineText: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  etaText: { fontSize: 12, color: '#22C55E', fontWeight: '700', marginBottom: 8 },
  contributeBtn: { backgroundColor: 'rgba(192,132,252,0.15)', borderRadius: 12, paddingVertical: 9, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.textSecondary, marginTop: 4 },
  contributeBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary },
  contributeRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6 },
  contributeInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: 10, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, borderWidth: 1.5, borderColor: 'rgba(192,132,252,0.4)' },
  contributeConfirmBtn: { backgroundColor: COLORS.textSecondary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  contributeConfirmText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  cancelBtn: { padding: 8 },
  cancelBtnText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '800' },
  completeMsg: { fontSize: 13, color: '#22C55E', fontWeight: '800', textAlign: 'center', marginTop: 6 },
  // add form
  addTitle: { fontSize: 16, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 12 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  emojiBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  emojiBtnActive: { borderColor: COLORS.textSecondary, backgroundColor: 'rgba(192,132,252,0.12)' },
  emojiChar: { fontSize: 20 },
  input: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 13, fontSize: 14, color: COLORS.textPrimary, marginBottom: 10, borderWidth: 1.5, borderColor: 'rgba(192,132,252,0.3)', fontWeight: '600' },
  formBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  saveBtn: { flex: 1, backgroundColor: COLORS.textSecondary, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '900', color: '#fff' },
  cancelFormBtn: { paddingHorizontal: 20, justifyContent: 'center' },
  cancelFormText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '700' },
  // add button
  addBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed' },
  addBtnText: { fontSize: 16, fontWeight: '800', color: COLORS.white },
});
