// ...existing code...
const fetch = require('node-fetch');
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPA_URL || !SUPA_KEY) return { statusCode: 500, body: 'Server misconfigured' };

  try {
    const body = JSON.parse(event.body || '{}');
    const { date, ciphertext } = body;
    if (!date || !ciphertext) return { statusCode: 400, body: 'missing date or ciphertext' };

    // checa se já existe registro para a data
    const qry = `${SUPA_URL}/rest/v1/entries?date=eq.${encodeURIComponent(date)}`;
    const resCheck = await fetch(qry, { headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` } });
    const rows = await resCheck.json();

    if (rows && rows.length > 0) {
      // atualizar (PATCH)
      const id = rows[0].id;
      const res = await fetch(`${SUPA_URL}/rest/v1/entries?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPA_KEY,
          'Authorization': `Bearer ${SUPA_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ ciphertext })
      });
      const updated = await res.json();
      return { statusCode: 200, body: JSON.stringify({ id: updated[0].id }) };
    } else {
      // inserir novo
      const res = await fetch(`${SUPA_URL}/rest/v1/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPA_KEY,
          'Authorization': `Bearer ${SUPA_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ date, ciphertext })
      });
      const data = await res.json();
      return { statusCode: 200, body: JSON.stringify({ id: data[0].id }) };
    }
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
};
// ...existing code...