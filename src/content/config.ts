import { defineCollection, z } from 'astro:content';

const gamesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    thumbnail: z.string(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']),
    category: z.string(),
    publishDate: z.string(),
    platform: z.enum(['PC', 'All']),
  }),
});

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.string(),
    author: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
    image: z.string().optional(),
  }),
});

export const collections = {
  'games': gamesCollection,
  'blog': blogCollection,
};
