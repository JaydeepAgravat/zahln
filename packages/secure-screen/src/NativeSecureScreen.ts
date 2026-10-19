import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * The native contract (Codegen reads this file: its name must start with `Native`).
 * Generated glue: ObjC++ protocol `NativeSecureScreenSpec` and Java `NativeSecureScreenSpec`.
 */
export interface Spec extends TurboModule {
  /** Protect the current screen. Calls are counted; the last `disable()` lifts the protection. */
  enable(): void;
  disable(): void;
  /** iOS: the screen is being recorded or mirrored right now. Android: always false (FLAG_SECURE blanks it). */
  isCaptured(): boolean;
  /** Heuristics only. A hint for a warning banner, never a reason to block someone from their money. */
  integrity(): { rooted: boolean; emulator: boolean; signals: string[] };

  readonly onCaptureChanged: CodegenTypes.EventEmitter<boolean>;
  readonly onScreenshot: CodegenTypes.EventEmitter<void>;
}

/** `null` where the module isn't linked (Jest, Storybook): callers fall back to no-ops. */
export default TurboModuleRegistry.get<Spec>('ZasterSecureScreen');
