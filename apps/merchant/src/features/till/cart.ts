import type { CatalogueItem } from '@zahln/shared';
import { create } from 'zustand';

/**
 * The order being rung up. In memory only: a till that restarts starts a fresh order.
 * Prices here are for display; the server prices the cart again from its own catalogue.
 */
type Cart = {
  mode: 'catalogue' | 'amount';
  lines: Record<string, number>; // sku → qty
  amountCents: number;
  setMode: (mode: Cart['mode']) => void;
  add: (sku: string) => void;
  remove: (sku: string) => void;
  setAmount: (cents: number) => void;
  clear: () => void;
};

export const useCart = create<Cart>()((set) => ({
  mode: 'catalogue',
  lines: {},
  amountCents: 0,
  setMode: (mode) => set({ mode }),
  add: (sku) => set((s) => ({ lines: { ...s.lines, [sku]: Math.min(99, (s.lines[sku] ?? 0) + 1) } })),
  remove: (sku) =>
    set((s) => {
      const qty = (s.lines[sku] ?? 0) - 1;
      const { [sku]: _, ...rest } = s.lines;
      return { lines: qty > 0 ? { ...rest, [sku]: qty } : rest };
    }),
  setAmount: (amountCents) => set({ amountCents }),
  clear: () => set({ lines: {}, amountCents: 0 }),
}));

export function cartTotal(
  cart: Pick<Cart, 'mode' | 'lines' | 'amountCents'>,
  catalogue: CatalogueItem[] = [],
) {
  if (cart.mode === 'amount') return { cents: cart.amountCents, count: cart.amountCents > 0 ? 1 : 0 };
  let cents = 0;
  let count = 0;
  for (const item of catalogue) {
    const qty = cart.lines[item.sku] ?? 0;
    cents += qty * item.priceCents;
    count += qty;
  }
  return { cents, count };
}
