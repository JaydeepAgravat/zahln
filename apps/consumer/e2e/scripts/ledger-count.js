// Maestro runScript: how many ledger transactions the intent produced (must be exactly 1 after a payment).
const api = (typeof API !== 'undefined' && API) || 'http://localhost:4000';
const token = (typeof ADMIN_TOKEN !== 'undefined' && ADMIN_TOKEN) || 'dev-admin-token-change-me-please';
const res = http.get(`${api}/admin/payments/${INTENT}`, {
  headers: { 'x-admin-token': token, 'x-admin-name': 'maestro' },
});
const ids = {};
for (const row of json(res.body).ledger) ids[row.transactionId] = true;
output.ledgerTransactions = Object.keys(ids).length;
