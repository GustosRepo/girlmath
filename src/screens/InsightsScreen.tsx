import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import GradientBackground from '../components/GradientBackground';
import ScreenTransition from '../components/ScreenTransition';
import GradientCard from '../components/GradientCard';
import { COLORS, SPEND_CATEGORIES } from '../utils/theme';
import { loadHistory, loadPeriodExpenses, loadState } from '../utils/storage';
import { fmt$ } from '../utils/finance';
import { HistoryEntry, SpendCategory } from '../types';

// ── helpers ────────────────────────────────────────────────
const CAT_COLORS: Record<SpendCategory, string> = {
  shopping: '#C084FC',
  food:     '#F97316',
  beauty:   '#EC4899',
  shoes:    '#8B5CF6',
  health:   '#22C55E',
  tech:     '#3B82F6',
  fun:      '#F59E0B',
  home:     '#10B981',
  misc:     '#9CA3AF',
};

function dayLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return String(d.getDate());
}

interface DayBucket { label: string; total: number; }
interface CatBucket { category: SpendCategory; total: number; }

export default function InsightsScreen() {
  const navigation = useNavigation();
  const [daily, setDaily] = useState<DayBucket[]>([]);
  const [byCategory, setByCategory] = useState<CatBucket[]>([]);
  const [periodTotal, setPeriodTotal] = useState(0);
  const [avgPerDay, setAvgPerDay] = useState(0);
  const [biggestEntry, setBiggestEntry] = useState<HistoryEntry | null>(null);
  const [totalEntries, setTotalEntries] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const saved = await loadState();
        const freq = saved.moneyContext?.payFrequency ?? 'biweekly';
        const [history, period] = await Promise.all([
          loadHistory(),
          loadPeriodExpenses(freq),
        ]);

        // ── 30-day daily buckets ─────────────────────────
        const buckets: DayBucket[] = Array.from({ length: 30 }, (_, i) => ({
          label: dayLabel(13 - i),
          total: 0,
        }));
        const now = Date.now();
        history.forEach(e => {
          if (!e.isLogged) return;
          const daysAgo = Math.floor((now - new Date(e.timestamp).getTime()) / 86400000);
          if (daysAgo >= 0 && daysAgo < 30) {
            buckets[29 - daysAgo].total += e.price;
          }
        });
        setDaily(buckets);

        // ── category totals (all time logged) ────────────
        const catMap: Partial<Record<SpendCategory, number>> = {};
        history.forEach(e => {
          if (!e.isLogged || !e.category) return;
          catMap[e.category] = (catMap[e.category] ?? 0) + e.price;
        });
        const cats = Object.entries(catMap)
          .map(([cat, total]) => ({ category: cat as SpendCategory, total: total ?? 0 }))
          .sort((a, b) => b.total - a.total);
        setByCategory(cats);

        // ── stats ─────────────────────────────────────────
        setPeriodTotal(period.total);
        const loggedInPeriod = history.filter(e => {
          if (!e.isLogged) return false;
          return new Date(e.timestamp).getTime() >= new Date(period.periodStart).getTime();
        });
        const daysInPeriod = Math.max(1, Math.ceil(
          (now - new Date(period.periodStart).getTime()) / 86400000,
        ));
        setAvgPerDay(loggedInPeriod.length > 0 ? period.total / daysInPeriod : 0);
        const biggest = [...history]
          .filter(e => e.isLogged)
          .sort((a, b) => b.price - a.price)[0] ?? null;
        setBiggestEntry(biggest);
        setTotalEntries(history.filter(e => e.isLogged).length);
      })();
    }, []),
  );

  const maxDaily = Math.max(...daily.map(d => d.total), 1);
  const maxCat = byCategory.length > 0 ? byCategory[0].total : 1;

  return (
    <ScreenTransition>
      <GradientBackground>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>‹ back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>📊 spending insights</Text>
          <Text style={styles.subtitle}>the unfiltered truth about your money ✨</Text>

          {/* Stats row */}
          <GradientCard>
            <Text style={styles.cardTitle}>this period</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statNum}>{fmt$(periodTotal)}</Text>
                <Text style={styles.statLabel}>total spent</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statNum}>{fmt$(avgPerDay)}</Text>
                <Text style={styles.statLabel}>avg / day</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statNum}>{totalEntries}</Text>
                <Text style={styles.statLabel}>purchases</Text>
              </View>
            </View>
            {biggestEntry && (
              <View style={styles.biggestRow}>
                <Text style={styles.biggestLabel}>💸 biggest purchase</Text>
                <Text style={styles.biggestItem} numberOfLines={1}>{biggestEntry.itemName}</Text>
                <Text style={styles.biggestAmt}>{fmt$(biggestEntry.price)}</Text>
              </View>
            )}
          </GradientCard>

          {/* 30-day daily chart */}
          <GradientCard>
            <Text style={styles.cardTitle}>last 30 days</Text>
            <View style={styles.dailyChart}>
              {daily.map((d, i) => (
                <View key={i} style={styles.dayCol}>
                  <View style={styles.dayBarTrack}>
                    <View style={[
                      styles.dayBar,
                      {
                        height: d.total > 0 ? Math.max(4, (d.total / maxDaily) * 80) : 3,
                        backgroundColor: d.total > 0 ? '#C084FC' : 'rgba(0,0,0,0.08)',
                      },
                    ]} />
                  </View>
                  <Text style={[styles.dayLabel, i % 5 !== 0 && styles.dayLabelHidden]}>
                    {d.label}
                  </Text>
                </View>
              ))}
            </View>
            {daily.every(d => d.total === 0) && (
              <Text style={styles.emptyHint}>no logged expenses yet 👻 start logging to see your chart</Text>
            )}
          </GradientCard>

          {/* Category breakdown */}
          <GradientCard>
            <Text style={styles.cardTitle}>by category (all time)</Text>
            {byCategory.length === 0 ? (
              <Text style={styles.emptyHint}>no categorized expenses yet 🌸 log some to see breakdown</Text>
            ) : (
              byCategory.map(({ category, total }) => {
                const cat = SPEND_CATEGORIES.find(c => c.key === category);
                const pct = (total / maxCat) * 100;
                const color = CAT_COLORS[category] ?? '#9CA3AF';
                return (
                  <View key={category} style={styles.catRow}>
                    <Text style={styles.catEmoji}>{cat?.emoji ?? '🛍️'}</Text>
                    <View style={styles.catInfo}>
                      <View style={styles.catTopRow}>
                        <Text style={styles.catName}>{cat?.label ?? category}</Text>
                        <Text style={[styles.catAmt, { color }]}>{fmt$(total)}</Text>
                      </View>
                      <View style={styles.catBarTrack}>
                        <View style={[styles.catBar, { width: `${pct}%`, backgroundColor: color }]} />
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </GradientCard>

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
  cardTitle: { fontSize: 15, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 14, letterSpacing: 0.5 },
  // stats
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statCell: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '900', color: COLORS.textSecondary },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(0,0,0,0.08)' },
  biggestRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(192,132,252,0.1)', borderRadius: 10, padding: 10, flexWrap: 'wrap' },
  biggestLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
  biggestItem: { flex: 1, fontSize: 13, color: COLORS.textPrimary, fontWeight: '700' },
  biggestAmt: { fontSize: 14, fontWeight: '900', color: COLORS.textSecondary },
  // daily chart
  dailyChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingBottom: 4 },
  dayCol: { flex: 1, alignItems: 'center' },
  dayBarTrack: { height: 84, justifyContent: 'flex-end' },
  dayBar: { width: '100%', borderRadius: 3, minHeight: 3 },
  dayLabel: { fontSize: 8, color: COLORS.textMuted, marginTop: 4, fontWeight: '600' },
  dayLabelHidden: { opacity: 0 },
  emptyHint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', fontStyle: 'italic', marginTop: 4 },
  // category bars
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  catEmoji: { fontSize: 20, width: 28 },
  catInfo: { flex: 1 },
  catTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  catName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },
  catAmt: { fontSize: 13, fontWeight: '900' },
  catBarTrack: { height: 7, backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden' },
  catBar: { height: '100%', borderRadius: 4 },
});
