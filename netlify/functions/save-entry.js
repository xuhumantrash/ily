// ...existing code...
const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPA_URL, SUPA_KEY);

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const date = body.date;
    const ciphertext = body.ciphertext; // seu JSON criptografado com campo texts[...]

    // opcional: descriptografe aqui ou armazene ciphertext tal qual
    // se quiser interpretar texts para decidir delete/upsert, descriptografe e checar payload.texts

    // exemplo: upsert por date (sobrescreve a linha existente)
    const payload = { date, ciphertext, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('diary').upsert(payload, { onConflict: 'date' });

    if (error) throw error;

    // se preferir deletar quando payload.texts for vazio, faça:
    // await supabase.from('diary').delete().eq('date', date);

    return { statusCode: 200, body: JSON.stringify({ ok: true, data }) };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
};
// ...existing code...
