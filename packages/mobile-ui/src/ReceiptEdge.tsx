import type { ColorToken } from '@zaster/shared/tokens';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from './theme';

/**
 * The signature motif: a torn-receipt zigzag ("Quittung"). Sits under the ink balance card,
 * the receipt, the paid screen. Purely decorative.
 */
export function ReceiptEdge({
  color = 'ink',
  tooth = 10,
  depth = 7,
}: {
  color?: ColorToken;
  tooth?: number;
  depth?: number;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const teeth = Math.max(1, Math.round(width / tooth));
  const step = width / teeth;
  let d = `M0 0 H${width} V0`;
  for (let i = teeth; i > 0; i--) {
    const x = i * step;
    d += ` L${x - step / 2} ${depth} L${x - step} 0`;
  }
  d += ' Z';
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: depth, marginTop: -0.5 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 ? (
        <Svg width={width} height={depth}>
          <Path d={d} fill={colors[color]} />
        </Svg>
      ) : null}
    </View>
  );
}
