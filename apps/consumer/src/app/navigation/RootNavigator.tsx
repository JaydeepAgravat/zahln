import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSession, useT } from '@zahln/mobile-core';
import {
  BiometricsScreen,
  LockScreen,
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
import { WalletScreen } from '../../features/home/WalletScreen';
import { PayScreen } from '../../features/pay/PayScreen';
import { ReceiptScreen } from '../../features/pay/ReceiptScreen';
import { ScanScreen } from '../../features/pay/ScanScreen';
import type { HomeStackParamList, TabParamList } from './types';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends OnboardingStackParamList {}
  }
}

const Onboarding = createNativeStackNavigator<OnboardingStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const Home = createNativeStackNavigator<HomeStackParamList>();

function OnboardingStack() {
  const { t } = useT();
  return (
    <Onboarding.Navigator screenOptions={useOnboardingScreenOptions()}>
      <Onboarding.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Onboarding.Screen name="Phone" component={PhoneScreen} />
      <Onboarding.Screen name="Otp" component={OtpScreen} />
      <Onboarding.Screen name="Name" component={NameScreen} />
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

function TabsScreen() {
  const { t } = useT();
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="Wallet" component={WalletScreen} options={{ title: t('tabs.wallet') }} />
      <Tabs.Screen name="Settings" component={SettingsScreen} options={{ title: t('tabs.profile') }} />
    </Tabs.Navigator>
  );
}

/** Paying sits on top of the tabs: the camera slides up, the result replaces it, closing returns to the wallet. */
function HomeStack() {
  return (
    <Home.Navigator screenOptions={{ headerShown: false }}>
      <Home.Screen name="Tabs" component={TabsScreen} />
      <Home.Screen
        name="Scan"
        component={ScanScreen}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Home.Screen name="Pay" component={PayScreen} options={{ animation: 'fade', gestureEnabled: false }} />
      <Home.Screen name="Receipt" component={ReceiptScreen} options={{ animation: 'slide_from_bottom' }} />
    </Home.Navigator>
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
      {status === 'onboarding' ? <OnboardingStack /> : status === 'locked' ? <LockScreen /> : <HomeStack />}
    </NavigationContainer>
  );
}
