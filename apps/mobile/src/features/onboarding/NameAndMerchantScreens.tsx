import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { View } from 'react-native';
import type { OnboardingStackParamList } from '../../app/navigation/types';
import { Button, Icon, PressableScale, StatusBadge, Text, TextField, TillIllustration } from '../../ds';
import { useT } from '../../lib/i18n';
import { useDraft } from './draft';
import { OnboardingLayout } from './OnboardingLayout';

export function NameScreen({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'Name'>) {
  const { t } = useT();
  const draft = useDraft();
  const [name, setName] = useState(draft.name);
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    if (name.trim().length < 2) {
      setError(t('onboarding.name.invalid'));
      return;
    }
    draft.set({ name: name.trim() });
    navigation.navigate(draft.role === 'merchant' ? 'Merchant' : 'PinCreate');
  };

  return (
    <OnboardingLayout
      step="name"
      title={t('onboarding.name.title')}
      footer={<Button title={t('common.continue')} onPress={submit} disabled={!name.trim()} />}
    >
      <TextField
        label={t('onboarding.name.label')}
        value={name}
        onChangeText={setName}
        textContentType="name"
        autoComplete="name"
        autoFocus
        error={error}
        onSubmitEditing={submit}
      />
    </OnboardingLayout>
  );
}

/**
 * Merchant mode: the phone number must belong to staff of a business (KYB happens elsewhere).
 * The chosen business decides what this till can do, based on its plan.
 */
export function MerchantScreen({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'Merchant'>) {
  const { t } = useT();
  const draft = useDraft();
  const [selected, setSelected] = useState(draft.memberships[0]?.merchantId ?? null);

  if (draft.memberships.length === 0) {
    return (
      <OnboardingLayout
        step="merchant"
        title={t('onboarding.merchant.title')}
        footer={<Button title={t('common.back')} variant="secondary" onPress={() => navigation.popToTop()} />}
      >
        <View className="flex-row gap-3 rounded-lg bg-warning-subtle p-4">
          <Icon name="info" size={22} color="warning" weight="fill" />
          <Text className="flex-1" tone="warning">
            {t('onboarding.merchant.none')}
          </Text>
        </View>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      step="merchant"
      illustration={<TillIllustration width={220} />}
      title={t('onboarding.merchant.title')}
      subtitle={t('onboarding.merchant.subtitle')}
      footer={
        <Button
          title={t('common.continue')}
          disabled={!selected}
          onPress={() => {
            draft.set({ merchantId: selected });
            navigation.navigate('PinCreate');
          }}
        />
      }
    >
      {draft.memberships.map((m) => {
        const active = m.merchantId === selected;
        return (
          <PressableScale
            key={m.merchantId}
            onPress={() => setSelected(m.merchantId)}
            hapticOnPress
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${m.merchantName}, ${t(`onboarding.merchant.role.${m.role}`)}, ${m.plan}`}
            className={`flex-row items-center gap-4 rounded-lg border-2 bg-surface p-4 ${active ? 'border-brand' : 'border-border'}`}
          >
            <View className="h-12 w-12 items-center justify-center rounded-md bg-ink">
              <Icon name="store" size={24} color="onInk" weight="duotone" />
            </View>
            <View className="flex-1 gap-1.5">
              <Text variant="headline" style={{ fontFamily: 'Inter-Bold' }}>
                {m.merchantName}
              </Text>
              <View className="flex-row gap-2">
                <StatusBadge tone="neutral" label={t(`onboarding.merchant.role.${m.role}`)} />
                <StatusBadge tone="info" icon={null} label={m.plan[0]?.toUpperCase() + m.plan.slice(1)} />
              </View>
            </View>
            <View
              className={`h-6 w-6 items-center justify-center rounded-full border-2 ${active ? 'border-brand bg-brand' : 'border-border-strong'}`}
            >
              {active ? <View className="h-2.5 w-2.5 rounded-full bg-on-brand" /> : null}
            </View>
          </PressableScale>
        );
      })}
    </OnboardingLayout>
  );
}
