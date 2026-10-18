import type { Locale } from './i18n-messages';

/** The checkout's own small dictionary: it ships to phones without the app, so it carries nothing else. */
const de = {
  title: '{merchant} · Zahln',
  validFor: 'Gültig noch {time}',
  total: 'Gesamt',
  openApp: 'In der App öffnen',
  payInBrowser: 'Im Browser bezahlen',
  noApp: 'Keine App? Du kannst hier mit deiner Zahln-Nummer bezahlen.',
  phone: 'Deine Zahln-Handynummer',
  sendCode: 'Code senden',
  code: 'Code aus der SMS',
  devCode: 'Entwicklung: Der Code ist {code}.',
  confirmCode: 'Bestätigen',
  payAs: '{amount} bezahlen',
  payingAs: 'Als {name}',
  otherNumber: 'Andere Nummer',
  paying: 'Wird bezahlt…',
  paid: 'Bezahlt',
  paidBody: '{amount} an {merchant}. Den Beleg findest du in deiner Zahln-App und unter zahln.de/wallet.',
  checking: 'Wird geprüft',
  checkingBody: 'Dein Geld ist sicher. Wir fragen bei der Bank nach, ob die Zahlung angekommen ist.',
  checkingLong:
    'Das dauert länger als sonst. Entweder ist die Zahlung angekommen, oder es wurde nichts abgebucht. Du kannst die Seite schließen.',
  notCharged: 'Nicht belastet',
  notChargedBody: 'Die Bank hat abgelehnt. Es wurde kein Geld abgebucht.',
  insufficient: 'Guthaben reicht nicht',
  insufficientBody: 'Dein Guthaben reicht für {amount} nicht. Es wurde kein Geld abgebucht.',
  expired: 'Abgelaufen',
  expiredBody: 'Dieser Zahlungslink ist abgelaufen. Es wurde kein Geld abgebucht.',
  failed: 'Das hat nicht geklappt',
  failedBody: 'Es wurde kein Geld abgebucht. {reason}',
  alreadyPaid: 'Schon bezahlt',
  alreadyPaidBody: 'Diese Zahlung ist abgeschlossen.',
  invalid: 'Ungültiger Link',
  invalidBody: 'Diesen Zahlungslink gibt es nicht. Prüfe, ob er vollständig ist.',
  noAccount: 'Für diese Nummer gibt es noch kein Zahln-Konto. Lade die App, um eins anzulegen.',
  error: 'Das hat nicht geklappt: {message}',
  secure: 'Sicher bezahlt mit SEPA Instant · 0 € Gebühren',
};

export type CopyKey = keyof typeof de;

const en: Record<CopyKey, string> = {
  title: '{merchant} · Zahln',
  validFor: 'Valid for {time}',
  total: 'Total',
  openApp: 'Open in the app',
  payInBrowser: 'Pay in the browser',
  noApp: 'No app? Pay here with your Zahln number.',
  phone: 'Your Zahln mobile number',
  sendCode: 'Send code',
  code: 'Code from the text message',
  devCode: 'Development: the code is {code}.',
  confirmCode: 'Confirm',
  payAs: 'Pay {amount}',
  payingAs: 'As {name}',
  otherNumber: 'Different number',
  paying: 'Paying…',
  paid: 'Paid',
  paidBody: '{amount} to {merchant}. The receipt is in your Zahln app and at zahln.de/wallet.',
  checking: 'Checking',
  checkingBody: 'Your money is safe. We are asking the bank whether the payment arrived.',
  checkingLong:
    'This is taking longer than usual. Either the payment arrived or nothing was charged. You can close this page.',
  notCharged: 'Not charged',
  notChargedBody: 'The bank declined. Nothing was charged.',
  insufficient: 'Balance too low',
  insufficientBody: 'Your balance does not cover {amount}. Nothing was charged.',
  expired: 'Expired',
  expiredBody: 'This payment link has expired. Nothing was charged.',
  failed: "That didn't work",
  failedBody: 'Nothing was charged. {reason}',
  alreadyPaid: 'Already paid',
  alreadyPaidBody: 'This payment is complete.',
  invalid: 'Invalid link',
  invalidBody: "This payment link doesn't exist. Check that it's complete.",
  noAccount: 'There is no Zahln account for this number yet. Get the app to create one.',
  error: "That didn't work: {message}",
  secure: 'Paid securely with SEPA Instant · €0 fees',
};

export const checkoutCopy = (locale: Locale) => {
  const dict = locale === 'en' ? en : de;
  return (key: CopyKey, vars?: Record<string, string | number>) =>
    dict[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? ''));
};
