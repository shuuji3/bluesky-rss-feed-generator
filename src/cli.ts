#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { generateRss } from './core.ts';
import { startServer } from './server.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    port: {
      type: 'string',
      short: 'p',
      default: process.env.PORT || '3000',
    },
    help: {
      type: 'boolean',
      short: 'h',
    },
  },
});

const helpMessage = `
Usage:
  bsky-rss generate <handle>    Generate RSS feed for a Bluesky user
  bsky-rss serve                Start the RSS proxy server
  
Options:
  -p, --port <number>   Port to listen on (default: 3000)
  -h, --help            Show this help message
`;

async function main() {
  const command = positionals[0];

  if (values.help || !command) {
    console.log(helpMessage);
    process.exit(0);
  }

  if (command === 'generate') {
    const handle = positionals[1];
    if (!handle) {
      console.error('Error: Handle is required for generate command');
      console.log(helpMessage);
      process.exit(1);
    }
    try {
      const rss = await generateRss(handle);
      console.log(rss);
    } catch (e: any) {
      console.error(`Error: ${e.message}`);
      process.exit(1);
    }
  } else if (command === 'serve') {
    const port = Number(values.port);
    startServer(port);
  } else {
    console.error(`Error: Unknown command "${command}"`);
    console.log(helpMessage);
    process.exit(1);
  }
}

main();
