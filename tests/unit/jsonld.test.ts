import { describe, it, expect } from 'vitest';
import { homeJsonLd, projectJsonLd, PERSON_ID } from '../../src/lib/jsonld';
import { mapLegacyHash } from '../../src/lib/legacy-hash';

const project = {
  title: 'Hybrid RAG Knowledge Assistant', slug: 'hybrid-rag', order: 1, category: 'AI Engineering · RAG', year: '2025', visibility: 'NDA',
  summary: 's', metrics: [{ value: '86.67%', label: 'Context Recall' }], stack: ['Python', 'FastAPI'], links: [], seo_description: 'd',
};

describe('json-ld', () => {
  it('is JSON-serialisable', () => {
    for (const o of [...homeJsonLd(), ...projectJsonLd(project)]) expect(JSON.parse(JSON.stringify(o))).toEqual(o);
  });
  it('uses one Person @id on home and on projects', () => {
    expect(PERSON_ID).toBe('https://kevinanugerah.dev/#person');
    const person = homeJsonLd().find((o: any) => o['@type'] === 'Person') as any;
    expect(person['@id']).toBe(PERSON_ID);
    expect(person.alternateName).toBe('Kevin Anugerah');
    expect(person.address.addressCountry).toBe('ID');
    expect(JSON.stringify(person)).not.toMatch(/Surabaya/);
    expect(person.sameAs).toHaveLength(3);
    const work = projectJsonLd(project).find((o: any) => o['@type'] === 'CreativeWork') as any;
    expect(work.author['@id']).toBe(PERSON_ID);
    expect(work.keywords).toBe('Python, FastAPI');
  });
  it('has a Home > Projects > title breadcrumb', () => {
    const bc = projectJsonLd(project).find((o: any) => o['@type'] === 'BreadcrumbList') as any;
    expect(bc.itemListElement.map((i: any) => i.name)).toEqual(['Home', 'Projects', project.title]);
  });
  it('has no semicolons in text', () => expect(JSON.stringify(homeJsonLd())).not.toMatch(/;/));
});

describe('legacy hash', () => {
  it('maps old anchors', () => {
    expect(mapLegacyHash('#leadership')).toBe('#organizations');
    expect(mapLegacyHash('#work')).toBe('#projects');
    expect(mapLegacyHash('#experience')).toBeNull();
    expect(mapLegacyHash('#nope')).toBeNull();
    expect(mapLegacyHash('')).toBeNull();
  });
});
