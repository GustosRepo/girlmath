import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ScreenTransition from '../components/ScreenTransition';
import { COLORS, GRADIENTS } from '../utils/theme';
import {
  PersonalityMode,
  JustificationResponse,
  MoneyContext,
  SpendableResult,
  HistoryEntry,
  PeriodExpenses,
  SmartJustificationContext,
  SpendCategory,
} from '../types';
import { generateJustification } from '../utils/girlMathEngine';
import { computeSpendable, fmt$ } from '../utils/finance';
import { loadState, addHistory, incrementJustifyCount, getJustifyCount, incrementTotalJustifyCount, loadPeriodExpenses, addExpense, loadAuraTheme, loadHistory, loadSavingsJar, loadTreatBudget, loadAuraScore, updateAuraScore } from '../utils/storage';
import * as StoreReview from 'expo-store-review';
import { usePaywall } from '../context/PaywallContext';
import { hasPremium } from '../utils/purchases';
import { maybeSendBudgetAlert } from '../utils/notifications';

import GradientBackground from '../components/GradientBackground';
import GradientCard from '../components/GradientCard';
import CollapsibleSection from '../components/CollapsibleSection';
import InputRow from '../components/InputRow';
import AuraMeter from '../components/AuraMeter';
import ChatBubble from '../components/ChatBubble';

// ══════════════════════════════════════════════════════════
// HOME SCREEN
// ══════════════════════════════════════════════════════════
// Daily free justify allowance before paywall nudge
const FREE_JUSTIFIES = 3;

// Rotating placeholders that teach specificity by example
const ITEM_PLACEHOLDERS = [
  'Coach Tabby Shoulder Bag 26',
  'Stanley Quencher 40oz Tumbler',
  'Dyson Airwrap Complete Long',
  'Lululemon Align 25" leggings',
  'Nike Dunk Low Panda',
  'Charlotte Tilbury Pillow Talk set',
  'Apple AirPods Pro 2',
  'Sol de Janeiro Bum Bum Cream',
  'UGG Classic Mini II boots',
  'Skims Soft Lounge Long Sleeve dress',
];

function isVagueName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const words = trimmed.split(/\s+/);
  // Too short (1-2 words) and no numbers → probably vague
  return words.length <= 2 && !/\d/.test(trimmed);
}

export default function HomeScreen() {
  const { showPaywall } = usePaywall();

  // ── core state ────────────────────────────────────────
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [personality, setPersonality] = useState<PersonalityMode>('responsible');
  const [response, setResponse] = useState<JustificationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [auraTheme, setAuraTheme] = useState<import('../types').AuraTheme>('default');

  // ── money context ─────────────────────────────────────
  const [moneyCtx, setMoneyCtx] = useState<MoneyContext>({
    payFrequency: 'biweekly',
    payAmount: 0,
    rent: 0,
    carNote: 0,
    billsTotal: 0,
    savingsGoalPct: 10,
  });
  const hasMoneyCtx = moneyCtx.payAmount > 0;
  const [justifyCount, setJustifyCount] = useState(0);
  const justifiesLeft = Math.max(0, FREE_JUSTIFIES - justifyCount);

  // ── expense logging ───────────────────────────────────
  const [periodExpenses, setPeriodExpenses] = useState<PeriodExpenses>({ periodStart: '', total: 0 });
  const [logConfirmMsg, setLogConfirmMsg] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [smartCtx, setSmartCtx] = useState<SmartJustificationContext>({});
  const [placeholderIdx, setPlaceholderIdx] = useState(
    () => Math.floor(Math.random() * ITEM_PLACEHOLDERS.length),
  );

  // ── clear inputs after action ────────────────────────
  const clearInputs = () => {
    setItemName('');
    setPrice('');
    setNote('');
    setPlaceholderIdx((i) => (i + 1) % ITEM_PLACEHOLDERS.length);
  };

  // ── derived ───────────────────────────────────────────
  const parsedPrice = parseFloat(price) || 0;
  const spendable: SpendableResult | undefined =
    hasMoneyCtx && parsedPrice > 0
      ? computeSpendable(moneyCtx, parsedPrice, periodExpenses.total)
      : undefined;

  // ── animations ────────────────────────────────────────
  const buttonScale = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);

  // ── persistence: load on focus (picks up Bills-tab changes) ──
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const saved = await loadState();
        if (saved.moneyContext) setMoneyCtx(saved.moneyContext);
        if (saved.lastMode) setPersonality(saved.lastMode);
        const c = await getJustifyCount();
        setJustifyCount(c);
        const freq = saved.moneyContext?.payFrequency ?? 'biweekly';
        const expenses = await loadPeriodExpenses(freq);
        setPeriodExpenses(expenses);
        const theme = await loadAuraTheme();
        setAuraTheme(theme);

        // Build smart context from real user data
        const [history, jar, treat, auraScoreData] = await Promise.all([
          loadHistory(),
          loadSavingsJar(),
          loadTreatBudget(),
          loadAuraScore(),
        ]);
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const weekTotal = history
          .filter(e => e.isLogged && new Date(e.timestamp).getTime() > weekAgo)
          .reduce((s, e) => s + e.price, 0);
        const lastSplurge = history.find(e => e.isLogged);
        const daysSinceLastSplurge = lastSplurge
          ? Math.floor((now - new Date(lastSplurge.timestamp).getTime()) / (24 * 60 * 60 * 1000))
          : undefined;
        const byCategory = expenses.byCategory ?? {};
        let topCategory: SpendCategory | undefined;
        let topCategoryAmount: number | undefined;
        let maxAmt = 0;
        for (const [cat, amt] of Object.entries(byCategory)) {
          if ((amt ?? 0) > maxAmt) {
            maxAmt = amt ?? 0;
            topCategory = cat as SpendCategory;
            topCategoryAmount = amt;
          }
        }
        const jarTotal = jar.reduce((s, e) => s + e.price, 0);
        const treatRemaining = treat.monthlyLimit > 0 ? Math.max(0, treat.monthlyLimit - treat.spent) : 0;
        setSmartCtx({
          topCategory,
          topCategoryAmount,
          daysSinceLastSplurge,
          savingsJarTotal: jarTotal > 0 ? jarTotal : undefined,
          treatBudgetRemaining: treatRemaining > 0 ? treatRemaining : undefined,
          weekTotal,
          auraScore: auraScoreData.score,
        });
      })();
    }, []),
  );

  // ── justify handler ───────────────────────────────────
  const handleJustify = () => {
    if (!itemName.trim() || parsedPrice <= 0) return;

    // Hard gate — if limit already hit, show paywall
    if (justifyCount >= FREE_JUSTIFIES) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      showPaywall();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLogConfirmMsg('');

    Animated.sequence([
      Animated.spring(buttonScale, { toValue: 0.92, useNativeDriver: true, speed: 50 }),
      Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }),
    ]).start();

    setIsLoading(true);

    setTimeout(async () => {
      const result = generateJustification({
        itemName: itemName.trim(),
        price: parsedPrice,
        note: note.trim() || undefined,
        personality,
        spendable,
        smartCtx,
      });
      setResponse(result);
      setIsLoading(false);

      // Save to history
      const entry: HistoryEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        itemName: itemName.trim(),
        price: parsedPrice,
        personality,
        message: result.message,
        emoji: result.emoji,
        timestamp: new Date().toISOString(),
        isLogged: false,
      };
      await addHistory(entry);

      // Justify counter → nudge paywall after FREE_JUSTIFIES uses
      const count = await incrementJustifyCount();
      setJustifyCount(count);
      if (count >= FREE_JUSTIFIES) {
        // Small delay so the response animates in first
        setTimeout(() => showPaywall(), 1800);
      }

      // Lifetime counter → ask for review after 5th total justify
      const total = await incrementTotalJustifyCount();
      if (total === 5 && await StoreReview.hasAction()) {
        setTimeout(() => StoreReview.requestReview(), 2000);
      }

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
      // Clear inputs after a brief moment so user sees result
      setTimeout(() => clearInputs(), 500);
    }, 800 + Math.random() * 700);
  };

  // ── log expense handler (FREE — no daily limit) ────────
  const LOG_MESSAGES = [
    'yes babe you know what you want 💅',
    'logged it queen, your budget is updated ✨',
    'money well spent bestie 💖',
    'added to the diary, slay responsibly 👑',
    'noted! your budget knows about this now 🩷',
    'logged and gorgeous, just like you 💫',
  ];

  const handleLogExpense = async (fromJustify = false) => {
    if (!itemName.trim() || parsedPrice <= 0) return;
    setIsLogging(true);
    if (!fromJustify) {
      setResponse(null);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const msg = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];
    setLogConfirmMsg(msg);

    // Save to history with isLogged flag
    if (!fromJustify) {
      const entry: HistoryEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        itemName: itemName.trim(),
        price: parsedPrice,
        personality,
        message: msg,
        emoji: '📝',
        timestamp: new Date().toISOString(),
        isLogged: true,
      };
      await addHistory(entry);
    }

    // Add to period expenses
    const updated = await addExpense(parsedPrice, moneyCtx.payFrequency);
    setPeriodExpenses(updated);

    // Update aura score
    if (spendable) {
      await updateAuraScore(spendable.purchasePct);
    }

    // Budget alert for premium users
    if (hasMoneyCtx) {
      const spendableAmt = computeSpendable(moneyCtx, 0, updated.total).perPeriod + updated.total;
      if (spendableAmt > 0) {
        const spentPct = (updated.total / spendableAmt) * 100;
        const premium = await hasPremium();
        if (premium) {
          maybeSendBudgetAlert(spentPct);
        }
      }
    }

    setTimeout(() => {
      setIsLogging(false);
      clearInputs();
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  // ── render ────────────────────────────────────────────
  return (
    <ScreenTransition>
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ─────────────────────────────────── */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/largehappycat.png')}
              style={styles.headerCat}
            />
            <Text style={styles.title}>GirlMath</Text>
            <Text style={styles.subtitle}>your spending bestie</Text>
          </View>

          {/* ── Item inputs ────────────────────────────── */}
          <GradientCard>
            <Text style={styles.cardTitle}>💅 what are we buying?</Text>
            <InputRow
              icon="🛍️"
              placeholder={ITEM_PLACEHOLDERS[placeholderIdx]}
              value={itemName}
              onChangeText={(t: string) => { setItemName(t); setLogConfirmMsg(''); }}
            />
            {itemName.trim().length > 0 && isVagueName(itemName) ? (
              <Text style={styles.vagueHint}>
                💡 be specific for better results — e.g. "{ITEM_PLACEHOLDERS[placeholderIdx]}"
              </Text>
            ) : (
              <Text style={styles.inputHelperText}>
                include brand + model for best results ✨
              </Text>
            )}
            <InputRow
              icon="💰"
              placeholder="price"
              value={price}
              onChangeText={(t: string) => { setPrice(t); setLogConfirmMsg(''); }}
              keyboardType="decimal-pad"
              prefix="$"
            />
            <InputRow
              icon="📝"
              placeholder="note (optional)"
              value={note}
              onChangeText={setNote}
            />
          </GradientCard>

          {/* ── Action Buttons (right after inputs!) ───── */}
          <View style={styles.buttonRow}>
            <Animated.View style={[{ transform: [{ scale: buttonScale }] }, styles.buttonFlex]}>
              <TouchableOpacity
                onPress={handleJustify}
                activeOpacity={0.8}
                disabled={!itemName.trim() || parsedPrice <= 0 || isLoading}
              >
                <LinearGradient
                  colors={justifiesLeft === 0 ? ['#9ca3af', '#6b7280'] : GRADIENTS.button as [string, string, ...string[]]}
                  style={styles.button}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? '✨ ...' : justifiesLeft === 0 ? '🔒' : '💅 justify'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.buttonFlex}>
              <TouchableOpacity
                onPress={() => handleLogExpense(false)}
                activeOpacity={0.8}
                disabled={!itemName.trim() || parsedPrice <= 0 || isLogging}
              >
                <LinearGradient
                  colors={['#22C55E', '#16A34A'] as [string, string]}
                  style={styles.button}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.buttonText}>
                    {isLogging ? '✨ ...' : '📝 log it'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Hints row ────────────────────────────────── */}
          <Text style={styles.justifiesRemainingText}>
            {justifiesLeft > 0
              ? `${justifiesLeft} free justify${justifiesLeft === 1 ? '' : 's'} left today ✨`
              : "you've used all 3 today — upgrade for unlimited 💖"}
          </Text>

          {/* ── Thinking cat while loading ──────────── */}
          {isLoading && (
            <View style={styles.loadingCatWrap}>
              <Image
                source={require('../../assets/smallthinkingcat.png')}
                style={styles.loadingCat}
              />
            </View>
          )}

          {/* ── Results area (only one shows at a time) ── */}
          {response && !isLoading && (
            <>
              <ChatBubble
                message={response.message}
                emoji={response.emoji}
                reactions={response.reactions}
                itemName={itemName}
                price={parsedPrice}
              />
              {!logConfirmMsg && (
                <TouchableOpacity
                  onPress={() => handleLogExpense(true)}
                  activeOpacity={0.7}
                  style={styles.logThisTooBtn}
                >
                  <Text style={styles.logThisTooText}>
                    📝 log this purchase too (free)
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {logConfirmMsg ? (
            <GradientCard>
              <Text style={styles.logConfirmText}>{logConfirmMsg}</Text>
            </GradientCard>
          ) : null}

          {/* ── Money Vibe + Aura (collapsible) ──────── */}
          {hasMoneyCtx && parsedPrice > 0 && spendable && (
            <CollapsibleSection title="✨ your money vibe">
              <Text style={styles.computedRow}>
                spendable per period: {fmt$(spendable.perPeriod)}
              </Text>
              <Text style={styles.computedRow}>
                spendable this month: {fmt$(spendable.monthly)}
              </Text>
              <Text style={styles.computedRow}>
                this purchase: {spendable.purchasePct.toFixed(1)}% of spendable
              </Text>
              {periodExpenses.total > 0 && (
                <Text style={styles.computedRow}>
                  💸 logged this period: {fmt$(periodExpenses.total)}
                </Text>
              )}
              {spendable.perPeriod <= 0 && (
                <Text style={styles.warnText}>
                  💀 bestie your spendable is negative… broke aura detected
                </Text>
              )}
              <View style={{ marginTop: 8 }}>
                <AuraMeter price={parsedPrice} spendable={spendable} theme={auraTheme} />
              </View>
            </CollapsibleSection>
          )}

          {/* ── Mode reminder ──────────────────────────── */}
          <View style={styles.modeBadge}>
            <Image
              source={
                personality === 'delulu'
                  ? require('../../assets/largehappycat.png')
                  : personality === 'responsible'
                  ? require('../../assets/largehappyangelcat.png')
                  : require('../../assets/largedevilcatcard.png')
              }
              style={styles.modeBadgeCat}
            />
            <Text style={styles.modeBadgeText}>
              {personality === 'delulu' ? 'delulu mode' : personality === 'responsible' ? 'responsible bestie' : 'chaotic spender'}
            </Text>
            <Text style={styles.modeBadgeHint}>change in settings ⚙️</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>made with 💖 and zero financial literacy</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
    </ScreenTransition>
  );
}

// ══════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerCat: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    marginBottom: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
    textShadowColor: 'rgba(192,132,252,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2,
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // computed outputs (money vibe card)
  computedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  computedRow: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  warnText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  vibeHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  justifiesRemainingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: -4,
    marginBottom: 8,
  },
  vagueHint: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: -6,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  inputHelperText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: -6,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  // main justify button
  button: {
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: 'center',
    marginVertical: 12,
    shadowColor: COLORS.pinkHot,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  buttonFlex: {
    flex: 1,
    marginHorizontal: 4,
  },
  logThisTooBtn: {
    alignSelf: 'center',
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  logThisTooText: {
    color: '#16A34A',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  logConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16A34A',
    textAlign: 'center',
    paddingVertical: 4,
  },
  loadingCatWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  loadingCat: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    paddingBottom: 20,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    gap: 8,
  },
  modeBadgeCat: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  modeBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  modeBadgeHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
