import { gsap } from 'gsap';
import { $$ } from '../lib.js';
import {
  siPython, siTypescript, siCplusplus, siGnubash, siPandas, siNumpy, siPytorch, siScikitlearn, siHuggingface,
  siLangchain, siOllama, siVllm, siLmstudio, siFastapi, siTelegram, siCelery, siRedis, siNextdotjs, siReact,
  siTailwindcss, siPostgresql, siMongodb, siMariadb, siClickhouse, siMysql, siApachekafka, siApachespark,
  siDocker, siGit, siGithubactions, siKubernetes, siLinux, siMlflow, siGooglecloud, siDigitalocean, siVercel,
  siNetlify, siDatacamp, siUdemy,
  siLanggraph, siModelcontextprotocol, siGooglegemini, siApacheairflow, siApachehadoop, siGooglebigquery, siMinio,
  siStreamlit, siGradio, siJavascript, siHtml5, siCss, siNodedotjs, siExpress, siVite, siYaml, siPrefect,
} from 'simple-icons';
// Custom single-colour SVGs (fill="currentColor"), inlined at build time.
import openaiSvg from '../assets/icons/openai.svg?raw';
import llamaindexSvg from '../assets/icons/llamaindex.svg?raw';
import unslothSvg from '../assets/icons/unsloth.svg?raw';
import awsSvg from '../assets/icons/aws.svg?raw';
import chromaSvg from '../assets/icons/chroma.svg?raw';
import langsmithSvg from '../assets/icons/langsmith.svg?raw';

// Only the icons used on the page are imported (bundled at build time, no runtime CDN).
const ICONS = {
  python: siPython, typescript: siTypescript, cplusplus: siCplusplus, gnubash: siGnubash, pandas: siPandas,
  numpy: siNumpy, pytorch: siPytorch, scikitlearn: siScikitlearn, huggingface: siHuggingface, langchain: siLangchain,
  ollama: siOllama, vllm: siVllm, lmstudio: siLmstudio, fastapi: siFastapi, telegram: siTelegram, celery: siCelery,
  redis: siRedis, nextdotjs: siNextdotjs, react: siReact, tailwindcss: siTailwindcss, postgresql: siPostgresql,
  mongodb: siMongodb, mariadb: siMariadb, clickhouse: siClickhouse, mysql: siMysql, apachekafka: siApachekafka,
  apachespark: siApachespark, docker: siDocker, git: siGit, githubactions: siGithubactions, kubernetes: siKubernetes,
  linux: siLinux, mlflow: siMlflow, googlecloud: siGooglecloud, digitalocean: siDigitalocean, vercel: siVercel,
  netlify: siNetlify, datacamp: siDatacamp, udemy: siUdemy,
  langgraph: siLanggraph, modelcontextprotocol: siModelcontextprotocol, googlegemini: siGooglegemini,
  apacheairflow: siApacheairflow, apachehadoop: siApachehadoop, googlebigquery: siGooglebigquery, minio: siMinio,
  streamlit: siStreamlit, gradio: siGradio, javascript: siJavascript, html5: siHtml5, css: siCss,
  nodedotjs: siNodedotjs, express: siExpress, vite: siVite, yaml: siYaml, prefect: siPrefect,
};
const RAW = { openai: openaiSvg, llamaindex: llamaindexSvg, unsloth: unslothSvg, aws: awsSvg, chroma: chromaSvg, langsmith: langsmithSvg };

// Strip size/style/title so inlined SVGs size and colour like the Simple Icons tiles.
function rawSvg(src) {
  const wrap = document.createElement('div');
  wrap.innerHTML = src;
  const svg = wrap.querySelector('svg');
  ['width', 'height', 'style', 'class'].forEach((a) => svg.removeAttribute(a));
  svg.querySelectorAll('title').forEach((t) => t.remove());
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  return svg;
}

const NS = 'http://www.w3.org/2000/svg';
function svgFor(icon) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', icon.path);
  s.appendChild(p);
  return s;
}

// Brand colour on hover only when it is visible on graphite (skip near-black brands).
function brandOk(hex) {
  const n = parseInt(hex, 16);
  const l = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return l > 70;
}

/** Toolkit: inline Simple Icons logos (monogram fallback), tiles rise in with a small stagger per row. */
export function initToolkit({ reduced }) {
  $$('[data-icon]').forEach((host) => {
    const key = host.dataset.icon;
    const icon = ICONS[key];
    if (RAW[key]) {
      host.appendChild(rawSvg(RAW[key])); // monochrome on hover: no brand colour
    } else if (icon) {
      host.appendChild(svgFor(icon));
      if (host.classList.contains('tool__logo') && brandOk(icon.hex)) host.style.setProperty('--brand', '#' + icon.hex);
    } else if (host.dataset.mono) {
      host.textContent = host.dataset.mono; host.classList.add('is-mono');
    }
  });
  $$('.tool__logo[data-mono]:not([data-icon])').forEach((host) => { host.textContent = host.dataset.mono || ''; host.classList.add('is-mono'); });

  if (reduced) return;
  const focus = $$('.focus li');
  if (focus.length) {
    gsap.from(focus, {
      opacity: 0, y: 22, duration: 0.8, ease: 'power3.out', stagger: 0.05,
      scrollTrigger: { trigger: '.focus', start: 'top 88%', toggleActions: 'play none none none' },
    });
  }
  $$('[data-kitrow]').forEach((row) => {
    const items = row.querySelectorAll('.tool, .chip');
    gsap.from(items, {
      opacity: 0, y: 16, duration: 0.6, ease: 'power3.out', stagger: 0.035, clearProps: 'opacity,transform',
      scrollTrigger: { trigger: row, start: 'top 88%', toggleActions: 'play none none none' },
    });
  });
}
