/** Splits a case-study markdown body into its sections. Source comments are removed, the `### Pipeline` list is left to parsePipeline. */
export type Block = { type: 'p'; text: string } | { type: 'ul'; items: string[] };
export interface CaseBody { problem: Block[]; how: Block[]; decisions: Block[]; results: Block[] }

const KEY: Record<string, keyof CaseBody> = { problem: 'problem', 'how it works': 'how', 'key decisions': 'decisions', results: 'results' };

export function parseCaseBody(markdown: string): CaseBody {
  const text = markdown.replace(/<!--[\s\S]*?-->/g, '');
  const out: CaseBody = { problem: [], how: [], decisions: [], results: [] };
  let cur: Block[] | null = null;
  let para: string[] = [];
  let list: string[] | null = null;
  const flush = () => {
    if (para.length && cur) cur.push({ type: 'p', text: para.join(' ') });
    if (list?.length && cur) cur.push({ type: 'ul', items: list });
    para = []; list = null;
  };
  let skip = false; // inside a ### subsection such as Pipeline
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) { flush(); cur = out[KEY[h2[1].trim().toLowerCase()]] ?? null; skip = false; continue; }
    if (/^#{3,6}\s/.test(line)) { flush(); skip = true; continue; }
    if (skip || !cur) continue;
    if (!line) { flush(); continue; }
    const item = /^-\s+(.*)$/.exec(line);
    if (item) { if (para.length) flush(); (list ??= []).push(item[1].trim()); continue; }
    if (list) flush();
    para.push(line);
  }
  flush();
  return out;
}
