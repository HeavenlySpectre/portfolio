import type { Project } from './project-schema';

export const SITE = 'https://kevinanugerah.dev';
export const PERSON_ID = `${SITE}/#person`;
export const HOME_TITLE = 'Kevin Anugerah Faza — AI & Data Engineer';
export const HOME_DESCRIPTION = 'Kevin Anugerah Faza is an AI and data engineer in Indonesia. I build AI and data systems that work beyond the notebook.';

/** Focus areas from docs/content/skills.md, in site order */
export const FOCUS_AREAS = [
  'Retrieval-Augmented Generation', 'Large Language Models', 'Agentic AI', 'LLM Evaluation', 'Machine Learning', 'MLOps',
  'Data Engineering', 'Natural Language Processing', 'Computer Vision', 'Deep Learning', 'Generative AI', 'LLM Fine-tuning',
];

export function homeJsonLd(): object[] {
  const ctx = 'https://schema.org';
  return [
    { '@context': ctx, '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'Kevin Anugerah Faza', inLanguage: 'en' },
    {
      '@context': ctx, '@type': 'ProfilePage', '@id': `${SITE}/#profilepage`, url: `${SITE}/`, name: HOME_TITLE,
      isPartOf: { '@id': `${SITE}/#website` }, mainEntity: { '@id': PERSON_ID }, dateModified: '2026-10-10', inLanguage: 'en',
    },
    {
      '@context': ctx, '@type': 'Person', '@id': PERSON_ID,
      name: 'Kevin Anugerah Faza', alternateName: 'Kevin Anugerah', jobTitle: 'AI & Data Engineer',
      description: 'Kevin Anugerah Faza is an AI and data engineer in Indonesia. He builds AI and data systems that work beyond the notebook.',
      url: `${SITE}/`, email: 'mailto:kevinanugerahf@gmail.com',
      address: { '@type': 'PostalAddress', addressCountry: 'ID' },
      alumniOf: { '@type': 'CollegeOrUniversity', name: 'Institut Teknologi Sepuluh Nopember', sameAs: 'https://www.its.ac.id/' },
      worksFor: [
        { '@type': 'Organization', name: 'AI Top Trends' },
        { '@type': 'Organization', name: 'Avalon AI' },
        { '@type': 'Organization', name: 'Cyber Security and Smart City Laboratory, Institut Teknologi Sepuluh Nopember' },
      ],
      knowsAbout: FOCUS_AREAS,
      award: [
        '1st Place, Spring 2025 Regression Challenge (international Kaggle competition)',
        '3rd Place, FIT Competition, Data Science International Category',
      ],
      sameAs: ['https://www.linkedin.com/in/kevinangrfz/', 'https://github.com/HeavenlySpectre', 'https://www.kaggle.com/kevinanugerah'],
    },
  ];
}

export function projectJsonLd(p: Project): object[] {
  const url = `${SITE}/projects/${p.slug}/`;
  const ctx = 'https://schema.org';
  return [
    {
      '@context': ctx, '@type': 'CreativeWork', '@id': `${url}#work`, name: p.title, description: p.seo_description, url,
      author: { '@type': 'Person', '@id': PERSON_ID, name: 'Kevin Anugerah Faza' }, keywords: p.stack.join(', '), inLanguage: 'en',
    },
    {
      '@context': ctx, '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Projects', item: `${SITE}/#projects` },
        { '@type': 'ListItem', position: 3, name: p.title, item: url },
      ],
    },
  ];
}
