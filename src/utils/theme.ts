import { AuraTheme } from '../types';

export const COLORS = {
  pink: '#FFB6D9',
  pinkLight: '#FFD6EC',
  pinkHot: '#FF69B4',
  lavender: '#D8B4FE',
  lavenderLight: '#EDE4FF',
  blue: '#93C5FD',
  blueLight: '#DBEAFE',
  mint: '#A7F3D0',
  yellow: '#FDE68A',
  peach: '#FECACA',
  white: '#FFFFFF',
  whiteTranslucent: 'rgba(255,255,255,0.85)',
  glassBg: 'rgba(255,255,255,0.55)',
  glassBorder: 'rgba(255,255,255,0.65)',
  textPrimary: '#4A1942',
  textSecondary: '#7C3AED',
  textMuted: '#9B8EC4',
  shadow: '#C084FC',
};

export const GRADIENTS = {
  background: ['#FFB6D9', '#D8B4FE', '#93C5FD'],
  card: ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0.55)'],
  button: ['#FF69B4', '#C084FC', '#818CF8'],
  auraGlow: ['#FFD6EC', '#EDE4FF'],
  auraHeal: ['#FDE68A', '#FECACA'],
  auraBroke: ['#FCA5A5', '#FCA5A580'],
};

export const SPARKLE_CHARS = ['✨', '💖', '🩷', '⭐', '💫', '🌟', '🦋'];

export const PERSONALITY_OPTIONS = [
  { key: 'delulu' as const, label: '🦄 Delulu Mode', desc: 'absolutely unhinged justifications' },
  { key: 'responsible' as const, label: '📋 Responsible Bestie', desc: 'sane but still supportive' },
  { key: 'chaotic' as const, label: '🔥 Chaotic Spender', desc: 'money isn\'t real anyway' },
];

export const AURA_THEME_OPTIONS: { key: AuraTheme; label: string; emoji: string }[] = [
  { key: 'default', label: 'GirlMath', emoji: '🩷' },
  { key: 'clean-girl', label: 'Clean Girl', emoji: '🤍' },
  { key: 'y2k', label: 'Y2K', emoji: '🌀' },
  { key: 'dark-academia', label: 'Dark Academia', emoji: '🕯️' },
];

export const AURA_THEMES: Record<AuraTheme, { glow: string[]; heal: string[]; broke: string[] }> = {
  'default': {
    glow: ['#FFD6EC', '#EDE4FF'],
    heal: ['#FDE68A', '#FECACA'],
    broke: ['#FCA5A5', '#FCA5A580'],
  },
  'clean-girl': {
    glow: ['#F0FDF4', '#DCFCE7'],
    heal: ['#FFF7ED', '#FED7AA'],
    broke: ['#FEF2F2', '#FECACA'],
  },
  'y2k': {
    glow: ['#FF69B4', '#FF1493'],
    heal: ['#FFFF00', '#FFA500'],
    broke: ['#FF4500', '#8B0000'],
  },
  'dark-academia': {
    glow: ['#A8956B', '#78716C'],
    heal: ['#B45309', '#92400E'],
    broke: ['#7F1D1D', '#450A0A'],
  },
};

export const SPEND_CATEGORIES = [
  { key: 'shopping' as const, label: 'Shopping', emoji: '🛍️' },
  { key: 'food' as const, label: 'Food', emoji: '🍔' },
  { key: 'beauty' as const, label: 'Beauty', emoji: '💄' },
  { key: 'shoes' as const, label: 'Shoes', emoji: '👟' },
  { key: 'health' as const, label: 'Health', emoji: '💊' },
  { key: 'tech' as const, label: 'Tech', emoji: '📱' },
  { key: 'fun' as const, label: 'Fun', emoji: '🎉' },
  { key: 'home' as const, label: 'Home', emoji: '🏠' },
  { key: 'misc' as const, label: 'Misc', emoji: '💸' },
];
