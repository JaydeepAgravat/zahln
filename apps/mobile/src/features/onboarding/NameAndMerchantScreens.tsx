import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { OnboardingStackParamList } from '../../app/navigation/types';
import { Button, Card, Screen, StatusBadge, Text, TextField } from '../../ds';
import { useT } from '../../lib/i18n';
import { useDraft } from './draft';

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
    <Screen footer={<Button title={t('common.continue')} onPress={submit} disabled={!name.trim()} />}>
      <Text variant="title" accessibilityRole="header">
        {t('onboarding.name.title')}
      </Text>
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
    </Screen>
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
      <Screen
        footer={<Button title={t('common.back')} variant="secondary" onPress={() => navigation.popToTop()} />}
      >
        <Text variant="title" accessibilityRole="header">
          {t('onboarding.merchant.title')}
        </Text>
        <Card className="bg-warning-subtle">
          <Text className="text-warning">{t('onboarding.merchant.none')}</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
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
      <Text variant="title" accessibilityRole="header">
        {t('onboarding.merchant.title')}
      </Text>
      <Text tone="secondary">{t('onboarding.merchant.subtitle')}</Text>
      <View className="gap-3">
        {draft.memberships.map((m) => {
          const active = m.merchantId === selected;
          return (
            <Pressable
              key={m.merchantId}
              onPress={() => setSelected(m.merchantId)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              className={`gap-2 rounded-lg border-2 bg-surface p-4 ${active ? 'border-brand' : 'border-border'}`}
            >
              <Text variant="headline">{m.merchantName}</Text>
              <View className="flex-row gap-2">
                <StatusBadge tone="neutral" label={t(`onboarding.merchant.role.${m.role}`)} />
                <StatusBadge tone="info" label={m.plan.toUpperCase()} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
