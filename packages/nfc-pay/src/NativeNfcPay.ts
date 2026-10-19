import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /** The phone has NFC hardware and HCE. */
  isSupported(): boolean;
  /** NFC is switched on in the system settings. */
  isEnabled(): boolean;
  /** Till: answer readers with this intent reference until `stopEmulating()`. */
  startEmulating(ref: string): void;
  stopEmulating(): void;
  /** Payer: look for a till while this screen is open. */
  startReading(): void;
  stopReading(): void;

  /** The raw reference a till sent. Validate it like a scanned QR (`parsePayUrl`). */
  readonly onTagRead: CodegenTypes.EventEmitter<string>;
  readonly onTagError: CodegenTypes.EventEmitter<string>;
}

/** Android only. `null` on iOS (not linked there) and in tests. */
export default TurboModuleRegistry.get<Spec>('ZasterNfcPay');
