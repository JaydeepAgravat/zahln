import type { Role } from '@zaster/mobile-core';
import type { Membership } from '@zaster/shared';
import { create } from 'zustand';

/** In-memory only: the PIN and tokens here never touch disk until onboarding completes into the keychain. */
type Draft = {
  role: Role | null;
  phone: string;
  challengeId: string | null;
  devCode: string | null;
  verificationToken: string | null;
  isNewUser: boolean;
  name: string;
  memberships: Membership[];
  merchantId: string | null;
  pin: string | null;
  set: (patch: Partial<Omit<Draft, 'set' | 'clear'>>) => void;
  clear: () => void;
};

const empty = {
  role: null,
  phone: '',
  challengeId: null,
  devCode: null,
  verificationToken: null,
  isNewUser: false,
  name: '',
  memberships: [],
  merchantId: null,
  pin: null,
};

export const useDraft = create<Draft>()((set) => ({
  ...empty,
  set: (patch) => set(patch),
  clear: () => set(empty),
}));
