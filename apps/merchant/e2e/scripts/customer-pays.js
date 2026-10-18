// Maestro runScript: a customer (Lena) pays the QR that's open on the till, through the API, like Zahln would.
const api = (typeof API !== 'undefined' && API) || 'http://localhost:4000';
const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
const latest = json(http.get(`${api}/dev/latest-intent`).body);
if (!latest.ref) throw new Error('no open QR on the till');
const intentId = latest.ref.split('.')[0];
const res = http.post(`${api}/intents/${intentId}/pay`, {
  headers: { 'x-user-id': 'usr_lena', 'idempotency-key': uuid(), 'content-type': 'application/json' },
  body: '{}',
});
if (res.status !== 201) throw new Error(`pay failed: ${res.status} ${res.body}`);
