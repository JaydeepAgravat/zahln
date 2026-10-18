import type { Meta } from '@storybook/react-native';
import { View } from 'react-native';
import { AmountDisplay, Button, Keypad, ListRow, PinDots, StatusBadge, Text } from '../ds';
import { themed } from './themed';

const meta: Meta = { title: 'Primitives' };
export default meta;

const Buttons = () => (
  <View className="gap-3">
    <Button title="Mit Face ID bezahlen · 6,30 €" icon="faceId" />
    <Button title="Beleg ansehen" variant="ink" icon="receipt" />
    <Button title="Später" variant="secondary" />
    <Button title="Erstatten" variant="destructive" icon="arrowOut" />
    <Button title="Wird bezahlt…" loading />
  </View>
);
export const { Light: ButtonsLight, Dark: ButtonsDark, English: ButtonsEnglish } = themed(Buttons);

const Money = () => (
  <View className="gap-4">
    <AmountDisplay cents={630} />
    <AmountDisplay cents={2847} size="lg" />
    <AmountDisplay cents={100} signed tone="success" />
    <AmountDisplay cents={2847} discreet />
    <Text variant="footnote" tone="tertiary">
      Screen readers hear "sechs Euro dreißig", not "6 Komma 30".
    </Text>
  </View>
);
export const { Light: MoneyLight, Dark: MoneyDark, English: MoneyEnglish } = themed(Money);

const Badges = () => (
  <View className="flex-row flex-wrap gap-2">
    <StatusBadge tone="success" label="Bezahlt" />
    <StatusBadge tone="pending" label="Wird geprüft" />
    <StatusBadge tone="danger" label="Nicht belastet" />
    <StatusBadge tone="warning" label="Teilweise erstattet" />
    <StatusBadge tone="info" label="Pro" icon={null} />
    <StatusBadge tone="neutral" label="Abgelaufen" />
  </View>
);
export const { Light: BadgesLight, Dark: BadgesDark } = themed(Badges);

const Pin = () => (
  <View className="flex-1 justify-between">
    <View className="items-center gap-6 pt-10">
      <PinDots length={3} />
      <PinDots length={6} error />
    </View>
    <Keypad mode="pin" onKey={() => {}} biometricIcon="faceId" />
  </View>
);
export const { Light: PinPadLight, Dark: PinPadDark } = themed(Pin);

const Rows = () => (
  <View className="rounded-xl bg-surface">
    <ListRow icon="lock" title="Jetzt sperren" chevron onPress={() => {}} />
    <ListRow icon="download" title="Meine Daten exportieren" chevron onPress={() => {}} />
    <ListRow
      icon="warning"
      iconColor="danger"
      iconBackground="bg-danger-subtle"
      title="Konto löschen"
      chevron
    />
  </View>
);
export const { Light: ListRowsLight, Dark: ListRowsDark } = themed(Rows);
