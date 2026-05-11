/**
 * r2-media-worker — Cloudflare Worker that serves files from R2 publicly
 * and accepts authenticated uploads via PUT.
 *
 * GET  /<key>        → serve file from R2 (public, cached)
 * PUT  /<key>        → upload file to R2 (requires Bearer token)
 * HEAD /<key>        → check if file exists
 * DELETE /<key>      → delete file (requires Bearer token)
 *
 * Upload token is stored as a Worker secret: UPLOAD_TOKEN
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.slice(1));

    // Health check
    if (!key || key === '' || key === 'favicon.ico') {
      return new Response('r2-media-worker ok', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // CORS headers for browser access
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, HEAD, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Auth check for write operations
    const requireAuth = (request) => {
      const auth = request.headers.get('Authorization');
      if (!auth || auth !== `Bearer ${env.UPLOAD_TOKEN}`) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }
      return null;
    };

    switch (request.method) {
      case 'GET': {
        const object = await env.MEDIA_BUCKET.get(key);
        if (!object) {
          return new Response('Not Found', { status: 404, headers: corsHeaders });
        }

        const headers = new Headers(corsHeaders);
        object.writeHttpMetadata(headers);
        headers.set('ETag', object.httpEtag);
        // Cache publicly for 1 year (immutable content-addressed files)
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new Response(object.body, { headers });
      }

      case 'HEAD': {
        const object = await env.MEDIA_BUCKET.head(key);
        if (!object) {
          return new Response(null, { status: 404, headers: corsHeaders });
        }

        const headers = new Headers(corsHeaders);
        object.writeHttpMetadata(headers);
        headers.set('ETag', object.httpEtag);
        headers.set('Content-Length', object.size.toString());

        return new Response(null, { headers });
      }

      case 'PUT': {
        const authErr = requireAuth(request);
        if (authErr) return authErr;

        const contentType = request.headers.get('Content-Type') || 'application/octet-stream';

        await env.MEDIA_BUCKET.put(key, request.body, {
          httpMetadata: {
            contentType,
          },
        });

        const publicUrl = `${url.origin}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

        return new Response(JSON.stringify({ ok: true, key, url: publicUrl }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }

      case 'DELETE': {
        const authErr = requireAuth(request);
        if (authErr) return authErr;

        await env.MEDIA_BUCKET.delete(key);

        return new Response(JSON.stringify({ ok: true, deleted: key }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }

      default:
        return new Response('Method Not Allowed', {
          status: 405,
          headers: corsHeaders,
        });
    }
  },
};
