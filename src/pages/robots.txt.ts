import type { APIRoute } from 'astro';

/**
 * Generated rather than static so the sitemap URL always matches the deployed
 * origin. /palette/view is a runtime view of a palette passed in the query
 * string, which means infinite near-identical URLs if a crawler ever finds one.
 */
export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL('http://localhost:4321')).origin;

  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /palette/view',
    'Disallow: /saved',
    '',
    '# AI crawlers are welcome; see /llms.txt for a plain-text map.',
    'User-agent: GPTBot',
    'Allow: /',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    '',
    `Sitemap: ${origin}/sitemap-index.xml`,
    '',
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
