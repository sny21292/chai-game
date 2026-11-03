// Proves every level can be beaten: breadth-first search over player inputs, run headless.
// Boss levels (with rooms) are solved room by room, each from its own checkpoint, as separate jobs.
// usage: node tools/solve.js            all levels (parallel)
//        node tools/solve.js 3 12 41    just those level numbers (1-based; a boss number means all its rooms)
//        node tools/solve.js --world delhi
//        STEP=8 node tools/solve.js ...  coarser inputs: passing this means the level is not frame-perfect
'use strict';
const os = require('os'), { fork } = require('child_process');

const STEP_FRAMES = +process.env.STEP || 4;   // input granularity; STEP=8 checks a level is not frame-perfect
const MAX_FRAMES = 60 * 75;             // give up after 75 seconds of game time
const MAX_NODES = 1500000;
const ACTIONS = [];
for (const dir of [1, 0, -1]) for (const jump of [1, 0]) ACTIONS.push([dir, jump]);

function solveLevel(idx, room = 0) {
  const { G, LEVELS, loadLevel, step, press } = require('./harness');
  const def = () => (LEVELS[idx].rooms ? LEVELS[idx].rooms[room] : LEVELS[idx]);
  const snap = () => structuredClone({ L: { ...G.L, def: null }, P: G.P, jumpBuf: G.jumpBuf, held: G.held, state: G.state });
  const restore = s => {
    const c = structuredClone(s);
    c.L.def = def();
    G.L = c.L; G.P = c.P; G.jumpBuf = c.jumpBuf; Object.assign(G.held, c.held); G.state = c.state;
  };
  const act = ([dir, jump], n) => {
    for (let f = 0; f < n && G.state === 'play'; f++) {
      G.held.left = dir < 0; G.held.right = dir > 0;
      if (jump) press('jump'); else G.held.jump = false;
      step();
    }
  };
  const key = () => {
    const { L, P } = G;
    const k = [Math.round(P.x / 10), Math.round(P.y / 10), Math.round(P.vy / 4), Math.sign(Math.round(P.vx / 2)), G.held.jump ? 1 : 0, P.onGround ? 1 : 0, P.boing ? 1 : 0, L.gravity, L.reversed ? 1 : 0, JSON.stringify(L.f), L.solids.length, L.hazards.length, L.spikes.length];
    for (const s of L.solids) {
      if (s.falling && s.landY == null) k.push('F');               // on its way off-screen: position no longer matters
      else if (s.move || s.falling || s.vx || s.crumble || s.sink || s.x !== s.ox || s.y !== s.oy) k.push(Math.round(s.x / 12), Math.round(s.y / 12), s.timer != null ? 1 : 0, Math.round(s.depth / 6));
    }
    for (const d of L.doors) k.push(Math.round(d.x / 8), Math.round(d.y / 8), d.evil ? 1 : 0, d.hidden ? 1 : 0);
    for (const h of L.hazards) if (h.active && (h.vx || h.vy || h.grav)) k.push(Math.round(h.x / 40), Math.round(h.y / 40));
    return k.join(',');
  };
  const fresh = () => { loadLevel(idx, false, room); Object.assign(G.held, { left: false, right: false, jump: false }); };
  const replay = path => { fresh(); for (const a of path) act(ACTIONS[a], STEP_FRAMES); return G.state; };

  // a lazy player who only holds right should NOT win: that is what makes it a troll level
  fresh();
  act([1, 0], 60 * 20);
  const naive = G.state;

  fresh();
  const seen = new Set([key()]);
  const parent = [-1], via = [-1];
  let frontier = [{ id: 0, s: snap() }], nodes = 1, found = -1, frames = 0;
  while (frontier.length && found < 0 && frames < MAX_FRAMES && nodes < MAX_NODES) {
    frames += STEP_FRAMES;
    const next = [];
    for (const n of frontier) {
      for (let a = 0; a < ACTIONS.length && found < 0; a++) {
        restore(n.s);
        act(ACTIONS[a], STEP_FRAMES);
        if (G.state === 'dead') continue;
        const k = G.state === 'win' ? 'win' : key();
        if (seen.has(k)) continue;
        seen.add(k);
        const id = nodes++;
        parent.push(n.id); via.push(a);
        if (G.state === 'win') { found = id; break; }
        next.push({ id, s: snap() });
      }
      if (found >= 0) break;
    }
    frontier = next;
  }
  let path = null, verified = false;
  if (found >= 0) {
    path = [];
    for (let i = found; i > 0; i = parent[i]) path.unshift(via[i]);
    verified = replay(path) === 'win';
  }
  return { idx, room, rooms: LEVELS[idx].rooms ? LEVELS[idx].rooms.length : 0, name: def().name, world: def().world, solved: found >= 0, verified, frames, nodes, naive, path };
}

if (process.argv[2] === '--one') {
  const r = solveLevel(+process.argv[3] - 1, (+process.argv[4] || 1) - 1);   // --one <level> [room]
  console.log(JSON.stringify({ ...r, path: r.path && r.path.join('') }));
} else if (process.argv[2] === '--child') {
  process.on('message', ([idx, room]) => process.send(solveLevel(idx, room)));
} else {
  const { LEVELS, WORLDS } = require('./harness');
  const args = process.argv.slice(2), wi = args.indexOf('--world');
  let queue = LEVELS.map((_, i) => i);
  if (wi >= 0) queue = queue.filter(i => WORLDS[LEVELS[i].world].id === args[wi + 1]);
  else if (args.length) queue = args.map(n => +n - 1).filter(i => i >= 0 && i < LEVELS.length);
  if (!queue.length) { console.log('no matching levels'); process.exit(1); }
  queue = queue.flatMap(i => (LEVELS[i].rooms ? LEVELS[i].rooms.map((_, r) => [i, r]) : [[i, 0]]));
  const results = [];
  let running = 0;
  const t0 = Date.now();
  const pump = () => {
    while (running < Math.max(1, os.cpus().length - 2) && queue.length) {
      const job = queue.shift(), child = fork(__filename, ['--child']);
      running++;
      child.on('message', r => { results.push(r); child.kill(); running--; report(r); pump(); });
      child.send(job);
    }
    if (!running && !queue.length) summary();
  };
  const report = r => {
    const tag = !r.solved ? 'UNSOLVED' : !r.verified ? 'NONDETERMINISTIC' : r.naive === 'win' ? 'TOO EASY' : 'ok';
    const where = r.rooms ? `${WORLDS[r.world].id}:boss r${r.room + 1}/${r.rooms}` : `${WORLDS[r.world].id}:${LEVELS[r.idx].num + 1}`;
    console.log(`${String(r.idx + 1).padStart(2)} ${where.padEnd(17)} ${r.name.padEnd(22)} ${tag.padEnd(16)} ${r.solved ? `solved in ${(r.frames / 60).toFixed(1)}s of play` : `searched ${(r.frames / 60).toFixed(1)}s`}, ${r.nodes} states, hold-right → ${r.naive}`);
  };
  const summary = () => {
    const bad = results.filter(r => !r.solved || !r.verified || r.naive === 'win');
    console.log(`\n${results.length - bad.length}/${results.length} levels/rooms ok in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    process.exit(bad.length ? 1 : 0);
  };
  pump();
}
