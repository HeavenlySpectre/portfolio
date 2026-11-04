import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE, FOCUS_AREAS } from '../lib/jsonld';
import { experience } from '../data/experience';
import { organizations } from '../data/organizations';
import { education } from '../data/education';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ym = (s: string) => { const [y, m] = s.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`; };

export const GET: APIRoute = async () => {
  const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
  const roles = [...experience].sort((a, b) => b.start.localeCompare(a.start));
  const lines = [
    '# Kevin Anugerah Faza',
    '',
    `> I am Kevin Anugerah Faza (also known as Kevin Anugerah), an AI & Data Engineer based in Indonesia. I build AI and data systems that work beyond the notebook, with a focus on retrieval-augmented generation (RAG), large language models, agentic AI and LLM evaluation. I study ${education.program} (${education.degree}) at ${education.school} (ITS), ${education.period}, GPA ${education.gpa.replace(' / ', '/')}.`,
    '',
    `- Website: ${SITE}/`,
    '- Email: kevinanugerahf@gmail.com',
    '- LinkedIn: https://www.linkedin.com/in/kevinangrfz/',
    '- GitHub: https://github.com/HeavenlySpectre',
    '- Kaggle: https://www.kaggle.com/kevinanugerah',
    `- CV (PDF): ${SITE}/media/documents/kevin-anugerah-faza-cv.pdf`,
    '',
    '## Experience',
    '',
    ...roles.map((r) => `- ${r.role}, ${r.org} (${ym(r.start)} – ${r.end ? ym(r.end) : 'present'}): ${r.bullets.join(' ')}`),
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
    '## Organizations',
    '',
    ...organizations.map((o) => `- ${o.role}, ${o.name} (${o.period}): ${o.stats.map((s) => `${s.value} ${s.label}`).join(', ')}.`),
    '',
    '## Focus areas',
    '',
    `${FOCUS_AREAS.join(', ')}.`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
