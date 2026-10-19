import { useT } from '@zaster/mobile-core';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Text } from '../../ds';
import { useDraft } from './draft';

export type OnboardingStep = 'phone' | 'otp' | 'name' | 'merchant' | 'pin' | 'biometrics';

/** The steps this person will actually see, so the progress bar never lies. */
function stepsFor(role: 'consumer' | 'merchant' | null, isNewUser: boolean): OnboardingStep[] {
  return [
    'phone',
    'otp',
    ...(isNewUser ? (['name'] as const) : []),
    ...(role === 'merchant' ? (['merchant'] as const) : []),
    'pin',
    'biometrics',
  ];
}

function Progress({ step }: { step: OnboardingStep }) {
  const { t } = useT();
  const role = useDraft((s) => s.role);
  const isNewUser = useDraft((s) => s.isNewUser);
  const steps = stepsFor(role, isNewUser);
  const current = Math.max(0, steps.indexOf(step));
  return (
    <View
      className="flex-row gap-1.5"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('onboarding.step', { current: current + 1, total: steps.length })}
    >
      {steps.map((s, i) => (
        <View
          key={s}
          className={`h-1.5 flex-1 rounded-full ${i <= current ? 'bg-brand' : 'bg-surface-muted'}`}
        />
      ))}
    </View>
  );
}

/** Shared frame for every onboarding step: progress, illustration, headline, content, pinned footer. */
export function OnboardingLayout({
  step,
  illustration,
  title,
  subtitle,
  children,
  footer,
  scroll = true,
}: {
  step: OnboardingStep;
  illustration?: ReactNode;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  return (
    <Screen footer={footer} scroll={scroll}>
      <Progress step={step} />
      <Animated.View entering={FadeInDown.duration(420)} className="gap-3 pt-2">
        {illustration ? <View className="pb-2">{illustration}</View> : null}
        <Text variant="display" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text tone="secondary">{subtitle}</Text> : null}
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(420).delay(90)} className="gap-4">
        {children}
      </Animated.View>
    </Screen>
  );
}
