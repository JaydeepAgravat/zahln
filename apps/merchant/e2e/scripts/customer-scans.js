// Maestro runScript: a customer (Lena) has scanned the QR open on the till, so it shows "Kunde prüft…".
const api = (typeof API !== 'undefined' && API) || 'http://localhost:4000';
const latest = json(http.get(`${api}/dev/latest-intent`).body);
if (!latest.ref) throw new Error('no open QR on the till');
const res = http.post(`${api}/intents/${latest.ref.split('.')[0]}/scanned`, {
  headers: { 'x-user-id': 'usr_lena', 'content-type': 'application/json' },
  body: '{}',
});
if (res.status >= 300) throw new Error(`scan failed: ${res.status} ${res.body}`);
