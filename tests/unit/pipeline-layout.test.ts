import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { parsePipeline } from '../../src/lib/pipeline';
import { rankPipeline, layoutPipeline, wrapLabel } from '../../src/lib/pipeline-layout';

const dir = 'docs/content/projects';
const all = readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => ({ f, p: parsePipeline(readFileSync(`${dir}/${f}`, 'utf8')) }));
const rag = all.find((a) => a.f === 'hybrid-rag.md')!.p;
const sql = all.find((a) => a.f === 'executive-data-assistant.md')!.p;

describe('rankPipeline (longest path, left to right)', () => {
  it('ranks the hybrid-rag pipeline by longest path', () => {
    const { rank } = rankPipeline(rag);
    expect(rank).toMatchObject({ upload: 0, query: 0, extract: 1, chunk: 2, embed: 3, bm25: 3, fuse: 4, rerank: 5, generate: 6, answer: 7 });
  });
  it('treats retry loops as back edges so ranks stay acyclic', () => {
    const { rank, back } = rankPipeline(sql);
    expect(back.has('validate->generate')).toBe(true);
    expect(back.has('run->generate')).toBe(true);
    for (const e of sql.edges) if (!back.has(`${e.from}->${e.to}`)) expect(rank[e.to]).toBeGreaterThan(rank[e.from]);
  });
});

describe('wrapLabel', () => {
  it('keeps short labels on one line and wraps at word boundaries', () => {
    expect(wrapLabel('Chunking', 17)).toEqual(['Chunking']);
    expect(wrapLabel('CV review and career planner', 17)).toEqual(['CV review and', 'career planner']);
    expect(wrapLabel('Hardhat local or Sepolia', 17)).toEqual(['Hardhat local or', 'Sepolia']);
  });
});

describe.each(['h', 'v'] as const)('layoutPipeline mode %s', (mode) => {
  for (const { f, p } of all) {
    describe(f, () => {
      const L = layoutPipeline(p, mode);
      it('places every node inside the viewBox without overlap', () => {
        expect(L.nodes).toHaveLength(p.nodes.length);
        for (const n of L.nodes) {
          expect(n.x - n.w / 2).toBeGreaterThanOrEqual(0);
          expect(n.y - n.h / 2).toBeGreaterThanOrEqual(0);
          expect(n.x + n.w / 2).toBeLessThanOrEqual(L.width);
          expect(n.y + n.h / 2).toBeLessThanOrEqual(L.height);
        }
        for (let i = 0; i < L.nodes.length; i++) for (let j = i + 1; j < L.nodes.length; j++) {
          const a = L.nodes[i], b = L.nodes[j];
          const ox = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2);
          const oy = Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2);
          expect(ox > 0 && oy > 0, `${a.id} overlaps ${b.id}`).toBe(false);
        }
      });
      it('routes every edge and times it inside 0..1', () => {
        expect(L.edges).toHaveLength(p.edges.length);
        for (const e of L.edges) {
          expect(e.d).toMatch(/^M[\d.\- ,L]+$/);
          expect(e.t0).toBeGreaterThanOrEqual(0);
          expect(e.t1).toBeLessThanOrEqual(1);
          expect(e.t1).toBeGreaterThan(e.t0);
        }
      });
      it('lights a node only after its incoming forward edges have arrived', () => {
        const byId = Object.fromEntries(L.nodes.map((n) => [n.id, n]));
        for (const e of L.edges) if (!e.back) expect(byId[e.to].arrive).toBeGreaterThanOrEqual(e.t1 - 1e-9);
      });
    });
  }
});
