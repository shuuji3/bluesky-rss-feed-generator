import { Client, simpleFetchHandler, isXRPCErrorPayload } from '@atcute/client';
import type { AppBskyActorGetProfile, AppBskyFeedGetAuthorFeed, AppBskyFeedPost } from '@atcute/bluesky';
import { Feed } from 'feed';

// Initialize AT Protocol client using the public AppView
export const rpc = new Client({
  handler: simpleFetchHandler({ service: 'https://public.api.bsky.app' }),
});

export async function generateRss(actor: string): Promise<string> {
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

  return feed.rss2();
}
