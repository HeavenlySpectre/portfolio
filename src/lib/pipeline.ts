export interface PipelineNode { id: string; label: string; note: string }
export interface PipelineEdge { from: string; to: string }
export interface Pipeline { nodes: PipelineNode[]; edges: PipelineEdge[] }

/** Parse the `### Pipeline` list: `- id | label | note` and `- a -> b`. */
export function parsePipeline(markdown: string): Pipeline {
  const text = markdown.replace(/<!--[\s\S]*?-->/g, '');
  const nodes: PipelineNode[] = [];
  const edges: PipelineEdge[] = [];
  let inside = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^###\s+Pipeline\s*$/i.test(line)) { inside = true; continue; }
    if (!inside) continue;
    if (/^#{1,6}\s/.test(line)) break;
    const item = /^-\s+(.*)$/.exec(line);
    if (!item) continue;
    const body = item[1].trim();
    const edge = /^([\w-]+)\s*->\s*([\w-]+)$/.exec(body);
    if (edge) { edges.push({ from: edge[1], to: edge[2] }); continue; }
    const [id, label, ...note] = body.split('|').map((s) => s.trim());
    if (id && label) nodes.push({ id, label, note: note.join(' | ') });
  }
  return { nodes, edges };
}
