// The town tree (week 1 on): three cozy decorating steps, each with three picks. The picks are saved in the event
// counters (tree1..tree3 = 1..3) and the tree in the square wears them (twinkleWorld.ts rebuilds when they change).
// No timers here, so closing the window leaves nothing running.
import { startAct } from '../actions';
import { sfx } from '../audio';
import { changed } from '../bus';
import { bumpEvent, eventProgress } from '../events';
import { btn, h, openPanel } from '../ui/dom';
import { TREE_STEPS } from './twinkleLayout';
import { queueTreeLighting } from './treeLighting';

/** `onGather`, on Christmas Eve / Day, adds a big button that starts the gathering from the same window. */
export function openTreePanel(onGather?: { label: string; run: () => void }) {
  openPanel('Twinkle Tree 🎄', (body, api) => {
    const c = eventProgress('twinkle').counters;
    const done = TREE_STEPS.every((s) => (c[s.key] ?? 0) > 0);
    if (onGather) body.append(h('div', 'card tw-step', h('b', '', 'Everyone is by the tree'), btn(onGather.label, () => { api.close(); onGather.run(); })));
    body.append(h('div', 'muted', done
      ? 'The tree is twinkling, and it looks wonderful. Changed your mind about a colour? Pick again any time.'
      : 'The town tree is waiting for a friend with good taste. Three cozy steps: garland, ornaments, then the glow on top.'));
    TREE_STEPS.forEach((st, i) => {
      const picked = c[st.key] ?? 0;
      const ready = i === 0 || (c[TREE_STEPS[i - 1].key] ?? 0) > 0;
      const row = h('div', 'tw-opts');
      st.options.forEach((o, k) => {
        const dot = h('span', 'tw-dot'); dot.style.background = o.color;
        row.append(btn(h('span', 'tw-opt', dot, o.label), () => {
          const first = !(c[st.key] ?? 0);
          c[st.key] = k + 1;
          sfx.tick();
          startAct('reach', 1.05);
          if (first) bumpEvent('twinkle', 'treeSteps', 1); else changed();
          api.rerender();
          // the last step is in: close the window and let the friends light the tree (once per save)
          // (queueTreeLighting holds one pending start, and waits out any panel reopened in the meantime)
          if (queueTreeLighting()) api.close();
        }, picked === k + 1 ? 'small on' : 'small', !ready));
      });
      body.append(h('div', 'card tw-step' + (picked ? ' done' : ''), h('b', '', `${i + 1}. ${st.title}${picked ? ' ✓' : ''}`), h('div', 'muted small', ready ? st.hint : 'Finish the step before this one first.'), row));
    });
  });
}
