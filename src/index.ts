import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { Client, simpleFetchHandler, isXRPCErrorPayload } from '@atcute/client';
import type { AppBskyActorGetProfile, AppBskyFeedGetAuthorFeed, AppBskyFeedPost } from '@atcute/bluesky';
import { Feed } from 'feed';

const app = new Hono();

// Initialize AT Protocol client using the public AppView
const rpc = new Client({
  handler: simpleFetchHandler({ service: 'https://public.api.bsky.app' }),
});

app.get('/', (c) => c.text('Bluesky RSS Generator 🦋\nUsage: /rss/:handle_or_did'));

app.get('/rss/:actor', async (c) => {
  const actor = c.req.param('actor');

  try {
    // Fetch user profile
    const profileRes = await rpc.get('app.bsky.actor.getProfile', {
      params: { actor: actor as any },
    });

    if (isXRPCErrorPayload(profileRes.data)) {
      throw new Error(`Profile error: ${profileRes.data.message}`);
    }
    
    const profile = profileRes.data as AppBskyActorGetProfile.$output;
    if (!profile) throw new Error('Profile is empty');

    // Fetch author feed including replies
    const feedRes = await rpc.get('app.bsky.feed.getAuthorFeed', {
      params: {
        actor: profile.did,
        filter: 'posts_with_replies',
        limit: 50,
      },
    });

    if (isXRPCErrorPayload(feedRes.data)) {
      throw new Error(`Feed error: ${feedRes.data.message}`);
    }
    
    const feedData = feedRes.data as AppBskyFeedGetAuthorFeed.$output;
    if (!feedData) throw new Error('Feed is empty');

    const feed = new Feed({
      title: `Posts by ${profile.displayName || profile.handle} (@${profile.handle})`,
      description: profile.description ?? '',
      id: `https://bsky.app/profile/${profile.did}`,
      link: `https://bsky.app/profile/${profile.did}`,
      language: 'ja',
      image: profile.avatar ?? '',
      updated: new Date(),
      generator: 'https://bsky.app',
    });

    for (const item of feedData.feed) {
      const post = item.post;
      const author = post.author;
      const record = post.record as AppBskyFeedPost.Main;

      const rkey = post.uri.split('/').pop();
      const link = `https://bsky.app/profile/${author.did}/post/${rkey}`;

      const text = record.text || '';
      const title = text.split('\n')[0] || 'Post';

      feed.addItem({
        title: title.length > 60 ? title.slice(0, 60) + '...' : title,
        id: post.uri,
        link: link,
        description: text,
        content: text,
        author: [
          {
            name: author.displayName || author.handle,
            link: `https://bsky.app/profile/${author.did}`,
          },
        ],
        date: new Date(record.createdAt),
      });
    }

    return c.text(feed.rss2(), 200, {
      'Content-Type': 'application/xml; charset=utf-8',
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(e);
    return c.text(`Error: ${message}`, 500);
  }
});

// Use standard port configuration
const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server started on http://localhost:${info.port} 🚀`);
});
