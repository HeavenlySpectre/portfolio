import { describe, it, expect } from 'vitest';
import { buildRoles, commitRows, monthIndex, ymLabel, nowMonth, dateRange } from '../../src/lib/experience-model';

describe('experience model', () => {
  const roles = buildRoles();
  const rows = commitRows(roles);
  it('parses YYYY-MM into month indexes and labels', () => {
    expect(ymLabel(monthIndex('2024-02'))).toBe('Feb 2024');
    expect(ymLabel(monthIndex('2026-07'))).toBe('Jul 2026');
  });
  it('date ranges say present for running roles', () => {
    expect(roles.find((r) => r.id === 'avalon')!.date).toBe('Feb 2024 - present');
    expect(roles.find((r) => r.id === 'pal')!.date).toBe('Dec 2025 - Feb 2026');
    expect(dateRange(monthIndex('2024-08'), monthIndex('2024-12'))).toBe('Aug 2024 - Dec 2024');
  });
  it('has one open row per role, a merge row per ended role and a sub row per stint', () => {
    expect(rows.filter((r) => r.type === 'open')).toHaveLength(5);
    expect(rows.filter((r) => r.type === 'merge').map((r) => r.role.id).sort()).toEqual(['pal', 'teach']);
    expect(rows.filter((r) => r.type === 'sub')).toHaveLength(4);
  });
  it('is newest first, so HEAD is the most recent role', () => {
    expect(rows[0].type).toBe('open');
    expect(rows[0].role.id).toBe('aitt');
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].t).toBeGreaterThanOrEqual(rows[i].t);
  });
  it('a role opens before it merges', () => {
    for (const r of roles.filter((x) => x.e != null)) {
      const open = rows.findIndex((w) => w.role === r && w.type === 'open');
      const merge = rows.findIndex((w) => w.role === r && w.type === 'merge');
      expect(merge).toBeLessThan(open); // newest first
    }
  });
  it('now never precedes the latest start', () => {
    expect(nowMonth(roles, new Date('2020-01-01'))).toBe(Math.max(...roles.map((r) => r.s)));
    expect(nowMonth(roles, new Date('2030-05-01'))).toBe(monthIndex('2030-05'));
  });
});
