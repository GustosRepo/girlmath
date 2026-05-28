import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { COLORS, GRADIENTS } from '../utils/theme';
import GradientBackground from '../components/GradientBackground';
import ScreenTransition from '../components/ScreenTransition';
import GradientCard from '../components/GradientCard';
import { HistoryEntry, PriceVerdict, PeriodExpenses, SpendCategory } from '../types';
import { loadHistory, clearHistory, loadPeriodExpenses, loadState } from '../utils/storage';
import { SPEND_CATEGORIES } from '../utils/theme';
import { fmt$ } from '../utils/finance';
import { hasPremium } from '../utils/purchases';
import { usePaywall } from '../context/PaywallContext';

const VERDICT_BADGE: Record<PriceVerdict, { emoji: string; color: string }> = {
  steal: { emoji: '🤑', color: '#22C55E' },
  fair: { emoji: '😌', color: '#F59E0B' },
  overpriced: { emoji: '😬', color: '#EF4444' },
};

function timeAgo(isoString: string, t: TFunction): string {
  const ts = new Date(isoString).getTime();
  if (!isoString || isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('history.just_now');
  if (mins < 60) return t('history.mins_ago', { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('history.hrs_ago', { n: hrs });
  const days = Math.floor(hrs / 24);
  if (days === 1) return t('history.yesterday');
  if (days < 7) return t('history.days_ago', { n: days });
  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [periodExpenses, setPeriodExpenses] = useState<PeriodExpenses | null>(null);
  const { showPaywall } = usePaywall();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [h, premium, savedState] = await Promise.all([
          loadHistory(),
          hasPremium(),
          loadState(),
        ]);
        const freq = savedState.moneyContext?.payFrequency ?? 'biweekly';
        const period = await loadPeriodExpenses(freq);
        setHistory(h);
        setIsPremium(premium);
        setPeriodExpenses(period);
      })();
    }, []),
  );

  const totalSpent = history.reduce((s, h) => s + h.price, 0);
  const steals = history.filter((h) => h.verdict === 'steal').length;
  const loggedCount = history.filter((h) => h.isLogged).length;
  const loggedEntries = history.filter((h) => h.isLogged);

  // ── Spending Insights (premium) ───────────────────────
  const generateInsights = (): { persona: { emoji: string; title: string; desc: string }; lines: string[] } | null => {
    if (loggedEntries.length === 0) return null;
    const lines: string[] = [];
    const totalLogged = loggedEntries.reduce((s, e) => s + e.price, 0);

    // ── Spending persona based on patterns ──
    const avg = totalLogged / loggedEntries.length;
    const over100 = loggedEntries.filter((e) => e.price >= 100).length;
    const under20 = loggedEntries.filter((e) => e.price < 20).length;
    let persona = { emoji: '🛍️', title: 'casual shopper', desc: 'you buy what you want, when you want' };
    if (over100 >= 3) persona = { emoji: '👑', title: 'luxury queen', desc: 'expensive taste is a personality trait' };
    else if (under20 > loggedEntries.length * 0.6) persona = { emoji: '🧋', title: 'small treat girlie', desc: 'death by a thousand little purchases' };
    else if (avg > 200) persona = { emoji: '💎', title: 'big spender energy', desc: 'go big or go home — you chose big' };
    else if (loggedEntries.length >= 10) persona = { emoji: '🛒', title: 'serial shopper', desc: 'your cart is never empty bestie' };

    // ── Latte conversion ──
    const lattes = Math.floor(totalLogged / 7);
    if (lattes > 0) lines.push(`🧋 that's ${lattes} iced lattes worth of spending`);

    // ── Biggest splurge with personality ──
    const biggest = loggedEntries.reduce((max, e) => (e.price > max.price ? e : max), loggedEntries[0]);
    lines.push(`👑 biggest splurge: ${biggest.itemName} (${fmt$(biggest.price)})`);

    // ── $100+ club ──
    if (over100 > 0) {
      lines.push(`💀 ${over100} purchase${over100 === 1 ? '' : 's'} over $100… we don't judge`);
    }

    // ── Week-over-week energy ──
    const now = Date.now();
    const thisWeek = loggedEntries.filter((e) => now - new Date(e.timestamp).getTime() < 7 * 86400000);
    const lastWeek = loggedEntries.filter((e) => {
      const age = now - new Date(e.timestamp).getTime();
      return age >= 7 * 86400000 && age < 14 * 86400000;
    });
    const thisWeekTotal = thisWeek.reduce((s, e) => s + e.price, 0);
    const lastWeekTotal = lastWeek.reduce((s, e) => s + e.price, 0);
    if (lastWeekTotal > 0) {
      const change = Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100);
      if (change > 0) lines.push(`📈 spending energy UP ${change}% this week`);
      else if (change < -10) lines.push(`📉 spending down ${Math.abs(change)}% — saving era?`);
      else lines.push(`➡️ spending is holding steady this week`);
    }

    // ── Monthly projection ──
    const oldestTs = new Date(loggedEntries[loggedEntries.length - 1].timestamp).getTime();
    const daysCovered = Math.max(1, isNaN(oldestTs) ? 1 : (now - oldestTs) / 86400000);
    const dailyRate = totalLogged / daysCovered;
    const monthlyProjection = dailyRate * 30;
    if (daysCovered >= 3) {
      lines.push(`🔮 at this rate you'll spend ~${fmt$(monthlyProjection)} this month`);
    }

    // ── Spending streak ──
    const uniqueDays = [...new Set(loggedEntries.map((e) => e.timestamp.slice(0, 10)))].sort();
    if (uniqueDays.length >= 2) {
      let streak = 1;
      for (let i = uniqueDays.length - 1; i > 0; i--) {
        const d1 = new Date(uniqueDays[i]);
        const d2 = new Date(uniqueDays[i - 1]);
        if (d1.getTime() - d2.getTime() <= 86400000 * 1.5) streak++;
        else break;
      }
      if (streak >= 2) lines.push(`🔥 ${streak}-day spending streak — iconic`);
    }

    return { persona, lines };
  };

  // ── Export spending report ────────────────────────────
  const handleExport = async () => {
    if (!isPremium) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      showPaywall();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const lines: string[] = ['✨ GirlMath Spending Report ✨', ''];

    // Stats
    lines.push(`📊 Total items: ${history.length}`);
    lines.push(`💰 Total researched: ${fmt$(totalSpent)}`);
    lines.push(`📝 Logged purchases: ${loggedCount}`);
    lines.push(`🤑 Steals found: ${steals}`);
    lines.push('');

    // Insights
    const insData = generateInsights();
    if (insData) {
      lines.push(`✨ Spending persona: ${insData.persona.emoji} ${insData.persona.title}`);
      lines.push(`   "${insData.persona.desc}"`);
      lines.push('');
      insData.lines.forEach((i) => lines.push(`  ${i}`));
      lines.push('');
    }

    // Recent entries
    const recent = history.slice(0, 15);
    if (recent.length > 0) {
      lines.push('🛍️ Recent purchases:');
      recent.forEach((e) => {
        const logged = e.isLogged ? ' 📝' : '';
        const verdict = e.verdict ? ` [${e.verdict}]` : '';
        lines.push(`  ${e.emoji} ${e.itemName} — ${fmt$(e.price)}${verdict}${logged}`);
      });
    }

    lines.push('');
    lines.push('— sent from GirlMath 💅');

    await Share.share({ message: lines.join('\n') });
  };

  const insightsData = isPremium ? generateInsights() : null;

  // Spending streak (extracted for free + premium display)
  const spendingStreak = (() => {
    if (loggedEntries.length < 2) return 0;
    const uniqueDays = [...new Set(loggedEntries.map((e) => e.timestamp.slice(0, 10)))].sort();
    let streak = 1;
    for (let i = uniqueDays.length - 1; i > 0; i--) {
      const d1 = new Date(uniqueDays[i]);
      const d2 = new Date(uniqueDays[i - 1]);
      if (d1.getTime() - d2.getTime() <= 86400000 * 1.5) streak++;
      else break;
    }
    return streak >= 2 ? streak : 0;
  })();

  // Cap history for free users
  const FREE_HISTORY_CAP = 7;
  const displayedHistory = isPremium ? history : history.slice(0, FREE_HISTORY_CAP);
  const hasLockedEntries = !isPremium && history.length > FREE_HISTORY_CAP;

  const handleClear = () => {
    Alert.alert(t('history.clear_title'), t('history.clear_body'), [
      { text: t('history.clear_no'), style: 'cancel' },
      {
        text: t('history.clear_yes'),
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          setHistory([]);
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
        <Text style={styles.title}>{t('history.page_title')}</Text>
        <Text style={styles.subtitle}>{t('history.page_subtitle')}</Text>

        {/* Streak badge */}
        {spendingStreak >= 2 && (
          <GradientCard>
            <View style={styles.streakRow}>
              <Text style={styles.streakFire}>🔥</Text>
              <View>
                <Text style={styles.streakTitle}>{t('history.streak_title', { n: spendingStreak })}</Text>
                <Text style={styles.streakSub}>{t('history.streak_sub')}</Text>
              </View>
            </View>
          </GradientCard>
        )}

        {/* Pay period summary (premium) */}
        {isPremium && periodExpenses && periodExpenses.total > 0 && (
          <GradientCard>
            <Text style={styles.sectionTitle}>{t('history.this_period')}</Text>
            <Text style={styles.periodTotal}>{t('history.period_spent', { amount: fmt$(periodExpenses.total) })}</Text>
            {periodExpenses.byCategory && Object.keys(periodExpenses.byCategory).length > 0 && (
              <View style={styles.catBreakdown}>
                {(Object.entries(periodExpenses.byCategory) as [SpendCategory, number][])
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([cat, amount]) => {
                    const catInfo = SPEND_CATEGORIES.find(c => c.key === cat);
                    return (
                      <View key={cat} style={styles.catRow}>
                        <Text style={styles.catEmoji}>{catInfo?.emoji ?? '🛍️'}</Text>
                        <Text style={styles.catLabel}>{catInfo ? t(`categories.${cat}` as any) : cat}</Text>
                        <Text style={styles.catAmount}>{fmt$(amount)}</Text>
                      </View>
                    );
                  })}
              </View>
            )}
          </GradientCard>
        )}

        {/* Stats card */}
        {history.length > 0 && (
          <GradientCard>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{history.length}</Text>
                <Text style={styles.statLabel}>{t('history.stat_justifications')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{fmt$(totalSpent)}</Text>
                <Text style={styles.statLabel}>{t('history.stat_researched')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{steals}</Text>
                <Text style={styles.statLabel}>{t('history.stat_steals')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#16A34A' }]}>{loggedCount}</Text>
                <Text style={styles.statLabel}>{t('history.logged')}</Text>
              </View>
            </View>
          </GradientCard>
        )}

        {/* ── Premium: Spending Insights ──────────────── */}
        {history.length >= 3 && (
          <TouchableOpacity
            activeOpacity={isPremium ? 1 : 0.8}
            onPress={!isPremium ? () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); showPaywall(); } : undefined}
          >
            <GradientCard>
              <Text style={styles.insightsTitle}>
                {isPremium ? t('history.spending_vibe_on') : t('history.spending_vibe_off')}
              </Text>
              {isPremium && insightsData ? (
                <>
                  <View style={styles.personaCard}>
                    <Text style={styles.personaEmoji}>{insightsData.persona.emoji}</Text>
                    <Text style={styles.personaTitle}>{insightsData.persona.title}</Text>
                    <Text style={styles.personaDesc}>{insightsData.persona.desc}</Text>
                  </View>
                  {insightsData.lines.map((line, i) => (
                    <Text key={i} style={styles.insightRow}>{line}</Text>
                  ))}
                </>
              ) : (
                <Text style={styles.insightLocked}>
                  {t('history.insights_upgrade')}
                </Text>
              )}
            </GradientCard>
          </TouchableOpacity>
        )}

        {/* ── Premium: Export Report Button ───────────── */}
        {history.length > 0 && (
          <TouchableOpacity onPress={handleExport} activeOpacity={0.8}>
            <LinearGradient
              colors={isPremium ? (GRADIENTS.button as [string, string, ...string[]]) : ['#9ca3af', '#6b7280']}
              style={styles.exportButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.exportButtonText}>
                {isPremium ? t('history.export_btn') : t('history.export_locked')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* History entries */}
        {displayedHistory.map((entry) => (
          <GradientCard key={entry.id}>
            <View style={styles.entryHeader}>
              <Text style={styles.entryEmoji}>{entry.emoji}</Text>
              <View style={styles.entryInfo}>
                <Text style={styles.entryName}>{entry.itemName}</Text>
                <Text style={styles.entryTime}>{timeAgo(entry.timestamp, t)}</Text>
              </View>
              <View style={styles.entryRight}>
                <Text style={styles.entryPrice}>{fmt$(entry.price)}</Text>
                {entry.verdict && (
                  <View
                    style={[
                      styles.verdictBadge,
                      { backgroundColor: VERDICT_BADGE[entry.verdict].color + '20' },
                    ]}
                  >
                    <Text style={styles.verdictText}>
                      {t(`history.verdict_${entry.verdict}` as any)}
                    </Text>
                  </View>
                )}
                {entry.isLogged && (
                  <View
                    style={[
                      styles.verdictBadge,
                      { backgroundColor: 'rgba(34,197,94,0.12)' },
                    ]}
                  >
                    <Text style={[styles.verdictText, { color: '#16A34A' }]}>
                      {t('history.verdict_logged')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.messageBubble}>
              <Text style={styles.messageText}>
                "{entry.message}"
              </Text>
            </View>
            <Text style={styles.modeTag}>
              {entry.personality === 'delulu' ? '🦄' : entry.personality === 'chaotic' ? '🔥' : '📋'}{' '}
              {t('history.mode_tag', { mode: entry.personality })}
            </Text>
          </GradientCard>
        ))}

        {/* Locked history upgrade prompt */}
        {hasLockedEntries && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); showPaywall(); }}
          >
            <GradientCard>
              <View style={styles.lockedBanner}>
                <Text style={styles.lockedBannerEmoji}>🔒</Text>
                <Text style={styles.lockedBannerText}>
                  {t('history.entries_hidden', { n: history.length - FREE_HISTORY_CAP })}
                </Text>
                <Text style={styles.lockedBannerSub}>{t('history.unlock_full')}</Text>
              </View>
            </GradientCard>
          </TouchableOpacity>
        )}

        {history.length === 0 && (
          <GradientCard>
            <View style={styles.emptyContainer}>
              <Image
                source={require('../../assets/smallsleepingcat.png')}
                style={styles.emptyCat}
              />
              <Text style={styles.emptyText}>
                {t('history.empty_text')}
              </Text>
            </View>
          </GradientCard>
        )}

        {history.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>{t('history.clear_btn')}</Text>
          </TouchableOpacity>
        )}

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
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: { alignItems: 'center', width: '50%', paddingVertical: 10 },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.glassBorder,
  },
  // Entry
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryEmoji: { fontSize: 28, marginRight: 10 },
  entryInfo: { flex: 1 },
  entryName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  entryTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  entryRight: { alignItems: 'flex-end' },
  entryPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  verdictBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  verdictText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  // Message
  messageBubble: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
  },
  messageText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  modeTag: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyCat: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
  // Clear
  clearBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  clearText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  // Insights
  insightsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  personaCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,182,217,0.4)',
  },
  personaEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  personaTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  personaDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'center',
  },
  insightRow: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    lineHeight: 18,
  },
  insightLocked: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Export
  exportButton: {
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Streak
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  streakFire: {
    fontSize: 36,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  streakSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  // Pay period summary
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  periodTotal: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.pinkHot,
    marginBottom: 10,
  },
  catBreakdown: {
    gap: 6,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catEmoji: {
    fontSize: 16,
    width: 24,
  },
  catLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  catAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  // Locked history banner
  lockedBanner: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  lockedBannerEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  lockedBannerText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  lockedBannerSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
