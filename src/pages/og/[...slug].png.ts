import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

/* 1200x630 Open Graph card per page, Kernel style: terminal frame, title, category, first metric. Never a photo. */
const require = createRequire(import.meta.url);
const font = (w: 400 | 600) => readFileSync(require.resolve(`@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-${w}-normal.woff`));
const BG = '#090c0a', SURFACE = '#0d110e', TEXT = '#d4ecdc', MUTED = '#7fa28d', ACCENT = '#4ade80', LINE = '#25362c';

interface Card { cmd: string; title: string; category: string; metric?: { value: string; label: string } }

export const getStaticPaths = (async () => {
  const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
  return [
    { params: { slug: 'index' }, props: { card: { cmd: 'whoami', title: 'Kevin Anugerah Faza', category: 'AI & Data Engineer · Indonesia' } satisfies Card } },
    ...projects.map((e) => ({
      params: { slug: `projects/${e.data.slug}` },
      props: { card: { cmd: `cd ~/projects/${e.data.slug}`, title: e.data.title, category: e.data.category, metric: e.data.metrics[0] } satisfies Card },
    })),
  ];
}) satisfies GetStaticPaths;

type N = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
const el = (style: Record<string, unknown>, children?: unknown): N => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

function tree({ cmd, title, category, metric }: Card): N {
  const dot = (c: string) => el({ width: 14, height: 14, borderRadius: 7, backgroundColor: c, marginRight: 10 });
  return el({ width: 1200, height: 630, backgroundColor: BG, padding: 48, boxSizing: 'border-box', fontFamily: 'IBM Plex Mono' },
    el({ flexDirection: 'column', flexGrow: 1, backgroundColor: SURFACE, border: `2px solid ${LINE}` }, [
      el({ alignItems: 'center', flexShrink: 0, height: 56, padding: '0 24px', borderBottom: `2px solid ${LINE}`, color: MUTED, fontSize: 22 }, [
        dot(LINE), dot(LINE), dot(ACCENT), el({ marginLeft: 12 }, 'kevin@portfolio'),
      ]),
      el({ flexDirection: 'column', flexGrow: 1, padding: '40px 48px', justifyContent: 'space-between' }, [
        el({ flexDirection: 'column' }, [
          el({ fontSize: 26, color: MUTED }, [el({ color: ACCENT, marginRight: 14 }, '$'), cmd]),
          el({ fontSize: title.length > 24 ? 56 : 72, fontWeight: 600, color: TEXT, lineHeight: 1.15, marginTop: 28 }, title),
          el({ fontSize: 28, color: ACCENT, marginTop: 20 }, category),
        ]),
        el({ alignItems: 'flex-end', justifyContent: 'space-between' }, [
          metric
            ? el({ flexDirection: 'column' }, [el({ fontSize: 64, fontWeight: 600, color: ACCENT }, metric.value), el({ fontSize: 24, color: MUTED }, metric.label)])
            : el({ fontSize: 24, color: MUTED }, 'I build AI and data systems that work beyond the notebook.'),
          el({ fontSize: 22, color: MUTED }, 'kevinanugerah.dev'),
        ]),
      ]),
    ]));
}

export const GET: APIRoute = async ({ props }) => {
  const svg = await satori(tree(props.card as Card) as never, {
    width: 1200, height: 630,
    fonts: [
      { name: 'IBM Plex Mono', data: font(400), weight: 400, style: 'normal' },
      { name: 'IBM Plex Mono', data: font(600), weight: 600, style: 'normal' },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
