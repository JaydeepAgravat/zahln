import type { Copy } from './types';

export const de = {
  lang: 'de',
  meta: {
    title: 'Die Zaster Edition · Herbst ’26',
    description:
      'Bezahlen, endlich fertig. Zaster und Zettel in zehn Kapiteln: per QR-Code von Konto zu Konto, 0 % Gebühren, SEPA Instant, gebaut in Augsburg.',
  },
  skip: 'Zum Inhalt springen',
  nav: {
    home: 'Zaster, zur Startseite',
    edition: 'Edition Herbst ’26',
    chapters: 'Kapitel',
    index: 'Kapitelübersicht',
    cta: 'Kostenlos starten',
    switchLabel: 'Read in English',
    switchHref: '/en/',
    switchHrefLang: 'en',
    switchShort: 'EN',
    pause: 'Bewegung pausieren',
    play: 'Bewegung abspielen',
  },
  intro: {
    title: 'Die Zaster Edition',
    season: 'Herbst ’26',
    line: 'Bezahlen, endlich fertig. 10 Kapitel.',
    chaptersLabel: 'Kapitel',
    scroll: 'Weiterlesen',
  },
  chapters: [
    {
      id: 'bezahlen',
      numeral: 'I',
      title: 'Bezahlen',
      promise: 'Scannen, ansehen, fertig.',
      statement:
        'Kein Kartenterminal, kein PIN-Pad, keine Kontaktlos-Grenze. Du scannst den Code an der Kasse, siehst, wen du bezahlst und wie viel, bestätigst mit Face ID. Das Geld geht direkt von Konto zu Konto.',
      features: [
        {
          id: 'ein-code-pro-zahlung',
          label: 'Ein Code pro Zahlung',
          blurb:
            'Jeder QR-Code gilt für genau eine Zahlung und fünf Minuten. Wer ihn abfotografiert, hat danach ein Foto, sonst nichts.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'qr',
            alt: 'Die Zettel-Kasse zeigt einen QR-Code über 10,80 € und „Kunde prüft…“.',
            platform: 'android',
          },
        },
        {
          id: 'du-siehst-wen-du-bezahlst',
          label: 'Du siehst, wen du bezahlst',
          blurb:
            'Händler und Betrag kommen vom Server, nicht aus dem Code. Ein Aufkleber über dem QR kann deine Zahlung nicht umleiten.',
          soon: '',
          link: { label: 'Sicherheit', href: '#sicherheit' },
          media: {
            kind: 'device',
            screen: 'confirm',
            alt: 'Zaster zeigt Café Mila, drei Positionen und „Mit PIN bezahlen · 10,80 €“.',
            platform: 'ios',
          },
        },
        {
          id: 'bestaetigt-in-254-ms',
          label: 'Bestätigt in 254 ms',
          blurb:
            'Gemessen von der Freigabe bis „Bezahlt“ auf dem Bildschirm. Wir messen das bei jeder Zahlung, statt es zu versprechen.',
          soon: '',
          link: null,
          media: { kind: 'stat', value: '254', unit: 'ms', caption: 'Freigabe bis „Bezahlt“, iOS-Simulator' },
        },
      ],
    },
    {
      id: 'kasse',
      numeral: 'II',
      title: 'Kasse',
      promise: 'Deine Theke, ohne Kartenleser.',
      statement:
        'Die Zettel-Kasse läuft auf dem Handy, das schon neben der Kaffeemaschine liegt. Artikel antippen, Code zeigen, „Bezahlt“ sehen. Mehr Hardware braucht ein Café nicht.',
      features: [
        {
          id: 'katalog-oder-betrag',
          label: 'Katalog oder Betrag',
          blurb:
            'Cappuccino und Croissant antippen oder den Betrag direkt eingeben. Die Eingabe beginnt bei den Cent, das Komma sitzt also immer richtig.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'till',
            alt: 'Der Katalog der Kasse mit Cappuccino und Croissant im Warenkorb, darunter „6,30 € kassieren“.',
            platform: 'android',
          },
        },
        {
          id: 'kasse-bereit',
          label: 'Fünf Minuten, dann ein neuer Code',
          blurb:
            'Der Code zählt sichtbar herunter und erneuert sich von selbst. Deine Kundschaft sieht den Warenkorb, bevor sie scannt.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'till-ready',
            alt: 'Die Kasse im Ruhezustand: „Kasse bereit“ und die Einnahmen des Tages.',
            platform: 'ios',
          },
        },
        {
          id: 'gruen-heisst-geld-ist-da',
          label: 'Grün heißt: Das Geld ist da',
          blurb:
            'Auf beiden Handys erscheint „Bezahlt“ in derselben Sekunde. Grün zeigen wir nur, wenn wirklich Geld geflossen ist, sonst nie.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'till-paid',
            alt: 'Die Kasse ist vollflächig grün: „Bezahlt, 10,80 €, Beleg Nr. 4“.',
            platform: 'android',
          },
        },
      ],
    },
    {
      id: 'wallet',
      numeral: 'III',
      title: 'Wallet',
      promise: 'Das Geld gehört dir, sobald es ankommt.',
      statement:
        'Kein Zwischenkonto, auf dem dein Geld übers Wochenende parkt. Dein Guthaben ist live, jede Buchung hat einen Beleg, und der Verlauf stimmt auf den Cent.',
      features: [
        {
          id: 'guthaben-live',
          label: 'Guthaben, live',
          blurb:
            'Der Kontostand ändert sich, während du hinsiehst. Ein Tipp verdeckt ihn, wenn in der Schlange jemand mitliest.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'wallet',
            alt: 'Die Zaster-Wallet mit 35,40 € Guthaben und den letzten Zahlungen in der Mensa.',
            platform: 'ios',
          },
        },
        {
          id: 'verlauf',
          label: 'Ein Verlauf ohne Rätsel',
          blurb:
            'Mensa, Café, Aufladung: Jede Zeile sagt, wo, wann und wie viel. Ausgaben stehen nie in Rot, denn Bezahlen ist kein Fehler.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'wallet-dark',
            alt: 'Dieselbe Wallet im dunklen Design.',
            platform: 'ios',
          },
        },
        {
          id: 'beleg',
          label: 'Ein Beleg für jede Zahlung',
          blurb: 'Mit Positionen, Mehrwertsteuer und Zahlungs-ID. Elektronisch, unveränderbar, in der App.',
          soon: '',
          link: { label: 'Ordnung', href: '#ordnung' },
          media: {
            kind: 'device',
            screen: 'receipt',
            alt: 'Ein Beleg von Café Mila: Cappuccino, Croissant, gesamt 6,30 €, davon 0,41 € MwSt.',
            platform: 'ios',
          },
        },
      ],
    },
    {
      id: 'auszahlung',
      numeral: 'IV',
      title: 'Auszahlung',
      promise: 'SEPA Instant, jede Nacht um 23:00.',
      statement:
        'Was du heute einnimmst, liegt morgen früh auf deinem Geschäftskonto. Nicht in drei bis fünf Werktagen, und nicht abzüglich einer Gebühr.',
      features: [
        {
          id: 'ein-tag',
          label: 'Ein Tag in vier Zeilen',
          blurb: 'Vom ersten Cappuccino bis zur Gutschrift auf deinem Konto, ohne dass du etwas tun musst.',
          soon: '',
          link: null,
          media: {
            kind: 'timeline',
            steps: [
              { time: '07:12', text: 'Erste Zahlung des Tages' },
              { time: '18:30', text: 'Kasse zu, Tagesumsatz steht fest' },
              { time: '23:00', text: 'Auszahlung per SEPA Instant' },
              { time: '23:00:08', text: 'Gutschrift auf deinem Geschäftskonto' },
            ],
          },
        },
        {
          id: 'jetzt-sofort',
          label: 'Oder jetzt sofort',
          blurb:
            'Du brauchst das Geld vor Feierabend? Auszahlen geht jederzeit, mit einem Tipp. Die nächtliche Automatik gibt es im Business-Plan.',
          soon: '',
          link: { label: 'Pläne', href: '#plaene' },
          media: {
            kind: 'device',
            screen: 'merchant-wallet',
            alt: 'Die Händler-Wallet: 7,30 € Guthaben, Auszahlung täglich 23:00 per SEPA Instant.',
            platform: 'ios',
          },
        },
      ],
    },
    {
      id: 'funkloch',
      numeral: 'V',
      title: 'Funkloch',
      promise: 'Die Verbindung bricht ab. Die Zahlung nicht.',
      statement:
        'Im Keller der Mensa, im Regionalzug, zwischen zwei Funkmasten: Netz fehlt immer genau dann, wenn du bezahlst. Zaster weiß in jedem Moment, ob Geld geflossen ist, und sagt es dir ehrlich.',
      features: [
        {
          id: 'wird-geprueft',
          label: '„Wird mit deiner Bank geprüft“',
          blurb:
            'Bleibt die Antwort aus, rät die App nicht. Sie fragt nach, bis sie es weiß, meistens drei Sekunden lang. Das Widget daneben läuft auf demselben Zustandsautomaten wie die App.',
          soon: '',
          link: null,
          media: { kind: 'status' },
        },
        {
          id: 'nie-doppelt',
          label: 'Nie doppelt abgebucht',
          blurb:
            'Jeder Bezahlversuch trägt einen Schlüssel, den die App speichert, bevor sie sendet. Kommt dieselbe Anfrage zweimal an, bucht der Server sie einmal.',
          soon: '',
          link: { label: 'Für Entwickler', href: '#entwickler' },
          media: { kind: 'none' },
        },
        {
          id: 'nicht-belastet',
          label: '„Nicht belastet“ statt „Fehler“',
          blurb:
            'Scheitert eine Zahlung, steht da, was mit deinem Geld passiert ist: nichts. Dann ein Knopf, um es noch einmal zu versuchen.',
          soon: '',
          link: null,
          media: { kind: 'none' },
        },
      ],
    },
    {
      id: 'plaene',
      numeral: 'VI',
      title: 'Pläne',
      promise: '0 % Gebühren. Für immer.',
      statement:
        'Keine Transaktionsgebühr, auf keinem Plan, bei keinem Betrag. Pläne schalten Funktionen frei, nicht den Zugang zu deinem eigenen Umsatz.',
      features: [
        {
          id: 'drei-plaene',
          label: 'Drei Pläne, eine Gebühr: keine',
          blurb:
            'Fang kostenlos mit einem festen QR-Code an der Theke an. Wenn das Team wächst, wächst der Plan mit, monatlich kündbar.',
          soon: '',
          link: null,
          media: { kind: 'plans' },
        },
      ],
    },
    {
      id: 'ordnung',
      numeral: 'VII',
      title: 'Ordnung',
      promise: 'Deine Steuerberaterin wird dich mögen.',
      statement:
        'Belege nach den Grundsätzen der GoBD, unveränderbar gespeichert, mit Mehrwertsteuer pro Position. Am Monatsende exportierst du, statt Zettel zu sortieren.',
      features: [
        {
          id: 'gobd',
          label: 'Belege nach GoBD',
          blurb:
            'Jeder Beleg bekommt eine fortlaufende Nummer und wird nach dem Speichern nie wieder verändert. Erstattungen sind neue Buchungen, keine Korrekturen.',
          soon: '',
          link: null,
          media: { kind: 'none' },
        },
        {
          id: 'export',
          label: 'CSV heute, DATEV bald',
          blurb:
            'Der CSV-Export ist im Business-Plan dabei. Der DATEV-Export für deine Kanzlei kommt als Nächstes.',
          soon: 'DATEV bald',
          link: null,
          media: { kind: 'none' },
        },
        {
          id: 'tse',
          label: 'Bar und digital in einem Kassenbuch',
          blurb:
            'Wer auch bar kassiert, braucht eine TSE. Zettel bindet eine Cloud-TSE an, damit beides an einem Ort landet.',
          soon: 'Bald',
          link: null,
          media: { kind: 'none' },
        },
      ],
    },
    {
      id: 'campus',
      numeral: 'VIII',
      title: 'Campus',
      promise: 'Gebaut für die Mensaschlange.',
      statement:
        'Zwölf Uhr, dreihundert Leute, ein Tablett in jeder Hand. Bezahlen muss hier schneller gehen als die Suche nach der Mensakarte.',
      features: [
        {
          id: 'unter-drei-sekunden',
          label: 'Unter drei Sekunden pro Person',
          blurb:
            'Das ist unser Ziel an der Kasse: scannen, bestätigen, weiter. Die Bezahlt-Animation dauert keine anderthalb Sekunden, denn hinter dir warten Leute.',
          soon: '',
          link: null,
          media: { kind: 'stat', value: '< 3', unit: 's', caption: 'Ziel pro Person an der Mensakasse' },
        },
        {
          id: 'auf-einen-meter',
          label: 'Lesbar auf einen Meter',
          blurb:
            'Die Kassiererin erkennt „Bezahlt“ mit einem Blick, ohne sich vorzubeugen. Dazu ein kurzer Ton und ein Vibrieren.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'paid',
            alt: 'Zaster zeigt vollflächig grün: „Bezahlt, 10,80 € an Café Mila, bestätigt in 254 ms“.',
            platform: 'ios',
          },
        },
        {
          id: 'ein-konto',
          label: 'Ein Konto für den ganzen Campus',
          blurb:
            'Mensa, Cafeteria, Copyshop. Aufgeladen per SEPA Instant statt am Automaten, der nur Zehner nimmt.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'welcome',
            alt: 'Der Willkommensbildschirm: „Bezahlen. Ohne Gebühren.“ mit „Ich bezahle“ und „Ich kassiere“.',
            platform: 'ios',
          },
        },
      ],
    },
    {
      id: 'sicherheit',
      numeral: 'IX',
      title: 'Sicherheit',
      promise: 'Deine Schlüssel verlassen dein Handy nie.',
      statement:
        'Was dich ausweist, liegt im Schlüsselbund deines Geräts. Nicht auf unserem Server, nicht in einer E-Mail, nicht auf einem Zettel unter der Kasse.',
      features: [
        {
          id: 'schluesselbund',
          label: 'Schlüsselbund statt Passwort',
          blurb:
            'Face ID, Fingerabdruck oder deine PIN geben einen Schlüssel frei, der das Gerät nie verlässt. Nach zu vielen Versuchen wird gesperrt, nicht geraten.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'pin',
            alt: 'Der Sperrbildschirm: „Hallo, Lena. Gib deine PIN ein.“',
            platform: 'ios',
          },
        },
        {
          id: 'geraet',
          label: 'An dein Gerät gebunden',
          blurb:
            'Ein neues Handy meldet sich mit SMS-Code und PIN neu an. Das alte verliert in derselben Sekunde den Zugriff.',
          soon: '',
          link: null,
          media: {
            kind: 'device',
            screen: 'device',
            alt: '„Gerät wird eingerichtet…“ während der Anmeldung.',
            platform: 'android',
          },
        },
        {
          id: 'daten-in-deutschland',
          label: 'Daten in Deutschland',
          blurb:
            'Konten, Buchungen und Belege liegen in Rechenzentren in Deutschland. Das Geld bewegt sich über SEPA.',
          soon: '',
          link: null,
          media: { kind: 'none' },
        },
      ],
    },
    {
      id: 'entwickler',
      numeral: 'X',
      title: 'Für Entwickler',
      promise: 'Eine API. Darunter doppelte Buchführung.',
      statement:
        'Jede Zahlung ist eine Buchung mit zwei Seiten, die sich zu null summieren. Stimmt die Summe nicht, wird nicht gebucht. So einfach, so streng.',
      features: [
        {
          id: 'eine-anfrage',
          label: 'Eine Zahlung, eine Anfrage',
          blurb:
            'Warenkorb rein, Code raus. Mit Idempotency-Key, damit ein Retry nach einem Timeout nie eine zweite Zahlung anlegt.',
          soon: '',
          link: null,
          media: {
            kind: 'code',
            caption: 'Eine einmalige Zahlung anlegen',
            code: 'POST /merchants/cafe-mila/intents\nIdempotency-Key: 3f6c0b2e-8d1a-4c57-9f0e-61b2a7d4c9e0\n\n{ "items": [ { "sku": "cappuccino", "qty": 1 },\n             { "sku": "croissant",  "qty": 1 } ] }\n\n201 Created\n{ "status": "awaiting_scan", "amountCents": 630,\n  "currency": "EUR", "expiresAt": "2026-10-18T18:46:43Z" }',
          },
        },
        {
          id: 'hauptbuch',
          label: 'Das Hauptbuch',
          blurb:
            'Jeder Cent hat eine Herkunft und ein Ziel. Salden werden aus Buchungen berechnet, nie überschrieben.',
          soon: '',
          link: null,
          media: {
            kind: 'ledger',
            caption: 'Lena zahlt 6,30 € bei Café Mila',
            rows: [
              { account: 'Wallet Lena', amount: '−6,30 €' },
              { account: 'Händler Café Mila', amount: '+6,30 €' },
            ],
            total: '0,00 €',
          },
        },
        {
          id: 'zustaende',
          label: 'Zustände, auf die du dich verlassen kannst',
          blurb:
            'Eine Zahlung ist immer in genau einem Zustand. Live per Server-Sent Events, verbindlich per REST.',
          soon: '',
          link: null,
          media: { kind: 'states', states: ['awaiting_scan', 'scanned', 'paid', 'expired', 'refunded'] },
        },
      ],
    },
  ],
  plans: {
    heading: 'Pläne für Zettel',
    note: 'Pro Monat, zzgl. MwSt. 0 % Transaktionsgebühren auf jedem Plan.',
    recommended: 'Beliebt',
    items: [
      {
        id: 'free',
        name: 'Free',
        price: '0 €',
        period: 'für immer',
        pitch: 'Ein fester QR-Code an der Theke.',
        features: ['Statischer QR-Code', '1 Person an der Kasse', 'Auszahlung jederzeit'],
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '29 €',
        period: 'pro Monat',
        pitch: 'Für das Café mit Team.',
        features: [
          'Ein Code pro Zahlung',
          'Bis zu 5 Personen mit Rollen',
          'Erstattungen und Trinkgeld',
          'Live-Dashboard, Schichtberichte',
        ],
      },
      {
        id: 'business',
        name: 'Business',
        price: '59 €',
        period: 'pro Monat',
        pitch: 'Für Mensa, Bäckerei mit Filialen, Laden.',
        features: ['Alles aus Pro', 'Artikelkatalog', 'CSV-Export', 'Automatische Auszahlung um 23:00'],
      },
    ],
  },
  status: {
    caption: 'Live-Demo: der echte Zustandsautomat aus der App',
    paid: 'Bezahlt',
    checking: 'Wird mit deiner Bank geprüft',
    checkingHint: 'Dauert meist 3 Sekunden',
    notCharged: 'Nicht belastet',
    notChargedHint: 'Kein Geld abgebucht',
    confirming: 'Bestätigen',
    submitting: 'Wird gesendet',
    merchant: 'Café Mila',
    amount: '6,30 €',
  },
  closing: {
    title: 'Bezahlen, endlich fertig.',
    line: 'Fünfhundert Jahre Münzen zählen. Dann ein QR-Code.',
    cta: 'Kostenlos starten',
    appStore: 'App Store',
    playStore: 'Google Play',
    soon: 'bald',
  },
  footer: {
    impressum: 'Impressum',
    datenschutz: 'Datenschutz',
    credits: 'Bildnachweis',
    creditsIntro:
      'Alle Gemälde stammen aus den Open-Access-Sammlungen der Museen und sind gemeinfrei (CC0 bzw. Public Domain Mark). Farbe und Ausschnitt wurden von uns bearbeitet.',
    note: 'Ein Interview-Prototyp. Zaster und Zettel, gebaut in Augsburg.',
    licence: 'Schriften: Inter, Inter Tight, Instrument Serif, Pinyon Script (SIL OFL 1.1).',
  },
  art: { label: 'Gemälde' },
} as const satisfies Copy;
