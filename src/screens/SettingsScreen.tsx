import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, TextInput } from 'react-native';
import * as StoreReview from 'expo-store-review';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import GradientBackground from '../components/GradientBackground';
import ScreenTransition from '../components/ScreenTransition';
import GradientCard from '../components/GradientCard';
import PersonalitySelector from '../components/PersonalitySelector';
import { COLORS, AURA_THEME_OPTIONS, SPEND_CATEGORIES } from '../utils/theme';
import { PersonalityMode, AuraTheme, SpendCategory, BudgetCategoryLimit } from '../types';
import { loadState, saveMode, saveAuraTheme, loadAuraTheme, loadBudgetLimits, saveBudgetLimits, loadLanguage, saveLanguage, type SupportedLanguage } from '../utils/storage';
import { requestNotifPermission, scheduleWeeklyRecap, cancelWeeklyRecap } from '../utils/notifications';
import { restorePurchases } from '../utils/purchases';
import { usePaywall } from '../context/PaywallContext';

const LEGAL_BASE = 'https://getgirlmath.app';
const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export default function SettingsScreen() {
  const { t, i18n: i18nInstance } = useTranslation();
  const [personality, setPersonality] = useState<PersonalityMode>('responsible');
  const [notifStatus, setNotifStatus] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const [weeklyRecapOn, setWeeklyRecapOn] = useState(false);
  const [auraTheme, setAuraTheme] = useState<AuraTheme>('default');
  const [budgetLimits, setBudgetLimits] = useState<BudgetCategoryLimit[]>([]);
  const [editingLimit, setEditingLimit] = useState<SpendCategory | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [, forceUpdate] = useState({});
  const { showPaywall, isPremium } = usePaywall();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const saved = await loadState();
        // If not premium and saved mode is locked, fall back to responsible
        if (saved.lastMode) {
          const mode = saved.lastMode;
          setPersonality(!isPremium && (mode === 'delulu' || mode === 'chaotic') ? 'responsible' : mode);
        }
        const { status } = await Notifications.getPermissionsAsync();
        setNotifStatus(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'unknown');
        const theme = await loadAuraTheme();
        setAuraTheme(theme);
        const lang = await loadLanguage();
        setSelectedLanguage(lang || (i18n.language as SupportedLanguage) || 'en');
        if (isPremium) {
          const limits = await loadBudgetLimits();
          setBudgetLimits(limits);
        }
      })();
    }, [isPremium]),
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

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
    await saveLanguage(lang);
    // Force re-render to ensure UI updates
    forceUpdate({});
    await i18n.changeLanguage(lang);
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
        t('settings.notif_blocked_title'),
        t('settings.notif_blocked_body'),
      );
      return;
    }
    const granted = await requestNotifPermission();
    setNotifStatus(granted ? 'granted' : 'denied');
    if (granted) Alert.alert(t('settings.notif_success_title'), t('settings.notif_success_body'));
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
          <Text style={styles.title}>{t('settings.title')}</Text>
          <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
        </View>

        {/* Premium upgrade card */}
        {!isPremium && (
          <GradientCard>
            <Text style={styles.sectionTitle}>{t('settings.premium_title')}</Text>
            <Text style={styles.sectionHint}>
              {t('settings.premium_hint')}
            </Text>
            <TouchableOpacity
              style={styles.upgradeBtn}
              activeOpacity={0.75}
              onPress={() => showPaywall()}
            >
              <Text style={styles.upgradeBtnText}>{t('settings.premium_cta')}</Text>
            </TouchableOpacity>
          </GradientCard>
        )}
        {isPremium && (
          <GradientCard>
            <Text style={styles.sectionTitle}>{t('settings.is_premium_title')}</Text>
            <Text style={styles.sectionHint}>
              {t('settings.is_premium_hint')}
            </Text>
          </GradientCard>
        )}

        {/* Mode selector */}
        <GradientCard>
          <Text style={styles.sectionTitle}>{t('settings.mode_title')}</Text>
          <Text style={styles.sectionHint}>
            {isPremium
              ? t('settings.mode_hint_premium')
              : t('settings.mode_hint_free')}
          </Text>
          <PersonalitySelector
            selected={personality}
            onSelect={handleModeChange}
            lockedModes={isPremium ? [] : ['delulu', 'chaotic']}
          />
        </GradientCard>

        {/* Language selector */}
        <GradientCard>
          <Text style={styles.sectionTitle}>{t('settings.language_title')}</Text>
          <Text style={styles.sectionHint}>{t('settings.language_hint')}</Text>
          <View style={styles.languageRow}>
            {[
              { key: 'en' as SupportedLanguage, label: 'English' },
              { key: 'es' as SupportedLanguage, label: 'Español' },
              { key: 'th' as SupportedLanguage, label: 'ไทย' },
            ].map((lang) => (
              <TouchableOpacity
                key={lang.key}
                style={[
                  styles.langPill,
                  selectedLanguage === lang.key && styles.langPillActive,
                ]}
                onPress={() => handleLanguageChange(lang.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.langLabel, selectedLanguage === lang.key && styles.langLabelActive]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GradientCard>

        {/* Aura meter theme */}
        <GradientCard>
          <Text style={styles.sectionTitle}>{t('settings.aura_theme_title')}</Text>
          <Text style={styles.sectionHint}>
            {isPremium ? t('settings.aura_theme_hint_premium') : t('settings.aura_theme_hint_free')}
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
            <Text style={styles.sectionTitle}>{t('settings.budget_limits_title')}</Text>
            <Text style={styles.sectionHint}>{t('settings.budget_limits_hint')}</Text>
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
                        placeholder={t('settings.limit_placeholder')}
                        placeholderTextColor={COLORS.textMuted}
                        autoFocus
                      />
                      <TouchableOpacity onPress={() => handleSaveLimit(cat.key)} style={styles.limitSaveBtn}>
                        <Text style={styles.limitSaveBtnText}>{t('settings.save')}</Text>
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
                        {existing ? `$${existing.limit}` : t('settings.set_limit')}
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
          <Text style={styles.sectionTitle}>{t('settings.notif_title')}</Text>
          <Text style={styles.sectionHint}>
            {t('settings.notif_hint')}
          </Text>
          <View style={styles.notifRow}>
            <View style={[
              styles.notifBadge,
              notifStatus === 'granted' ? styles.notifOn : styles.notifOff,
            ]}>
              <Text style={styles.notifBadgeText}>
                {notifStatus === 'granted' ? t('settings.notif_on') : t('settings.notif_off')}
              </Text>
            </View>
            {notifStatus !== 'granted' && (
              <TouchableOpacity style={styles.notifBtn} onPress={handleEnableNotifs} activeOpacity={0.7}>
                <Text style={styles.notifBtnText}>{t('settings.enable_reminders')}</Text>
              </TouchableOpacity>
            )}
            {notifStatus === 'granted' && (
              <Text style={styles.notifGrantedHint}>{t('settings.notif_active')}</Text>
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
              <Text style={styles.notifGrantedHint}>{t('settings.weekly_recap')} (Sundays)</Text>
            </TouchableOpacity>
          )}
        </GradientCard>
        {/* About card */}
        <GradientCard>
          <Text style={styles.sectionTitle}>{t('settings.about_title')}</Text>
          <Text style={styles.aboutText}>
            {t('settings.about_body')}
          </Text>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.reviewBtn}
            activeOpacity={0.75}
            onPress={async () => {
              if (await StoreReview.hasAction()) {
                await StoreReview.requestReview();
              } else {
                Alert.alert(t('settings.rate_alert_title'), t('settings.rate_alert_body'));
              }
            }}
          >
              <Text style={styles.reviewBtnText}>{t('settings.rate_btn')}</Text>
          </TouchableOpacity>

          {/* Restore Purchases */}
          <TouchableOpacity
            style={styles.restoreBtn}
            activeOpacity={0.75}
            onPress={async () => {
              try {
                const restored = await restorePurchases();
                if (restored) {
                  Alert.alert(t('settings.restore_success_title'), t('settings.restore_success_body'));
                } else {
                  Alert.alert(t('settings.restore_none_title'), t('settings.restore_none_body'));
                }
              } catch {
                Alert.alert(t('settings.restore_error_title'), t('settings.restore_error_body'));
              }
            }}
          >
              <Text style={styles.restoreBtnText}>{t('settings.restore_btn')}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Legal links */}
          <View style={styles.legalRow}>
            <TouchableOpacity onPress={() => Linking.openURL(`${LEGAL_BASE}/privacy`)}>
              <Text style={styles.legalLink}>{t('settings.privacy')}</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL(APPLE_EULA_URL)}>
              <Text style={styles.legalLink}>{t('settings.terms')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>version {Constants.expoConfig?.version ?? '1.2.0'} 💅</Text>
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
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  langPill: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 90,
  },
  langPillActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: COLORS.pinkHot,
  },
  langLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  langLabelActive: {
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
