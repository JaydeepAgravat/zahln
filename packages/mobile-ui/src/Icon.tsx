import type { ColorToken } from '@zahln/shared/tokens';
import type { IconProps as PhosphorProps } from 'phosphor-react-native';
import { ArrowDownLeftIcon } from 'phosphor-react-native/src/icons/ArrowDownLeft';
import { ArrowUpRightIcon } from 'phosphor-react-native/src/icons/ArrowUpRight';
import { AvocadoIcon } from 'phosphor-react-native/src/icons/Avocado';
import { BackspaceIcon } from 'phosphor-react-native/src/icons/Backspace';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { BowlFoodIcon } from 'phosphor-react-native/src/icons/BowlFood';
import { BreadIcon } from 'phosphor-react-native/src/icons/Bread';
import { CameraIcon } from 'phosphor-react-native/src/icons/Camera';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { ChatCircleTextIcon } from 'phosphor-react-native/src/icons/ChatCircleText';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { CloudSlashIcon } from 'phosphor-react-native/src/icons/CloudSlash';
import { CoffeeIcon } from 'phosphor-react-native/src/icons/Coffee';
import { CoffeeBeanIcon } from 'phosphor-react-native/src/icons/CoffeeBean';
import { CoinsIcon } from 'phosphor-react-native/src/icons/Coins';
import { DotsNineIcon } from 'phosphor-react-native/src/icons/DotsNine';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { EyeSlashIcon } from 'phosphor-react-native/src/icons/EyeSlash';
import { FingerprintIcon } from 'phosphor-react-native/src/icons/Fingerprint';
import { ForkKnifeIcon } from 'phosphor-react-native/src/icons/ForkKnife';
import { GlobeHemisphereWestIcon } from 'phosphor-react-native/src/icons/GlobeHemisphereWest';
import { GraduationCapIcon } from 'phosphor-react-native/src/icons/GraduationCap';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { LeafIcon } from 'phosphor-react-native/src/icons/Leaf';
import { LightningIcon } from 'phosphor-react-native/src/icons/Lightning';
import { LockSimpleIcon } from 'phosphor-react-native/src/icons/LockSimple';
import { MinusIcon } from 'phosphor-react-native/src/icons/Minus';
import { MoonStarsIcon } from 'phosphor-react-native/src/icons/MoonStars';
import { PaperPlaneTiltIcon } from 'phosphor-react-native/src/icons/PaperPlaneTilt';
import { PhoneIcon } from 'phosphor-react-native/src/icons/Phone';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { QrCodeIcon } from 'phosphor-react-native/src/icons/QrCode';
import { ReceiptIcon } from 'phosphor-react-native/src/icons/Receipt';
import { ScanIcon } from 'phosphor-react-native/src/icons/Scan';
import { ScanSmileyIcon } from 'phosphor-react-native/src/icons/ScanSmiley';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { ShoppingBagIcon } from 'phosphor-react-native/src/icons/ShoppingBag';
import { SignOutIcon } from 'phosphor-react-native/src/icons/SignOut';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { SquaresFourIcon } from 'phosphor-react-native/src/icons/SquaresFour';
import { StorefrontIcon } from 'phosphor-react-native/src/icons/Storefront';
import { SunIcon } from 'phosphor-react-native/src/icons/Sun';
import { TranslateIcon } from 'phosphor-react-native/src/icons/Translate';
import { UserCircleIcon } from 'phosphor-react-native/src/icons/UserCircle';
import { WalletIcon } from 'phosphor-react-native/src/icons/Wallet';
import { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { View } from 'react-native';
import { useTheme } from './theme';

/**
 * The app's icon vocabulary: Phosphor, one family, curated. Each icon is imported by path, so only these
 * end up in the bundle (the package has 1,500+). Add an icon here before using it anywhere.
 */
const ICONS = {
  arrowIn: ArrowDownLeftIcon,
  arrowOut: ArrowUpRightIcon,
  backspace: BackspaceIcon,
  bell: BellIcon,
  back: CaretLeftIcon,
  chevron: CaretRightIcon,
  sms: ChatCircleTextIcon,
  checkCircle: CheckCircleIcon,
  coffee: CoffeeIcon,
  coins: CoinsIcon,
  eye: EyeIcon,
  eyeOff: EyeSlashIcon,
  fingerprint: FingerprintIcon,
  food: ForkKnifeIcon,
  globe: GlobeHemisphereWestIcon,
  student: GraduationCapIcon,
  info: InfoIcon,
  instant: LightningIcon,
  lock: LockSimpleIcon,
  moon: MoonStarsIcon,
  send: PaperPlaneTiltIcon,
  phone: PhoneIcon,
  plus: PlusIcon,
  qr: QrCodeIcon,
  receipt: ReceiptIcon,
  scan: ScanIcon,
  faceId: ScanSmileyIcon,
  shield: ShieldCheckIcon,
  signOut: SignOutIcon,
  sparkle: SparkleIcon,
  store: StorefrontIcon,
  sun: SunIcon,
  language: TranslateIcon,
  profile: UserCircleIcon,
  wallet: WalletIcon,
  warning: WarningIcon,
  close: XIcon,
  avocado: AvocadoIcon,
  bread: BreadIcon,
  bowl: BowlFoodIcon,
  check: CheckIcon,
  clock: ClockIcon,
  coffeeBean: CoffeeBeanIcon,
  leaf: LeafIcon,
  minus: MinusIcon,
  bag: ShoppingBagIcon,
  camera: CameraIcon,
  keypad: DotsNineIcon,
  grid: SquaresFourIcon,
  cloudOff: CloudSlashIcon,
} as const;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  /** A colour token, so icons theme with everything else. */
  color?: ColorToken;
  weight?: PhosphorProps['weight'];
};

export function Icon({ name, size = 22, color = 'textPrimary', weight = 'regular' }: Props) {
  const { colors } = useTheme();
  const Component = ICONS[name];
  // Icons are decorative: the control around them carries the accessibility label.
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Component size={size} color={colors[color]} weight={weight} duotoneOpacity={0.22} />
    </View>
  );
}
