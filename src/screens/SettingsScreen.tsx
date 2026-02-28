import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import GradientBackground from '../components/GradientBackground';
import ScreenTransition from '../components/ScreenTransition';
import GradientCard from '../components/GradientCard';
import PersonalitySelector from '../components/PersonalitySelector';
import { COLORS } from '../utils/theme';
import { PersonalityMode } from '../types';
import { loadState, saveMode } from '../utils/storage';
import { requestNotifPermission } from '../utils/notifications';
import { restorePurchases } from '../utils/purchases';

const LEGAL_BASE = 'https://getgirlmath.app';
const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export default function SettingsScreen() {
  const [personality, setPersonality] = useState<PersonalityMode>('delulu');
  const [notifStatus, setNotifStatus] = useState<'granted' | 'denied' | 'unknown'>('unknown');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const saved = await loadState();
        if (saved.lastMode) setPersonality(saved.lastMode);
        const { status } = await Notifications.getPermissionsAsync();
        setNotifStatus(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'unknown');
      })();
    }, []),
  );

  const handleModeChange = useCallback((m: PersonalityMode) => {
    setPersonality(m);
    saveMode(m);
  }, []);

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

        {/* Mode selector */}
        <GradientCard>
          <Text style={styles.sectionTitle}>who's justifying today?</Text>
          <Text style={styles.sectionHint}>
            this controls how your purchase gets justified — switch it up anytime 💅
          </Text>
          <PersonalitySelector selected={personality} onSelect={handleModeChange} />
        </GradientCard>
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
        </GradientCard>
        {/* About card */}
        <GradientCard>
          <Text style={styles.sectionTitle}>about GirlMath ✨</Text>
          <Text style={styles.aboutText}>
            your spending bestie — justifying every purchase with{' '}
            <Text style={styles.bold}>delulu logic</Text>, real price checks, and
            zero judgment 💕
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

          <Text style={styles.versionText}>version 1.0 💅</Text>
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
});
