/** Anchors of the previous site and where they live now. null: nothing to rewrite. */
const LEGACY: Record<string, string> = { '#leadership': '#organizations', '#work': '#projects' };
export const mapLegacyHash = (hash: string): string | null => LEGACY[hash] ?? null;
