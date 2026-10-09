import { z } from 'astro/zod';

const labelFor = (url: string) =>
  /github\.com/i.test(url) ? 'Repository' : /kaggle\.com/i.test(url) ? 'Competition' : 'Link';

const link = z
  .union([z.string(), z.object({ label: z.string(), url: z.string() })])
  .transform((l) => (typeof l === 'string' ? { label: labelFor(l), url: l } : l));

export const projectSchema = z.object({
  title: z.string(),
  slug: z.string(),
  order: z.number(),
  category: z.string(),
  year: z.string(),
  visibility: z.string(),
  summary: z.string(),
  metrics: z.array(z.object({ value: z.string(), label: z.string() })),
  stack: z.array(z.string()),
  links: z.array(link).nullish().transform((v) => v ?? []),
  contribution: z.string().optional(),
  seo_description: z.string(),
});

export type Project = z.infer<typeof projectSchema>;
