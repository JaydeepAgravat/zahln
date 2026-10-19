// Maestro runScript: set the consumer app's minSupportedVersion through the ops API (forced-update screen).
const api = (typeof API !== 'undefined' && API) || 'http://localhost:4000';
const headers = {
  'x-admin-token': (typeof ADMIN_TOKEN !== 'undefined' && ADMIN_TOKEN) || 'dev-admin-token-change-me-please',
  'x-admin-name': 'maestro',
  'content-type': 'application/json',
};
const config = json(http.get(`${api}/admin/config`, { headers }).body).data;
config.apps.consumer.minSupportedVersion = VERSION;
const res = http.put(`${api}/admin/config`, {
  headers,
  body: JSON.stringify({ data: config, reason: 'README screenshots' }),
});
if (res.status !== 200) throw new Error(`config update failed: ${res.status} ${res.body}`);
