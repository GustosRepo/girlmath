import React from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardTypeOptions } from 'react-native';
import { COLORS } from '../utils/theme';

interface InputRowProps {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: KeyboardTypeOptions;
  prefix?: string;
}

export default function InputRow({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  prefix,
}: InputRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  icon: {
    fontSize: 18,
    marginRight: 10,
  },
  prefix: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: 2,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
});
