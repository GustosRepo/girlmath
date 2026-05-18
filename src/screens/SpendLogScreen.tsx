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
import { COLORS, GRADIENTS, SPEND_CATEGORIES } from '../utils/theme';
import { SpendCategory, PersonalityMode, HistoryEntry, PeriodExpenses, MoneyContext } from '../types';
import { generateJustification } from '../utils/girlMathEngine';
import { loadState, addHistory, loadPeriodExpenses, addExpense, loadBudgetLimits } from '../utils/storage';
import { hasPremium } from '../utils/purchases';
import { usePaywall } from '../context/PaywallContext';
import GradientBackground from '../components/GradientBackground';
import GradientCard from '../components/GradientCard';
import InputRow from '../components/InputRow';
import ChatBubble from '../components/ChatBubble';

// ── Category reactions (category-specific personality flavor) ───────
const SPEND_REACTIONS: Record<PersonalityMode, (cat: string, item: string, price: number) => string> = {
  delulu: (cat, item, price) =>
    `logged ${item ? item : 'that'} as ${cat} for $${price} ✨ every purchase is an investment in your main character era`,
  responsible: (cat, item, price) =>
    `${item ? item : 'it'} logged under ${cat} for $${price} 💖 staying on top of your spending is literally so powerful`,
  chaotic: (cat, item, price) =>
    `$${price} in ${cat}?? ${item ? `"${item}" ` : ''}added to the diary 🔥 we don't explain ourselves`,
};

export default function SpendLogScreen() {
  const { showPaywall } = usePaywall();

  const [selectedCategory, setSelectedCategory] = useState<SpendCategory>('misc');
  const [amount, setAmount] = useState('');
  const [itemName, setItemName] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [response, setResponse] = useState<{ message: string; emoji: string; reactions: string[] } | null>(null);
  const [loggedMsg, setLoggedMsg] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [personality, setPersonality] = useState<PersonalityMode>('responsible');
  const [moneyCtx, setMoneyCtx] = useState<MoneyContext | null>(null);
  const [periodExpenses, setPeriodExpenses] = useState<PeriodExpenses>({ periodStart: '', total: 0 });
  const [budgetWarning, setBudgetWarning] = useState('');
  const buttonScale = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [premium, saved] = await Promise.all([hasPremium(), loadState()]);
        setIsPremium(premium);
        if (saved.lastMode) setPersonality(saved.lastMode);
        if (saved.moneyContext) setMoneyCtx(saved.moneyContext);
        const freq = saved.moneyContext?.payFrequency ?? 'biweekly';
        const expenses = await loadPeriodExpenses(freq);
        setPeriodExpenses(expenses);
      })();
    }, []),
  );

  const parsedAmount = parseFloat(amount) || 0;

  const handleCategorySelect = (cat: SpendCategory) => {
    if (!isPremium && cat !== 'misc') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      showPaywall();
      return;
    }
    Haptics.selectionAsync();
    setSelectedCategory(cat);
    setResponse(null);
    setLoggedMsg('');
    setBudgetWarning('');
  };

  const handleLog = async () => {
    if (parsedAmount <= 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLogging(true);
    setBudgetWarning('');

    Animated.sequence([
      Animated.spring(buttonScale, { toValue: 0.92, useNativeDriver: true, speed: 50 }),
      Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }),
    ]).start();

    const catInfo = SPEND_CATEGORIES.find(c => c.key === selectedCategory)!;
    const displayItem = itemName.trim() || catInfo.label;

    // Generate personality reaction
    setTimeout(async () => {
      const result = generateJustification({
        itemName: displayItem,
        price: parsedAmount,
        personality,
      });
      setResponse(result);

      // Build history entry
      const entry: HistoryEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        itemName: displayItem,
        price: parsedAmount,
        personality,
        message: result.message,
        emoji: catInfo.emoji,
        timestamp: new Date().toISOString(),
        isLogged: true,
        category: selectedCategory,
      };
      await addHistory(entry);

      // Add to period expenses with category
      const updated = await addExpense(parsedAmount, moneyCtx?.payFrequency ?? 'biweekly', selectedCategory);
      setPeriodExpenses(updated);

      // Check budget limit warning (premium)
      if (isPremium) {
        const limits = await loadBudgetLimits();
        const catLimit = limits.find(l => l.category === selectedCategory);
        if (catLimit && catLimit.limit > 0) {
          const catTotal = updated.byCategory?.[selectedCategory] ?? 0;
          if (catTotal >= catLimit.limit) {
            setBudgetWarning(`⚠️ you've hit your ${catInfo.label} budget of $${catLimit.limit} this period!`);
          } else if (catTotal >= catLimit.limit * 0.8) {
            setBudgetWarning(`💡 ${Math.round((catLimit.limit - catTotal) * 100) / 100} left in ${catInfo.label} budget`);
          }
        }
      }

      setIsLogging(false);
      // Clear inputs
      setAmount('');
      setItemName('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    }, 600 + Math.random() * 400);
  };

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
              <Text style={styles.title}>💸 spend log</Text>
              <Text style={styles.subtitle}>track what you actually bought</Text>
            </View>

            {/* ── Period total pill ──────────────────────── */}
            {periodExpenses.total > 0 && (
              <View style={styles.periodPill}>
                <Text style={styles.periodPillText}>
                  💰 logged this period: <Text style={styles.periodPillAmount}>${periodExpenses.total.toFixed(2)}</Text>
                </Text>
              </View>
            )}

            {/* ── Category picker ────────────────────────── */}
            <GradientCard>
              <Text style={styles.cardTitle}>📂 what category?</Text>
              <View style={styles.categoryGrid}>
                {SPEND_CATEGORIES.map((cat) => {
                  const isLocked = !isPremium && cat.key !== 'misc';
                  const isSelected = selectedCategory === cat.key;
                  const catTotal = periodExpenses.byCategory?.[cat.key] ?? 0;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.categoryPill,
                        isSelected && styles.categoryPillActive,
                        isLocked && styles.categoryPillLocked,
                      ]}
                      onPress={() => handleCategorySelect(cat.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.categoryEmoji}>{isLocked ? '🔒' : cat.emoji}</Text>
                      <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelActive]}>
                        {cat.label}
                      </Text>
                      {catTotal > 0 && !isLocked && (
                        <Text style={styles.categoryTotal}>${catTotal.toFixed(0)}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!isPremium && (
                <TouchableOpacity onPress={() => showPaywall()} activeOpacity={0.7}>
                  <Text style={styles.unlockHint}>🔒 unlock all categories with premium ✨</Text>
                </TouchableOpacity>
              )}
            </GradientCard>

            {/* ── Inputs ─────────────────────────────────── */}
            <GradientCard>
              <Text style={styles.cardTitle}>
                {SPEND_CATEGORIES.find(c => c.key === selectedCategory)?.emoji}{' '}
                how much did you spend?
              </Text>
              <InputRow
                icon="💰"
                placeholder="amount"
                value={amount}
                onChangeText={(t: string) => { setAmount(t); setResponse(null); }}
                keyboardType="decimal-pad"
                prefix="$"
              />
              <InputRow
                icon="🏷️"
                placeholder="item name (optional)"
                value={itemName}
                onChangeText={(t: string) => { setItemName(t); setResponse(null); }}
              />
            </GradientCard>

            {/* ── Log button ─────────────────────────────── */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                onPress={handleLog}
                activeOpacity={0.8}
                disabled={parsedAmount <= 0 || isLogging}
              >
                <LinearGradient
                  colors={GRADIENTS.button as [string, string, ...string[]]}
                  style={styles.button}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.buttonText}>
                    {isLogging ? '✨ logging...' : '📝 log this spend'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* ── Budget warning ─────────────────────────── */}
            {!!budgetWarning && (
              <View style={styles.budgetWarning}>
                <Text style={styles.budgetWarningText}>{budgetWarning}</Text>
              </View>
            )}

            {/* ── Personality reaction ───────────────────── */}
            {response && !isLogging && (
              <ChatBubble
                message={response.message}
                emoji={response.emoji}
                reactions={response.reactions}
                itemName={itemName.trim() || (SPEND_CATEGORIES.find(c => c.key === selectedCategory)?.label ?? '')}
                price={parsedAmount}
              />
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>every dollar logged is a dollar owned 💅</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </GradientBackground>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 110,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(192,132,252,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  periodPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  periodPillText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '600',
  },
  periodPillAmount: {
    fontWeight: '900',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  categoryPill: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 72,
  },
  categoryPillActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: COLORS.lavender,
  },
  categoryPillLocked: {
    opacity: 0.6,
  },
  categoryEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  categoryLabelActive: {
    color: COLORS.textSecondary,
  },
  categoryTotal: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  unlockHint: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginTop: 10,
  },
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
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  budgetWarning: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  budgetWarningText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
  },
});
