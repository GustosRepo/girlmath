import './src/i18n'; // must be first — initialises i18next before any screen renders
import { i18nReady } from './src/i18n';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupAndroidChannel } from './src/utils/notifications';
import { initRevenueCat } from './src/utils/purchases';
import { initializeAds } from './src/utils/ads';
import { runStorageMigrations } from './src/utils/storage';
import HomeScreen from './src/screens/HomeScreen';
import BillsScreen from './src/screens/BillsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SpendLogScreen from './src/screens/SpendLogScreen';
import ToolsScreen from './src/screens/ToolsScreen';
import CanIAffordItScreen from './src/screens/CanIAffordItScreen';
import CostPerUseScreen from './src/screens/CostPerUseScreen';
import TreatYourselfScreen from './src/screens/TreatYourselfScreen';
import SubscriptionAuditScreen from './src/screens/SubscriptionAuditScreen';
import SavingsJarScreen from './src/screens/SavingsJarScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import SavingsGoalsScreen from './src/screens/SavingsGoalsScreen';
import { PaywallProvider } from './src/context/PaywallContext';
import OnboardingScreen, { ONBOARDING_KEY } from './src/screens/OnboardingScreen';

// Configure RevenueCat at module load time — before any component renders
// so PaywallProvider's useEffect never runs against an uninitialised SDK.
try { initRevenueCat(); } catch {}

const Tab = createBottomTabNavigator();
const ToolsStack = createNativeStackNavigator();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: focused ? 26 : 22 }}>{emoji}</Text>
    </View>
  );
}

function ToolsNavigator() {
  return (
    <ToolsStack.Navigator screenOptions={{ headerShown: false }}>
      <ToolsStack.Screen name="ToolsHub" component={ToolsScreen} />
      <ToolsStack.Screen name="CanIAffordIt" component={CanIAffordItScreen} />
      <ToolsStack.Screen name="CostPerUse" component={CostPerUseScreen} />
      <ToolsStack.Screen name="TreatYourself" component={TreatYourselfScreen} />
      <ToolsStack.Screen name="SubscriptionAudit" component={SubscriptionAuditScreen} />
      <ToolsStack.Screen name="SavingsJar" component={SavingsJarScreen} />
      <ToolsStack.Screen name="Insights" component={InsightsScreen} />
      <ToolsStack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
    </ToolsStack.Navigator>
  );
}

export default function App() {
  // null = still checking storage, false = show onboarding, true = show app
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [initialTab, setInitialTab] = useState<string>('Justify');
  const [i18nLoaded, setI18nLoaded] = useState(false);

  useEffect(() => {
    // Safety timeout: if startup takes longer than 5s, unblock the app
    const timeout = setTimeout(() => {
      setI18nLoaded(true);
      setHasOnboarded((prev) => prev ?? false);
    }, 5000);

    try { setupAndroidChannel(); } catch {}
    void initializeAds().catch((error) => {
      console.warn('[Ads] initializeAds failed', error);
    });
    (async () => {
      // Wait for i18n to load saved language
      await i18nReady;
      setI18nLoaded(true);

      await runStorageMigrations();
      const val = await AsyncStorage.getItem(ONBOARDING_KEY);
      setHasOnboarded(!!val);
    })().catch(() => {
      setI18nLoaded(true);
      setHasOnboarded(false);
    }).finally(() => {
      clearTimeout(timeout);
    });

    return () => clearTimeout(timeout);
  }, []);

  // Still loading — show splash background instead of blank white screen
  if (hasOnboarded === null || !i18nLoaded) {
    return <View style={styles.splash} />;
  }

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
              paddingHorizontal: 8,
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
              tabBarLabel: 'justify',
              tabBarIcon: ({ focused }) => (
                <TabIcon emoji="💸" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="SpendLog"
            component={SpendLogScreen}
            listeners={{ tabPress: () => Haptics.selectionAsync() }}
            options={{
              tabBarLabel: 'log',
              tabBarIcon: ({ focused }) => (
                <TabIcon emoji="📝" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="Bills"
            component={BillsScreen}
            listeners={{ tabPress: () => Haptics.selectionAsync() }}
            options={{
              tabBarLabel: 'bills',
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
              tabBarLabel: 'diary',
              tabBarIcon: ({ focused }) => (
                <TabIcon emoji="🦋" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="Tools"
            component={ToolsNavigator}
            listeners={{ tabPress: () => Haptics.selectionAsync() }}
            options={{
              tabBarLabel: 'tools',
              tabBarIcon: ({ focused }) => (
                <TabIcon emoji="🛠️" focused={focused} />
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

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#FFB6D9', // matches splash screen background
  },
});
