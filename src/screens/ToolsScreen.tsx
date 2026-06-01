import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { usePaywall } from '../context/PaywallContext';
import GradientBackground from '../components/GradientBackground';
import ScreenTransition from '../components/ScreenTransition';
import GradientCard from '../components/GradientCard';
import { COLORS } from '../utils/theme';
import { loadAuraScore, loadSavingsJar, loadTreatBudget, loadCostPerUseItems, loadSubscriptions } from '../utils/storage';
import { fmt$ } from '../utils/finance';
import { getGirlMathMoment } from '../utils/girlMathEngine';
import { AuraScore } from '../types';

const TOOLS = [
  { key: 'Insights', emoji: '📊', tKey: 'insights' },
  { key: 'CanIAffordIt', emoji: '🤔', tKey: 'afford' },
  { key: 'CostPerUse', emoji: '📈', tKey: 'cpu' },
  { key: 'TreatYourself', emoji: '🎀', tKey: 'treat' },
  { key: 'SubscriptionAudit', emoji: '💳', tKey: 'subs' },
  { key: 'SavingsJar', emoji: '🫙', tKey: 'jar' },
  { key: 'SavingsGoals', emoji: '🎯', tKey: 'goals' },
];

const PREMIUM_TOOL_KEYS = new Set(['Insights', 'SubscriptionAudit', 'SavingsGoals']);

function auraLevel(score: number): { emoji: string; tKey: string; color: string } {
  if (score >= 800) return { emoji: '✨', tKey: 'glowing', color: '#22C55E' };
  if (score >= 600) return { emoji: '💚', tKey: 'healing', color: '#84CC16' };
  if (score >= 400) return { emoji: '🌸', tKey: 'balanced', color: '#F59E0B' };
  if (score >= 200) return { emoji: '😬', tKey: 'broke_lite', color: '#EF4444' };
  return { emoji: '💀', tKey: 'broke', color: '#DC2626' };
}

export default function ToolsScreen() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { isPremium, showPaywall } = usePaywall();
  const auraShotRef = useRef<ViewShot>(null);
  const momentShotRef = useRef<ViewShot>(null);

  const [auraScore, setAuraScore] = useState<AuraScore>({ score: 500, lastUpdated: '' });
  const [moment, setMoment] = useState(() => getGirlMathMoment(i18n.language));
  const [jarTotal, setJarTotal] = useState(0);
  const [treatPct, setTreatPct] = useState(0);
  const [cpuCount, setCpuCount] = useState(0);
  const [subTotal, setSubTotal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [score, jar, treat, cpu, subs] = await Promise.all([
          loadAuraScore(),
          loadSavingsJar(),
          loadTreatBudget(),
          loadCostPerUseItems(),
          loadSubscriptions(),
        ]);
        setAuraScore(score);
        setJarTotal(jar.reduce((sum, entry) => sum + entry.price, 0));
        setTreatPct(treat.monthlyLimit > 0 ? treat.spent / treat.monthlyLimit : 0);
        setCpuCount(cpu.length);
        setSubTotal(subs.reduce((sum, sub) => sum + sub.monthlyCost, 0));
      })();
    }, []),
  );

  useEffect(() => {
    setMoment(getGirlMathMoment(i18n.language));
  }, [i18n.language]);

  const aura = auraLevel(auraScore.score);

  const handleNewMoment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMoment(getGirlMathMoment(i18n.language));
  };

  const handleShareAura = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const uri = await (auraShotRef.current as any)?.capture?.();
      if (uri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your aura score 💖' });
      }
    } catch {}
  };

  const handleShareMoment = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const uri = await (momentShotRef.current as any)?.capture?.();
      if (uri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your girl math moment 💅' });
      }
    } catch {}
  };

  const badgeFor = (key: string): string => {
    if (key === 'SavingsJar' && jarTotal > 0) return `${fmt$(jarTotal)} saved`;
    if (key === 'SavingsGoals' && jarTotal > 0) return `${fmt$(jarTotal)} in jar`;
    if (key === 'TreatYourself') return `${Math.round(treatPct * 100)}% used`;
    if (key === 'CostPerUse' && cpuCount > 0) return `${cpuCount} item${cpuCount !== 1 ? 's' : ''}`;
    if (key === 'SubscriptionAudit' && subTotal > 0) return `${fmt$(subTotal)}/mo`;
    return '';
  };

  return (
    <ScreenTransition>
      <GradientBackground>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{t('tools.title')}</Text>
          <Text style={styles.subtitle}>{t('tools.subtitle')}</Text>

          <ViewShot ref={auraShotRef} options={{ format: 'png', quality: 1 }}>
            <GradientCard>
              <Text style={styles.shotBrand}>💖 GirlMath</Text>
              <View style={styles.auraRow}>
                <Text style={styles.auraEmoji}>{aura.emoji}</Text>
                <View style={styles.auraInfo}>
                  <Text style={[styles.auraLabel, { color: aura.color }]}>{t(`tools.aura_${aura.tKey}` as any)}</Text>
                  <Text style={styles.auraScore}>{t('tools.aura_points', { score: auraScore.score })}</Text>
                </View>
                <View style={[styles.auraMini, { borderColor: aura.color }]}>
                  <Text style={[styles.auraMiniNum, { color: aura.color }]}>{auraScore.score}</Text>
                </View>
              </View>
              <View style={styles.auraBar}>
                <View
                  style={[
                    styles.auraFill,
                    {
                      width: `${(auraScore.score / 1000) * 100}%` as any,
                      backgroundColor: aura.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.auraHint}>{t('tools.aura_hint')}</Text>
              <Text style={styles.shotWatermark}>{t('tools.watermark')}</Text>
            </GradientCard>
          </ViewShot>
          <TouchableOpacity onPress={handleShareAura} style={styles.cardShareBtn} activeOpacity={0.8}>
            <Text style={styles.auraShareText}>{t('tools.share_aura')}</Text>
          </TouchableOpacity>

          <ViewShot ref={momentShotRef} options={{ format: 'png', quality: 1 }}>
            <GradientCard>
              <Text style={styles.shotBrand}>💖 GirlMath</Text>
              <Text style={styles.momentTitle}>{t('tools.moment_title')}</Text>
              <Text style={styles.momentText}>"{moment}"</Text>
              <Text style={styles.shotWatermark}>{t('tools.watermark')}</Text>
            </GradientCard>
          </ViewShot>
          <View style={styles.momentBtns}>
            <TouchableOpacity onPress={handleNewMoment} style={styles.momentBtn} activeOpacity={0.8}>
              <Text style={styles.momentBtnText}>{t('tools.new_moment')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShareMoment} style={styles.momentShareBtn} activeOpacity={0.8}>
              <Text style={styles.momentShareText}>{t('tools.share')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.toolsHeader}>{t('tools.tools_header')}</Text>
          {TOOLS.map((tool) => {
            const badge = badgeFor(tool.key);
            const isLocked = PREMIUM_TOOL_KEYS.has(tool.key) && !isPremium;

            return (
              <TouchableOpacity
                key={tool.key}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (isLocked) {
                    showPaywall();
                    return;
                  }
                  navigation.navigate(tool.key);
                }}
              >
                <GradientCard>
                  <View style={[styles.toolRow, isLocked && styles.toolRowLocked]}>
                    <Text style={styles.toolEmoji}>{tool.emoji}</Text>
                    <View style={styles.toolInfo}>
                      <View style={styles.toolTitleRow}>
                        <Text style={styles.toolLabel}>{t(`tools.tool_${tool.tKey}_label` as any)}</Text>
                        {isLocked && (
                          <View style={[styles.toolBadge, styles.toolBadgeLocked]}>
                            <Text style={styles.toolBadgeLockedText}>{t('tools.premium_badge')}</Text>
                          </View>
                        )}
                        {badge !== '' && (
                          <View style={styles.toolBadge}>
                            <Text style={styles.toolBadgeText}>{badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.toolDesc}>{t(`tools.tool_${tool.tKey}_desc` as any)}</Text>
                      {isLocked && (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            showPaywall();
                          }}
                          style={styles.toolUpgradeBtn}
                        >
                          <Text style={styles.toolUpgradeText}>{t('tools.premium_cta')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.toolArrow}>{isLocked ? '🔒' : '›'}</Text>
                  </View>
                </GradientCard>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 100 }} />
        </ScrollView>
      </GradientBackground>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 70, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.white, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  subtitle: { fontSize: 14, color: COLORS.whiteTranslucent, textAlign: 'center', marginBottom: 20, letterSpacing: 1.5 },
  auraRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  auraEmoji: { fontSize: 36 },
  auraInfo: { flex: 1 },
  auraLabel: { fontSize: 16, fontWeight: '900' },
  auraScore: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  auraMini: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  auraMiniNum: { fontSize: 14, fontWeight: '900' },
  auraBar: { height: 8, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  auraFill: { height: '100%', borderRadius: 4 },
  auraHint: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  cardShareBtn: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 4, paddingVertical: 4, paddingHorizontal: 8 },
  shotBrand: { fontSize: 18, fontWeight: '900', color: COLORS.textSecondary, marginBottom: 10, letterSpacing: 0.5 },
  shotWatermark: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: 12 },
  auraShareText: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary },
  momentTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  momentText: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22, fontStyle: 'italic', marginBottom: 14 },
  momentBtns: { flexDirection: 'row', gap: 8 },
  momentBtn: { flex: 1, backgroundColor: 'rgba(255,105,180,0.2)', borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.pinkHot },
  momentBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.pinkHot },
  momentShareBtn: { backgroundColor: 'rgba(192,132,252,0.2)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.textSecondary },
  momentShareText: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary },
  toolsHeader: { fontSize: 18, fontWeight: '900', color: COLORS.white, marginTop: 4, marginBottom: 2, textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolRowLocked: { opacity: 0.9 },
  toolEmoji: { fontSize: 28, width: 36 },
  toolInfo: { flex: 1 },
  toolTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  toolLabel: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  toolBadge: { backgroundColor: 'rgba(255,105,180,0.2)', borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8 },
  toolBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.pinkHot },
  toolBadgeLocked: { backgroundColor: 'rgba(124,58,237,0.14)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.24)' },
  toolBadgeLockedText: { fontSize: 11, fontWeight: '900', color: '#7C3AED' },
  toolDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  toolUpgradeBtn: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(124,58,237,0.22)' },
  toolUpgradeText: { fontSize: 12, fontWeight: '800', color: '#7C3AED' },
  toolArrow: { fontSize: 24, color: COLORS.textMuted, fontWeight: '800' },
});
