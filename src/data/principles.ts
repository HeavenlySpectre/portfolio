/* What drives me. Source: docs/content/quotes.md (confirmed). */
export const drivesIntro = 'Principles that shape how I approach engineering, research, leadership, and responsibility.';

export interface Principle { tag: string; quote: string; why: string }

export const principles: Principle[] = [
  { tag: 'purpose', quote: 'Build for usefulness, then optimize for intelligence.', why: 'Technology creates value when it solves a real problem reliably.' },
  { tag: 'execution', quote: 'Research creates possibilities, engineering turns them into systems and solutions.', why: 'Ideas become meaningful when they can operate beyond experiments and notebooks.' },
  { tag: 'commitment', quote: 'Hasta El Final.', why: 'Take responsibility for the outcome, keep moving through every setback, and see every commitment through to the end.' },
];
