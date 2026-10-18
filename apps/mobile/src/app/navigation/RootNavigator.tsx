import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { useTheme } from '../../ds';
import { WalletScreen } from '../../features/consumer/WalletScreen';
import { LockScreen } from '../../features/lock/LockScreen';
import { MerchantWalletScreen, TillScreen } from '../../features/merchant/MerchantScreens';
import { BiometricsScreen } from '../../features/onboarding/BiometricsScreen';
import { MerchantScreen, NameScreen } from '../../features/onboarding/NameAndMerchantScreens';
import { OtpScreen } from '../../features/onboarding/OtpScreen';
import { PhoneScreen } from '../../features/onboarding/PhoneScreen';
import { PinConfirmScreen, PinCreateScreen } from '../../features/onboarding/PinScreens';
import { WelcomeScreen } from '../../features/onboarding/WelcomeScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import { useT } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useSession } from '../../lib/session';
import { TabBar } from './TabBar';
import type { ConsumerTabParamList, MerchantTabParamList, OnboardingStackParamList } from './types';

const Onboarding = createNativeStackNavigator<OnboardingStackParamList>();
const ConsumerTabs = createBottomTabNavigator<ConsumerTabParamList>();
const MerchantTabs = createBottomTabNavigator<MerchantTabParamList>();

function OnboardingStack() {
  const { t } = useT();
  const { colors } = useTheme();
  return (
    <Onboarding.Navigator
      screenOptions={{
        headerTitle: '',
        animation: 'slide_from_right',
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.brand,
        headerStyle: { backgroundColor: colors.bg },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Onboarding.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Onboarding.Screen name="Phone" component={PhoneScreen} />
      <Onboarding.Screen name="Otp" component={OtpScreen} />
      <Onboarding.Screen name="Name" component={NameScreen} />
      <Onboarding.Screen name="Merchant" component={MerchantScreen} />
      <Onboarding.Screen name="PinCreate" component={PinCreateScreen} />
      <Onboarding.Screen
        name="PinConfirm"
        component={PinConfirmScreen}
        options={{ title: t('common.back') }}
      />
      <Onboarding.Screen name="Biometrics" component={BiometricsScreen} options={{ gestureEnabled: false }} />
    </Onboarding.Navigator>
  );
}

const tabOptions = { headerShown: false } as const;

function ConsumerApp() {
  const { t } = useT();
  return (
    <ConsumerTabs.Navigator screenOptions={tabOptions} tabBar={(props) => <TabBar {...props} />}>
      <ConsumerTabs.Screen name="Wallet" component={WalletScreen} options={{ title: t('tabs.wallet') }} />
      <ConsumerTabs.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('tabs.profile') }}
      />
    </ConsumerTabs.Navigator>
  );
}

function MerchantApp() {
  const { t } = useT();
  return (
    <MerchantTabs.Navigator screenOptions={tabOptions} tabBar={(props) => <TabBar {...props} />}>
      <MerchantTabs.Screen name="Till" component={TillScreen} options={{ title: t('tabs.till') }} />
      <MerchantTabs.Screen
        name="MerchantWallet"
        component={MerchantWalletScreen}
        options={{ title: t('tabs.wallet') }}
      />
      <MerchantTabs.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('tabs.profile') }}
      />
    </MerchantTabs.Navigator>
  );
}

/**
 * Separate roots per session state, so nothing behind the lock (or onboarding) is reachable,
 * even through a deep link: the money screens simply aren't mounted until the app is unlocked.
 */
export function RootNavigator() {
  const status = useSession((s) => s.status);
  const role = usePrefs((s) => s.role);
  const { scheme, colors } = useTheme();

  const navTheme: Theme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.brand,
        background: colors.bg,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
      },
    };
  }, [scheme, colors]);

  if (status === 'booting') return null;

  return (
    <NavigationContainer theme={navTheme}>
      {status === 'onboarding' ? (
        <OnboardingStack />
      ) : status === 'locked' ? (
        <LockScreen />
      ) : role === 'merchant' ? (
        <MerchantApp />
      ) : (
        <ConsumerApp />
      )}
    </NavigationContainer>
  );
}
