import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useT } from '@zaster/mobile-core';
import { Icon, PressableScale, ReceiptEdge, SafeArea, Text, useTheme } from '@zaster/mobile-ui';
import { handleUrlFor } from '@zaster/shared';
import { StatusBar, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { HomeStackParamList } from '../../app/navigation/types';
import { useCurrentMerchant } from './TillScreens';

type Props = NativeStackScreenProps<HomeStackParamList, 'MyQr'>;

/**
 * The merchant's static QR: pay.zaster.de/@handle. It never expires and carries no amount, so it can
 * be printed on the counter. The customer types the amount; on every plan, including Free.
 */
export function MyQrScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const merchant = useCurrentMerchant();
  return (
    <View className="flex-1" style={{ backgroundColor: colors.ink }}>
      <StatusBar barStyle="light-content" />
      <SafeArea className="flex-1 px-6">
        <View className="flex-row items-center justify-between py-2">
          <PressableScale
            onPress={() => navigation.goBack()}
            hapticOnPress
            accessibilityRole="button"
            accessibilityLabel={t('pay.close')}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <Icon name="close" size={22} color="onInk" />
          </PressableScale>
          <Text variant="headline" tone="on-ink" style={{ fontFamily: 'Inter-Bold' }}>
            {t('myQr.title')}
          </Text>
          <View className="h-11 w-11" />
        </View>

        {merchant ? (
          <View className="flex-1 items-center justify-center gap-6">
            <Animated.View entering={FadeInDown.springify().damping(16)} className="items-center">
              <View
                className="items-center gap-3 rounded-t-xl px-6 pb-4 pt-6"
                style={{ backgroundColor: colors.qrBackground }}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`${merchant.merchantName}, @${merchant.handle}`}
              >
                <Text variant="headline" style={{ color: colors.qrForeground, fontFamily: 'Inter-Bold' }}>
                  {merchant.merchantName}
                </Text>
                <QRCode
                  value={handleUrlFor(merchant.handle)}
                  size={220}
                  ecl="M"
                  quietZone={4}
                  color={colors.qrForeground}
                  backgroundColor={colors.qrBackground}
                />
                <Text variant="callout" style={{ color: '#6B665E', fontFamily: 'Inter-SemiBold' }}>
                  @{merchant.handle}
                </Text>
              </View>
              <View style={{ width: 268 }}>
                <ReceiptEdge color="qrBackground" />
              </View>
            </Animated.View>
            <Text variant="callout" tone="on-ink-muted" className="px-4 text-center">
              {t('myQr.body')}
            </Text>
          </View>
        ) : null}
      </SafeArea>
    </View>
  );
}
