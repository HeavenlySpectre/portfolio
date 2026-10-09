import { mountGitGraph } from './experience/gitgraph';
import { mountSectionMotion } from './motion/sections';

/* Home sections below the spiral: the experience git graph (final state until armed) and the per-section motion. */
const section = document.getElementById('experience');
if (section) {
  const graph = mountGitGraph(section);
  mountSectionMotion(graph).catch((err) => console.warn('section motion unavailable, showing final states', err));
}
