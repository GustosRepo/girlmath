import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../components/GradientBackground';
import ScreenTransition from '../components/ScreenTransition';
import GradientCard from '../components/GradientCard';
import { COLORS, GRADIENTS } from '../utils/theme';
import { loadSavingsJar, addToSavingsJar, saveSavingsJar } from '../utils/storage';
import { fmt$ } from '../utils/finance';
import { SavingsJarEntry } from '../types';

import type { TFunction } from 'i18next';

function timeAgo(iso: string, t: TFunction): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return t('jar.today');
  if (days === 1) return t('jar.yesterday');
  if (days < 7) return t('jar.days_ago', { n: days });
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function SavingsJarScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [entries, setEntries] = useState<SavingsJarEntry[]>([]);
  const [itemInput, setItemInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [justSaved, setJustSaved] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadSavingsJar().then(setEntries);
      setItemInput('');
      setPriceInput('');
      setNoteInput('');
      setJustSaved('');
    }, []),
  );

  const totalSaved = entries.reduce((s, e) => s + e.price, 0);

  const handleLog = async () => {
    const price = parseFloat(priceInput);
    if (!itemInput.trim() || !price || price <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const entry: SavingsJarEntry = {
      id: Date.now().toString(),
      itemName: itemInput.trim(),
      price,
      timestamp: new Date().toISOString(),
      note: noteInput.trim() || undefined,
    };
    await addToSavingsJar(entry);
    const updated = [entry, ...entries];
    setEntries(updated);
    setJustSaved(`+${fmt$(price)} saved by skipping ${entry.itemName} 💪`);
    setItemInput('');
    setPriceInput('');
    setNoteInput('');
    setTimeout(() => setJustSaved(''), 3500);
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('jar.delete_title'), t('jar.delete_body'), [
      { text: t('jar.delete_keep'), style: 'cancel' },
      {
        text: t('jar.delete_remove'), style: 'destructive', onPress: async () => {
          const updated = entries.filter(e => e.id !== id);
          setEntries(updated);
          await saveSavingsJar(updated);
        },
      },
    ]);
  };

  const jarVibeMessage = () => {
    if (totalSaved === 0) return t('jar.vibe_empty');
    if (totalSaved < 50) return t('jar.vibe_start', { amount: fmt$(totalSaved) });
    if (totalSaved < 200) return t('jar.vibe_good', { amount: fmt$(totalSaved) });
    if (totalSaved < 500) return t('jar.vibe_great', { amount: fmt$(totalSaved) });
    return t('jar.vibe_icon', { amount: fmt$(totalSaved) });
  };

  return (
    <ScreenTransition>
      <GradientBackground>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backText}>{t('jar.back')}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t('jar.title')}</Text>
            <Text style={styles.subtitle}>{t('jar.subtitle')}</Text>

            {/* Jar total */}
            <GradientCard>
              <Text style={styles.jarEmoji}>🫙</Text>
              <Text style={styles.totalSaved}>{fmt$(totalSaved)}</Text>
              <Text style={styles.totalLabel}>{t('jar.skipped_saved')}</Text>
              <Text style={styles.vibeMsg}>{jarVibeMessage()}</Text>
              {entries.length > 0 && (
                <Text style={styles.countNote}>{entries.length !== 1 ? t('jar.skip_count_plural', { n: entries.length }) : t('jar.skip_count', { n: entries.length })}</Text>
              )}
            </GradientCard>

            {/* Log a skip */}
            <GradientCard>
              <Text style={styles.sectionTitle}>{t('jar.log_title')}</Text>
              <TextInput
                style={styles.input}
                value={itemInput}
                onChangeText={setItemInput}
                placeholder={t('jar.item_placeholder')}
                placeholderTextColor={COLORS.textMuted}
              />
              <View style={styles.priceRow}>
                <Text style={styles.dollar}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  value={priceInput}
                  onChangeText={setPriceInput}
                  keyboardType="decimal-pad"
                  placeholder={t('jar.price_placeholder')}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <TextInput
                style={styles.noteInput}
                value={noteInput}
                onChangeText={setNoteInput}
                placeholder={t('jar.note_placeholder')}
                placeholderTextColor={COLORS.textMuted}
              />
              {justSaved ? (
                <Text style={styles.savedConfirm}>{justSaved}</Text>
              ) : (
                <TouchableOpacity onPress={handleLog} activeOpacity={0.8}>
                  <LinearGradient
                    colors={GRADIENTS.button as [string, string, ...string[]]}
                    style={styles.logBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.logBtnText}>{t('jar.log_btn')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </GradientCard>

            {entries.length === 0 && (
              <GradientCard>
                <Text style={styles.emptyText}>{t('jar.empty')}</Text>
              </GradientCard>
            )}

            {entries.map(entry => (
              <GradientCard key={entry.id}>
                <View style={styles.entryRow}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryName}>{entry.itemName}</Text>
                    {entry.note && <Text style={styles.entryNote}>"{entry.note}"</Text>}
                    <Text style={styles.entryTime}>{timeAgo(entry.timestamp, t)}</Text>
                  </View>
                  <View style={styles.entryRight}>
                    <Text style={styles.entryAmount}>+{fmt$(entry.price)}</Text>
                    <TouchableOpacity onPress={() => handleDelete(entry.id)} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
  jarEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 4 },
  totalSaved: { fontSize: 48, fontWeight: '900', color: COLORS.pinkHot, textAlign: 'center' },
  totalLabel: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', fontWeight: '600' },
  vibeMsg: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  countNote: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  input: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, marginBottom: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, paddingHorizontal: 14, marginBottom: 10 },
  dollar: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginRight: 4 },
  priceInput: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, paddingVertical: 12 },
  noteInput: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.textPrimary, marginBottom: 12 },
  savedConfirm: { fontSize: 15, fontWeight: '800', color: '#22C55E', textAlign: 'center', paddingVertical: 12 },
  logBtn: { borderRadius: 20, paddingVertical: 14, alignItems: 'center' },
  logBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  entryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  entryInfo: { flex: 1 },
  entryName: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  entryNote: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 2 },
  entryTime: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  entryRight: { alignItems: 'flex-end', gap: 4 },
  entryAmount: { fontSize: 18, fontWeight: '900', color: '#22C55E' },
  deleteBtn: { padding: 2 },
  deleteBtnText: { fontSize: 14, color: COLORS.textMuted },
});
