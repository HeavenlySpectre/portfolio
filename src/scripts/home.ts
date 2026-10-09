import { mountGitGraph } from './experience/gitgraph';
import { mountSectionMotion, type SectionMotion } from './motion/sections';
import { onPage } from './lifecycle';

/* Home sections below the spiral: the experience git graph (final state until armed) and the per-section motion.
   Mounted on every visit of the home page and torn down when it is swapped out. */
onPage(() => {
  const section = document.getElementById('experience');
  if (!section) return;
  const ac = new AbortController();
  const graph = mountGitGraph(section);
  let motion: SectionMotion | null = null;
  mountSectionMotion(graph, { signal: ac.signal })
    .then((m) => { motion = m; })
    .catch((err) => console.warn('section motion unavailable, showing final states', err));
  return () => {
    ac.abort(); // stops a mount that is still waiting for the loader or arming in slices
    motion?.destroy();
    graph.destroy();
  };
});
