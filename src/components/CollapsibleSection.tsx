import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { COLORS } from '../utils/theme';
import GradientCard from './GradientCard';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const spinAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(spinAnim, {
      toValue: open ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setOpen((v) => !v);
  };

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <GradientCard>
      <TouchableOpacity
        style={styles.header}
        onPress={toggle}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>{title}</Text>
        <Animated.Text style={[styles.chevron, { transform: [{ rotate }] }]}>
          ▶
        </Animated.Text>
      </TouchableOpacity>
      {open && <View style={styles.body}>{children}</View>}
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  body: {
    marginTop: 14,
  },
});
