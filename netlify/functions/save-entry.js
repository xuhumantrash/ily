
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPA_URL || !SUPA_KEY) return { statusCode: 500, body: 'Server misconfigured' };

  try {
    const body = JSON.parse(event.body || '{}');
    const { date, ciphertext } = body;
    if (!date || !ciphertext) return { statusCode: 400, body: 'missing date or ciphertext' };

    // verificar se já existe entry com a mesma date
    const checkRes = await fetch(`${SUPA_URL}/rest/v1/entries?date=eq.${encodeURIComponent(date)}&select=id`, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
    });
    const existing = await checkRes.json();

    if (existing && existing.length > 0) {
      const id = existing[0].id;
      const patchRes = await fetch(`${SUPA_URL}/rest/v1/entries?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPA_KEY,
          'Authorization': `Bearer ${SUPA_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ ciphertext })
      });
      const updated = await patchRes.json();
      return { statusCode: 200, body: JSON.stringify({ id: updated[0].id }) };
    } else {
      const postRes = await fetch(`${SUPA_URL}/rest/v1/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPA_KEY,
          'Authorization': `Bearer ${SUPA_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ date, ciphertext })
      });
      const data = await postRes.json();
      return { statusCode: 200, body: JSON.stringify({ id: data[0].id }) };
    }
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
};
