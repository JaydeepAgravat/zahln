import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSession, useT } from '@zahln/mobile-core';
import {
  BiometricsScreen,
  LockScreen,
  MerchantScreen,
  NameScreen,
  type OnboardingStackParamList,
  OtpScreen,
  PhoneScreen,
  PinConfirmScreen,
  PinCreateScreen,
  SettingsScreen,
  TabBar,
  useNavigationTheme,
  useOnboardingScreenOptions,
  WelcomeScreen,
} from '@zahln/mobile-ui';
import { MerchantWalletScreen, TillScreen } from '../../features/till/TillScreens';

export type TabParamList = { Till: undefined; MerchantWallet: undefined; Settings: undefined };

declare global {
  namespace ReactNavigation {
    interface RootParamList extends OnboardingStackParamList {}
  }
}

const Onboarding = createNativeStackNavigator<OnboardingStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

function OnboardingStack() {
  const { t } = useT();
  return (
    <Onboarding.Navigator screenOptions={useOnboardingScreenOptions()}>
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

function Home() {
  const { t } = useT();
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="Till" component={TillScreen} options={{ title: t('tabs.till') }} />
      <Tabs.Screen
        name="MerchantWallet"
        component={MerchantWalletScreen}
        options={{ title: t('tabs.wallet') }}
      />
      <Tabs.Screen name="Settings" component={SettingsScreen} options={{ title: t('tabs.profile') }} />
    </Tabs.Navigator>
  );
}

/**
 * Separate roots per session state, so nothing behind the lock (or onboarding) is reachable,
 * even through a deep link: the money screens simply aren't mounted until the app is unlocked.
 */
export function RootNavigator() {
  const status = useSession((s) => s.status);
  const theme = useNavigationTheme();
  if (status === 'booting') return null;
  return (
    <NavigationContainer theme={theme}>
      {status === 'onboarding' ? <OnboardingStack /> : status === 'locked' ? <LockScreen /> : <Home />}
    </NavigationContainer>
  );
}
