export interface Org {
  name: string;
  role: string;
  period: string;
  logo: string;
  stats: { value: string; label: string; count?: { to: number; decimals?: number; prefix?: string; suffix?: string } }[];
  bullets: string[];
}

export const organizations: Org[] = [
  {
    name: 'Google Developer Groups on Campus ITS', role: 'Lead Chapter', period: 'Oct 2025 - present', logo: '/media/logos/gdgoc.webp',
    stats: [
      { value: '29', label: 'core team staff led', count: { to: 29 } },
      { value: '800+', label: 'community members', count: { to: 800, suffix: '+' } },
    ],
    bullets: [
      'Overseeing AI, Cyber Security, Cloud Development and Web Development tracks.',
      'Plan and execute technical programs, workshops and project-based learning activities.',
      'Contributed to a Top 3 national registration result among GDGoC Indonesia chapters for #JuaraVibeCoding.',
    ],
  },
  {
    name: 'A Renewal Agent 7.0 ITS', role: 'Project Officer', period: 'Aug 2025 - Mar 2026', logo: '/media/logos/ara.webp',
    stats: [
      { value: '13', label: 'cross-functional divisions', count: { to: 13 } },
      { value: '170+', label: 'committee members', count: { to: 170, suffix: '+' } },
      { value: '+60%', label: 'competition registrations (average)', count: { to: 60, prefix: '+', suffix: '%' } },
      { value: '>100%', label: 'event finance growth', count: { to: 100, prefix: '>', suffix: '%' } },
      { value: '3x', label: 'social media performance', count: { to: 3, suffix: 'x' } },
    ],
    bullets: [
      'Held the highest executive role of the committee.',
      'Directed Roadshow, IT Olympiad, Capture the Flag, Data Science Competition and the ExploIT IT Expo.',
      'Established a national Data Science Competition as a new flagship event with the highest participant count across the event portfolio.',
    ],
  },
  {
    name: 'Himpunan Mahasiswa Teknologi Informasi ITS', role: 'Research and Technology Staff', period: 'Jan 2025 - Jan 2026', logo: '/media/logos/hmit.webp',
    stats: [{ value: 'Staff of the Year', label: 'award for contribution and consistency' }],
    bullets: [
      'Coordinated AI Club learning sessions and peer mentoring in machine learning, deep learning and generative AI.',
      'Person in Charge for LKMM-TD HMIT ITS in collaboration with BEM ITS.',
    ],
  },
];
