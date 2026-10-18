import { haptic, useT } from '@zahln/mobile-core';
import { spokenMoney } from '@zahln/shared';
import { type ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { SafeArea } from './SafeArea';
import { Text } from './Text';
import { useTheme } from './theme';

/**
 * Seconds left until the server's `expiresAt`, by the device clock (NTP-synced on real phones).
 * The countdown is a courtesy: the server is the authority and rejects an expired code with 409.
 */
export function useCountdown(intent: { createdAt: string; expiresAt: string }) {
  const deadline = Date.parse(intent.expiresAt);
  const total = Math.round((deadline - Date.parse(intent.createdAt)) / 1000);
  const secondsLeft = () => Math.min(total, Math.max(0, Math.round((deadline - Date.now()) / 1000)));
  const [left, setLeft] = useState(secondsLeft);
  useEffect(() => {
    const tick = () => setLeft(Math.min(total, Math.max(0, Math.round((deadline - Date.now()) / 1000))));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [deadline, total]);
  const label = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return { left, total, label, expired: left <= 0 };
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A thin ring that empties as the QR's 5 minutes run out; the last 30 s turn warning-coloured. */
export function CountdownRing({
  left,
  total,
  label,
  size = 64,
  tone = 'ink',
}: {
  left: number;
  total: number;
  label: string;
  size?: number;
  tone?: 'ink' | 'paper';
}) {
  const { colors } = useTheme();
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(total > 0 ? left / total : 0);
  useEffect(() => {
    progress.value = withTiming(total > 0 ? left / total : 0, { duration: 260, easing: Easing.linear });
  }, [left, total, progress]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.value) }));
  const urgent = left <= 30;
  const track = tone === 'ink' ? 'rgba(255,255,255,0.14)' : colors.border;
  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center"
      accessibilityRole="timer"
      accessibilityLabel={label}
    >
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={urgent ? colors.warning : colors.brand}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          fill="none"
        />
      </Svg>
      <Text
        variant="footnote"
        tone={tone === 'ink' ? 'on-ink' : 'primary'}
        style={{ fontFamily: 'Inter-SemiBold', fontVariant: ['tabular-nums'] }}
      >
        {label}
      </Text>
    </View>
  );
}

/** The check draws itself, then springs: the one moment in the app that is allowed to celebrate. */
function DrawnCheck({ size = 112 }: { size?: number }) {
  const { colors } = useTheme();
  const length = 60;
  const offset = useSharedValue(length);
  useEffect(() => {
    offset.value = withDelay(180, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [offset]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  return (
    <Animated.View entering={ZoomIn.springify().damping(12).stiffness(180)}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={48} fill="rgba(255,255,255,0.16)" />
        <Circle cx={50} cy={50} r={36} fill={colors.onFlood} />
        <AnimatedPath
          d="M34 51 L45 62 L67 39"
          stroke={colors.floodPaid}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={length}
          animatedProps={props}
        />
      </Svg>
    </Animated.View>
  );
}

/**
 * Full-screen "Bezahlt": green flood, drawn check, the amount as the hero, a success haptic and
 * a screen-reader announcement. Used by the till and by the payer, so both phones feel the same.
 */
export function PaidFlood({
  amountCents,
  subtitle,
  meta,
  children,
}: {
  amountCents: number;
  subtitle: string;
  meta?: string;
  children?: ReactNode;
}) {
  const { t, money, locale } = useT();
  const { colors } = useTheme();
  useEffect(() => {
    haptic.success();
    AccessibilityInfo.announceForAccessibility(
      `${t('payment.status.paid')}, ${spokenMoney(amountCents, locale)}. ${subtitle}`,
    );
  }, [amountCents, locale, subtitle, t]);

  return (
    <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1, backgroundColor: colors.floodPaid }}>
      <SafeArea className="flex-1 px-6" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center gap-5">
          <DrawnCheck />
          <Text variant="title" tone="on-flood" accessibilityRole="header">
            {t('payment.status.paid')}
          </Text>
          <Animated.View entering={FadeIn.delay(160).duration(300)} className="items-center gap-1">
            <Text
              variant="amountHero"
              tone="on-flood"
              accessibilityLabel={spokenMoney(amountCents, locale)}
              style={{ fontSize: 56, lineHeight: 62 }}
            >
              {money(amountCents)}
            </Text>
            <Text variant="callout" tone="on-flood" className="text-center opacity-90">
              {subtitle}
            </Text>
            {meta ? (
              <View
                className="mt-3 rounded-full px-3 py-1"
                style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
              >
                <Text variant="caption" tone="on-flood" style={{ fontVariant: ['tabular-nums'] }}>
                  {meta}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        </View>
        <View className="gap-3 pb-2">{children}</View>
      </SafeArea>
    </Animated.View>
  );
}
