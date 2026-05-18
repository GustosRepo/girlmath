import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Share,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import GradientBackground from '../components/GradientBackground';
import ScreenTransition from '../components/ScreenTransition';
import GradientCard from '../components/GradientCard';
import { COLORS } from '../utils/theme';
import { loadAuraScore, updateAuraScore, loadSavingsJar, loadTreatBudget, loadCostPerUseItems, loadSubscriptions } from '../utils/storage';
import { fmt$ } from '../utils/finance';
import { getGirlMathMoment } from '../utils/girlMathEngine';
import { AuraScore } from '../types';

const TOOLS = [
  { key: 'Insights',          emoji: '📊', label: 'spending insights',      desc: 'charts + trends + the real numbers' },
  { key: 'CanIAffordIt',     emoji: '🤔', label: 'can i afford it?',         desc: 'reality check without judgment' },
  { key: 'CostPerUse',       emoji: '📈', label: 'cost per use',             desc: 'justify expensive stuff with math' },
  { key: 'TreatYourself',    emoji: '🎀', label: 'treat yourself budget',    desc: 'your guilt-free fun money envelope' },
  { key: 'SubscriptionAudit',emoji: '💳', label: 'subscription audit',       desc: 'face your monthly spending truth' },
  { key: 'SavingsJar',       emoji: '🫙', label: 'savings jar',              desc: 'log every skip and watch it grow' },
  { key: 'SavingsGoals',     emoji: '🎯', label: 'savings goals',            desc: 'set goals and save toward them' },
];

function auraLabel(score: number): { emoji: string; label: string; color: string } {
  if (score >= 800) return { emoji: '✨', label: 'financially glowing', color: '#22C55E' };
  if (score >= 600) return { emoji: '💚', label: 'healing era', color: '#84CC16' };
  if (score >= 400) return { emoji: '🌸', label: 'balanced bestie', color: '#F59E0B' };
  if (score >= 200) return { emoji: '😬', label: 'a lil broke coded', color: '#EF4444' };
  return { emoji: '💀', label: 'broke aura', color: '#DC2626' };
}

export default function ToolsScreen() {
  const navigation = useNavigation<any>();
  const [auraScore, setAuraScore] = useState<AuraScore>({ score: 500, lastUpdated: '' });
  const [moment, setMoment] = useState(getGirlMathMoment());
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
        setJarTotal(jar.reduce((s, e) => s + e.price, 0));
        setTreatPct(treat.monthlyLimit > 0 ? treat.spent / treat.monthlyLimit : 0);
        setCpuCount(cpu.length);
        setSubTotal(subs.reduce((s, sub) => s + sub.monthlyCost, 0));
      })();
    }, []),
  );

  const aura = auraLabel(auraScore.score);

  const handleNewMoment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMoment(getGirlMathMoment());
  };

  const handleShareMoment = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const aura = auraLabel(auraScore.score);
    const msg = [
      `✨ girl math moment ✨`,
      ``,
      `“${moment}”`,
      ``,
      `my girl math aura: ${auraScore.score}/1000 ${aura.emoji}`,
      `status: ${aura.label}`,
      ``,
      `girl math AI 💸`,
    ].join('\n');
    await Share.share({ message: msg });
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
          <Text style={styles.title}>🛠️ tools</Text>
          <Text style={styles.subtitle}>your financial bestie toolkit ✨</Text>

          {/* Aura score */}
          <GradientCard>
            <View style={styles.auraRow}>
              <Text style={styles.auraEmoji}>{aura.emoji}</Text>
              <View style={styles.auraInfo}>
                <Text style={[styles.auraLabel, { color: aura.color }]}>{aura.label}</Text>
                <Text style={styles.auraScore}>{auraScore.score} aura points</Text>
              </View>
              <View style={[styles.auraMini, { borderColor: aura.color }]}>
                <Text style={[styles.auraMiniNum, { color: aura.color }]}>{auraScore.score}</Text>
              </View>
            </View>
            <View style={styles.auraBar}>
              <View style={[styles.auraFill, {
                width: `${(auraScore.score / 1000) * 100}%` as any,
                backgroundColor: aura.color,
              }]} />
            </View>
            <View style={styles.auraFooter}>
              <Text style={styles.auraHint}>score updates when you log expenses ✨</Text>
              <TouchableOpacity
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await Share.share({
                    message: [
                      `${aura.emoji} my girl math aura score ${aura.emoji}`,
                      ``,
                      `${auraScore.score} / 1000`,
                      `status: ${aura.label}`,
                      ``,
                      `girl math AI 💸`,
                    ].join('\n'),
                  });
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.auraShareText}>📤 share</Text>
              </TouchableOpacity>
            </View>
          </GradientCard>

          {/* Girl math moment */}
          <GradientCard>
            <Text style={styles.momentTitle}>💅 girl math moment</Text>
            <Text style={styles.momentText}>"{moment}"</Text>
            <View style={styles.momentBtns}>
              <TouchableOpacity onPress={handleNewMoment} style={styles.momentBtn} activeOpacity={0.8}>
                <Text style={styles.momentBtnText}>✨ new moment</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShareMoment} style={styles.momentShareBtn} activeOpacity={0.8}>
                <Text style={styles.momentShareText}>📤 share</Text>
              </TouchableOpacity>
            </View>
          </GradientCard>

          {/* Tool cards */}
          <Text style={styles.toolsHeader}>your tools 🛠️</Text>
          {TOOLS.map(tool => {
            const badge = badgeFor(tool.key);
            return (
              <TouchableOpacity
                key={tool.key}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate(tool.key);
                }}
              >
                <GradientCard>
                  <View style={styles.toolRow}>
                    <Text style={styles.toolEmoji}>{tool.emoji}</Text>
                    <View style={styles.toolInfo}>
                      <View style={styles.toolTitleRow}>
                        <Text style={styles.toolLabel}>{tool.label}</Text>
                        {badge !== '' && (
                          <View style={styles.toolBadge}>
                            <Text style={styles.toolBadgeText}>{badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.toolDesc}>{tool.desc}</Text>
                    </View>
                    <Text style={styles.toolArrow}>›</Text>
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
  auraFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  toolEmoji: { fontSize: 28, width: 36 },
  toolInfo: { flex: 1 },
  toolTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  toolLabel: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  toolBadge: { backgroundColor: 'rgba(255,105,180,0.2)', borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8 },
  toolBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.pinkHot },
  toolDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  toolArrow: { fontSize: 24, color: COLORS.textMuted, fontWeight: '800' },
});
