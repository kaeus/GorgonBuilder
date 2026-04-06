// GorgonBuilder CORS proxy for gorgonexplorer.com/api/build/<id>.
//
// Deployed as a Cloudflare Worker. The upstream API does not send CORS headers
// and 403s requests that lack a Referer/User-Agent, so we proxy through here,
// spoof a browser visit, and re-emit the response with permissive CORS.
//
// Usage from the client:
//   GET https://<worker>.workers.dev/?id=1234
// or
//   GET https://<worker>.workers.dev/1234

export default {
  async fetch(req: Request): Promise<Response> {
    // Preflight.
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (req.method !== 'GET') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const url = new URL(req.url);
    const idFromQuery = url.searchParams.get('id');
    const idFromPath = url.pathname.replace(/^\/+/, '').split('/')[0];
    const id = (idFromQuery ?? idFromPath ?? '').trim();
    if (!/^\d+$/.test(id)) {
      return json({ error: 'Missing or invalid build id' }, 400);
    }

    const upstream = `https://gorgonexplorer.com/api/build/${id}`;
    let upstreamResp: Response;
    try {
      upstreamResp = await fetch(upstream, {
        headers: {
          // Full browser-style header set. GE's WAF is picky.
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': `https://gorgonexplorer.com/build-planner/${id}`,
          'Origin': 'https://gorgonexplorer.com',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        redirect: 'follow',
      });
    } catch (e) {
      return json({ error: 'Upstream fetch failed', detail: String(e) }, 502);
    }

    const body = await upstreamResp.text();

    // Debug mode: ?debug=1 returns the upstream response headers + body so you can
    // inspect exactly what GE is sending back (useful when diagnosing 403s).
    if (url.searchParams.get('debug') === '1') {
      const headers: Record<string, string> = {};
      upstreamResp.headers.forEach((v, k) => (headers[k] = v));
      return json(
        {
          upstreamUrl: upstream,
          upstreamStatus: upstreamResp.status,
          upstreamHeaders: headers,
          upstreamBody: body.slice(0, 2000),
        },
        200,
      );
    }

    // Only cache successful responses — never cache a 403/5xx, or the edge will pin
    // the failure for everyone in the same region.
    const cacheHeader = upstreamResp.ok
      ? 'public, max-age=300'
      : 'no-store';

    // Note: the Workers runtime auto-decompresses the upstream body, so we must NOT
    // forward Content-Encoding / Content-Length — those refer to the compressed form.
    return new Response(body, {
      status: upstreamResp.status,
      headers: {
        ...corsHeaders(),
        'Content-Type': upstreamResp.headers.get('Content-Type') ?? 'application/json; charset=utf-8',
        'Cache-Control': cacheHeader,
      },
    });
  },
};

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}
