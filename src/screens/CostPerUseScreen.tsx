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
import { loadCostPerUseItems, saveCostPerUseItems, incrementCostPerUse } from '../utils/storage';
import { fmt$ } from '../utils/finance';
import { CostPerUseItem } from '../types';

const EMOJI_OPTIONS = ['👗', '👠', '👜', '💄', '🧴', '📱', '💻', '🎒', '🧥', '👟', '⌚', '🎧', '🏋️', '📸', '🪮'];

function cpuLabel(item: CostPerUseItem): string {
  if (item.uses === 0) return `$${item.price.toFixed(2)} / use`;
  return fmt$(item.price / item.uses) + ' / use';
}

function cpuColor(item: CostPerUseItem): string {
  if (item.uses === 0) return COLORS.textMuted;
  const cpu = item.price / item.uses;
  if (cpu <= 1) return '#22C55E';
  if (cpu <= 5) return '#84CC16';
  if (cpu <= 20) return '#F59E0B';
  return '#EF4444';
}

export default function CostPerUseScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState<CostPerUseItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newEmoji, setNewEmoji] = useState('👗');

  useFocusEffect(
    useCallback(() => {
      loadCostPerUseItems().then(setItems);
      setShowAdd(false);
    }, []),
  );

  const handleAdd = async () => {
    const price = parseFloat(newPrice);
    if (!newName.trim() || !price || price <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const item: CostPerUseItem = {
      id: Date.now().toString(),
      name: newName.trim(),
      emoji: newEmoji,
      price,
      uses: 0,
      dateAdded: new Date().toISOString(),
    };
    const updated = [item, ...items];
    setItems(updated);
    await saveCostPerUseItems(updated);
    setNewName('');
    setNewPrice('');
    setNewEmoji('👗');
    setShowAdd(false);
  };

  const handleUse = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await incrementCostPerUse(id);
    setItems(updated);
  };

  const handleDelete = (id: string) => {
    Alert.alert('remove item?', 'this will delete the tracking history', [
      { text: 'keep it', style: 'cancel' },
      {
        text: 'remove', style: 'destructive', onPress: async () => {
          const updated = items.filter(i => i.id !== id);
          setItems(updated);
          await saveCostPerUseItems(updated);
        },
      },
    ]);
  };

  return (
    <ScreenTransition>
      <GradientBackground>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backText}>‹ tools</Text>
            </TouchableOpacity>
            <Text style={styles.title}>📊 cost per use</Text>
            <Text style={styles.subtitle}>justify the expensive stuff with math 💅</Text>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowAdd(v => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.addBtnText}>{showAdd ? '✕ cancel' : '+ add item'}</Text>
            </TouchableOpacity>

            {showAdd && (
              <GradientCard>
                <Text style={styles.sectionTitle}>new item</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiPicker}>
                  {EMOJI_OPTIONS.map(e => (
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
                  placeholder="item name (e.g. Lululemon leggings)"
                  placeholderTextColor={COLORS.textMuted}
                />
                <View style={styles.priceRow}>
                  <Text style={styles.dollar}>$</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={newPrice}
                    onChangeText={setNewPrice}
                    keyboardType="decimal-pad"
                    placeholder="price paid"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} activeOpacity={0.8}>
                  <Text style={styles.saveBtnText}>add to tracker ✨</Text>
                </TouchableOpacity>
              </GradientCard>
            )}

            {items.length === 0 && !showAdd && (
              <GradientCard>
                <Text style={styles.emptyText}>
                  no items yet 💭{'\n'}track your purchases and log each time you use them — watch the cost-per-use drop 👑
                </Text>
              </GradientCard>
            )}

            {items.map(item => {
              const cpu = item.uses > 0 ? item.price / item.uses : item.price;
              const color = cpuColor(item);
              return (
                <GradientCard key={item.id}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemEmoji}>{item.emoji}</Text>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPaid}>paid {fmt$(item.price)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cpuRow}>
                    <View style={[styles.cpuBadge, { backgroundColor: color + '20', borderColor: color }]}>
                      <Text style={[styles.cpuValue, { color }]}>{cpuLabel(item)}</Text>
                    </View>
                    <Text style={styles.usesText}>{item.uses} use{item.uses !== 1 ? 's' : ''}</Text>
                  </View>

                  {item.uses > 0 && cpu <= 1 && (
                    <Text style={styles.crowdText}>✨ basically free at this point</Text>
                  )}
                  {item.uses === 0 && (
                    <Text style={styles.crowdText}>log your first use to see the magic happen 👇</Text>
                  )}

                  <TouchableOpacity style={styles.useBtn} onPress={() => handleUse(item.id)} activeOpacity={0.75}>
                    <Text style={styles.useBtnText}>👆 i used this today</Text>
                  </TouchableOpacity>
                </GradientCard>
              );
            })}

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
  addBtn: { backgroundColor: 'rgba(255,105,180,0.25)', borderRadius: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.pinkHot, marginBottom: 12 },
  addBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.pinkHot },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  emojiPicker: { marginBottom: 12 },
  emojiOpt: { padding: 8, borderRadius: 12, marginRight: 6, backgroundColor: 'rgba(255,255,255,0.4)' },
  emojiOptActive: { backgroundColor: 'rgba(255,105,180,0.3)', borderWidth: 2, borderColor: COLORS.pinkHot },
  emojiOptText: { fontSize: 22 },
  input: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, marginBottom: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, paddingHorizontal: 14, marginBottom: 12 },
  dollar: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginRight: 4 },
  priceInput: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, paddingVertical: 12 },
  saveBtn: { backgroundColor: COLORS.pinkHot, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  itemEmoji: { fontSize: 30 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  itemPaid: { fontSize: 12, color: COLORS.textMuted },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 16, color: COLORS.textMuted },
  cpuRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  cpuBadge: { borderRadius: 12, borderWidth: 2, paddingVertical: 4, paddingHorizontal: 12 },
  cpuValue: { fontSize: 18, fontWeight: '900' },
  usesText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  crowdText: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 8 },
  useBtn: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  useBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
});
