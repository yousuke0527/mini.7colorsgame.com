import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const site = 'https://mini.7colorsgame.com';
const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = async () => {
  const [games, posts] = await Promise.all([getCollection('games'), getCollection('blog')]);
  const urls = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/en/', priority: '1.0', changefreq: 'daily' },
    { path: '/blog/', priority: '0.7', changefreq: 'weekly' },
    ...games.map((game) => ({ path: `/play/${game.slug}/`, priority: '0.8', changefreq: 'monthly' })),
    ...games.map((game) => ({ path: `/en/play/${game.slug}/`, priority: '0.8', changefreq: 'monthly' })),
    ...posts.map((post) => ({ path: `/blog/${post.slug}/`, priority: '0.6', changefreq: 'monthly' })),
  ];

  const body = urls.map(({ path, priority, changefreq }) => `  <url>
    <loc>${escapeXml(`${site}${path}`)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
