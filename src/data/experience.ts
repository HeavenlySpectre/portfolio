export interface Stint {
  name: string;
  tiny: string;
  start: string; // YYYY-MM
  end: string;
  hash: string;
  bullets: string[];
}

export interface Role {
  id: string;
  org: string;
  short?: string;
  role: string;
  start: string; // YYYY-MM
  end: string | null; // null = still running
  lane: number;
  branch: string;
  hash: string;
  logo: string;
  bullets: string[];
  stints?: Stint[];
}

export const experience: Role[] = [
  {
    id: 'avalon', org: 'Avalon AI', role: 'Machine Learning Engineer',
    start: '2024-02', end: null, lane: 0, branch: 'main', hash: '1a8c6f4', logo: '/media/logos/avalon.svg',
    bullets: [
      'Research on gradient boosting trees, language-model architectures and RAG. Authored a SahabatAI-based legal RAG study on Indonesian open-source models.',
      'Weekly ML Tweaks sessions for experiment evaluation and model improvement.',
    ],
  },
  {
    id: 'teach', org: 'Institut Teknologi Sepuluh Nopember', short: 'ITS', role: 'Assistant Lecturer',
    start: '2024-08', end: '2026-07', lane: 1, branch: 'teaching', hash: 'e20b9a7', logo: '/media/logos/its.svg',
    bullets: ['Assisted practicum modules and mentored students building, debugging and evaluating their work.'],
    stints: [
      { name: 'Algorithms and Programming Techniques', tiny: 'Algorithms', start: '2024-08', end: '2024-12', hash: '05f8b3e',
        bullets: ['C practicum: control flow, arrays, recursion, pointers, structs, sorting and searching.'] },
      { name: 'Database Systems', tiny: 'Databases', start: '2025-01', end: '2025-07', hash: '7c3a0de',
        bullets: ['ERD design, normalization, MySQL DDL/DML, triggers, stored procedures, MongoDB.'] },
      { name: 'Data Communications and Computer Network', tiny: 'Networks', start: '2025-08', end: '2026-01', hash: 'b64e1ca',
        bullets: ['Subnetting, routing, firewalls and IPTables. Cisco Packet Tracer and GNS3 labs.'] },
      { name: 'Artificial Intelligence / Machine Learning', tiny: 'AI / ML', start: '2026-02', end: '2026-07', hash: '3d90f2b',
        bullets: ['Preprocessing, supervised and unsupervised learning, deep learning, generative AI. CNN, RNN, LSTM, GRU, Transformer, RAG.'] },
    ],
  },
  {
    id: 'pal', org: 'PT PAL Indonesia', role: 'AI Engineer Intern',
    start: '2025-12', end: '2026-02', lane: 3, branch: 'pal-intern', hash: 'c71d5e0', logo: '/media/logos/pal.webp',
    bullets: [
      'Developed NDA-protected internal AI systems for document knowledge access and conversational business intelligence.',
      'Covered backend APIs, local model integration, retrieval, database access, validation and testing.',
    ],
  },
  {
    id: 'lab', org: 'Cyber Security and Smart City Laboratory', short: 'Cyber Security & Smart City Lab', role: 'Vice Head',
    start: '2026-01', end: null, lane: 2, branch: 'lab', hash: '4be07d8', logo: '/media/logos/smartcity-lab.webp',
    bullets: [
      'Lead data science and AI research in smart-city and cybersecurity contexts.',
      'Designed and deployed a RAG laboratory chatbot with model auto-routing across query types.',
    ],
  },
  {
    id: 'aitt', org: 'AI Top Trends', role: 'AI Developer Intern',
    start: '2026-08', end: null, lane: 3, branch: 'ai-top-trends', hash: '9f3a1c2', logo: '/media/logos/ai-top-trends.webp',
    bullets: [
      'Built an evidence-driven AI news pipeline: ingestion, deduplication, story clustering, claim/evidence validation, provenance and status gates.',
      'Validated daily summaries in Bahasa Indonesia and grounded Markdown articles. 129 passing tests, 38/38 live sources connected.',
    ],
  },
];
