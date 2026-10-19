import { appKind } from '@zaster/mobile-core';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { useTheme } from './theme';

/**
 * Custom geometric illustrations, drawn in code from the design tokens so they re-theme in dark mode
 * and never look like stock art. Shared vocabulary: ink phone, paper receipt with a torn edge,
 * ember coin/sun, saffron sparkles.
 */

const zigzag = (x: number, y: number, width: number, teeth: number, depth: number) => {
  const step = width / teeth;
  let d = '';
  for (let i = 0; i < teeth; i++)
    d += ` L${x + width - i * step - step / 2} ${y + depth} L${x + width - (i + 1) * step} ${y}`;
  return d;
};

function Sparkle({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <Path
      d={`M${x} ${y - r} C${x + r * 0.15} ${y - r * 0.15} ${x + r * 0.15} ${y - r * 0.15} ${x + r} ${y} C${x + r * 0.15} ${y + r * 0.15} ${x + r * 0.15} ${y + r * 0.15} ${x} ${y + r} C${x - r * 0.15} ${y + r * 0.15} ${x - r * 0.15} ${y + r * 0.15} ${x - r} ${y} C${x - r * 0.15} ${y - r * 0.15} ${x - r * 0.15} ${y - r * 0.15} ${x} ${y - r} Z`}
      fill={color}
    />
  );
}

/** A deterministic QR-like pattern (decorative only, not scannable). */
function FauxQr({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const n = 9;
  const c = size / n;
  const cells: [number, number][] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const finder = (i < 3 && j < 3) || (i < 3 && j > 5) || (i > 5 && j < 3);
      if (!finder && (i * 7 + j * 3 + i * j) % 3 === 0) cells.push([i, j]);
    }
  const finder = (fx: number, fy: number) => (
    <G key={`${fx}-${fy}`}>
      <Rect x={fx} y={fy} width={c * 3} height={c * 3} rx={c * 0.6} fill={color} />
      <Rect x={fx + c * 0.6} y={fy + c * 0.6} width={c * 1.8} height={c * 1.8} rx={c * 0.35} fill="#FFFFFF" />
      <Rect x={fx + c} y={fy + c} width={c} height={c} rx={c * 0.25} fill={color} />
    </G>
  );
  return (
    <G>
      {cells.map(([i, j]) => (
        <Rect
          key={`${i}-${j}`}
          x={x + j * c + 0.6}
          y={y + i * c + 0.6}
          width={c - 1.2}
          height={c - 1.2}
          rx={c * 0.3}
          fill={color}
        />
      ))}
      {finder(x, y)}
      {finder(x + c * 6, y)}
      {finder(x, y + c * 6)}
    </G>
  );
}

function useFloat(distance = 6, duration = 2600) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(
      withSequence(
        withTiming(-distance, {
          duration,
          easing: Easing.inOut(Easing.sin),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System }),
      ),
      // Finite on purpose: a few calm floats, then rest (battery, distraction, and UI-test idle detection).
      3,
    );
  }, [v, distance, duration]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: v.value }] }));
}

/** Welcome: phone with a one-time QR, a torn receipt, the ember coin. */
export function WelcomeIllustration({ width = 320 }: { width?: number }) {
  const { colors } = useTheme();
  const float = useFloat();
  const h = width * 0.78;
  return (
    <Animated.View style={float} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={h} viewBox="0 0 320 250">
        <Circle cx={214} cy={96} r={74} fill={colors.brand} />
        <Circle
          cx={214}
          cy={96}
          r={74}
          fill="none"
          stroke={colors.ink}
          strokeWidth={2}
          strokeDasharray="2 7"
          opacity={0.25}
        />
        <Path
          d="M60 232 Q160 214 262 232"
          stroke={colors.border}
          strokeWidth={10}
          strokeLinecap="round"
          fill="none"
        />
        {/* phone */}
        <G rotation={-7} origin="120, 130">
          <Rect x={70} y={34} width={104} height={196} rx={22} fill={colors.ink} />
          <Rect x={78} y={44} width={88} height={176} rx={16} fill={colors.surfaceRaised} />
          <Rect x={108} y={50} width={28} height={6} rx={3} fill={colors.ink} />
          <Rect x={88} y={70} width={44} height={6} rx={3} fill={colors.border} />
          <Rect x={88} y={82} width={28} height={10} rx={3} fill={colors.ink} />
          <FauxQr x={92} y={104} size={60} color={colors.ink} />
          <Rect x={88} y={182} width={68} height={22} rx={11} fill={colors.brand} />
        </G>
        {/* receipt */}
        <G rotation={9} origin="236, 160">
          <Path
            d={`M196 104 H276 V196${zigzag(196, 196, 80, 8, 7)} Z`}
            fill={colors.surfaceRaised}
            stroke={colors.ink}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Rect x={208} y={118} width={40} height={6} rx={3} fill={colors.ink} />
          <Rect x={208} y={132} width={56} height={4} rx={2} fill={colors.border} />
          <Rect x={208} y={142} width={48} height={4} rx={2} fill={colors.border} />
          <Line
            x1={208}
            y1={160}
            x2={264}
            y2={160}
            stroke={colors.ink}
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
          <Rect x={208} y={170} width={22} height={7} rx={3} fill={colors.ink} />
          <Circle cx={256} cy={174} r={9} fill={colors.success} />
          <Path
            d="M251.5 174 l3 3 l6 -6"
            stroke="#FFFFFF"
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
        <Sparkle x={52} y={70} r={10} color={colors.accent} />
        <Sparkle x={290} y={196} r={7} color={colors.brand} />
        <Sparkle x={272} y={30} r={5} color={colors.ink} />
      </Svg>
    </Animated.View>
  );
}

/** OTP: a phone with an incoming code bubble. */
export function CodeIllustration({ size = 120 }: { size?: number }) {
  const { colors } = useTheme();
  const float = useFloat(4, 2000);
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={56} fill={colors.brandSubtle} />
        <Rect x={36} y={22} width={48} height={84} rx={12} fill={colors.ink} />
        <Rect x={41} y={30} width={38} height={68} rx={8} fill={colors.surfaceRaised} />
      </Svg>
      <Animated.View style={[{ position: 'absolute', left: size * 0.42, top: size * 0.3 }, float]}>
        <Svg width={size * 0.56} height={size * 0.3} viewBox="0 0 68 36">
          <Path
            d="M8 2 H60 a6 6 0 0 1 6 6 V24 a6 6 0 0 1 -6 6 H18 L8 35 V30 a6 6 0 0 1 -6 -6 V8 a6 6 0 0 1 6 -6 Z"
            fill={colors.brand}
          />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Circle key={i} cx={14 + i * 8 + (i > 2 ? 4 : 0)} cy={16} r={2.6} fill={colors.onBrand} />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}

/** PIN: an ink shield with an ember keyhole. */
export function ShieldIllustration({ size = 112 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={56} fill={colors.surfaceMuted} />
        <Path d="M60 18 L92 30 V58 C92 80 78 96 60 104 C42 96 28 80 28 58 V30 Z" fill={colors.ink} />
        <Path
          d="M60 26 L86 36 V58 C86 76 75 89 60 96"
          stroke={colors.onInkMuted}
          strokeWidth={2}
          fill="none"
          opacity={0.35}
        />
        <Circle cx={60} cy={56} r={9} fill={colors.brand} />
        <Path d="M56 60 L54 76 H66 L64 60 Z" fill={colors.brand} />
        <Sparkle x={98} y={22} r={6} color={colors.accent} />
      </Svg>
    </View>
  );
}

/** Biometrics: scan frame with a calm face and a moving scan line. */
export function FaceScanIllustration({ size = 140 }: { size?: number }) {
  const { colors } = useTheme();
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(0, {
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        }),
      ),
      4,
    );
  }, [y]);
  const line = useAnimatedStyle(() => ({ transform: [{ translateY: size * 0.18 + y.value * size * 0.6 }] }));
  const corner = (d: string) => (
    <Path d={d} stroke={colors.brand} strokeWidth={6} strokeLinecap="round" fill="none" />
  );
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox="0 0 140 140">
        <Circle cx={70} cy={70} r={64} fill={colors.surfaceMuted} />
        {corner('M28 48 V36 a8 8 0 0 1 8 -8 H48')}
        {corner('M92 28 H104 a8 8 0 0 1 8 8 V48')}
        {corner('M112 92 V104 a8 8 0 0 1 -8 8 H92')}
        {corner('M48 112 H36 a8 8 0 0 1 -8 -8 V92')}
        <Circle cx={56} cy={60} r={4.5} fill={colors.ink} />
        <Circle cx={84} cy={60} r={4.5} fill={colors.ink} />
        <Path
          d="M70 62 V78 H64"
          stroke={colors.ink}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M54 90 Q70 102 86 90"
          stroke={colors.ink}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: size * 0.2,
            width: size * 0.6,
            height: 3,
            borderRadius: 2,
            backgroundColor: colors.brand,
            opacity: 0.8,
          },
          line,
        ]}
      />
    </View>
  );
}

/** Empty history: a small stack of blank receipts. */
export function EmptyReceiptsIllustration({ size = 132 }: { size?: number }) {
  const { colors } = useTheme();
  const receipt = (x: number, rot: number, fill: string) => (
    <G rotation={rot} origin={`${x + 30}, 70`}>
      <Path
        d={`M${x} 30 H${x + 60} V100${zigzag(x, 100, 60, 6, 6)} Z`}
        fill={fill}
        stroke={colors.ink}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Rect x={x + 10} y={44} width={30} height={5} rx={2.5} fill={colors.border} />
      <Rect x={x + 10} y={56} width={40} height={4} rx={2} fill={colors.border} />
      <Rect x={x + 10} y={66} width={24} height={4} rx={2} fill={colors.border} />
    </G>
  );
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 132 132">
        <Circle cx={66} cy={66} r={60} fill={colors.surfaceMuted} />
        {receipt(28, -10, colors.surface)}
        {receipt(42, 6, colors.surfaceRaised)}
        <Sparkle x={108} y={30} r={7} color={colors.brand} />
        <Sparkle x={24} y={104} r={5} color={colors.accent} />
      </Svg>
    </View>
  );
}

/** Merchant till: phone on a stand showing a QR, next to a coffee cup. */
export function TillIllustration({ width = 260 }: { width?: number }) {
  const { colors } = useTheme();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={width * 0.62} viewBox="0 0 260 160">
        <Rect x={10} y={140} width={240} height={10} rx={5} fill={colors.border} />
        <Circle cx={84} cy={70} r={58} fill={colors.brandSubtle} />
        <Path d="M96 140 L106 120 H134 L144 140 Z" fill={colors.ink} />
        <Rect x={86} y={14} width={68} height={112} rx={14} fill={colors.ink} />
        <Rect x={92} y={22} width={56} height={96} rx={9} fill={colors.surfaceRaised} />
        <FauxQr x={99} y={40} size={42} color={colors.ink} />
        <Rect x={102} y={92} width={36} height={10} rx={5} fill={colors.brand} />
        <Path
          d="M180 98 H222 L216 140 H186 Z"
          fill={colors.surfaceRaised}
          stroke={colors.ink}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <Path d="M222 106 a10 10 0 0 1 0 20" stroke={colors.ink} strokeWidth={2.5} fill="none" />
        <Path
          d="M192 88 q4 -8 0 -14 M202 88 q4 -8 0 -14 M212 88 q4 -8 0 -14"
          stroke={colors.textTertiary}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <Sparkle x={40} y={30} r={8} color={colors.accent} />
      </Svg>
    </View>
  );
}

/**
 * The brand marks: a receipt with a torn edge carrying a bold Z. Same geometry as the app icons
 * (scripts/generate-icons.mjs).
 * Zaster (consumer) is ember-first: a paper receipt and ink Z on an ember tile.
 * Zettel (merchant) is ink-first: a paper receipt and ember Z on an ink tile, like a till slip under counter light.
 */
export function Logo({
  size = 56,
  tile = true,
  brand = appKind() === 'merchant' ? 'zettel' : 'zaster',
}: {
  size?: number;
  tile?: boolean;
  brand?: 'zaster' | 'zettel';
}) {
  const { colors } = useTheme();
  const receipt = `M24 26 Q24 18 32 18 H68 Q76 18 76 26 V76${zigzag(24, 76, 52, 5, 6)} Z`;
  const merchant = brand === 'zettel';
  const paper = '#F7F3EE';
  const ink = '#1B1A17';
  const ember = '#FF4F1F';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={merchant ? 'Zettel' : 'Zaster'}>
      {tile ? (
        <Rect x={0} y={0} width={100} height={100} rx={26} fill={merchant ? ink : colors.brand} />
      ) : null}
      <Path d={receipt} fill={tile ? paper : colors.brand} />
      <Path
        d="M38 33 H62 L38 57 H62"
        stroke={tile ? (merchant ? ember : ink) : colors.onBrand}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
