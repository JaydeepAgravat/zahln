import QRCode from 'qrcode';

/** QR as an SVG string, ink on white (scanners need the contrast, whatever the theme). Error correction M. */
export const qrSvg = (text: string) =>
  QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#1B1A17', light: '#FFFFFF' },
  });
