import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCaseBody } from '../../src/lib/case-body';

const rag = parseCaseBody(readFileSync('docs/content/projects/hybrid-rag.md', 'utf8').replace(/^---[\s\S]*?\n---\n/, ''));

describe('parseCaseBody', () => {
  it('reads the four sections and strips source comments', () => {
    expect(rag.problem).toEqual([{ type: 'p', text: expect.stringContaining('PT PAL Indonesia') }]);
    expect(rag.decisions[0]).toMatchObject({ type: 'ul' });
    expect(JSON.stringify(rag)).not.toContain('src:');
    expect(JSON.stringify(rag)).not.toContain('<!--');
  });
  it('keeps the evaluation line as its own paragraph and leaves the pipeline list out', () => {
    expect(rag.how.map((b) => b.type)).toEqual(['p', 'p']);
    expect(rag.how[1]).toEqual({ type: 'p', text: 'Evaluated with RAGAS (LLM-as-a-judge).' });
    expect(JSON.stringify(rag.how)).not.toContain('->');
  });
  it('lists results one item per bullet', () => {
    const list = rag.results[0];
    expect(list.type).toBe('ul');
    expect(list.type === 'ul' && list.items).toHaveLength(3);
  });
});
