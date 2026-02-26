import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { COLORS, GRADIENTS, PERSONALITY_OPTIONS } from '../utils/theme';
import { PersonalityMode } from '../types';
import { saveMode } from '../utils/storage';
import { PAYWALL_DISMISSED_KEY } from './PaywallScreen';

const { width, height } = Dimensions.get('window');

export const ONBOARDING_KEY = '@girlmath_onboarded';

const MODE_CATS: Record<PersonalityMode, any> = {
  delulu: require('../../assets/largehappycat.png'),
  responsible: require('../../assets/largehappyangelcat.png'),
  chaotic: require('../../assets/largedevilcatcard.png'),
};

const MODE_GRADIENTS: Record<PersonalityMode, [string, string]> = {
  delulu: ['rgba(255,182,217,0.9)', 'rgba(255,214,236,0.8)'],
  responsible: ['rgba(167,243,208,0.9)', 'rgba(216,244,255,0.8)'],
  chaotic: ['rgba(252,165,165,0.9)', 'rgba(253,230,138,0.8)'],
};

interface Props {
  onComplete: (goToBills?: boolean) => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState<PersonalityMode>('delulu');

  // Slide + fade for step transitions
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Cat float
  const floatAnim = useRef(new Animated.Value(0)).current;
  // Sparkle scale
  const sparkleAnim = useRef(new Animated.Value(0.8)).current;
  // Dot bounce
  const dotAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -14, duration: 1900, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1900, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, { toValue: 1.25, duration: 850, useNativeDriver: true }),
        Animated.timing(sparkleAnim, { toValue: 0.8, duration: 850, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Bounce dot on step change
  useEffect(() => {
    Animated.sequence([
      Animated.spring(dotAnim, { toValue: 1.6, useNativeDriver: true, speed: 40, bounciness: 14 }),
      Animated.spring(dotAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();
  }, [step]);

  const transitionTo = (nextStep: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(40);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleFinish = async (goToBills = false) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveMode(selectedMode);
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    // Don't hit the paywall immediately after onboarding — give the user a proper first look
    await AsyncStorage.setItem(PAYWALL_DISMISSED_KEY, 'true');
    onComplete(goToBills);
  };

  // ── Shared sparkle ring ──────────────────────────────
  const SPARKLES = ['✨', '💖', '🩷', '💫', '🌟', '⭐'];
  const SPARKLE_POS = [
    { top: -16, left: 20 }, { top: -10, right: 22 },
    { top: 32, right: -14 }, { bottom: 8, right: 16 },
    { bottom: -10, left: 20 }, { top: 60, left: -14 },
  ];

  const CatMascot = ({ source, size = 190 }: { source: any; size?: number }) => (
    <View style={[styles.mascotWrap, { width: size, height: size }]}>
      <View style={[styles.glowBlob, { width: size * 0.82, height: size * 0.82, borderRadius: size }]} />
      {SPARKLE_POS.map((pos, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.floatSparkle,
            pos as any,
            { transform: [{ scale: sparkleAnim }, { translateY: floatAnim }] },
          ]}
        >
          {SPARKLES[i]}
        </Animated.Text>
      ))}
      <Animated.Image
        source={source}
        style={[styles.mascot, { width: size, height: size, transform: [{ translateY: floatAnim }] }]}
        resizeMode="contain"
      />
    </View>
  );

  const PrimaryBtn = ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={styles.btnWrap}>
      <LinearGradient
        colors={GRADIENTS.button as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.btn}
      >
        <Text style={styles.btnText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  // ── Step dots ────────────────────────────────────────
  const Dots = () => (
    <View style={styles.dotsRow}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            i === step && styles.dotActive,
            i === step && { transform: [{ scale: dotAnim }] },
          ]}
        />
      ))}
    </View>
  );

  // ─────────────────────────────────────────────────────
  // STEP 0 — Welcome
  // ─────────────────────────────────────────────────────
  const StepWelcome = () => (
    <View style={styles.stepContent}>
      <CatMascot source={require('../../assets/largehappycat.png')} />

      <View style={styles.textBlock}>
        <Text style={styles.tagline}>hey bestie 💖</Text>
        <Text style={styles.headline}>Meet GirlMath</Text>
        <Text style={styles.body}>
          Your emotionally intelligent spending bestie — here to justify every purchase,
          track your bills, and make finance feel cute.
        </Text>
      </View>

      <View style={styles.pillRow}>
        {['justify anything 💅', 'price check 🔍', 'track bills 📅'].map((p) => (
          <View key={p} style={styles.pill}>
            <Text style={styles.pillText}>{p}</Text>
          </View>
        ))}
      </View>

      <PrimaryBtn label="let's go bestie 💖" onPress={() => transitionTo(1)} />
    </View>
  );

  // ─────────────────────────────────────────────────────
  // STEP 1 — Pick your vibe
  // ─────────────────────────────────────────────────────
  const StepVibe = () => (
    <View style={styles.stepContent}>
      <Text style={styles.tagline}>step 2 of 3</Text>
      <Text style={styles.headline}>pick your vibe ✨</Text>
      <Text style={styles.body}>
        Your bestie's personality. You can always change this in Settings.
      </Text>

      <View style={styles.modeList}>
        {PERSONALITY_OPTIONS.map((opt) => {
          const isActive = selectedMode === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              activeOpacity={0.78}
              onPress={async () => {
                await Haptics.selectionAsync();
                setSelectedMode(opt.key);
              }}
              style={[styles.modeCard, isActive && styles.modeCardActive]}
            >
              <LinearGradient
                colors={isActive ? MODE_GRADIENTS[opt.key] : ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.45)']}
                style={styles.modeCardInner}
              >
                <Image
                  source={MODE_CATS[opt.key]}
                  style={styles.modeCat}
                  resizeMode="contain"
                />
                <View style={styles.modeText}>
                  <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.modeDesc}>{opt.desc}</Text>
                </View>
                {isActive && <Text style={styles.modeCheck}>✓</Text>}
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>

      <PrimaryBtn label="that's so me 💅" onPress={() => transitionTo(2)} />
    </View>
  );

  // ─────────────────────────────────────────────────────
  // STEP 2 — Bills optional
  // ─────────────────────────────────────────────────────
  const StepBills = () => (
    <View style={styles.stepContent}>
      <CatMascot source={require('../../assets/largecatbillsdue.png')} size={170} />

      <View style={styles.textBlock}>
        <Text style={styles.tagline}>last step, bestie 💌</Text>
        <Text style={styles.headline}>want to track your bills?</Text>
        <Text style={styles.body}>
          Add your recurring expenses and we'll remind you before they're due — no more
          surprise charges, just soft reminders from your bestie.
        </Text>
      </View>

      <View style={styles.billsFeatureRow}>
        {[
          { emoji: '🔔', text: 'due date reminders' },
          { emoji: '📊', text: 'spending breakdown' },
          { emoji: '💰', text: 'savings tracking' },
        ].map((f) => (
          <View key={f.text} style={styles.billsFeatureChip}>
            <Text style={styles.billsFeatureEmoji}>{f.emoji}</Text>
            <Text style={styles.billsFeatureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <PrimaryBtn label="set up my bills 📅" onPress={() => handleFinish(true)} />

      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => handleFinish(false)}
        style={styles.skipBtn}
      >
        <Text style={styles.skipText}>skip for now — I'll add later</Text>
      </TouchableOpacity>
    </View>
  );

  const STEPS = [<StepWelcome key="0" />, <StepVibe key="1" />, <StepBills key="2" />];

  return (
    <LinearGradient
      colors={GRADIENTS.background as [string, string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      {/* Step dots at top */}
      <View style={styles.topBar}>
        <Dots />
        {step > 0 && (
          <TouchableOpacity
            onPress={() => transitionTo(step - 1)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backBtn}>← back</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            width: '100%',
            alignItems: 'center',
          }}
        >
          {STEPS[step]}
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 48,
  },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 58 : 38,
    paddingHorizontal: 24,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 24,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  // ── Dots ──────────────────────────────────────────────
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    width: 22,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },

  // ── Step content ──────────────────────────────────────
  stepContent: {
    width: width - 32,
    alignItems: 'center',
    paddingTop: 12,
    gap: 20,
  },

  // ── Mascot ────────────────────────────────────────────
  mascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowBlob: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.32)',
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 30,
    elevation: 8,
  },
  mascot: { zIndex: 2 },
  floatSparkle: {
    position: 'absolute',
    fontSize: 18,
    zIndex: 3,
  },

  // ── Text ──────────────────────────────────────────────
  textBlock: { alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  tagline: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: 'lowercase',
    textAlign: 'center',
  },
  headline: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(255,255,255,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  body: {
    fontSize: 15,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    opacity: 0.85,
  },

  // ── Feature pills (step 0) ────────────────────────────
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,182,217,0.55)',
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // ── Mode cards (step 1) ───────────────────────────────
  modeList: { width: '100%', gap: 10 },
  modeCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  modeCardActive: {
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
    transform: [{ scale: 1.02 }],
  },
  modeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
    gap: 12,
  },
  modeCat: { width: 52, height: 52 },
  modeText: { flex: 1, gap: 2 },
  modeLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modeLabelActive: { color: COLORS.textSecondary },
  modeDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  modeCheck: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textSecondary,
  },

  // ── Bills features (step 2) ───────────────────────────
  billsFeatureRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  billsFeatureChip: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,182,217,0.5)',
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  billsFeatureEmoji: { fontSize: 22 },
  billsFeatureText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  // ── Buttons ───────────────────────────────────────────
  btnWrap: {
    width: '100%',
    borderRadius: 28,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  btn: {
    borderRadius: 28,
    paddingVertical: 17,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  btnText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(74,25,66,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: -8,
  },
  skipText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(155,142,196,0.4)',
  },
});
