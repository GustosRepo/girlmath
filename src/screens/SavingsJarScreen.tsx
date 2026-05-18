import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../components/GradientBackground';
import ScreenTransition from '../components/ScreenTransition';
import GradientCard from '../components/GradientCard';
import { COLORS, GRADIENTS } from '../utils/theme';
import { loadSavingsJar, addToSavingsJar, saveSavingsJar } from '../utils/storage';
import { fmt$ } from '../utils/finance';
import { SavingsJarEntry } from '../types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SavingsJarScreen() {
  const navigation = useNavigation();
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
    Alert.alert('remove this?', "it'll come off your jar total", [
      { text: 'keep it', style: 'cancel' },
      {
        text: 'remove', style: 'destructive', onPress: async () => {
          const updated = entries.filter(e => e.id !== id);
          setEntries(updated);
          await saveSavingsJar(updated);
        },
      },
    ]);
  };

  const jarVibeMessage = () => {
    if (totalSaved === 0) return 'start skipping things to fill the jar 🫙';
    if (totalSaved < 50) return `off to a great start! ${fmt$(totalSaved)} saved so far ✨`;
    if (totalSaved < 200) return `${fmt$(totalSaved)} saved — the self-control is immaculate 👑`;
    if (totalSaved < 500) return `${fmt$(totalSaved)}?? bestie you're THRIVING 💅`;
    return `${fmt$(totalSaved)} saved — you're literally a financial icon 🏆`;
  };

  return (
    <ScreenTransition>
      <GradientBackground>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backText}>‹ tools</Text>
            </TouchableOpacity>
            <Text style={styles.title}>🫙 savings jar</Text>
            <Text style={styles.subtitle}>every skip counts bestie ✨</Text>

            {/* Jar total */}
            <GradientCard>
              <Text style={styles.jarEmoji}>🫙</Text>
              <Text style={styles.totalSaved}>{fmt$(totalSaved)}</Text>
              <Text style={styles.totalLabel}>skipped & saved</Text>
              <Text style={styles.vibeMsg}>{jarVibeMessage()}</Text>
              {entries.length > 0 && (
                <Text style={styles.countNote}>{entries.length} skip{entries.length !== 1 ? 's' : ''} logged</Text>
              )}
            </GradientCard>

            {/* Log a skip */}
            <GradientCard>
              <Text style={styles.sectionTitle}>💪 i skipped this</Text>
              <TextInput
                style={styles.input}
                value={itemInput}
                onChangeText={setItemInput}
                placeholder="what did you NOT buy? (e.g. Zara jacket)"
                placeholderTextColor={COLORS.textMuted}
              />
              <View style={styles.priceRow}>
                <Text style={styles.dollar}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  value={priceInput}
                  onChangeText={setPriceInput}
                  keyboardType="decimal-pad"
                  placeholder="how much was it?"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <TextInput
                style={styles.noteInput}
                value={noteInput}
                onChangeText={setNoteInput}
                placeholder="why'd you skip it? (optional)"
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
                    <Text style={styles.logBtnText}>🫙 add to jar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </GradientCard>

            {entries.length === 0 && (
              <GradientCard>
                <Text style={styles.emptyText}>
                  nothing in the jar yet 💭{'\n'}every time you resist a purchase, log it here and watch your willpower savings grow 💪
                </Text>
              </GradientCard>
            )}

            {entries.map(entry => (
              <GradientCard key={entry.id}>
                <View style={styles.entryRow}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryName}>{entry.itemName}</Text>
                    {entry.note && <Text style={styles.entryNote}>"{entry.note}"</Text>}
                    <Text style={styles.entryTime}>{timeAgo(entry.timestamp)}</Text>
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
