import { useT } from '@zahln/mobile-core';
import { deviceIntegrity } from '@zahln/secure-screen';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * A rooted or jailbroken phone gets a warning, never a block: the checks are easy to fool (so blocking only stops
 * honest users), people would lose access to their own money, and the server already enforces everything that
 * matters. With Play Integrity / App Attest (docs/HANDBOOK.md, Epilogue) the server could step up checks for such devices.
 */
export function IntegrityNotice() {
  const { t } = useT();
  const integrity = useMemo(() => deviceIntegrity(), []);
  if (!integrity?.rooted) return null;
  return (
    <View
      accessibilityRole="alert"
      className="flex-row items-start gap-3 rounded-lg bg-warning-subtle px-4 py-3"
    >
      <Icon name="warning" size={20} color="warning" weight="fill" />
      <Text variant="footnote" className="flex-1">
        {t('security.rooted')}
      </Text>
    </View>
  );
}
