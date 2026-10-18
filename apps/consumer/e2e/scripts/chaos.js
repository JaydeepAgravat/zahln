// Maestro runScript: switch the simulated SEPA rail (dev only). MODE is passed by the flow.
const api = (typeof API !== 'undefined' && API) || 'http://localhost:4000';
http.post(`${api}/dev/chaos`, {
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ mode: MODE }),
});
