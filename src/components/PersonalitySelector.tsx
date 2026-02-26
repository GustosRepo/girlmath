import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { COLORS, PERSONALITY_OPTIONS } from '../utils/theme';
import { PersonalityMode } from '../types';

const MODE_CATS: Record<PersonalityMode, any> = {
  delulu: require('../../assets/largehappycat.png'),
  responsible: require('../../assets/largehappyangelcat.png'),
  chaotic: require('../../assets/largedevilcatcard.png'),
};

interface PersonalitySelectorProps {
  selected: PersonalityMode;
  onSelect: (mode: PersonalityMode) => void;
}

export default function PersonalitySelector({ selected, onSelect }: PersonalitySelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>who’s justifying today? 👇</Text>
      {PERSONALITY_OPTIONS.map((opt) => {
        const isActive = selected === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.option, isActive && styles.optionActive]}
            onPress={() => onSelect(opt.key)}
            activeOpacity={0.7}
          >
            <Image source={MODE_CATS[opt.key]} style={styles.catImg} />
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                {opt.label}
              </Text>
              <Text style={[styles.optionDesc, isActive && styles.optionDescActive]}>
                {opt.desc}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'lowercase',
    marginBottom: 10,
    textAlign: 'center',
  },
  option: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catImg: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  optionText: {
    flex: 1,
  },
  optionActive: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderColor: COLORS.pinkHot,
    shadowColor: COLORS.pinkHot,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  optionLabelActive: {
    color: COLORS.pinkHot,
  },
  optionDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  optionDescActive: {
    color: COLORS.textSecondary,
  },
});
