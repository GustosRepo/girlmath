import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupAndroidChannel } from './src/utils/notifications';
import HomeScreen from './src/screens/HomeScreen';
import BillsScreen from './src/screens/BillsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { PaywallProvider } from './src/context/PaywallContext';
import OnboardingScreen, { ONBOARDING_KEY } from './src/screens/OnboardingScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: focused ? 26 : 22 }}>{emoji}</Text>
    </View>
  );
}

export default function App() {
  // null = still checking storage, false = show onboarding, true = show app
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [initialTab, setInitialTab] = useState<string>('Justify');

  useEffect(() => {
    setupAndroidChannel();
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setHasOnboarded(!!val);
    });
  }, []);

  // Still reading AsyncStorage — render nothing to avoid flash
  if (hasOnboarded === null) return null;

  // First-time user — show onboarding (full screen, no nav)
  if (!hasOnboarded) {
    return (
      <>
        <StatusBar style="light" />
        <OnboardingScreen
          onComplete={(goToBills) => {
            if (goToBills) setInitialTab('Bills');
            setHasOnboarded(true);
          }}
        />
      </>
    );
  }

  return (
    <PaywallProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Tab.Navigator
          initialRouteName={initialTab}
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: 'rgba(255,255,255,0.92)',
              borderTopWidth: 0,
              elevation: 20,
              shadowColor: '#C084FC',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              height: 85,
              paddingBottom: 28,
              paddingTop: 8,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              position: 'absolute',
            },
            tabBarActiveTintColor: '#7C3AED',
            tabBarInactiveTintColor: '#9B8EC4',
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 0.3,
            },
          }}
        >
          <Tab.Screen
            name="Justify"
            component={HomeScreen}
            listeners={{ tabPress: () => Haptics.selectionAsync() }}
            options={{
              tabBarLabel: 'justify ✨',
              tabBarIcon: ({ focused }) => (
                <TabIcon emoji="💸" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="Bills"
            component={BillsScreen}
            listeners={{ tabPress: () => Haptics.selectionAsync() }}
            options={{
              tabBarLabel: 'bills 💌',
              tabBarIcon: ({ focused }) => (
                <TabIcon emoji="📅" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="History"
            component={HistoryScreen}
            listeners={{ tabPress: () => Haptics.selectionAsync() }}
            options={{
              tabBarLabel: 'diary 📜',
              tabBarIcon: ({ focused }) => (
                <TabIcon emoji="🦋" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            listeners={{ tabPress: () => Haptics.selectionAsync() }}
            options={{
              tabBarLabel: 'settings',
              tabBarIcon: ({ focused }) => (
                <TabIcon emoji="⚙️" focused={focused} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </PaywallProvider>
  );
}
