import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, TextInput } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import GradientBackground from '../components/GradientBackground';
import ScreenTransition from '../components/ScreenTransition';
import GradientCard from '../components/GradientCard';
import PersonalitySelector from '../components/PersonalitySelector';
import { COLORS, AURA_THEME_OPTIONS, SPEND_CATEGORIES } from '../utils/theme';
import { PersonalityMode, AuraTheme, SpendCategory, BudgetCategoryLimit } from '../types';
import { loadState, saveMode, saveAuraTheme, loadAuraTheme, loadBudgetLimits, saveBudgetLimits } from '../utils/storage';
import { requestNotifPermission, scheduleWeeklyRecap, cancelWeeklyRecap } from '../utils/notifications';
import { restorePurchases, hasPremium } from '../utils/purchases';
import { usePaywall } from '../context/PaywallContext';

const LEGAL_BASE = 'https://getgirlmath.app';
const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export default function SettingsScreen() {
  const [personality, setPersonality] = useState<PersonalityMode>('responsible');
  const [notifStatus, setNotifStatus] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const [weeklyRecapOn, setWeeklyRecapOn] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [auraTheme, setAuraTheme] = useState<AuraTheme>('default');
  const [budgetLimits, setBudgetLimits] = useState<BudgetCategoryLimit[]>([]);
  const [editingLimit, setEditingLimit] = useState<SpendCategory | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const { showPaywall } = usePaywall();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const saved = await loadState();
        const premium = await hasPremium();
        setIsPremium(premium);
        // If not premium and saved mode is locked, fall back to responsible
        if (saved.lastMode) {
          const mode = saved.lastMode;
          setPersonality(!premium && (mode === 'delulu' || mode === 'chaotic') ? 'responsible' : mode);
        }
        const { status } = await Notifications.getPermissionsAsync();
        setNotifStatus(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'unknown');
        const theme = await loadAuraTheme();
        setAuraTheme(theme);
        if (premium) {
          const limits = await loadBudgetLimits();
          setBudgetLimits(limits);
        }
      })();
    }, []),
  );

  const handleModeChange = useCallback((m: PersonalityMode) => {
    if (!isPremium && (m === 'delulu' || m === 'chaotic')) {
      showPaywall();
      return;
    }
    setPersonality(m);
    saveMode(m);
  }, [isPremium]);

  const handleAuraTheme = async (theme: AuraTheme) => {
    if (!isPremium) {
      showPaywall();
      return;
    }
    setAuraTheme(theme);
    await saveAuraTheme(theme);
  };

  const handleSaveLimit = async (category: SpendCategory) => {
    const val = parseFloat(limitInput);
    const updated = budgetLimits.filter(l => l.category !== category);
    if (!isNaN(val) && val > 0) {
      updated.push({ category, limit: val });
    }
    setBudgetLimits(updated);
    await saveBudgetLimits(updated);
    setEditingLimit(null);
    setLimitInput('');
  };

  const handleEnableNotifs = async () => {
    if (notifStatus === 'denied') {
      Alert.alert(
        'notifications blocked',
        'go to Settings > GirlMath > Notifications and enable them manually 💕',
      );
      return;
    }
    const granted = await requestNotifPermission();
    setNotifStatus(granted ? 'granted' : 'denied');
    if (granted) Alert.alert('yay! 🎉', 'bill reminders are on! you\'ll get pinged 3 days before, 1 day before, and on the due date 💸');
  };

  return (
    <ScreenTransition>
    <GradientBackground>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoEmoji}>⚙️</Text>
          <Text style={styles.title}>settings</Text>
          <Text style={styles.subtitle}>YOUR VIBE, YOUR RULES</Text>
        </View>

        {/* Premium upgrade card */}
        {!isPremium && (
          <GradientCard>
            <Text style={styles.sectionTitle}>💎 go premium</Text>
            <Text style={styles.sectionHint}>
              unlimited justifies, spending insights, export reports & more ✨
            </Text>
            <TouchableOpacity
              style={styles.upgradeBtn}
              activeOpacity={0.75}
              onPress={() => showPaywall()}
            >
              <Text style={styles.upgradeBtnText}>upgrade to premium 👑</Text>
            </TouchableOpacity>
          </GradientCard>
        )}
        {isPremium && (
          <GradientCard>
            <Text style={styles.sectionTitle}>👑 you're premium!</Text>
            <Text style={styles.sectionHint}>
              unlimited everything — you're literally that girl 💅
            </Text>
          </GradientCard>
        )}

        {/* Mode selector */}
        <GradientCard>
          <Text style={styles.sectionTitle}>who's justifying today?</Text>
          <Text style={styles.sectionHint}>
            {isPremium
              ? 'all modes unlocked — switch it up anytime 💅'
              : 'free tier: responsible only. upgrade for delulu & chaotic 💎'}
          </Text>
          <PersonalitySelector
            selected={personality}
            onSelect={handleModeChange}
            lockedModes={isPremium ? [] : ['delulu', 'chaotic']}
          />
        </GradientCard>

        {/* Aura meter theme */}
        <GradientCard>
          <Text style={styles.sectionTitle}>✨ aura meter theme</Text>
          <Text style={styles.sectionHint}>
            {isPremium ? 'pick your aesthetic 💅' : '🔒 premium feature — upgrade to unlock'}
          </Text>
          <View style={styles.themeRow}>
            {AURA_THEME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.themePill,
                  auraTheme === opt.key && styles.themePillActive,
                  !isPremium && opt.key !== 'default' && styles.themePillLocked,
                ]}
                onPress={() => handleAuraTheme(opt.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.themeEmoji}>{opt.emoji}</Text>
                <Text style={[styles.themeLabel, auraTheme === opt.key && styles.themeLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GradientCard>

        {/* Budget category limits (premium) */}
        {isPremium && (
          <GradientCard>
            <Text style={styles.sectionTitle}>💰 budget limits</Text>
            <Text style={styles.sectionHint}>set per-category limits for each pay period ✨</Text>
            {SPEND_CATEGORIES.map((cat) => {
              const existing = budgetLimits.find(l => l.category === cat.key);
              const isEditing = editingLimit === cat.key;
              return (
                <View key={cat.key} style={styles.limitRow}>
                  <Text style={styles.limitCatLabel}>{cat.emoji} {cat.label}</Text>
                  {isEditing ? (
                    <View style={styles.limitEditRow}>
                      <TextInput
                        style={styles.limitInput}
                        value={limitInput}
                        onChangeText={setLimitInput}
                        keyboardType="decimal-pad"
                        placeholder="limit $"
                        placeholderTextColor={COLORS.textMuted}
                        autoFocus
                      />
                      <TouchableOpacity onPress={() => handleSaveLimit(cat.key)} style={styles.limitSaveBtn}>
                        <Text style={styles.limitSaveBtnText}>save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingLimit(null)} style={styles.limitCancelBtn}>
                        <Text style={styles.limitCancelText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => { setEditingLimit(cat.key); setLimitInput(existing ? String(existing.limit) : ''); }}
                      style={styles.limitBadge}
                    >
                      <Text style={styles.limitBadgeText}>
                        {existing ? `$${existing.limit}` : 'set limit'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </GradientCard>
        )}
        {/* Notifications card */}
        <GradientCard>
          <Text style={styles.sectionTitle}>🔔 bill reminders</Text>
          <Text style={styles.sectionHint}>
            get pinged 3 days before, 1 day before, and on the due date of every bill 💸
          </Text>
          <View style={styles.notifRow}>
            <View style={[
              styles.notifBadge,
              notifStatus === 'granted' ? styles.notifOn : styles.notifOff,
            ]}>
              <Text style={styles.notifBadgeText}>
                {notifStatus === 'granted' ? '✅ on' : '🔕 off'}
              </Text>
            </View>
            {notifStatus !== 'granted' && (
              <TouchableOpacity style={styles.notifBtn} onPress={handleEnableNotifs} activeOpacity={0.7}>
                <Text style={styles.notifBtnText}>enable reminders 💕</Text>
              </TouchableOpacity>
            )}
            {notifStatus === 'granted' && (
              <Text style={styles.notifGrantedHint}>reminders are active for all your bills ✨</Text>
            )}
          </View>
          {notifStatus === 'granted' && (
            <TouchableOpacity
              style={styles.notifRow}
              onPress={async () => {
                const next = !weeklyRecapOn;
                setWeeklyRecapOn(next);
                if (next) {
                  await scheduleWeeklyRecap(0);
                } else {
                  await cancelWeeklyRecap();
                }
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.notifBadge, weeklyRecapOn ? styles.notifOn : styles.notifOff]}>
                <Text style={styles.notifBadgeText}>{weeklyRecapOn ? '✅ on' : '🔕 off'}</Text>
              </View>
              <Text style={styles.notifGrantedHint}>📊 weekly spending recap (Sundays)</Text>
            </TouchableOpacity>
          )}
        </GradientCard>
        {/* About card */}
        <GradientCard>
          <Text style={styles.sectionTitle}>about GirlMath ✨</Text>
          <Text style={styles.aboutText}>
            your spending bestie — justifying every purchase with{' '}
            <Text style={styles.bold}>delulu logic</Text> and zero judgment 💕
          </Text>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.reviewBtn}
            activeOpacity={0.75}
            onPress={async () => {
              if (await StoreReview.hasAction()) {
                await StoreReview.requestReview();
              } else {
                Alert.alert('💖 aww tysm!', 'Find us on the App Store and leave a rating — it means the world 🌟');
              }
            }}
          >
            <Text style={styles.reviewBtnText}>⭐ rate GirlMath</Text>
          </TouchableOpacity>

          {/* Restore Purchases */}
          <TouchableOpacity
            style={styles.restoreBtn}
            activeOpacity={0.75}
            onPress={async () => {
              try {
                const restored = await restorePurchases();
                if (restored) {
                  Alert.alert('💖 restored!', 'Your premium access has been restored.');
                } else {
                  Alert.alert('no purchases found', 'We couldn\'t find any previous purchases on this Apple ID.');
                }
              } catch {
                Alert.alert('oops', 'Something went wrong restoring purchases. Try again later.');
              }
            }}
          >
            <Text style={styles.restoreBtnText}>🔄 restore purchases</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Legal links */}
          <View style={styles.legalRow}>
            <TouchableOpacity onPress={() => Linking.openURL(`${LEGAL_BASE}/privacy`)}>
              <Text style={styles.legalLink}>privacy policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL(APPLE_EULA_URL)}>
              <Text style={styles.legalLink}>terms of use</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>version 1.1.0 💅</Text>
        </GradientCard>
      </ScrollView>
    </GradientBackground>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoEmoji: { fontSize: 36, marginBottom: 4 },
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
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2.5,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  sectionHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 14,
    fontStyle: 'italic',
  },
  aboutText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  bold: {
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.glassBorder,
    marginVertical: 12,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  notifBadge: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  notifOn: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: '#22C55E',
  },
  notifOff: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: '#EF4444',
  },
  notifBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  notifBtn: {
    flex: 1,
    backgroundColor: COLORS.pinkLight,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.pinkHot,
  },
  notifBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.pinkHot,
  },
  notifGrantedHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    flex: 1,
  },
  reviewBtn: {
    backgroundColor: 'rgba(255,182,217,0.25)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.pinkHot,
    marginBottom: 12,
  },
  reviewBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.pinkHot,
  },
  restoreBtn: {
    backgroundColor: 'rgba(192,132,252,0.15)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(192,132,252,0.4)',
    marginBottom: 12,
  },
  restoreBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C084FC',
  },
  upgradeBtn: {
    backgroundColor: 'rgba(255,105,180,0.2)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FF69B4',
  },
  upgradeBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FF69B4',
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  legalLink: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.pinkHot,
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  themeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  themePill: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 72,
  },
  themePillActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: COLORS.pinkHot,
  },
  themePillLocked: {
    opacity: 0.5,
  },
  themeEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  themeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  themeLabelActive: {
    color: COLORS.pinkHot,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  limitCatLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  limitBadge: {
    backgroundColor: 'rgba(192,132,252,0.2)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.4)',
  },
  limitBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  limitEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  limitInput: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    width: 80,
  },
  limitSaveBtn: {
    backgroundColor: COLORS.pinkHot,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  limitSaveBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  limitCancelBtn: {
    padding: 4,
  },
  limitCancelText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
});
