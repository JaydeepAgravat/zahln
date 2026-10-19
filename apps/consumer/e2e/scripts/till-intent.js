// Maestro runScript: Café Mila's till opens a one-time QR (6,30 €) through the dev API, like the Zettel app would.
const api = (typeof API !== 'undefined' && API) || 'http://localhost:4000';
const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
const res = http.post(`${api}/merchants/cafe-mila/intents`, {
  headers: {
    'x-user-id': 'usr_mila',
    'content-type': 'application/json',
    'idempotency-key': uuid(),
  },
  body: JSON.stringify({
    items: [
      { sku: 'cappuccino', qty: 1 },
      { sku: 'croissant', qty: 1 },
    ],
  }),
});
const intent = json(res.body);
if (!intent.ref) throw new Error(`till intent failed: ${res.status} ${res.body}`);
output.ref = intent.ref;
output.intentId = intent.id;
