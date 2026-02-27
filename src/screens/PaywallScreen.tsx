import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  purchaseMonthly,
  purchaseLifetime,
  restorePurchases,
} from '../utils/purchases';

export { purchaseMonthly, purchaseLifetime, restorePurchases };

const { width } = Dimensions.get('window');

export const PAYWALL_DISMISSED_KEY = '@girlmath_paywall_dismissed';

const SPARKLE_POSITIONS = [
  { top: -18, left: 12 },
  { top: -8, right: 14 },
  { top: 20, right: -10 },
  { bottom: 10, left: -8 },
  { top: 50, left: -14 },
  { bottom: -10, right: 12 },
];

const KITTY_COPY = [
  '"this is basically free bestie 💸"',
  '"future you will be SO proud 🌟"',
  '"support your emotional support cat 🐱"',
];

interface Props {
  onClose: () => void;
}

export default function PaywallScreen({ onClose }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'lifetime'>('lifetime');
  const [purchasing, setPurchasing] = useState(false);

  // floating mascot animation
  const floatAnim = useRef(new Animated.Value(0)).current;
  // sparkle pulse
  const sparkleAnim = useRef(new Animated.Value(0.7)).current;
  // button shine sweep
  const shineAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -12,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1.2,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0.7,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shineAnim, {
          toValue: 1.4,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.delay(1600),
        Animated.timing(shineAnim, {
          toValue: -1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleDismiss = async () => {
    await AsyncStorage.setItem(PAYWALL_DISMISSED_KEY, 'true');
    onClose();
  };

  const handlePurchase = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPurchasing(true);
    try {
      const success =
        selectedPlan === 'monthly'
          ? await purchaseMonthly()
          : await purchaseLifetime();

      if (success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await AsyncStorage.setItem(PAYWALL_DISMISSED_KEY, 'true');
        Alert.alert('💖 Welcome bestie!', "You're officially premium. The world is your wallet.", [
          { text: "let's go 💅", onPress: onClose },
        ]);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const shineTranslate = shineAnim.interpolate({
    inputRange: [-1, 1.4],
    outputRange: [-width * 0.9, width * 0.9],
  });

  return (
    <LinearGradient
      colors={['#FFB6D9', '#D8B4FE', '#93C5FD']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ── MASCOT SECTION ────────────────────────────────── */}
        <View style={styles.mascotSection}>
          {/* Floating sparkle ring */}
          {SPARKLE_POSITIONS.map((pos, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.floatingSparkle,
                pos as any,
                {
                  transform: [
                    { scale: sparkleAnim },
                    { translateY: floatAnim },
                  ],
                  opacity: sparkleAnim.interpolate({ inputRange: [0.7, 1.2], outputRange: [0.6, 1] }),
                },
              ]}
            >
              {['✨', '💖', '🩷', '⭐', '💫', '🌟'][i]}
            </Animated.Text>
          ))}

          {/* Mascot glow blob */}
          <View style={styles.glowBlob} />

          {/* Cat mascot */}
          <Animated.Image
            source={require('../../assets/largehappycat.png')}
            style={[styles.mascot, { transform: [{ translateY: floatAnim }] }]}
            resizeMode="contain"
          />

          {/* Pleading hearts */}
          <Animated.Text
            style={[
              styles.pleadHeart,
              { transform: [{ scale: sparkleAnim }], left: '18%' },
            ]}
          >
            🥺
          </Animated.Text>
          <Animated.Text
            style={[
              styles.pleadHeart,
              { transform: [{ scale: sparkleAnim }], right: '18%' },
            ]}
          >
            💕
          </Animated.Text>
        </View>

        {/* ── HEADLINE ──────────────────────────────────────── */}
        <View style={styles.headlineWrap}>
          <Text style={styles.headline}>Upgrade your spending bestie 💖</Text>
          <Text style={styles.subheadline}>
            Unlock unlimited girl math, deeper insights, and premium vibes
          </Text>
        </View>

        {/* ── KITTY MICROCOPY ───────────────────────────────── */}
        <View style={styles.micropyCopyWrap}>
          {KITTY_COPY.map((line, i) => (
            <View key={i} style={styles.microcopyBubble}>
              <Text style={styles.microcopyText}>{line}</Text>
            </View>
          ))}
        </View>

        {/* ── PRICING CARDS ─────────────────────────────────── */}
        <View style={styles.cardsRow}>
          {/* Monthly */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={async () => {
              await Haptics.selectionAsync();
              setSelectedPlan('monthly');
            }}
            style={[
              styles.planCardWrap,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
          >
            <LinearGradient
              colors={['rgba(255,214,236,0.92)', 'rgba(232,196,255,0.82)']}
              style={styles.planCard}
            >
              {/* Selection ring */}
              {selectedPlan === 'monthly' && (
                <View style={styles.selectedRing} />
              )}

              <Text style={styles.planEmoji}>🌸</Text>
              <Text style={styles.planName}>Monthly</Text>
              <Text style={styles.planPrice}>$1.99</Text>
              <Text style={styles.planPer}>/month</Text>

              <View style={styles.featureDivider} />

              <View style={styles.featureList}>
                {[
                  '✨ Unlimited price checks',
                  '📊 Monthly spending summary',
                  '🌍 Multi-language support',
                ].map((f, i) => (
                  <Text key={i} style={styles.featureRow}>{f}</Text>
                ))}
              </View>

              {/* sparkle accents */}
              <Text style={styles.cardSparkleTopLeft}>💫</Text>
              <Text style={styles.cardSparkleBottomRight}>🩷</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Lifetime */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={async () => {
              await Haptics.selectionAsync();
              setSelectedPlan('lifetime');
            }}
            style={[
              styles.planCardWrap,
              styles.planCardLifetimeWrap,
              selectedPlan === 'lifetime' && styles.planCardSelected,
            ]}
          >
            <LinearGradient
              colors={['rgba(255,180,220,0.95)', 'rgba(192,132,252,0.88)']}
              style={[styles.planCard, styles.planCardLifetime]}
            >
              {/* Glow ring */}
              <View style={styles.lifetimeGlowRing} />

              {/* Badge */}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>bestie favorite ✨</Text>
              </View>

              <Text style={styles.planEmoji}>👑</Text>
              <Text style={[styles.planName, styles.planNameLifetime]}>Lifetime</Text>
              <Text style={[styles.planPrice, styles.planPriceLifetime]}>$9.99</Text>
              <Text style={[styles.planPer, styles.planPerLifetime]}>one-time</Text>

              <View style={[styles.featureDivider, { borderColor: 'rgba(255,255,255,0.5)' }]} />

              <View style={styles.featureList}>
                {[
                  '💎 Everything unlocked forever',
                  '♾️ No limits, ever',
                  '🎨 Future themes included',
                ].map((f, i) => (
                  <Text key={i} style={[styles.featureRow, styles.featureRowLifetime]}>{f}</Text>
                ))}
              </View>

              {/* Princess cat accent */}
              <Image
                source={require('../../assets/smallprincesscat.png')}
                style={styles.lifetimeCatAccent}
                resizeMode="contain"
              />

              <Text style={styles.cardSparkleTopLeft}>✨</Text>
              <Text style={styles.cardSparkleBottomRight}>💜</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── CTA BUTTON ────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handlePurchase}
          disabled={purchasing}
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={['#FF69B4', '#C084FC', '#818CF8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            {/* Shine sweep */}
            <Animated.View
              style={[
                styles.ctaShine,
                { transform: [{ translateX: shineTranslate }] },
              ]}
              pointerEvents="none"
            />
            <Text style={styles.ctaText}>
              {purchasing
                ? 'unlocking... 🔓'
                : `Unlock unlimited girl math 💅`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.planHint}>
          {selectedPlan === 'monthly'
            ? '💌 $1.99/mo · cancel anytime bestie'
            : '👑 $9.99 one-time · yours forever'}
        </Text>

        {/* ── SECONDARY ACTIONS ─────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={handleDismiss}
          style={styles.dismissBtn}
        >
          <Text style={styles.dismissText}>Not now bestie</Text>
        </TouchableOpacity>

        <Text style={styles.legalText}>
          Prices shown in USD · Auto-renews unless cancelled{' '}
          · Restore purchases in Settings
        </Text>
        <View style={styles.legalLinksRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://girlmath-production-600b.up.railway.app/legal/privacy.html')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}> · </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://girlmath-production-600b.up.railway.app/legal/terms.html')}>
            <Text style={styles.legalLink}>Terms of Use</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const CARD_WIDTH = (width - 52) / 2;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 60,
    paddingHorizontal: 16,
    alignItems: 'center',
  },

  // ── Mascot ─────────────────────────────────────────────
  mascotSection: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  glowBlob: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  mascot: {
    width: 170,
    height: 170,
    zIndex: 2,
  },
  floatingSparkle: {
    position: 'absolute',
    fontSize: 20,
    zIndex: 3,
  },
  pleadHeart: {
    position: 'absolute',
    bottom: 10,
    fontSize: 26,
    zIndex: 3,
  },

  // ── Headline ───────────────────────────────────────────
  headlineWrap: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4A1942',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 8,
    textShadowColor: 'rgba(255,255,255,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subheadline: {
    fontSize: 14,
    color: '#7C3AED',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },

  // ── Microcopy ──────────────────────────────────────────
  micropyCopyWrap: {
    gap: 8,
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  microcopyBubble: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,182,217,0.6)',
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  microcopyText: {
    fontSize: 13,
    color: '#4A1942',
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // ── Pricing Cards ──────────────────────────────────────
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    width: '100%',
    alignItems: 'flex-start',
  },
  planCardWrap: {
    flex: 1,
    borderRadius: 24,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'visible',
  },
  planCardLifetimeWrap: {
    shadowColor: '#FF69B4',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  planCardSelected: {
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 14,
    transform: [{ scale: 1.03 }],
  },
  planCard: {
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    minHeight: 260,
    position: 'relative',
  },
  planCardLifetime: {
    borderColor: 'rgba(255,255,255,0.55)',
  },
  selectedRing: {
    position: 'absolute',
    inset: 0,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#C084FC',
    zIndex: 10,
  },
  lifetimeGlowRing: {
    position: 'absolute',
    inset: 0,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.55)',
    zIndex: 10,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 8,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.3,
  },
  planEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  planName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4A1942',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  planNameLifetime: {
    color: '#FFFFFF',
  },
  planPrice: {
    fontSize: 30,
    fontWeight: '900',
    color: '#4A1942',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  planPriceLifetime: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(74,25,66,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  planPer: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 10,
  },
  planPerLifetime: {
    color: 'rgba(255,255,255,0.85)',
  },
  featureDivider: {
    width: '80%',
    borderTopWidth: 1,
    borderColor: 'rgba(192,132,252,0.35)',
    marginBottom: 10,
  },
  featureList: {
    gap: 5,
    alignItems: 'flex-start',
    width: '100%',
  },
  featureRow: {
    fontSize: 11,
    color: '#4A1942',
    fontWeight: '600',
    lineHeight: 16,
  },
  featureRowLifetime: {
    color: '#FFFFFF',
  },
  cardSparkleTopLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
    fontSize: 12,
  },
  cardSparkleBottomRight: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    fontSize: 12,
  },
  lifetimeCatAccent: {
    width: 38,
    height: 38,
    marginTop: 8,
    opacity: 0.92,
  },

  // ── CTA Button ─────────────────────────────────────────
  ctaWrap: {
    width: '100%',
    borderRadius: 28,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  ctaButton: {
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    position: 'relative',
  },
  ctaShine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 30,
    transform: [{ skewX: '-20deg' }],
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(74,25,66,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  planHint: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },

  // ── Secondary Actions ──────────────────────────────────
  dismissBtn: {
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  dismissText: {
    fontSize: 14,
    color: '#9B8EC4',
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(155,142,196,0.45)',
  },
  legalText: {
    fontSize: 10,
    color: '#9B8EC4',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
  },
  legalLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  legalLink: {
    fontSize: 11,
    color: '#9B8EC4',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  legalDot: {
    fontSize: 11,
    color: '#9B8EC4',
  },
});
