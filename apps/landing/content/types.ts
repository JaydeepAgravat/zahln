/**
 * Landing copy lives in apps/landing (not packages/shared/i18n): it is long-form editorial text that only this
 * page uses. `de` is the source; `en` must have exactly the same shape (enforced by the `Copy` type here and by
 * test/content.test.ts, which also checks array lengths and ids).
 */

export type ScreenName =
  | 'till'
  | 'qr'
  | 'confirm'
  | 'paid'
  | 'till-paid'
  | 'receipt'
  | 'wallet'
  | 'wallet-dark'
  | 'till-ready'
  | 'merchant-wallet'
  | 'profile'
  | 'pin'
  | 'welcome'
  | 'pin-set'
  | 'device';

/** What sits beside a feature article. Text inside media is localised; the kind and assets are not. */
export type Media =
  | { kind: 'device'; screen: ScreenName; alt: string; platform: 'ios' | 'android' }
  | { kind: 'stat'; value: string; unit: string; caption: string }
  | { kind: 'timeline'; steps: ReadonlyArray<{ time: string; text: string }> }
  | { kind: 'status' }
  | { kind: 'plans' }
  | { kind: 'code'; caption: string; code: string }
  | {
      kind: 'ledger';
      caption: string;
      rows: ReadonlyArray<{ account: string; amount: string }>;
      total: string;
    }
  | { kind: 'states'; states: ReadonlyArray<string> }
  | { kind: 'none' };

export type Feature = {
  id: string;
  label: string;
  blurb: string;
  /** "Bald" / "Soon" for things that are designed but not built yet. Empty string = shipped. */
  soon: string;
  link: { label: string; href: string } | null;
  media: Media;
};

export type Chapter = {
  id: string;
  numeral: string;
  title: string;
  /** The one-line promise (serif italic). */
  promise: string;
  /** The editorial statement; its first letter is set as the chapter's single script initial. */
  statement: string;
  features: ReadonlyArray<Feature>;
};

export type Plan = {
  id: 'free' | 'pro' | 'business';
  name: string;
  price: string;
  period: string;
  pitch: string;
  features: ReadonlyArray<string>;
};

export type Copy = {
  lang: 'de' | 'en';
  meta: { title: string; description: string };
  skip: string;
  nav: {
    home: string;
    edition: string;
    chapters: string;
    index: string;
    cta: string;
    switchLabel: string;
    switchHref: string;
    switchHrefLang: 'de' | 'en';
    switchShort: string;
    pause: string;
    play: string;
  };
  intro: { title: string; season: string; line: string; chaptersLabel: string; scroll: string };
  chapters: ReadonlyArray<Chapter>;
  plans: { heading: string; note: string; items: ReadonlyArray<Plan>; recommended: string };
  status: {
    caption: string;
    paid: string;
    checking: string;
    checkingHint: string;
    notCharged: string;
    notChargedHint: string;
    confirming: string;
    submitting: string;
    merchant: string;
    amount: string;
  };
  closing: { title: string; line: string; cta: string; appStore: string; playStore: string; soon: string };
  footer: {
    impressum: string;
    datenschutz: string;
    credits: string;
    creditsIntro: string;
    note: string;
    licence: string;
  };
  art: { label: string };
};
