import type { Copy } from './types';

export const en = {
  lang: 'en',
  meta: {
    title: 'The Zaster Edition · Autumn ’26',
    description:
      'Paying, finally finished. Zaster and Zettel in ten chapters: account to account by QR code, 0 % fees, SEPA Instant, built in Augsburg.',
  },
  skip: 'Skip to content',
  nav: {
    home: 'Zaster, home',
    edition: 'Edition Autumn ’26',
    chapters: 'Chapters',
    index: 'Chapter index',
    cta: 'Start for free',
    switchLabel: 'Auf Deutsch lesen',
    switchHref: '/',
    switchHrefLang: 'de',
    switchShort: 'DE',
    pause: 'Pause motion',
    play: 'Play motion',
  },
  intro: {
    title: 'The Zaster Edition',
    season: 'Autumn ’26',
    line: 'Paying, finally finished. 10 chapters.',
    chaptersLabel: 'Chapters',
    scroll: 'Read on',
  },
  chapters: [
    {
      id: 'bezahlen',
      numeral: 'I',
      title: 'Pay',
      promise: 'Scan, look, done.',
      statement:
        'No card terminal, no PIN pad, no contactless limit. You scan the code at the counter, see who you are paying and how much, and confirm with Face ID. The money goes straight from account to account.',
      features: [
        {
          id: 'ein-code-pro-zahlung',
          label: 'One code per payment',
          blurb:
            'Every QR code is good for exactly one payment and five minutes. Anyone who photographs it ends up with a photo, nothing more.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'qr',
            alt: 'The Zettel till shows a QR code for €10.80 and “Customer is checking…”.',
            platform: 'android',
          },
        },
        {
          id: 'du-siehst-wen-du-bezahlst',
          label: 'You see who you are paying',
          blurb:
            'The merchant and the amount come from our server, not from the code. A sticker over the QR cannot redirect your payment.',
          soon: '',
          link: { label: 'Security', href: '#sicherheit' },
          media: {
            kind: 'device',
            screen: 'confirm',
            alt: 'Zaster shows Café Mila, three items and “Pay with PIN · €10.80”.',
            platform: 'ios',
          },
        },
        {
          id: 'bestaetigt-in-254-ms',
          label: 'Confirmed in 254 ms',
          blurb:
            'Measured from approval to “Paid” on screen. We measure it on every payment instead of promising it.',
          soon: '',
          link: null,
          media: { kind: 'stat', value: '254', unit: 'ms', caption: 'Approval to “Paid”, iOS simulator' },
        },
      ],
    },
    {
      id: 'kasse',
      numeral: 'II',
      title: 'Till',
      promise: 'Your counter, minus the card reader.',
      statement:
        'The Zettel till runs on the phone that is already lying next to the coffee machine. Tap the items, show the code, see “Paid”. A café needs no more hardware than that.',
      features: [
        {
          id: 'katalog-oder-betrag',
          label: 'Catalogue or amount',
          blurb:
            'Tap a cappuccino and a croissant, or type the amount. Entry starts from the cents, so the decimal point is always in the right place.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'till',
            alt: 'The till catalogue with a cappuccino and a croissant in the cart, and “Charge €6.30” below.',
            platform: 'android',
          },
        },
        {
          id: 'kasse-bereit',
          label: 'Five minutes, then a new code',
          blurb:
            'The code counts down where everyone can see it and renews itself. Your customers see the cart before they scan.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'till-ready',
            alt: 'The till at rest: “Till ready” and the day’s takings.',
            platform: 'ios',
          },
        },
        {
          id: 'gruen-heisst-geld-ist-da',
          label: 'Green means the money is there',
          blurb:
            '“Paid” appears on both phones in the same second. We only ever show green when money has actually moved.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'till-paid',
            alt: 'The till turns fully green: “Paid, €10.80, receipt no. 4”.',
            platform: 'android',
          },
        },
      ],
    },
    {
      id: 'wallet',
      numeral: 'III',
      title: 'Wallet',
      promise: 'The money is yours the moment it lands.',
      statement:
        'No holding account where your money sits out the weekend. Your balance is live, every booking has a receipt, and your history is right to the cent.',
      features: [
        {
          id: 'guthaben-live',
          label: 'Balance, live',
          blurb:
            'The balance changes while you watch. One tap hides it when someone in the queue is reading over your shoulder.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'wallet',
            alt: 'The Zaster wallet with a €35.40 balance and recent payments at the university canteen.',
            platform: 'ios',
          },
        },
        {
          id: 'verlauf',
          label: 'A history without riddles',
          blurb:
            'Canteen, café, top-up: every line says where, when and how much. Spending is never shown in red, because paying is not an error.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'wallet-dark',
            alt: 'The same wallet in the dark theme.',
            platform: 'ios',
          },
        },
        {
          id: 'beleg',
          label: 'A receipt for every payment',
          blurb: 'With line items, VAT and a payment ID. Electronic, unalterable, in the app.',
          soon: '',
          link: { label: 'Records', href: '#ordnung' },
          media: {
            kind: 'device',
            screen: 'receipt',
            alt: 'A receipt from Café Mila: cappuccino, croissant, total €6.30 including €0.41 VAT.',
            platform: 'ios',
          },
        },
      ],
    },
    {
      id: 'auszahlung',
      numeral: 'IV',
      title: 'Payout',
      promise: 'SEPA Instant, every night at 23:00.',
      statement:
        'What you take today is in your business account tomorrow morning. Not in three to five working days, and not minus a fee.',
      features: [
        {
          id: 'ein-tag',
          label: 'A day in four lines',
          blurb: 'From the first cappuccino to the credit in your account, without you lifting a finger.',
          soon: '',
          link: null,
          media: {
            kind: 'timeline',
            steps: [
              { time: '07:12', text: 'First payment of the day' },
              { time: '18:30', text: 'Till closes, the day’s takings are final' },
              { time: '23:00', text: 'Payout via SEPA Instant' },
              { time: '23:00:08', text: 'Credited to your business account' },
            ],
          },
        },
        {
          id: 'jetzt-sofort',
          label: 'Or right now',
          blurb:
            'Need the money before closing time? You can pay out any time with one tap. The nightly automatic payout comes with the Business plan.',
          soon: '',
          link: { label: 'Plans', href: '#plaene' },
          media: {
            kind: 'device',
            screen: 'merchant-wallet',
            alt: 'The merchant wallet: €7.30 balance, daily payout at 23:00 via SEPA Instant.',
            platform: 'ios',
          },
        },
      ],
    },
    {
      id: 'funkloch',
      numeral: 'V',
      title: 'Dead zone',
      promise: 'The connection drops. The payment doesn’t.',
      statement:
        'In the canteen basement, on the regional train, between two masts: the signal always goes exactly when you pay. Zaster knows at every moment whether money has moved, and tells you honestly.',
      features: [
        {
          id: 'wird-geprueft',
          label: '“Checking with your bank”',
          blurb:
            'When the answer doesn’t come, the app doesn’t guess. It asks until it knows, usually for about three seconds. The widget alongside runs on the same state machine as the app.',
          soon: '',
          link: null,
          media: { kind: 'status' },
        },
        {
          id: 'nie-doppelt',
          label: 'Never charged twice',
          blurb:
            'Every payment attempt carries a key that the app saves before it sends anything. If the same request arrives twice, the server books it once.',
          soon: '',
          link: { label: 'Developers', href: '#entwickler' },
          media: { kind: 'none' },
        },
        {
          id: 'nicht-belastet',
          label: '“Not charged” instead of “Error”',
          blurb:
            'If a payment fails, the screen says what happened to your money: nothing. Then a button to try again.',
          soon: '',
          link: null,
          media: { kind: 'none' },
        },
      ],
    },
    {
      id: 'plaene',
      numeral: 'VI',
      title: 'Plans',
      promise: '0 % fees. Forever.',
      statement:
        'No transaction fee, on any plan, at any amount. Plans unlock features, never access to your own takings.',
      features: [
        {
          id: 'drei-plaene',
          label: 'Three plans, one fee: none',
          blurb:
            'Start free with one fixed QR code on the counter. When the team grows, the plan grows with it, and you can cancel monthly.',
          soon: '',
          link: null,
          media: { kind: 'plans' },
        },
      ],
    },
    {
      id: 'ordnung',
      numeral: 'VII',
      title: 'Records',
      promise: 'Your tax adviser will like you.',
      statement:
        'Receipts kept to GoBD principles, stored unalterably, with VAT on every line. At the end of the month you export instead of sorting slips of paper.',
      features: [
        {
          id: 'gobd',
          label: 'Receipts to GoBD',
          blurb:
            'Every receipt gets a sequential number and is never changed once stored. Refunds are new bookings, not corrections.',
          soon: '',
          link: null,
          media: { kind: 'none' },
        },
        {
          id: 'export',
          label: 'CSV today, DATEV soon',
          blurb: 'CSV export comes with the Business plan. A DATEV export for your accountant is next.',
          soon: 'DATEV soon',
          link: null,
          media: { kind: 'none' },
        },
        {
          id: 'tse',
          label: 'Cash and digital in one cash book',
          blurb:
            'If you also take cash, German law requires a TSE. Zettel connects a cloud TSE so both end up in one place.',
          soon: 'Soon',
          link: null,
          media: { kind: 'none' },
        },
      ],
    },
    {
      id: 'campus',
      numeral: 'VIII',
      title: 'Campus',
      promise: 'Built for the canteen queue.',
      statement:
        'Noon, three hundred people, a tray in every hand. Paying here has to be quicker than finding your canteen card.',
      features: [
        {
          id: 'unter-drei-sekunden',
          label: 'Under three seconds a person',
          blurb:
            'That is our target at the till: scan, confirm, move on. The paid animation lasts less than a second and a half, because people are waiting behind you.',
          soon: '',
          link: null,
          media: { kind: 'stat', value: '< 3', unit: 's', caption: 'Target per person at the canteen till' },
        },
        {
          id: 'auf-einen-meter',
          label: 'Readable from a metre away',
          blurb:
            'The cashier recognises “Paid” at a glance without leaning over. With a short sound and a buzz as backup.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'paid',
            alt: 'Zaster fully green: “Paid, €10.80 to Café Mila, confirmed in 254 ms”.',
            platform: 'ios',
          },
        },
        {
          id: 'ein-konto',
          label: 'One account for the whole campus',
          blurb:
            'Canteen, cafeteria, copy shop. Topped up by SEPA Instant instead of at the machine that only takes tens.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'welcome',
            alt: 'The welcome screen: “Pay. Without fees.” with “I’m paying” and “I’m charging”.',
            platform: 'ios',
          },
        },
      ],
    },
    {
      id: 'sicherheit',
      numeral: 'IX',
      title: 'Security',
      promise: 'Your keys never leave your phone.',
      statement:
        'What identifies you lives in your device’s keychain. Not on our server, not in an email, not on a note under the till.',
      features: [
        {
          id: 'schluesselbund',
          label: 'A keychain, not a password',
          blurb:
            'Face ID, your fingerprint or your PIN unlock a key that never leaves the device. After too many attempts it locks instead of letting anyone guess.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'pin',
            alt: 'The lock screen: “Hello, Lena. Enter your PIN.”',
            platform: 'ios',
          },
        },
        {
          id: 'geraet',
          label: 'Bound to your device',
          blurb:
            'A new phone signs in again with an SMS code and your PIN. The old one loses access in the same second.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'device',
            alt: '“Setting up this device…” during sign-in.',
            platform: 'android',
          },
        },
        {
          id: 'daten-in-deutschland',
          label: 'Data in Germany',
          blurb:
            'Accounts, bookings and receipts are stored in data centres in Germany. The money moves over SEPA.',
          soon: '',
          link: null,
          media: { kind: 'none' },
        },
      ],
    },
    {
      id: 'entwickler',
      numeral: 'X',
      title: 'Developers',
      promise: 'One API. Double-entry underneath.',
      statement:
        'Every payment is a booking with two sides that sum to zero. If the sum is off, nothing is booked. That simple, that strict.',
      features: [
        {
          id: 'eine-anfrage',
          label: 'One payment, one request',
          blurb:
            'Cart in, code out. With an idempotency key, so a retry after a timeout never creates a second payment.',
          soon: '',
          link: null,
          media: {
            kind: 'code',
            caption: 'Create a one-time payment',
            code: 'POST /merchants/cafe-mila/intents\nIdempotency-Key: 3f6c0b2e-8d1a-4c57-9f0e-61b2a7d4c9e0\n\n{ "items": [ { "sku": "cappuccino", "qty": 1 },\n             { "sku": "croissant",  "qty": 1 } ] }\n\n201 Created\n{ "status": "awaiting_scan", "amountCents": 630,\n  "currency": "EUR", "expiresAt": "2026-10-18T18:46:43Z" }',
          },
        },
        {
          id: 'hauptbuch',
          label: 'The ledger',
          blurb:
            'Every cent has a source and a destination. Balances are computed from bookings, never overwritten.',
          soon: '',
          link: null,
          media: {
            kind: 'ledger',
            caption: 'Lena pays €6.30 at Café Mila',
            rows: [
              { account: 'Wallet Lena', amount: '−€6.30' },
              { account: 'Merchant Café Mila', amount: '+€6.30' },
            ],
            total: '€0.00',
          },
        },
        {
          id: 'zustaende',
          label: 'States you can rely on',
          blurb:
            'A payment is always in exactly one state. Live over server-sent events, authoritative over REST.',
          soon: '',
          link: null,
          media: { kind: 'states', states: ['awaiting_scan', 'scanned', 'paid', 'expired', 'refunded'] },
        },
      ],
    },
  ],
  plans: {
    heading: 'Plans for Zettel',
    note: 'Per month, excl. VAT. 0 % transaction fees on every plan.',
    recommended: 'Popular',
    items: [
      {
        id: 'free',
        name: 'Free',
        price: '€0',
        period: 'forever',
        pitch: 'One fixed QR code on the counter.',
        features: ['Static QR code', '1 person on the till', 'Pay out any time'],
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '€29',
        period: 'per month',
        pitch: 'For the café with a team.',
        features: [
          'One code per payment',
          'Up to 5 people with roles',
          'Refunds and tips',
          'Live dashboard, shift reports',
        ],
      },
      {
        id: 'business',
        name: 'Business',
        price: '€59',
        period: 'per month',
        pitch: 'For canteens, bakeries with branches, shops.',
        features: ['Everything in Pro', 'Item catalogue', 'CSV export', 'Automatic payout at 23:00'],
      },
    ],
  },
  status: {
    caption: 'Live demo: the real state machine from the app',
    paid: 'Paid',
    checking: 'Checking with your bank',
    checkingHint: 'Usually takes 3 seconds',
    notCharged: 'Not charged',
    notChargedHint: 'No money was taken',
    confirming: 'Confirm',
    submitting: 'Sending',
    merchant: 'Café Mila',
    amount: '€6.30',
  },
  closing: {
    title: 'Paying, finally finished.',
    line: 'Five hundred years of counting coins. Then one QR code.',
    cta: 'Start for free',
    appStore: 'App Store',
    playStore: 'Google Play',
    soon: 'soon',
  },
  footer: {
    impressum: 'Impressum (legal notice)',
    datenschutz: 'Datenschutz (privacy)',
    credits: 'Picture credits',
    creditsIntro:
      'Every painting comes from a museum’s open-access collection and is in the public domain (CC0 or Public Domain Mark). We changed colour and crop.',
    note: 'An interview prototype. Zaster and Zettel, built in Augsburg.',
    licence: 'Typefaces: Inter, Inter Tight, Instrument Serif, Pinyon Script (SIL OFL 1.1).',
  },
  art: { label: 'Painting' },
} as const satisfies Copy;
