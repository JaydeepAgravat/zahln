import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { haptic, payments, useKillSwitch, useT } from '@zahln/mobile-core';
import { Button, Icon, PressableScale, SafeArea, Text, toast, useTheme } from '@zahln/mobile-ui';
import { useNfcReader } from '@zahln/nfc-pay';
import { handleUrlFor, parseHandleUrl, parsePayUrl } from '@zahln/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StatusBar, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import type { HomeStackParamList } from '../../app/navigation/types';
import { useQrOutput } from './useQrOutput';

type Props = NativeStackScreenProps<HomeStackParamList, 'Scan'>;

const FRAME = 248;

function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

/** Four ember corners: the target, without boxing in the camera picture. */
function Viewfinder() {
  const { colors } = useTheme();
  const corner = { position: 'absolute' as const, width: 36, height: 36, borderColor: colors.brand };
  return (
    <View style={{ width: FRAME, height: FRAME }} pointerEvents="none">
      <View
        style={[corner, { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 20 }]}
      />
      <View
        style={[
          corner,
          { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 20 },
        ]}
      />
      <View
        style={[
          corner,
          { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 20 },
        ]}
      />
      <View
        style={[
          corner,
          { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 20 },
        ]}
      />
    </View>
  );
}

/**
 * Scan → parse → hand over the *reference* only. The amount and payee always come from the server,
 * so a QR sticker can't change who gets paid. The first valid code wins; everything after is ignored.
 */
export function ScanScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const permission = useCameraPermission();
  const device = useCameraDevice('back');
  const focused = useIsFocused();
  const appActive = useAppActive();
  const handled = useRef(false);
  const lastInvalid = useRef(0);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const open = useCallback(
    (ref: string) => {
      if (handled.current) return;
      handled.current = true;
      haptic.success();
      navigation.replace('Pay', { ref });
    },
    [navigation],
  );

  const openHandle = useCallback(
    (handle: string) => {
      if (handled.current) return;
      handled.current = true;
      haptic.success();
      navigation.replace('Handle', { handle });
    },
    [navigation],
  );

  const onCodes = useCallback(
    (values: string[]) => {
      if (handled.current) return;
      for (const value of values) {
        const parsed = parsePayUrl(value);
        if (parsed) return open(parsed.ref);
        const handle = parseHandleUrl(value);
        if (handle) return openHandle(handle);
      }
      // A QR that isn't ours: say so once every few seconds, not 30 times a second.
      if (Date.now() - lastInvalid.current > 3000) {
        lastInvalid.current = Date.now();
        haptic.warning();
        toast(t('pay.invalidCode'), 'warning');
      }
    },
    [open, openHandle, t],
  );

  // Android: holding the phone against a ZYSYGY till delivers the same reference the QR carries.
  const nfcKilled = useKillSwitch('nfc_pay');
  const onNfc = useCallback((ref: string) => onCodes([ref]), [onCodes]);
  useNfcReader(focused && appActive && !nfcKilled, onNfc);

  const scanner = useQrOutput(onCodes);

  const loadDemo = async () => {
    setLoadingDemo(true);
    try {
      const ref = await payments.devLatestRef();
      if (ref) open(ref);
      else toast(t('pay.noDemoQr'), 'info');
    } catch {
      toast(t('common.networkError'), 'warning');
    } finally {
      setLoadingDemo(false);
    }
  };

  const canScan = permission.hasPermission && device != null;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.ink }}>
      <StatusBar barStyle="light-content" />
      {canScan ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          outputs={[scanner]}
          isActive={focused && appActive && !handled.current}
        />
      ) : null}
      <SafeArea className="flex-1 px-6" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between py-2">
          <PressableScale
            onPress={() => navigation.goBack()}
            hapticOnPress
            accessibilityRole="button"
            accessibilityLabel={t('pay.close')}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          >
            <Icon name="close" size={22} color="onInk" />
          </PressableScale>
          <Text variant="headline" tone="on-ink" style={{ fontFamily: 'Inter-Bold' }}>
            {t('pay.scanTitle')}
          </Text>
          <View className="h-11 w-11" />
        </View>

        <View className="flex-1 items-center justify-center gap-6">
          {canScan ? (
            <>
              <Viewfinder />
              <Text variant="callout" tone="on-ink" className="text-center">
                {t('pay.scanHint')}
              </Text>
            </>
          ) : (
            <Animated.View entering={FadeIn} className="items-center gap-4 px-2">
              <View
                className="h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
              >
                <Icon name="camera" size={40} color="brand" weight="duotone" />
              </View>
              <Text variant="title" tone="on-ink" className="text-center">
                {device == null ? t('pay.noCamera') : t('pay.cameraTitle')}
              </Text>
              {device != null ? (
                <Text tone="on-ink-muted" className="text-center">
                  {t('pay.cameraBody')}
                </Text>
              ) : null}
              {device != null ? (
                <View className="w-full pt-2">
                  {permission.canRequestPermission ? (
                    <Button
                      title={t('pay.allowCamera')}
                      icon="camera"
                      onPress={() => void permission.requestPermission()}
                    />
                  ) : (
                    <Button
                      title={t('pay.openSettings')}
                      variant="secondary"
                      onPress={() => void Linking.openSettings()}
                    />
                  )}
                </View>
              ) : null}
            </Animated.View>
          )}
        </View>

        {__DEV__ ? (
          <View className="pb-2">
            <Button
              title={t('pay.demoQr')}
              icon="qr"
              variant="secondary"
              loading={loadingDemo}
              onPress={() => void loadDemo()}
            />
            {/* The static QR of a Free-plan merchant, as if scanned from a sticker on the counter. */}
            <PressableScale
              onPress={() => onCodes([handleUrlFor('doener-ali')])}
              accessibilityRole="button"
              className="min-h-[44px] items-center justify-center"
            >
              <Text variant="footnote" tone="on-ink-muted">
                Demo: @doener-ali
              </Text>
            </PressableScale>
          </View>
        ) : null}
      </SafeArea>
    </View>
  );
}
