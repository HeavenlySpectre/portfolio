import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The covers of the NDA projects (hybrid-rag, executive-data-assistant) must not read as real company data.
const src = readFileSync('src/scripts/spiral/covers.ts', 'utf8');
const body = (slug: string) => {
  const start = src.indexOf(`'${slug}'(c, r, T)`);
  const next = src.indexOf('\n  // ', start);
  return src.slice(start, next);
};

describe('NDA project covers carry no invented values', () => {
  const sql = body('executive-data-assistant');
  const rag = body('hybrid-rag');
  it('finds both bodies', () => {
    expect(sql.length).toBeGreaterThan(200);
    expect(rag.length).toBeGreaterThan(200);
  });
  it.each(['Jakarta', 'Bandung', 'Surabaya', '412jt', '287jt', '254jt', 'omzet', 'cabang', 'penjualan', '2025-09'])('SQL cover has no %s', (w) => {
    expect(sql).not.toContain(w);
  });
  it('SQL cover uses neutral placeholders', () => {
    expect(sql).toContain('region_a');
    expect(sql).toContain('▮▮▮');
  });
  it('RAG cover prints no scores and no sample query text', () => {
    expect(rag).not.toContain('toFixed');
    expect(rag).not.toContain('kebijakan');
    expect(rag).toContain('▮▮▮');
  });
});
