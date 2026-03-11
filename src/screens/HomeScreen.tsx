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
  PriceCheckResult,
  HistoryEntry,
  PeriodExpenses,
} from '../types';
import { generateJustification } from '../utils/girlMathEngine';
import { computeSpendable, fmt$ } from '../utils/finance';
import { loadState, addHistory, incrementJustifyCount, getJustifyCount, incrementTotalJustifyCount, loadPeriodExpenses, addExpense } from '../utils/storage';
import * as StoreReview from 'expo-store-review';
import { fetchPriceCheck, RateLimitError } from '../utils/priceCheck';
import { usePaywall } from '../context/PaywallContext';
import { hasPremium } from '../utils/purchases';
import { maybeSendBudgetAlert } from '../utils/notifications';

import GradientBackground from '../components/GradientBackground';
import GradientCard from '../components/GradientCard';
import CollapsibleSection from '../components/CollapsibleSection';
import InputRow from '../components/InputRow';
import AuraMeter from '../components/AuraMeter';
import ChatBubble from '../components/ChatBubble';
import PriceCheckResultCard from '../components/PriceCheckResultCard';

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
  const [personality, setPersonality] = useState<PersonalityMode>('delulu');
  const [response, setResponse] = useState<JustificationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  // ── price check ───────────────────────────────────────
  const [priceResult, setPriceResult] = useState<PriceCheckResult | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [checksRemaining, setChecksRemaining] = useState<number | null>(null);
  const [justifyCount, setJustifyCount] = useState(0);
  const justifiesLeft = Math.max(0, FREE_JUSTIFIES - justifyCount);

  // ── expense logging ───────────────────────────────────
  const [periodExpenses, setPeriodExpenses] = useState<PeriodExpenses>({ periodStart: '', total: 0 });
  const [logConfirmMsg, setLogConfirmMsg] = useState('');
  const [isLogging, setIsLogging] = useState(false);
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
      })();
    }, []),
  );

  // ── price check handler ───────────────────────────────
  const handlePriceCheck = async () => {
    if (!itemName.trim() || parsedPrice <= 0) return;
    setPriceLoading(true);
    setPriceError('');
    setResponse(null);
    setLogConfirmMsg('');
    try {
      const result = await fetchPriceCheck(itemName.trim(), parsedPrice);
      setPriceResult(result);
      if ('remaining' in result && typeof result.remaining === 'number') {
        setChecksRemaining(result.remaining);
      }
    } catch (err) {
      setPriceResult(null);
      if (err instanceof RateLimitError) {
        // Rate limit hit → show paywall instead of plain error
        setChecksRemaining(0);
        showPaywall();
      } else {
        setPriceError((err as Error).message || 'Something went wrong 😢');
      }
    } finally {
      setPriceLoading(false);
    }
  };

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
    setPriceResult(null);
    setPriceError('');

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
        priceCheck: priceResult ?? undefined,
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
        verdict: priceResult?.verdict,
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
      setPriceResult(null);
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
        verdict: priceResult?.verdict,
        timestamp: new Date().toISOString(),
        isLogged: true,
      };
      await addHistory(entry);
    }

    // Add to period expenses
    const updated = await addExpense(parsedPrice, moneyCtx.payFrequency);
    setPeriodExpenses(updated);

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
                onPress={handlePriceCheck}
                activeOpacity={0.8}
                disabled={!itemName.trim() || parsedPrice <= 0 || priceLoading || checksRemaining === 0}
              >
                <LinearGradient
                  colors={checksRemaining === 0 ? ['#9ca3af', '#6b7280'] : ['#F59E0B', '#D97706'] as [string, string]}
                  style={styles.button}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.buttonText}>
                    {priceLoading ? '🔍 ...' : '🛍️ prices'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

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

          {priceResult && !isLoading && !response && (
            <GradientCard>
              <PriceCheckResultCard result={priceResult} />
              {checksRemaining !== null && (
                <Text style={styles.remainingText}>
                  {checksRemaining > 0
                    ? `${checksRemaining} check${checksRemaining === 1 ? '' : 's'} left today ✨`
                    : "no checks left today — come back tomorrow bestie 💅"}
                </Text>
              )}
            </GradientCard>
          )}

          {priceError ? (
            <Text style={styles.warnText}>{priceError}</Text>
          ) : null}

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
                <AuraMeter price={parsedPrice} spendable={spendable} />
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
    paddingHorizontal: 20,
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
  // mini button (price check)
  miniButton: {
    backgroundColor: COLORS.pinkHot,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 6,
  },
  miniButtonDisabled: {
    opacity: 0.45,
  },
  miniButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  remainingText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
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
