// BIGTUNES RADIO — Cloudflare Worker
// Deploy via: wrangler deploy
// Of via Cloudflare Dashboard > Workers > Create Worker

const ALLOWED_ORIGINS = [
  'https://bigtunes-radio.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));

    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
      'Access-Control-Max-Age': '86400',
    };

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // POST /upload — audio uploaden naar R2
    if (request.method === 'POST' && url.pathname === '/upload') {
      try {
        const userId = request.headers.get('X-User-Id');
        if (!userId) {
          return json({ error: 'Niet ingelogd' }, 401, corsHeaders);
        }

        const formData = await request.formData();
        const file = formData.get('audio');

        if (!file) {
          return json({ error: 'Geen bestand gevonden' }, 400, corsHeaders);
        }

        // Valideer bestandstype
        if (!ALLOWED_TYPES.includes(file.type)) {
          return json({ error: 'Alleen audio bestanden toegestaan (MP3, WAV, OGG)' }, 400, corsHeaders);
        }

        // Valideer bestandsgrootte
        const arrayBuffer = await file.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
          return json({ error: 'Bestand te groot — max 3 MB' }, 400, corsHeaders);
        }

        // Unieke bestandsnaam
        const ext = file.name.split('.').pop() || 'mp3';
        const filename = `${userId}/${Date.now()}.${ext}`;

        // Upload naar R2
        await env.BIGTUNES_BUCKET.put(filename, arrayBuffer, {
          httpMetadata: {
            contentType: file.type,
            cacheControl: 'public, max-age=31536000',
          },
        });

        // Publieke URL teruggeven
        const audioUrl = `https://audio.bigtunes-radio.com/${filename}`;

        return json({ success: true, audioUrl, filename }, 200, corsHeaders);

      } catch (err) {
        console.error('Upload error:', err);
        return json({ error: 'Upload mislukt: ' + err.message }, 500, corsHeaders);
      }
    }

    // DELETE /audio/:filename — audio verwijderen
    if (request.method === 'DELETE' && url.pathname.startsWith('/audio/')) {
      try {
        const userId = request.headers.get('X-User-Id');
        if (!userId) {
          return json({ error: 'Niet ingelogd' }, 401, corsHeaders);
        }

        const filename = url.pathname.replace('/audio/', '');

        // Controleer of het bestand van deze gebruiker is
        if (!filename.startsWith(userId + '/')) {
          return json({ error: 'Geen toegang tot dit bestand' }, 403, corsHeaders);
        }

        await env.BIGTUNES_BUCKET.delete(filename);
        return json({ success: true }, 200, corsHeaders);

      } catch (err) {
        return json({ error: 'Verwijderen mislukt' }, 500, corsHeaders);
      }
    }

    // GET /health — status check
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ status: 'ok', service: 'BIGTUNES Radio Worker' }, 200, corsHeaders);
    }

    return json({ error: 'Niet gevonden' }, 404, corsHeaders);
  }
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
