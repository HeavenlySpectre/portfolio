import { experience, type Role, type Stint } from '../data/experience';

/* Shared by the server-rendered git log (Experience.astro) and the client graph (gitgraph.ts). */

export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM' to a month index (year * 12 + month - 1). */
export const monthIndex = (ym: string): number => {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + m - 1;
};
export const ymLabel = (m: number): string => `${MON[m % 12]} ${Math.floor(m / 12)}`;
export const dateRange = (s: number, e: number | null): string => `${ymLabel(s)} - ${e == null ? 'present' : ymLabel(e)}`;

export interface StintModel extends Omit<Stint, 'start' | 'end' | 'bullets'> {
  s: number;
  e: number;
  b: string[];
  date: string;
}
export interface RoleModel extends Omit<Role, 'start' | 'end' | 'bullets' | 'stints'> {
  s: number;
  e: number | null;
  b: string[];
  date: string;
  stints: StintModel[];
}

export function buildRoles(src: Role[] = experience): RoleModel[] {
  return src.map((r) => {
    const s = monthIndex(r.start), e = r.end == null ? null : monthIndex(r.end);
    return {
      id: r.id, org: r.org, short: r.short, role: r.role, lane: r.lane, branch: r.branch, hash: r.hash, logo: r.logo,
      s, e, b: r.bullets, date: dateRange(s, e),
      stints: (r.stints ?? []).map((st) => {
        const ss = monthIndex(st.start), se = monthIndex(st.end);
        return { name: st.name, tiny: st.tiny, hash: st.hash, s: ss, e: se, b: st.bullets, date: dateRange(ss, se) };
      }),
    };
  });
}

export type RowType = 'open' | 'merge' | 'sub';
export interface CommitRow { type: RowType; role: RoleModel; stint?: StintModel; lane: number; t: number }

/** One row per commit, newest first: a role opens, an ended role merges back into main, a course stint is a sub commit. */
export function commitRows(roles: RoleModel[]): CommitRow[] {
  const rows: CommitRow[] = [];
  for (const r of roles) {
    rows.push({ type: 'open', role: r, lane: r.lane, t: r.s });
    if (r.e != null) rows.push({ type: 'merge', role: r, lane: 0, t: r.e + 0.9 });
    for (const st of r.stints) rows.push({ type: 'sub', role: r, stint: st, lane: r.lane, t: st.s + 0.01 });
  }
  return rows.sort((a, b) => b.t - a.t);
}

/** The current month, but never earlier than the newest start in the data. */
export function nowMonth(roles: RoleModel[], today: Date = new Date()): number {
  return Math.max(today.getFullYear() * 12 + today.getMonth(), ...roles.map((r) => r.s));
}
