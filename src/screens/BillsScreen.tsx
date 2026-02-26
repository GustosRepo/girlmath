import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ScreenTransition from '../components/ScreenTransition';
import { COLORS, GRADIENTS } from '../utils/theme';
import GradientBackground from '../components/GradientBackground';
import GradientCard from '../components/GradientCard';
import CollapsibleSection from '../components/CollapsibleSection';
import InputRow from '../components/InputRow';
import { BillReminder, BillCategory, MoneyContext, PayFrequency } from '../types';
import { loadBills, saveBills, loadState, saveMoneyContext } from '../utils/storage';
import { fmt$ } from '../utils/finance';
import { scheduleBillNotifs, cancelBillNotifs, rescheduleAllBills } from '../utils/notifications';

const { width } = Dimensions.get('window');

const CATEGORY_OPTIONS: { key: BillCategory; label: string; emoji: string }[] = [
  { key: 'rent', label: 'Rent', emoji: '🏠' },
  { key: 'utilities', label: 'Utilities', emoji: '💡' },
  { key: 'subscriptions', label: 'Subs', emoji: '📺' },
  { key: 'insurance', label: 'Insurance', emoji: '🛡️' },
  { key: 'phone', label: 'Phone', emoji: '📱' },
  { key: 'car', label: 'Car', emoji: '🚗' },
  { key: 'loans', label: 'Loans', emoji: '🏦' },
  { key: 'other', label: 'Other', emoji: '💸' },
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getDaysUntilDue(dueDay: number): number {
  const today = new Date();
  const currentDay = today.getDate();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  if (dueDay >= currentDay) return dueDay - currentDay;
  return lastDay - currentDay + dueDay;
}

function getDueLabel(dueDay: number): { text: string; urgent: boolean } {
  const days = getDaysUntilDue(dueDay);
  if (days === 0) return { text: 'DUE TODAY 🚨', urgent: true };
  if (days === 1) return { text: 'due tomorrow!', urgent: true };
  if (days <= 3) return { text: `due in ${days} days`, urgent: true };
  if (days <= 7) return { text: `due in ${days} days`, urgent: false };
  return { text: `due in ${days} days`, urgent: false };
}

const FREQ_OPTIONS: { key: PayFrequency; label: string }[] = [
  { key: 'weekly', label: '📅 Weekly' },
  { key: 'biweekly', label: '📆 Biweekly' },
  { key: 'monthly', label: '🗓️ Monthly' },
];

export default function BillsScreen() {
  const [bills, setBills] = useState<BillReminder[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  // Income & savings state
  const [payFrequency, setPayFrequency] = useState<PayFrequency>('biweekly');
  const [payAmount, setPayAmount] = useState(0);
  const [savingsGoalPct, setSavingsGoalPct] = useState(10);

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [category, setCategory] = useState<BillCategory>('other');

  // Load bills + saved income on focus
  useFocusEffect(
    useCallback(() => {
      loadBills().then(setBills);
      loadState().then((s) => {
        if (s.moneyContext) {
          setPayFrequency(s.moneyContext.payFrequency);
          setPayAmount(s.moneyContext.payAmount);
          setSavingsGoalPct(s.moneyContext.savingsGoalPct);
        }
      });
    }, []),
  );

  // Auto-sync MoneyContext whenever income settings or bills change
  const syncMoneyContext = useCallback(
    (freq: PayFrequency, pay: number, savings: number, currentBills: BillReminder[]) => {
      const rent = currentBills
        .filter((b) => b.category === 'rent')
        .reduce((s, b) => s + b.amount, 0);
      const carNote = currentBills
        .filter((b) => b.category === 'car')
        .reduce((s, b) => s + b.amount, 0);
      const billsTotal = currentBills
        .filter((b) => b.category !== 'rent' && b.category !== 'car')
        .reduce((s, b) => s + b.amount, 0);

      const ctx: MoneyContext = {
        payFrequency: freq,
        payAmount: pay,
        rent,
        carNote,
        billsTotal,
        savingsGoalPct: savings,
      };
      saveMoneyContext(ctx);
    },
    [],
  );

  // Sync whenever bills or income settings change
  useEffect(() => {
    syncMoneyContext(payFrequency, payAmount, savingsGoalPct, bills);
  }, [payFrequency, payAmount, savingsGoalPct, bills, syncMoneyContext]);

  const totalMonthly = bills.reduce((s, b) => s + b.amount, 0);
  const paidCount = bills.filter((b) => b.isPaid).length;
  const unpaidTotal = bills.filter((b) => !b.isPaid).reduce((s, b) => s + b.amount, 0);

  // Sort: unpaid first (by days until due), then paid
  const sorted = [...bills].sort((a, b) => {
    if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
    return getDaysUntilDue(a.dueDay) - getDaysUntilDue(b.dueDay);
  });

  const handleAdd = async () => {
    const parsedAmount = parseFloat(amount);
    const parsedDay = parseInt(dueDay, 10);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('oops', 'fill in the name and amount bestie 💅');
      return;
    }
    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      Alert.alert('oops', 'due day should be 1–31 💅');
      return;
    }
    const cat = CATEGORY_OPTIONS.find((c) => c.key === category)!;
    const newBill: BillReminder = {
      id: generateId(),
      name: name.trim(),
      amount: parsedAmount,
      dueDay: parsedDay,
      emoji: cat.emoji,
      isPaid: false,
      category,
    };
    // Schedule bill reminders (3 days before, 1 day before, due day)
    const notifIds = await scheduleBillNotifs(newBill);
    const newBillWithNotifs = { ...newBill, notifIds };
    const updated = [...bills, newBillWithNotifs];
    setBills(updated);
    await saveBills(updated);
    setName('');
    setAmount('');
    setDueDay('');
    setCategory('other');
    setShowAdd(false);
  };

  const togglePaid = async (id: string) => {
    const target = bills.find((b) => b.id === id);
    if (!target) return;
    const nowPaid = !target.isPaid;
    await Haptics.notificationAsync(
      nowPaid ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
    if (nowPaid && target.notifIds?.length) {
      // Paid — cancel upcoming reminders
      await cancelBillNotifs(target.notifIds);
    } else if (!nowPaid) {
      // Un-paid — re-schedule reminders
      const notifIds = await scheduleBillNotifs(target);
      const updated = bills.map((b) =>
        b.id === id
          ? { ...b, isPaid: false, paidDate: undefined, notifIds }
          : b,
      );
      setBills(updated);
      await saveBills(updated);
      return;
    }
    const updated = bills.map((b) =>
      b.id === id
        ? { ...b, isPaid: nowPaid, paidDate: nowPaid ? new Date().toISOString() : undefined }
        : b,
    );
    setBills(updated);
    await saveBills(updated);
  };

  const deleteBill = async (id: string) => {
    Alert.alert('delete this bill?', 'bestie are you sure?', [
      { text: 'nah', style: 'cancel' },
      {
        text: 'yep delete it',
        style: 'destructive',
        onPress: async () => {
          const target = bills.find((b) => b.id === id);
          if (target?.notifIds?.length) {
            await cancelBillNotifs(target.notifIds);
          }
          const updated = bills.filter((b) => b.id !== id);
          setBills(updated);
          await saveBills(updated);
        },
      },
    ]);
  };

  const resetMonth = async () => {
    Alert.alert('new month?', 'mark all bills as unpaid for the new month? ✨', [
      { text: 'not yet', style: 'cancel' },
      {
        text: 'yes reset!',
        onPress: async () => {
          const reset = bills.map((b) => ({ ...b, isPaid: false, paidDate: undefined }));
          // Re-schedule all notifications for the new month
          const rescheduled = await rescheduleAllBills(reset);
          setBills(rescheduled);
          await saveBills(rescheduled);
        },
      },
    ]);
  };

  return (
    <ScreenTransition>
    <GradientBackground>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Image
            source={require('../../assets/largecatbillsdue.png')}
            style={styles.headerCat}
          />
          <Text style={styles.title}>gentle reminders</Text>
          <Text style={styles.subtitle}>your bills, tracked with love ✨</Text>
        </View>

        {/* Summary Card */}
        <GradientCard>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{fmt$(totalMonthly)}</Text>
              <Text style={styles.summaryLabel}>monthly total</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{fmt$(unpaidTotal)}</Text>
              <Text style={styles.summaryLabel}>still owed</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {paidCount}/{bills.length}
              </Text>
              <Text style={styles.summaryLabel}>paid</Text>
            </View>
          </View>

          {/* Progress bar */}
          {bills.length > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBg}>
                <LinearGradient
                  colors={GRADIENTS.button as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${(paidCount / bills.length) * 100}%` as any }]}
                />
              </View>
              <Text style={styles.progressText}>
                {paidCount === bills.length && bills.length > 0
                  ? 'all paid queen! 👑'
                  : `${Math.round((paidCount / bills.length) * 100)}% done`}
              </Text>
            </View>
          )}
        </GradientCard>

        {/* ── Income & Savings (collapsible) ─────────── */}
        <CollapsibleSection title="💰 Income & savings">
          <Text style={styles.sectionHint}>
            set your pay info so the justify tab knows your vibe ✨
          </Text>

          <Text style={styles.miniLabel}>pay frequency</Text>
          <View style={styles.freqRow}>
            {FREQ_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.key}
                style={[styles.freqChip, payFrequency === o.key && styles.freqChipActive]}
                onPress={() => setPayFrequency(o.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.freqChipText, payFrequency === o.key && styles.freqChipTextActive]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <InputRow
            icon="💵"
            placeholder="pay amount per period"
            value={payAmount ? String(payAmount) : ''}
            onChangeText={(t) => setPayAmount(parseFloat(t) || 0)}
            keyboardType="decimal-pad"
            prefix="$"
          />

          <View style={styles.savingsContainer}>
            <View style={styles.savingsLabelRow}>
            <Image
              source={require('../../assets/smallcatwithpiggybank.png')}
              style={styles.savingsCatIcon}
            />
            <Text style={styles.savingsLabel}>savings goal: {savingsGoalPct}%</Text>
          </View>
            <View style={styles.savingsRow}>
              <TouchableOpacity
                style={styles.savingsBtn}
                onPress={() => setSavingsGoalPct(Math.max(0, savingsGoalPct - 5))}
              >
                <Text style={styles.savingsBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.savingsTrack}>
                <View style={[styles.savingsFill, { width: `${(savingsGoalPct / 30) * 100}%` }]} />
              </View>
              <TouchableOpacity
                style={styles.savingsBtn}
                onPress={() => setSavingsGoalPct(Math.min(30, savingsGoalPct + 5))}
              >
                <Text style={styles.savingsBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {payAmount > 0 && bills.length > 0 && (
            <View style={styles.computedBox}>
              <Text style={styles.computedTitle}>✨ auto-synced to justify tab ✨</Text>
              <Text style={styles.computedRow}>
                rent: {fmt$(bills.filter(b => b.category === 'rent').reduce((s, b) => s + b.amount, 0))}
              </Text>
              <Text style={styles.computedRow}>
                car: {fmt$(bills.filter(b => b.category === 'car').reduce((s, b) => s + b.amount, 0))}
              </Text>
              <Text style={styles.computedRow}>
                other bills: {fmt$(bills.filter(b => b.category !== 'rent' && b.category !== 'car').reduce((s, b) => s + b.amount, 0))}
              </Text>
            </View>
          )}
        </CollapsibleSection>

        {/* Bills List */}
        {sorted.map((bill) => {
          const due = getDueLabel(bill.dueDay);
          return (
            <TouchableOpacity
              key={bill.id}
              activeOpacity={0.7}
              onPress={() => togglePaid(bill.id)}
              onLongPress={() => deleteBill(bill.id)}
            >
              <GradientCard>
                <View style={styles.billRow}>
                  <Text style={styles.billEmoji}>{bill.emoji}</Text>
                  <View style={styles.billInfo}>
                    <Text
                      style={[styles.billName, bill.isPaid && styles.billNamePaid]}
                    >
                      {bill.name}
                    </Text>
                    <Text
                      style={[
                        styles.billDue,
                        due.urgent && !bill.isPaid && styles.billDueUrgent,
                        bill.isPaid && styles.billDuePaid,
                      ]}
                    >
                      {bill.isPaid ? '✅ paid!' : `📅 ${due.text}`}
                    </Text>
                  </View>
                  <Text
                    style={[styles.billAmount, bill.isPaid && styles.billAmountPaid]}
                  >
                    {fmt$(bill.amount)}
                  </Text>
                </View>
              </GradientCard>
            </TouchableOpacity>
          );
        })}

        {bills.length === 0 && !showAdd && (
          <GradientCard>
            <Text style={styles.emptyText}>
              no bills yet ✨{'\n'}tap + to add your first one
            </Text>
          </GradientCard>
        )}

        {/* Add Bill Form */}
        {showAdd && (
          <GradientCard>
            <Text style={styles.addTitle}>✨ add a bill</Text>

            <View style={styles.inputRow}>
              <Text style={styles.inputIcon}>📝</Text>
              <TextInput
                style={styles.input}
                placeholder="bill name"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputIcon}>💰</Text>
              <TextInput
                style={styles.input}
                placeholder="amount"
                placeholderTextColor={COLORS.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputIcon}>📅</Text>
              <TextInput
                style={styles.input}
                placeholder="due day (1–31)"
                placeholderTextColor={COLORS.textMuted}
                value={dueDay}
                onChangeText={setDueDay}
                keyboardType="number-pad"
              />
            </View>

            {/* Category picker */}
            <Text style={styles.catLabel}>category:</Text>
            <View style={styles.catGrid}>
              {CATEGORY_OPTIONS.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.catChip, category === cat.key && styles.catChipActive]}
                  onPress={() => setCategory(cat.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.catChipText}>
                    {cat.emoji} {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.addButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAdd(false)}
              >
                <Text style={styles.cancelText}>cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAdd}>
                <LinearGradient
                  colors={GRADIENTS.button as [string, string, ...string[]]}
                  style={styles.saveBtn}
                >
                  <Text style={styles.saveBtnText}>save ✨</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </GradientCard>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => setShowAdd(!showAdd)}>
            <LinearGradient
              colors={GRADIENTS.button as [string, string, ...string[]]}
              style={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>
                {showAdd ? '✕ close' : '+ add bill'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {bills.length > 0 && (
            <TouchableOpacity onPress={resetMonth}>
              <View style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>🔄 new month</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.hint}>
          tap to mark paid · long press to delete 💅
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </GradientBackground>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 40,
  },
  // Header
  headerContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  headerCat: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.whiteTranslucent,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1.5,
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.glassBorder,
  },
  // Progress
  progressContainer: { marginTop: 14, alignItems: 'center' },
  progressBg: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5 },
  progressText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6,
    fontWeight: '600',
  },
  // Bill items
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billEmoji: { fontSize: 28, marginRight: 12 },
  billInfo: { flex: 1 },
  billName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  billNamePaid: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  billDue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  billDueUrgent: { color: '#EF4444', fontWeight: '700' },
  billDuePaid: { color: '#22C55E' },
  billAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  billAmountPaid: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  // Empty
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
  // Add form
  addTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.whiteTranslucent,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  catLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 8,
    fontWeight: '600',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  catChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1.5,
    borderColor: COLORS.glassBorder,
  },
  catChipActive: {
    backgroundColor: COLORS.pinkLight,
    borderColor: COLORS.pinkHot,
  },
  catChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  // Buttons
  addButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.white },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 22,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  actionBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.white },
  resetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 22,
    backgroundColor: COLORS.whiteTranslucent,
    borderWidth: 1.5,
    borderColor: COLORS.glassBorder,
  },
  resetBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 16,
    fontStyle: 'italic',
  },
  // Income & savings
  sectionHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  miniLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  freqChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1.5,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
  },
  freqChipActive: {
    backgroundColor: COLORS.pinkLight,
    borderColor: COLORS.pinkHot,
  },
  freqChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  freqChipTextActive: {
    color: COLORS.pinkHot,
    fontWeight: '800',
  },
  savingsContainer: { marginTop: 10 },
  savingsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  savingsCatIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  savingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.whiteTranslucent,
    borderWidth: 1.5,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.pinkHot,
  },
  savingsTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  savingsFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: COLORS.pinkHot,
  },
  computedBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
  },
  computedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  computedRow: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginVertical: 1,
  },
});
