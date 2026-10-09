import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parsePipeline } from '../../src/lib/pipeline';

const md = readFileSync('docs/content/projects/hybrid-rag.md', 'utf8');

describe('parsePipeline', () => {
  const p = parsePipeline(md);
  it('yields 10 nodes', () => expect(p.nodes).toHaveLength(10));
  it('has fan-out edges from chunk', () => {
    expect(p.edges).toContainEqual({ from: 'chunk', to: 'embed' });
    expect(p.edges).toContainEqual({ from: 'chunk', to: 'bm25' });
  });
  it('every edge endpoint exists', () => {
    const ids = new Set(p.nodes.map((n) => n.id));
    for (const e of p.edges) { expect(ids.has(e.from)).toBe(true); expect(ids.has(e.to)).toBe(true); }
  });
  it('strips src comments', () => {
    for (const n of p.nodes) { expect(n.label).not.toContain('<!--'); expect(n.note).not.toContain('<!--'); }
  });
  it('returns empty for markdown without a pipeline', () => {
    expect(parsePipeline('# hi')).toEqual({ nodes: [], edges: [] });
  });
});
