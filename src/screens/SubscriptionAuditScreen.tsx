import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../components/GradientBackground';
import ScreenTransition from '../components/ScreenTransition';
import GradientCard from '../components/GradientCard';
import { COLORS } from '../utils/theme';
import { loadSubscriptions, saveSubscriptions } from '../utils/storage';
import { fmt$ } from '../utils/finance';
import { Subscription } from '../types';

const CATEGORY_EMOJIS: Record<Subscription['category'], string> = {
  streaming: '📺',
  fitness: '🏋️',
  beauty: '💄',
  food: '🍔',
  software: '💻',
  other: '💳',
};

const CATEGORY_OPTIONS: { key: Subscription['category']; label: string; emoji: string }[] = [
  { key: 'streaming', label: 'streaming', emoji: '📺' },
  { key: 'fitness', label: 'fitness', emoji: '🏋️' },
  { key: 'beauty', label: 'beauty', emoji: '💄' },
  { key: 'food', label: 'food', emoji: '🍔' },
  { key: 'software', label: 'software', emoji: '💻' },
  { key: 'other', label: 'other', emoji: '💳' },
];

const SUB_EMOJIS = ['📺', '🎵', '🎮', '💻', '🏋️', '💄', '🛒', '📰', '☁️', '🧘', '🎬', '📱'];

export default function SubscriptionAuditScreen() {
  const navigation = useNavigation();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newEmoji, setNewEmoji] = useState('📺');
  const [newCategory, setNewCategory] = useState<Subscription['category']>('streaming');

  useFocusEffect(
    useCallback(() => {
      loadSubscriptions().then(setSubs);
      setShowAdd(false);
    }, []),
  );

  const totalMonthly = subs.reduce((s, sub) => s + sub.monthlyCost, 0);
  const totalYearly = totalMonthly * 12;

  const byCategory = CATEGORY_OPTIONS.map(cat => ({
    ...cat,
    items: subs.filter(s => s.category === cat.key),
    total: subs.filter(s => s.category === cat.key).reduce((s, sub) => s + sub.monthlyCost, 0),
  })).filter(c => c.items.length > 0);

  const handleAdd = async () => {
    const cost = parseFloat(newCost);
    if (!newName.trim() || !cost || cost <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const sub: Subscription = {
      id: Date.now().toString(),
      name: newName.trim(),
      emoji: newEmoji,
      monthlyCost: cost,
      category: newCategory,
    };
    const updated = [...subs, sub];
    setSubs(updated);
    await saveSubscriptions(updated);
    setNewName('');
    setNewCost('');
    setNewEmoji('📺');
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('cancel subscription?', 'removes it from your audit list', [
      { text: 'keep it', style: 'cancel' },
      {
        text: 'remove', style: 'destructive', onPress: async () => {
          const updated = subs.filter(s => s.id !== id);
          setSubs(updated);
          await saveSubscriptions(updated);
        },
      },
    ]);
  };

  const wasteMoment = () => {
    if (totalYearly > 2000) return `that's ${fmt$(totalYearly)} a year… imagine what else 👀`;
    if (totalYearly > 1000) return `${fmt$(totalYearly/12)} a month on subscriptions alone 😬`;
    if (totalMonthly > 0) return `${fmt$(totalMonthly)}/mo on subscriptions — is it all worth it?`;
    return '';
  };

  return (
    <ScreenTransition>
      <GradientBackground>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backText}>‹ tools</Text>
            </TouchableOpacity>
            <Text style={styles.title}>💳 subscription audit</Text>
            <Text style={styles.subtitle}>face the truth bestie 👀</Text>

            {subs.length > 0 && (
              <GradientCard>
                <Text style={styles.totalLabel}>total monthly</Text>
                <Text style={styles.totalValue}>{fmt$(totalMonthly)}</Text>
                <Text style={styles.yearlyNote}>{fmt$(totalYearly)} per year</Text>
                {wasteMoment() !== '' && (
                  <Text style={styles.wasteMoment}>{wasteMoment()}</Text>
                )}
              </GradientCard>
            )}

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowAdd(v => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.addBtnText}>{showAdd ? '✕ cancel' : '+ add subscription'}</Text>
            </TouchableOpacity>

            {showAdd && (
              <GradientCard>
                <Text style={styles.sectionTitle}>new subscription</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
                  {SUB_EMOJIS.map(e => (
                    <TouchableOpacity
                      key={e}
                      style={[styles.emojiOpt, newEmoji === e && styles.emojiOptActive]}
                      onPress={() => setNewEmoji(e)}
                    >
                      <Text style={styles.emojiOptText}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput
                  style={styles.input}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Netflix, Spotify, ClassPass…"
                  placeholderTextColor={COLORS.textMuted}
                />
                <View style={styles.costRow}>
                  <Text style={styles.dollar}>$</Text>
                  <TextInput
                    style={styles.costInput}
                    value={newCost}
                    onChangeText={setNewCost}
                    keyboardType="decimal-pad"
                    placeholder="monthly cost"
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <Text style={styles.perMonth}>/mo</Text>
                </View>
                <View style={styles.catRow}>
                  {CATEGORY_OPTIONS.map(cat => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[styles.catPill, newCategory === cat.key && styles.catPillActive]}
                      onPress={() => setNewCategory(cat.key)}
                    >
                      <Text style={styles.catPillText}>{cat.emoji} {cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} activeOpacity={0.8}>
                  <Text style={styles.saveBtnText}>add subscription 📋</Text>
                </TouchableOpacity>
              </GradientCard>
            )}

            {subs.length === 0 && !showAdd && (
              <GradientCard>
                <Text style={styles.emptyText}>
                  no subscriptions logged 💭{'\n'}add everything you're paying for and face the math
                </Text>
              </GradientCard>
            )}

            {byCategory.map(cat => (
              <GradientCard key={cat.key}>
                <View style={styles.catHeader}>
                  <Text style={styles.catHeaderEmoji}>{cat.emoji}</Text>
                  <Text style={styles.catHeaderLabel}>{cat.label}</Text>
                  <Text style={styles.catHeaderTotal}>{fmt$(cat.total)}/mo</Text>
                </View>
                {cat.items.map(sub => (
                  <View key={sub.id} style={styles.subRow}>
                    <Text style={styles.subEmoji}>{sub.emoji}</Text>
                    <Text style={styles.subName}>{sub.name}</Text>
                    <Text style={styles.subCost}>{fmt$(sub.monthlyCost)}</Text>
                    <TouchableOpacity onPress={() => handleDelete(sub.id)} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </GradientCard>
            ))}

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
  totalLabel: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', fontWeight: '600' },
  totalValue: { fontSize: 36, fontWeight: '900', color: COLORS.pinkHot, textAlign: 'center', marginVertical: 4 },
  yearlyNote: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  wasteMoment: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  addBtn: { backgroundColor: 'rgba(255,105,180,0.25)', borderRadius: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.pinkHot, marginBottom: 12 },
  addBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.pinkHot },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  emojiRow: { marginBottom: 12 },
  emojiOpt: { padding: 8, borderRadius: 12, marginRight: 6, backgroundColor: 'rgba(255,255,255,0.4)' },
  emojiOptActive: { backgroundColor: 'rgba(255,105,180,0.3)', borderWidth: 2, borderColor: COLORS.pinkHot },
  emojiOptText: { fontSize: 22 },
  input: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, marginBottom: 10 },
  costRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, paddingHorizontal: 14, marginBottom: 12 },
  dollar: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginRight: 4 },
  costInput: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, paddingVertical: 12 },
  perMonth: { fontSize: 14, color: COLORS.textMuted, fontWeight: '700' },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  catPill: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: 'transparent' },
  catPillActive: { backgroundColor: 'rgba(255,105,180,0.2)', borderColor: COLORS.pinkHot },
  catPillText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  saveBtn: { backgroundColor: COLORS.pinkHot, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  catHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  catHeaderEmoji: { fontSize: 20 },
  catHeaderLabel: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, textTransform: 'capitalize' },
  catHeaderTotal: { fontSize: 15, fontWeight: '900', color: COLORS.pinkHot },
  subRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  subEmoji: { fontSize: 18, width: 28 },
  subName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  subCost: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 14, color: COLORS.textMuted },
});
