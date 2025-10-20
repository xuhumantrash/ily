// ...existing code...
exports.handler = async function(event) {
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPA_URL || !SUPA_KEY) return { statusCode: 500, body: 'Server misconfigured' };

  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/entries?select=id,date,ciphertext,created_at`, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
    });
    const rows = await res.json();
    return { statusCode: 200, body: JSON.stringify(rows) };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
};
// ...existing code...
