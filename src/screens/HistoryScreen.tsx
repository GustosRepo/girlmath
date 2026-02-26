import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../utils/theme';
import GradientBackground from '../components/GradientBackground';
import ScreenTransition from '../components/ScreenTransition';
import GradientCard from '../components/GradientCard';
import { HistoryEntry, PriceVerdict } from '../types';
import { loadHistory, clearHistory } from '../utils/storage';
import { fmt$ } from '../utils/finance';

const VERDICT_BADGE: Record<PriceVerdict, { emoji: string; color: string }> = {
  steal: { emoji: '🤑', color: '#22C55E' },
  fair: { emoji: '😌', color: '#F59E0B' },
  overpriced: { emoji: '😬', color: '#EF4444' },
};

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadHistory().then(setHistory);
    }, []),
  );

  const totalSpent = history.reduce((s, h) => s + h.price, 0);
  const steals = history.filter((h) => h.verdict === 'steal').length;

  const handleClear = () => {
    Alert.alert('clear history?', 'this can\'t be undone bestie 👀', [
      { text: 'nah keep it', style: 'cancel' },
      {
        text: 'clear it all',
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
        <Text style={styles.title}>📜 spending diary</Text>
        <Text style={styles.subtitle}>every purchase has a story ✨</Text>

        {/* Stats card */}
        {history.length > 0 && (
          <GradientCard>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{history.length}</Text>
                <Text style={styles.statLabel}>justifications</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{fmt$(totalSpent)}</Text>
                <Text style={styles.statLabel}>total "researched"</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{steals}</Text>
                <Text style={styles.statLabel}>steals found</Text>
              </View>
            </View>
          </GradientCard>
        )}

        {/* History entries */}
        {history.map((entry) => (
          <GradientCard key={entry.id}>
            <View style={styles.entryHeader}>
              <Text style={styles.entryEmoji}>{entry.emoji}</Text>
              <View style={styles.entryInfo}>
                <Text style={styles.entryName}>{entry.itemName}</Text>
                <Text style={styles.entryTime}>{timeAgo(entry.timestamp)}</Text>
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
                      {VERDICT_BADGE[entry.verdict].emoji}{' '}
                      {entry.verdict}
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
              {entry.personality} mode
            </Text>
          </GradientCard>
        ))}

        {history.length === 0 && (
          <GradientCard>
            <View style={styles.emptyContainer}>
              <Image
                source={require('../../assets/smallsleepingcat.png')}
                style={styles.emptyCat}
              />
              <Text style={styles.emptyText}>
                no justifications yet ✨{`\n`}go justify some purchases bestie!
              </Text>
            </View>
          </GradientCard>
        )}

        {history.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>🗑️ clear history</Text>
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', flex: 1 },
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
});
