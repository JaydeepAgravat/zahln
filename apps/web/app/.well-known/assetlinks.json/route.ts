/**
 * Android App Links: lets de.zahln.app verify that it may open pay.zahln.de links (intent-filter autoVerify).
 * The fingerprint is the release signing certificate's SHA-256 (Play App Signing), set at release time.
 */
export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? '').split(',').filter(Boolean);
  return Response.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'de.zahln.app',
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { 'cache-control': 'public, max-age=3600' } },
  );
}
