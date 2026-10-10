import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../lib/jsonld';

export const GET: APIRoute = async () => {
  const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
  const lines = [
    '# Kevin Anugerah Faza',
    '',
    '> Kevin Anugerah Faza (also known as Kevin Anugerah) is an AI & Data Engineer based in Indonesia. I build AI and data systems that work beyond the notebook. He studies Information Technology (Bachelor of Computer Science) at Institut Teknologi Sepuluh Nopember (ITS), 2023–2027 (expected), GPA 3.80/4.00.',
    '',
    `- Website: ${SITE}/`,
    '- Email: kevinanugerahf@gmail.com',
    '- LinkedIn: https://www.linkedin.com/in/kevinangrfz/',
    '- GitHub: https://github.com/HeavenlySpectre',
    '- Kaggle: https://www.kaggle.com/kevinanugerah',
    `- CV (PDF): ${SITE}/media/documents/kevin-anugerah-faza-cv.pdf`,
    '',
    '## Projects',
    '',
    ...projects.map((e) => `- [${e.data.title}](${SITE}/projects/${e.data.slug}/): ${e.data.summary}`),
    '',
    '## Achievements',
    '',
    '- 1st Place, Spring 2025 Regression Challenge (international Kaggle competition).',
    '- 3rd Place, FIT Competition, Data Science International Category (Universitas Kristen Satya Wacana).',
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
