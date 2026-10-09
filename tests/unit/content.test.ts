import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { projectSchema } from '../../src/lib/project-schema';
import { achievements } from '../../src/data/achievements';
import { organizations } from '../../src/data/organizations';
import { experience } from '../../src/data/experience';
import { toolkit } from '../../src/data/toolkit';
import { education, certifications } from '../../src/data/education';
import { contact } from '../../src/data/contact';

const dir = 'docs/content/projects';
const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
const load = (f: string) => {
  const raw = readFileSync(`${dir}/${f}`, 'utf8').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw)!;
  return { data: parse(m[1]), body: m[2].replace(/<!--[\s\S]*?-->/g, '') };
};
const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

describe('projects', () => {
  const all = files.map((f) => ({ f, ...load(f) }));
  it('has 7 files', () => expect(files).toHaveLength(7));
  for (const p of all) {
    it(`${p.f} parses against the schema`, () => {
      const r = projectSchema.safeParse(p.data);
      expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
    });
  }
  it('order is exactly 1..7', () => {
    expect(all.map((p) => p.data.order).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it('no TODO anywhere', () => {
    for (const p of all) expect(JSON.stringify(p.data) + p.body).not.toContain('TODO');
  });
  it('no semicolons in visible prose', () => {
    for (const p of all) {
      expect(strings(p.data).filter((s) => s.includes(';')), p.f).toEqual([]);
      expect(p.body, p.f).not.toContain(';');
    }
  });
  it('normalises string links', () => {
    const r = projectSchema.parse({ ...all[0].data, links: ['https://github.com/x/y'] });
    expect(r.links).toEqual([{ label: 'Repository', url: 'https://github.com/x/y' }]);
    expect(projectSchema.parse({ ...all[0].data, links: undefined }).links).toEqual([]);
  });
});

describe('section data', () => {
  const everything = { achievements, organizations, experience, toolkit, education, certifications, contact };
  it('achievements length is 2', () => expect(achievements).toHaveLength(2));
  it('organizations have no "pass rate"', () => {
    expect(JSON.stringify(organizations).toLowerCase()).not.toContain('pass rate');
  });
  it('no semicolons or pass rate in any visible string', () => {
    for (const [k, v] of Object.entries(everything)) {
      const s = strings(v);
      expect(s.filter((x) => x.includes(';')), k).toEqual([]);
      expect(s.filter((x) => /pass rate/i.test(x)), k).toEqual([]);
    }
  });
  it('contact location is Indonesia and school short form is exact', () => {
    expect(contact.location).toBe('Indonesia');
    expect(education.schoolShort).toBe('Institut Teknologi Sepuluh Nopember (B.Comp.Sci)');
  });
  it('experience has 5 roles with valid lanes and logos', () => {
    expect(experience).toHaveLength(5);
    for (const r of experience) expect(r.logo).toMatch(/^\/media\/logos\//);
  });
  it('toolkit has 9 groups', () => expect(toolkit).toHaveLength(9));
  it('6 certifications', () => expect(certifications).toHaveLength(6));
});
