/**
 * iOS universal links: pay.zaster.de/i/* and /@handle open Zaster when it's installed, the web checkout when not.
 * Served without a file extension as JSON. APPLE_TEAM_ID comes from the Apple Developer account at release;
 * until then the placeholder keeps the file valid but matches no app.
 */
export function GET() {
  const appID = `${process.env.APPLE_TEAM_ID ?? 'TEAMID0000'}.de.zaster.app`;
  return Response.json(
    {
      applinks: {
        details: [{ appIDs: [appID], components: [{ '/': '/i/*' }, { '/': '/@*' }] }],
      },
    },
    { headers: { 'cache-control': 'public, max-age=3600' } },
  );
}
