import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { generateRss } from './core.ts';

export const app = new Hono();

app.get('/', (c) => c.text('Bluesky RSS Generator 🦋\nUsage: /rss/:handle_or_did'));

app.get('/rss/:actor', async (c) => {
  const actor = c.req.param('actor');

  try {
    const rss = await generateRss(actor);
    return c.text(rss, 200, {
      'Content-Type': 'application/xml; charset=utf-8',
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(e);
    return c.text(`Error: ${message}`, 500);
  }
});

export function startServer(port: number = 3000) {
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Server started on http://localhost:${info.port} 🚀`);
  });
}
