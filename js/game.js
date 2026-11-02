'use strict';
// Engine: audio, saving, input, simulation, rendering, menus and the main loop.

// Flattened play order. A boss level has `rooms`: each room is played like a level of its own, a door leads
// to the next room, and dying sends you back to the start of the current room (the checkpoint).
const LEVELS = WORLDS.flatMap((w, wi) => w.levels.map((lv, li) => {
  const L = Object.assign({}, lv, { world: wi, num: li });
  if (lv.rooms) L.rooms = lv.rooms.map((r, ri) => Object.assign({}, r, { world: wi, num: li, room: ri }));
  return L;
}));
const roomDef = (i, room) => (LEVELS[i].rooms ? LEVELS[i].rooms[room] : LEVELS[i]);
const RED = '#ff4d5e', DOOR = '#5ee6a8', DOOR_DARK = '#2c9c6c', CREAM = '#fbeedd', DIM = '#c9b8a6', INK = '#1a1324';
const CHAI = '#b8743a', CHAI_TOP = '#e2b277';
const FONT = 'ui-rounded, "SF Pro Rounded", "Trebuchet MS", system-ui, sans-serif';
const QUIPS = [
  'arre bhai, floor pe bharosa?', 'mummy ne mana kiya tha', 'bas? ho gaya?', 'chai thandi ho gayi',
  'ek aur try. bas ek.', 'yeh toh hona hi tha', 'koi baat nahi, beta', 'bhai sahab...',
  'aaj ka din hi kharab hai', 'jugaad fail ho gaya', 'level ne bola: "nahi"', 'sab moh maya hai',
  'sharma ji ka beta first try mein kar leta', 'itna bhi kya bharosa?', 'oye hoye!', 'galti se mistake ho gaya',
  'Chotu ki chai gir gayi', 'popat ho gaya', 'phir se? achha theek hai', 'dimaag ki dahi ho gayi',
];

// ---------- audio ----------
let actx = null;
function audioInit() {
  if (actx) return;
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
}
function beep(freq, dur, type = 'square', vol = 0.05, slide = 0) {
  if (!actx || !save.sfx || Ads.showing || Portal.muted) return;
  const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(actx.destination);
  o.start(t); o.stop(t + dur);
}
const later = (ms, fn) => (typeof setTimeout === 'function' ? setTimeout(fn, ms) : fn());
const sfx = {
  jump: () => beep(520, 0.12, 'square', 0.04, 300),
  die: () => { beep(320, 0.45, 'sawtooth', 0.07, -280); later(60, () => beep(1400, 0.08, 'triangle', 0.03)); },
  win: () => { beep(660, 0.1); later(90, () => beep(990, 0.18)); },
  trap: () => beep(150, 0.2, 'triangle', 0.09, -70),
  thud: () => beep(80, 0.18, 'sine', 0.12, -30),
  flip: () => beep(300, 0.3, 'sine', 0.07, 500),
  horn: () => { beep(392, 0.35, 'sawtooth', 0.05); beep(494, 0.35, 'sawtooth', 0.04); },
  click: () => beep(880, 0.05, 'square', 0.03),
};

// ---------- save ----------
const SAVE_KEY = 'floorIsLying.v2';   // old name kept on purpose: renaming the key would wipe everyone's progress
// done: levels cleared per world id, in order (e.g. { mumbai: 4 }). skins: Chotu looks you have unlocked.
const save = { done: {}, deaths: 0, music: true, sfx: true, vibrate: true, noAds: false, skipped: [], skin: 'glass', skins: ['glass'] };
try { if (typeof localStorage !== 'undefined') Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
if ('muted' in save) { if (save.muted) save.music = save.sfx = false; delete save.muted; }   // pre-settings saves
migrateSave.happened = migrateSave(save);
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// Saves before the India map kept one linear index over 5 worlds of 10 (Mumbai, Delhi, Rajasthan, Kerala, Himalaya).
// World ids never changed, so that maps straight onto per-world counts. Old Delhi progress has no equivalent
// (Delhi is now a 5-room boss), so it is dropped; the boss still unlocks the normal way.
function migrateSave(sv) {
  if (!('level' in sv)) return false;
  ['mumbai', 'delhi', 'rajasthan', 'kerala', 'himalaya'].forEach((id, k) => {
    const n = Math.max(0, Math.min(10, sv.level - k * 10));
    if (id !== 'delhi' && n) sv.done[id] = Math.max(sv.done[id] || 0, n);
  });
  delete sv.level;
  return true;
}

// ---------- progress and unlocks ----------
// States play in a chain (finish one to open the next). UT bosses are optional side trips that open
// once `unlockAfter` states (default 2) are finished, and pay out a reward skin.
const STATE_ORDER = WORLDS.map((w, wi) => wi).filter(wi => WORLDS[wi].kind !== 'ut');
const doneIn = wi => Math.min(WORLDS[wi].levels.length, save.done[WORLDS[wi].id] || 0);
const complete = wi => doneIn(wi) >= WORLDS[wi].levels.length;
const statesDone = () => STATE_ORDER.filter(complete).length;
function unlocked(wi) {
  const w = WORLDS[wi];
  if (w.kind === 'ut') return statesDone() >= (w.unlockAfter ?? 2);
  const k = STATE_ORDER.indexOf(wi);
  return k <= 0 || complete(STATE_ORDER[k - 1]);
}
const levelUnlocked = i => unlocked(LEVELS[i].world) && LEVELS[i].num <= doneIn(LEVELS[i].world);
const firstLevel = wi => LEVELS.findIndex(l => l.world === wi);
// the level to offer next in a world: the first one not yet cleared (or the last one when all are done)
const nextIn = wi => firstLevel(wi) + Math.min(doneIn(wi), WORLDS[wi].levels.length - 1);
// where the player is "at": the first unlocked, unfinished state; else an unfinished boss; else the first state
function homeWorld() {
  const st = STATE_ORDER.find(wi => unlocked(wi) && !complete(wi));
  if (st != null) return st;
  const any = WORLDS.findIndex((w, wi) => unlocked(wi) && !complete(wi));
  return any >= 0 ? any : STATE_ORDER[0];
}
function markDone(i) {
  const lv = LEVELS[i], w = WORLDS[lv.world], before = { states: statesDone(), complete: complete(lv.world) };
  save.done[w.id] = Math.max(save.done[w.id] || 0, lv.num + 1);
  if (w.reward && complete(lv.world) && !save.skins.includes(w.reward)) { save.skins.push(w.reward); save.skin = w.reward; G.newSkin = w.reward; Portal.happy(); }
  persist();
  return before;
}

// ---------- game state ----------
const G = {
  state: 'title', paused: false, L: null, P: null, idx: 0, room: 0, sel: 0,
  map: null,        // India map menu state, see js/map.js
  newSkin: null,    // a reward skin just unlocked, shown on the next "khatam" screen
  justDone: null,   // the world just finished (for the "khatam" screen)
  held: { left: false, right: false, jump: false }, jumpBuf: 0,
  frame: 0, shake: 0, particles: [], quip: '', deathTimer: 0, winTimer: 0,
  levelDeaths: 0, levelFrames: 0, runDeaths: 0, runStart: 0, runEnd: 0, buttons: [],
  settings: null,   // { sel, confirmReset } while the settings panel is open over any screen
};
// stable stats ids: world:n for normal levels (e.g. kerala:3), world:boss for a UT boss
const levelId = i => `${WORLDS[LEVELS[i].world].id}:${LEVELS[i].rooms ? 'boss' : LEVELS[i].num + 1}`;

// ---------- simulation ----------
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const shrink = (r, m) => ({ x: r.x + m, y: r.y + m, w: r.w - 2 * m, h: r.h - 2 * m });

// respawn = reloading after a death (same attempt, same room), otherwise a fresh visit starting at `room`
function loadLevel(i, respawn = false, room = 0) {
  if (!respawn) { G.levelDeaths = 0; G.levelFrames = 0; G.room = room; Stats.track('level_start', { level: levelId(i) }); }
  const def = roomDef(i, G.room);
  G.idx = i;
  const L = G.L = { def, solids: [], spikes: [], doors: [], hazards: [], winds: [], signs: [], r: {}, f: {}, t: 0, gravity: 1, reversed: false, flood: null, msg: null };
  def.build(L);
  const [sx, sy] = L.start || [60, FY - PH];
  G.P = { x: sx, y: sy, w: PW, h: PH, vx: 0, vy: 0, onGround: false, ground: null, coyote: 0, face: 1, squash: 0 };
  G.particles = [];
  G.jumpBuf = 0;
  G.state = 'play';
}

function startAt(i, room = 0) { G.runDeaths = 0; G.runStart = G.frame; loadLevel(i, false, room); }

function die() {
  if (G.state !== 'play') return;
  G.state = 'dead';
  G.deathTimer = 50;
  save.deaths++; G.runDeaths++; G.levelDeaths++;
  G.levelFrames += G.L.t;
  persist();
  Stats.track('level_death', { level: levelId(G.idx), attempt: G.levelDeaths });
  G.shake = 14;
  sfx.die();
  Haptics.buzz(60);
  const P = G.P;
  burst(P.x + P.w / 2, P.y + P.h / 2, CHAI, 26);
  burst(P.x + P.w / 2, P.y + P.h / 2, '#e9f6ff', 10);
  G.quip = QUIPS[Math.floor(Math.random() * QUIPS.length)];
}

const moreRooms = () => !!LEVELS[G.idx].rooms && G.room < LEVELS[G.idx].rooms.length - 1;

function win() {
  G.state = 'win';
  G.winTimer = 45;
  sfx.win();
  burst(G.P.x + G.P.w / 2, G.P.y + G.P.h / 2, DOOR, 24);
  burst(G.P.x + G.P.w / 2, G.P.y + G.P.h / 2, '#ff9f1c', 14);
  Haptics.buzz([25, 40, 25]);
  if (moreRooms()) { G.levelFrames += G.L.t; Stats.track('room_clear', { level: levelId(G.idx), room: G.room + 1, deaths: G.levelDeaths }); return; }
  G.justDone = markDone(G.idx);
  Stats.track('level_win', { level: levelId(G.idx), deaths: G.levelDeaths, frames: G.levelFrames + G.L.t });
  Ads.levelCleared();
}

function nextLevel() {
  if (moreRooms()) {        // through the door into the next room: that's the new checkpoint
    G.room++;
    loadLevel(G.idx, true);
    say(G.L, `checkpoint! kamra ${G.room + 1}/${LEVELS[G.idx].rooms.length}`, 120);
    return;
  }
  const wi = LEVELS[G.idx].world, next = G.idx + 1;
  if (next < LEVELS.length && LEVELS[next].world === wi) return goToLevel(next);
  // that was the world's last level
  if (G.justDone && G.justDone.complete) return openMenu(wi);       // a replay of a world finished before
  if (WORLDS.every((w, k) => complete(k))) { G.state = 'end'; G.runEnd = G.frame; return; }
  G.state = 'worldDone';
  G.doneWorld = wi;
}

// Enter a level, showing an ad break first when the ad rules allow one.
function goToLevel(i) {
  if (!Ads.wantsBreak(LEVELS[i].world !== STATE_ORDER[0], save.noAds)) return loadLevel(i);
  G.state = 'adbreak';
  Ads.interstitial('between_levels').then(() => loadLevel(i));
}

// Rewarded ad: watch one, skip the level you're stuck on.
function skipLevel() {
  if (G.state !== 'play' || !canOfferSkip()) return;
  G.paused = true;
  Ads.rewarded('skip_level').then(ok => {
    G.paused = false;
    if (!ok || G.state !== 'play') return;
    // on a boss, an ad skips the current room, not the whole boss
    const id = levelId(G.idx) + (LEVELS[G.idx].rooms ? `#${G.room + 1}` : '');
    Stats.track('level_skip', { level: levelId(G.idx), room: LEVELS[G.idx].rooms ? G.room + 1 : undefined, deaths: G.levelDeaths });
    if (!save.skipped.includes(id)) save.skipped.push(id);
    if (!moreRooms()) G.justDone = markDone(G.idx);
    persist();
    nextLevel();
  });
}
const canOfferSkip = () => Ads.available && G.levelDeaths >= Ads.RULES.offerSkipAfterDeaths;

function update() {
  if (G.paused || G.settings || Ads.showing || G.state === 'adbreak') return;
  G.frame++;
  G.shake = G.shake > 0.3 ? G.shake * 0.85 : 0;
  updateParticles();
  if (G.state === 'dead') { updateWorld(G.L); if (--G.deathTimer <= 0) loadLevel(G.idx, true); }
  else if (G.state === 'win') { updateWorld(G.L); if (--G.winTimer <= 0) nextLevel(); }
  else if (G.state === 'play') step();
  else if (G.state === 'map') mapUpdate();
}

// One frame of play. Kept free of rendering so tools/solve.js can run it headless.
function step() {
  const L = G.L;
  L.t++;
  if (L.def.tick) L.def.tick(L, G.P);
  updateWorld(L);
  if (G.state === 'play') updatePlayer(L, G.P);
}

function updateWorld(L) {
  for (const s of L.solids) {
    const px = s.x, py = s.y;
    if (s.crumble && !s.falling && (s.stood || s.timer != null)) {
      s.timer = (s.timer ?? s.crumbleDelay ?? 16) - 1;
      if (s.timer <= 0) drop(s);
    }
    if (s.sink) {
      s.depth = s.stood ? s.depth + 0.45 : Math.max(0, s.depth - 1.2);
      s.y = s.oy + s.depth;
    }
    s.stood = false;
    if (s.move && s.move.on !== false && !s.falling) {
      const m = s.move;
      m.t = (m.t || 0) + 1;
      const k = (1 - Math.cos(2 * Math.PI * (m.t / m.period + (m.phase || 0)))) / 2;
      s.x = s.ox + (m.dx || 0) * k;
      s.y = s.oy + (m.dy || 0) * k;
    }
    if (s.vx) s.x += s.vx;
    if (s.falling) {
      s.vy += s.crusher ? 1.3 : 0.8;
      s.y += s.vy;
      if (s.landY != null && s.y >= s.landY) {
        s.y = s.landY; s.vy = 0; s.falling = false; s.landY = null; s.crusher = false;
        G.shake = 10; sfx.thud();
      }
    }
    s.dx = s.x - px; s.dy = s.y - py;
  }
  L.solids = L.solids.filter(s => s.y < H + 300 && s.x > -600 && s.x < W + 600);

  for (const sp of L.spikes) {
    if (!sp.hidden && sp.pop < 1) sp.pop = Math.min(1, sp.pop + 0.25);
    if (sp.on) {
      if (sp.offX == null) { sp.offX = sp.x - sp.on.x; sp.offY = sp.y - sp.on.y; }
      sp.x = sp.on.x + sp.offX; sp.y = sp.on.y + sp.offY;
    }
  }
  L.spikes = L.spikes.filter(sp => sp.y < H + 300);

  for (const d of L.doors) {
    d.x += (d.tx - d.x) * 0.18; if (Math.abs(d.tx - d.x) < 0.5) d.x = d.tx;
    d.y += (d.ty - d.y) * 0.18; if (Math.abs(d.ty - d.y) < 0.5) d.y = d.ty;
    if (!d.hidden && d.alpha < 1) d.alpha = Math.min(1, d.alpha + 0.05);
  }

  for (const h of L.hazards) {
    if (!h.active) continue;
    h.vy += h.grav;
    h.x += h.vx; h.y += h.vy;
    if (h.landY != null && h.y >= h.landY) { h.y = h.landY; h.vy = 0; h.grav = 0; h.vx = 0; }
    h.rot += h.vx / Math.max(8, h.w / 2);
  }
  L.hazards = L.hazards.filter(h => h.y < H + 200 && h.x > -900 && h.x < W + 900);

  const fl = L.flood;
  if (fl && L.t > (fl.delay || 0) && fl.y > fl.stop) fl.y -= fl.speed;
  if (L.msg && --L.msg.t <= 0) L.msg = null;
}

function updatePlayer(L, P) {
  const g = L.gravity, held = G.held;
  const blocking = s => !s.ghost && hit(P, s);

  // ride whatever we stood on last frame; get scraped off if that drags us into something
  const gr = P.ground && L.solids.includes(P.ground) ? P.ground : null;
  if (gr && !gr.falling) {
    P.x += gr.dx; P.y += gr.dy;
    if (L.solids.some(s => s !== gr && blocking(s))) P.x -= gr.dx;
  }
  // moving things shove us; getting pinned means getting squashed
  for (const s of L.solids) {
    if (s === gr || !(s.dx || s.dy) || !blocking(s)) continue;
    if (s.crusher && s.falling) return die();
    if (Math.abs(s.dx) >= Math.abs(s.dy)) P.x = s.dx > 0 ? s.x + s.w : s.x - P.w;
    else P.y = s.dy > 0 ? s.y + s.h : s.y - P.h;
    if (P.x < 0 || P.x > W - P.w || L.solids.some(o => o !== s && blocking(o))) return die();
  }

  let dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  if (L.reversed) dir = -dir;
  if (dir) P.face = dir;
  const ice = P.onGround && gr && gr.ice, sand = P.onGround && gr && gr.sink;
  P.vx += (dir * SPEED * (sand ? 0.5 : 1) - P.vx) * (ice ? 0.04 : 0.35);
  if (!ice && Math.abs(P.vx) < 0.05) P.vx = 0;

  P.coyote = P.onGround ? 6 : P.coyote - 1;
  if (G.jumpBuf > 0) G.jumpBuf--;
  if (G.jumpBuf > 0 && P.coyote > 0) {
    P.vy = -JUMP * g * (sand ? 0.8 : 1);
    P.coyote = 0; G.jumpBuf = 0; P.onGround = false; P.squash = -0.25;
    sfx.jump();
  }
  if (!held.jump && P.vy * g < -4) P.vy = -4 * g;    // release early = short hop
  P.vy += GRAV * g;
  if (P.vy * g > MAXFALL) P.vy = MAXFALL * g;
  P.squash *= 0.8;

  // horizontal
  let push = 0;
  for (const z of L.winds) if (hit(P, z)) push += z.fx;
  const mx = P.vx + push;
  P.x = Math.max(0, Math.min(W - P.w, P.x + mx));
  for (const s of L.solids) {
    if (!blocking(s)) continue;
    if (s.crusher && s.falling) return die();
    // push out the nearer side, so a sliver of overlap (e.g. from sinking sand) never teleports us across a block
    P.x = P.x + P.w - s.x < s.x + s.w - P.x ? s.x - P.w : s.x + s.w;
    P.vx = 0;
  }

  // vertical
  const wasGround = P.onGround;
  P.y += P.vy;
  P.onGround = false; P.ground = null;
  for (const s of L.solids) {
    if (!blocking(s)) continue;
    if (s.crusher && s.falling) return die();
    if (s.invisible) s.revealed = true;
    const landing = P.vy * g > 0;
    P.y = P.vy > 0 ? s.y - P.h : s.y + s.h;
    if (landing) {
      P.onGround = true; P.ground = s; s.stood = true;
      if (!wasGround) P.squash = 0.3;
    }
    P.vy = 0;
  }

  // hazards
  if (P.ground && P.ground.sink && P.ground.depth >= 28) return die();
  for (const sp of L.spikes) {
    if (sp.pop < 0.6) continue;
    const h = SPH * sp.pop;
    const box = sp.dir === 'up' ? { x: sp.x + 4, y: sp.y - h + 6, w: sp.w - 8, h: h - 6 } : { x: sp.x + 4, y: sp.y, w: sp.w - 8, h: h - 6 };
    if (!hit(P, box)) continue;
    if (!sp.fake) return die();
    // fake spikes are cardboard: they crumble where you touch them
    const i = Math.max(0, Math.min(Math.round(sp.w / SPH) - 1, Math.floor((P.x + P.w / 2 - sp.x) / SPH)));
    sp.broken = sp.broken || [];
    if (!sp.broken.includes(i)) { sp.broken.push(i); burst(sp.x + i * SPH + SPH / 2, sp.y - 8, RED, 6); }
  }
  for (const h of L.hazards) if (hit(P, shrink(h, h.pad ?? (h.kind === 'water' ? 8 : 3)))) return die();
  if (L.flood && P.y + P.h > L.flood.y + 6) return die();
  if (P.y > H + 40 || P.y + P.h < -40) return die();
  for (const d of L.doors) {
    if (d.hidden || d.alpha < 0.9 || !hit(P, shrink(d, 8))) continue;
    if (d.evil) return die();
    if (!d.fake && d.x === d.tx && d.y === d.ty) return win();
  }
}

// ---------- particles ----------
function burst(x, y, color, n) {
  if (typeof document === 'undefined') return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 5;
    G.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 40 + Math.random() * 20, color, size: 3 + Math.random() * 4 });
  }
}
function updateParticles() {
  for (const p of G.particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.vx *= 0.98; p.life--; }
  G.particles = G.particles.filter(p => p.life > 0);
}

// ---------- input ----------
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump' };
function press(k) { if (k === 'jump' && !G.held.jump) G.jumpBuf = 7; G.held[k] = true; }

function onKey(e) {
  if (e.repeat) return;
  const c = e.code;
  if (G.settings) return settingsKey(c);
  if (Ads.showing || G.state === 'adbreak') return;
  if (c === 'KeyM') { const on = !(save.sfx || save.music); save.sfx = save.music = on; persist(); return; }
  if (c === 'KeyO') return openSettings();
  if (G.state === 'title') { if (c === 'Enter' || c === 'Space') openMenu(); return; }
  if (G.state === 'map') return mapKey(c);
  if (G.state === 'worldDone') { if (c === 'Enter' || c === 'Space') worldDoneGo(); if (c === 'Escape') openMenu(); return; }
  if (G.state === 'end') { if (c === 'Enter' || c === 'Space') openMenu(); return; }
  if (c === 'KeyP') G.paused = !G.paused;
  if (c === 'KeyR') restartLevel();
  if (c === 'KeyK') skipLevel();
  if (c === 'Escape') quitToMenu();
}
function restartLevel() { if (G.state === 'play' || G.state === 'dead') { G.paused = false; loadLevel(G.idx, true); } }
function quitToMenu() {
  if (G.state === 'play' || G.state === 'dead') Stats.track('level_quit', { level: levelId(G.idx), deaths: G.levelDeaths });
  G.paused = false; G.sel = G.idx; openMenu(LEVELS[G.idx].world);
}

// ---------- settings ----------
const SETTINGS = [
  { label: 'Music', key: 'music' },
  { label: 'Sound effects', key: 'sfx' },
  { label: 'Vibration (phone)', key: 'vibrate' },
  { label: 'Chotu', skin: true, act: () => cycleSkin() },
  { label: 'Playtest stats download karo', act: () => downloadStats() },
  { label: 'Progress reset', reset: true, act: () => resetProgress() },
  { label: 'Wapas', act: () => { G.settings = null; } },
];
function openSettings() { G.settings = { sel: 0, confirmReset: false }; sfx.click(); }
function settingsKey(c) {
  const st = G.settings;
  if (c === 'Escape' || c === 'KeyO') { G.settings = null; return; }
  if (c === 'ArrowUp' || c === 'KeyW') st.sel = (st.sel + SETTINGS.length - 1) % SETTINGS.length;
  if (c === 'ArrowDown' || c === 'KeyS') st.sel = (st.sel + 1) % SETTINGS.length;
  if (['Enter', 'Space', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(c)) activateSetting(st.sel);
  if (c !== 'Enter' && c !== 'Space') st.confirmReset = st.confirmReset && SETTINGS[st.sel].reset;
}
function activateSetting(i) {
  const row = SETTINGS[i];
  G.settings.sel = i;
  if (row.key) { save[row.key] = !save[row.key]; persist(); if (row.key === 'vibrate') Haptics.buzz(40); }
  else row.act();
  sfx.click();
}
// Chotu skins: 'glass' (default) and rewards from UT bosses (WORLDS[].reward)
const SKINS = { glass: 'cutting glass', kulhad: 'kulhad', steel: 'steel tumbler' };
function cycleSkin() {
  const k = save.skins.indexOf(save.skin);
  save.skin = save.skins[(k + 1) % save.skins.length];
  persist();
}
function skinLabel() {
  const locked = Object.keys(SKINS).filter(s => !save.skins.includes(s));
  return `Chotu: ${SKINS[save.skin] || save.skin}` + (locked.length ? `   (${locked.map(s => SKINS[s]).join(', ')} 🔒 boss se)` : '');
}
function resetProgress() {
  if (!G.settings.confirmReset) { G.settings.confirmReset = true; return; }
  Object.assign(save, { done: {}, deaths: 0, skipped: [], skin: 'glass', skins: ['glass'] });
  persist();
  G.settings = null; G.sel = 0; G.map = null; G.state = 'title'; G.paused = false;
}
function downloadStats() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([Stats.export()], { type: 'application/json' }));
  a.download = `floor-pe-dhokha-stats-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- rendering ----------
let cv, ctx;
const bgCache = {};
function background(id) {
  if (!bgCache[id]) {
    const c = document.createElement('canvas');
    c.width = W * 2; c.height = H * 2;
    const x = c.getContext('2d');
    x.scale(2, 2);
    THEMES[id].paint(x);
    bgCache[id] = c;
  }
  return bgCache[id];
}
function themeOf(i) { return THEMES[WORLDS[LEVELS[i].world].theme]; }

function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function text(str, x, y, size, color = CREAM, align = 'center', weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}
function pill(str, x, y, size, color = CREAM, bg = 'rgba(20,12,24,.72)') {
  ctx.font = `700 ${size}px ${FONT}`;
  const w = ctx.measureText(str).width + size * 1.4;
  ctx.fillStyle = bg;
  rrect(x - w / 2, y - size * 0.95, w, size * 1.9, size * 0.95); ctx.fill();
  text(str, x, y + 1, size, color, 'center', 700);
}

// Chotu: a cutting-chai glass. Drawn with feet at (0,0), growing upward.
function drawChotu(w, h, face, idle, fill = 0.74, skin = typeof save !== 'undefined' ? save.skin : 'glass') {
  if (skin === 'kulhad') return drawKulhad(w, h, face, idle);
  if (skin === 'steel') return drawSteel(w, h, face, idle);
  const bw = w * 0.74, lvl = -h * fill;
  const at = y => bw / 2 + (w / 2 + 1 - bw / 2) * (-y / h);      // half-width of the glass at height y
  ctx.fillStyle = 'rgba(225,242,255,.32)';
  ctx.beginPath(); ctx.moveTo(-bw / 2, 0); ctx.lineTo(bw / 2, 0); ctx.lineTo(w / 2 + 1, -h); ctx.lineTo(-w / 2 - 1, -h); ctx.closePath(); ctx.fill();
  const grad = ctx.createLinearGradient(0, 0, 0, lvl);
  grad.addColorStop(0, '#8d5527'); grad.addColorStop(1, CHAI);
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.moveTo(-bw / 2, 0); ctx.lineTo(bw / 2, 0); ctx.lineTo(at(lvl), lvl); ctx.lineTo(-at(lvl), lvl); ctx.closePath(); ctx.fill();
  ctx.fillStyle = CHAI_TOP;
  ctx.fillRect(-at(lvl), lvl, at(lvl) * 2, 3);
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;          // cut-glass ridges
  ctx.beginPath();
  for (const k of [-0.5, 0, 0.5]) { ctx.moveTo(k * bw / 2, -1); ctx.lineTo(k * (w / 2), -h + 2); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-w / 2 - 1, -h); ctx.lineTo(-bw / 2, 0); ctx.lineTo(bw / 2, 0); ctx.lineTo(w / 2 + 1, -h); ctx.stroke();
  ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-w / 2 - 2, -h); ctx.lineTo(w / 2 + 2, -h); ctx.stroke();
  const ey = -h * 0.42, ex = face * 1.5, blink = G.frame % 200 < 6;
  for (const sx of [-4.5, 4.5]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(sx + ex * 0.5, ey, 3.2, blink ? 0.6 : 3.8, 0, 0, Math.PI * 2); ctx.fill();
    if (!blink) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(sx + ex, ey + 0.5, 1.7, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(ex * 0.6, ey + 6, 2.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  if (idle) {
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5;
    for (const k of [-4, 4]) {
      const o = Math.sin(G.frame * 0.08 + k) * 2.5;
      ctx.beginPath(); ctx.moveTo(k, -h - 3); ctx.quadraticCurveTo(k + 4 + o, -h - 10, k - o, -h - 17); ctx.stroke();
    }
  }
}

// Kulhad Chotu (reward for the Delhi boss): a matte clay cup, chai right up to the rim.
function drawKulhad(w, h, face, idle) {
  const bw = w * 0.66;
  ctx.fillStyle = '#b4532a';
  ctx.beginPath(); ctx.moveTo(-bw / 2, 0); ctx.lineTo(bw / 2, 0); ctx.quadraticCurveTo(w / 2 + 3, -h * 0.55, w / 2 + 1, -h); ctx.lineTo(-w / 2 - 1, -h); ctx.quadraticCurveTo(-w / 2 - 3, -h * 0.55, -bw / 2, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a3b1c'; ctx.fillRect(-w / 2 - 1, -h * 0.2, w + 2, 3);             // fired band near the base
  ctx.fillStyle = 'rgba(255,220,180,.18)'; ctx.fillRect(-w / 2 + 3, -h + 4, 3, h - 8);   // soft clay sheen
  ctx.fillStyle = '#d98a55'; ctx.fillRect(-w / 2 - 2, -h - 1, w + 4, 3);                  // rim
  ctx.fillStyle = CHAI_TOP; ctx.fillRect(-w / 2, -h + 2, w, 2);
  const ey = -h * 0.5, ex = face * 1.5, blink = G.frame % 200 < 6;
  for (const sx of [-4.5, 4.5]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(sx + ex * 0.5, ey, 3.2, blink ? 0.6 : 3.8, 0, 0, Math.PI * 2); ctx.fill();
    if (!blink) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(sx + ex, ey + 0.5, 1.7, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(ex * 0.6, ey + 6, 2.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  if (idle) {
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5;
    for (const k of [-4, 4]) {
      const o = Math.sin(G.frame * 0.08 + k) * 2.5;
      ctx.beginPath(); ctx.moveTo(k, -h - 3); ctx.quadraticCurveTo(k + 4 + o, -h - 10, k - o, -h - 17); ctx.stroke();
    }
  }
}

// Steel tumbler Chotu (reward for the Chandigarh boss): straight sides, shiny, a rolled rim.
function drawSteel(w, h, face, idle) {
  const bw = w * 0.82;
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, '#8b97a3'); g.addColorStop(0.35, '#eef3f7'); g.addColorStop(0.6, '#b9c3cc'); g.addColorStop(1, '#7b8691');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-bw / 2, 0); ctx.lineTo(bw / 2, 0); ctx.lineTo(w / 2, -h); ctx.lineTo(-w / 2, -h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#dfe6ec'; ctx.fillRect(-w / 2 - 1.5, -h - 1.5, w + 3, 3);         // rolled rim
  ctx.fillStyle = 'rgba(80,90,100,.5)'; ctx.fillRect(-bw / 2, -3, bw, 3);
  ctx.fillStyle = CHAI_TOP; ctx.fillRect(-w / 2 + 1, -h + 1.5, w - 2, 2);
  const ey = -h * 0.5, ex = face * 1.5, blink = G.frame % 200 < 6;
  for (const sx of [-4.5, 4.5]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(sx + ex * 0.5, ey, 3.2, blink ? 0.6 : 3.8, 0, 0, Math.PI * 2); ctx.fill();
    if (!blink) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(sx + ex, ey + 0.5, 1.7, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(ex * 0.6, ey + 6, 2.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  if (idle) {
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5;
    for (const k of [-4, 4]) {
      const o = Math.sin(G.frame * 0.08 + k) * 2.5;
      ctx.beginPath(); ctx.moveTo(k, -h - 3); ctx.quadraticCurveTo(k + 4 + o, -h - 10, k - o, -h - 17); ctx.stroke();
    }
  }
}

function drawPlayer(L, P) {
  const sq = P.squash, w = P.w * (1 + sq * 0.6), h = P.h * (1 - sq * 0.6);
  ctx.save();
  ctx.translate(P.x + P.w / 2, L.gravity > 0 ? P.y + P.h : P.y);
  if (L.gravity < 0) ctx.scale(1, -1);
  // sinking into quicksand: clip the part below the sand surface
  const gr = P.ground;
  if (gr && gr.sink && gr.depth > 0) { ctx.beginPath(); ctx.rect(-40, -80, 80, 80 - gr.depth); ctx.clip(); }
  drawChotu(w, h, P.face, Math.abs(P.vx) < 0.2 && P.onGround);
  ctx.restore();
}

function drawSolid(s, pal) {
  if (s.invisible && !s.revealed) return;
  if (s.fog && Math.abs(G.P.x + G.P.w / 2 - (s.x + s.w / 2)) > s.fog) return;    // fog: only seen up close
  const jx = s.timer != null && !s.falling ? (Math.random() - 0.5) * 3 : 0;
  const x = s.x + jx, y = s.sink ? s.oy : s.y, w = s.w, h = s.h;
  if (s.invisible) {
    ctx.globalAlpha = 0.6; ctx.setLineDash([6, 4]); ctx.strokeStyle = pal.text; ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    return;
  }
  if (s.kind && KIND_DRAW[s.kind]) return KIND_DRAW[s.kind](x, y, w, h, s);
  if (s.sink) {
    ctx.fillStyle = '#d9a95e'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(120,70,30,.35)';
    for (let i = 0; i < w / 10; i++) ctx.fillRect(x + ((i * 37 + G.frame * (s.depth > 0 ? 0.6 : 0)) % w), y + 6 + (i * 13) % Math.max(8, h - 12), 3, 2);
    ctx.fillStyle = 'rgba(255,240,200,.5)'; ctx.fillRect(x, y, w, 3);
    return;
  }
  ctx.fillStyle = s.ice ? '#a8e4ff' : pal.block;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = s.ice ? '#e8f8ff' : pal.top;
  ctx.fillRect(x, y, w, Math.min(5, h));
  ctx.fillStyle = s.ice ? '#6fb8dc' : pal.shade;
  if (h > 10) ctx.fillRect(x, y + h - 4, w, 4);
  if (s.ice) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 8, y + 12); ctx.lineTo(x + 20, y + 8); ctx.stroke(); }
  if (s.crumble) {
    ctx.strokeStyle = pal.shade; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y); ctx.lineTo(x + w * 0.4, y + h * 0.6);
    ctx.moveTo(x + w * 0.7, y + h); ctx.lineTo(x + w * 0.62, y + h * 0.3);
    ctx.stroke();
  }
}

const KIND_DRAW = {
  cow(x, y, w, h, s) {
    const f = s.vx < 0 ? -1 : 1;
    ctx.fillStyle = '#f3efe6'; rrect(x, y + 4, w, h - 14, 8); ctx.fill();
    ctx.fillStyle = '#6b5a4b';
    ctx.beginPath(); ctx.ellipse(x + w * 0.35, y + h * 0.35, 9, 6, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + w * 0.7, y + h * 0.5, 7, 5, -0.4, 0, Math.PI * 2); ctx.fill();
    for (const lx of [0.15, 0.35, 0.65, 0.85]) ctx.fillRect(x + w * lx - 3, y + h - 12, 6, 12);
    const hx = f > 0 ? x + w - 6 : x - 14;
    ctx.fillStyle = '#f3efe6'; rrect(hx, y - 2, 20, 18, 6); ctx.fill();
    ctx.strokeStyle = '#d8c7a0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hx + 3, y); ctx.lineTo(hx - 1, y - 9); ctx.moveTo(hx + 17, y); ctx.lineTo(hx + 21, y - 9); ctx.stroke();
    ctx.fillStyle = INK; ctx.fillRect(hx + (f > 0 ? 12 : 4), y + 5, 3, 3);
    ctx.fillStyle = '#ff9f1c'; ctx.beginPath(); ctx.arc(x + w / 2, y + 6, 4, 0, Math.PI * 2); ctx.fill();   // a marigold
  },
  boat(x, y, w, h) {
    ctx.fillStyle = '#5a3a22';
    ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + w + 8, y); ctx.quadraticCurveTo(x + w, y + h, x + w / 2, y + h); ctx.quadraticCurveTo(x, y + h, x - 8, y); ctx.fill();
    ctx.fillStyle = '#c8a26a'; ctx.fillRect(x, y, w, 4);
  },
  camel(x, y, w, h) {
    ctx.fillStyle = '#c38a4f';
    rrect(x, y + 6, w, h - 20, 10); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w * 0.5, y + 8, w * 0.22, Math.PI, 0); ctx.fill();
    for (const lx of [0.2, 0.8]) ctx.fillRect(x + w * lx - 3, y + h - 16, 6, 16);
    ctx.fillStyle = '#e2424f'; ctx.fillRect(x + w * 0.3, y + 4, w * 0.4, 6);
  },
  crate(x, y, w, h) {
    ctx.fillStyle = '#a0703f'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#6e4a26'; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + w - 2, y + h - 2); ctx.stroke();
  },
  boulder(x, y, w, h) {
    ctx.fillStyle = '#7d7468'; rrect(x, y, w, h, Math.min(w, h) * 0.35); ctx.fill();
    ctx.fillStyle = '#9a9184'; rrect(x + 6, y + 5, w * 0.5, h * 0.3, 8); ctx.fill();
    ctx.strokeStyle = '#5a5248'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h * 0.55); ctx.lineTo(x + w * 0.55, y + h * 0.7); ctx.lineTo(x + w * 0.7, y + h * 0.5); ctx.stroke();
  },
  bus(x, y, w, h, s) { HAZARD_DRAW.bus({ x, y, w, h, vx: s.vx }); },
  log(x, y, w, h) {
    ctx.fillStyle = '#7a4a2a'; rrect(x, y, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = '#5a341c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 10, y + h / 2); ctx.lineTo(x + w - 10, y + h / 2); ctx.stroke();
  },
};

function drawSpikes(sp) {
  if (sp.pop <= 0) return;
  const h = SPH * sp.pop, n = Math.round(sp.w / SPH), s = sp.dir === 'up' ? -1 : 1;
  ctx.fillStyle = RED;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    if (sp.broken && sp.broken.includes(i)) continue;
    const x0 = sp.x + i * SPH;
    ctx.moveTo(x0, sp.y); ctx.lineTo(x0 + SPH / 2, sp.y + s * h); ctx.lineTo(x0 + SPH, sp.y);
  }
  ctx.fill();
}

function drawDoor(d) {
  if (d.alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = d.alpha;
  if (d.flip) { ctx.translate(0, 2 * d.y + d.h); ctx.scale(1, -1); }
  const { x, y, w, h } = d;
  ctx.fillStyle = d.evil ? RED : DOOR;
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = d.evil ? '#7a1424' : DOOR_DARK;
  ctx.beginPath(); ctx.moveTo(x + 7, y + h); ctx.lineTo(x + 7, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2 - 7, Math.PI, 0); ctx.lineTo(x + w - 7, y + h); ctx.closePath(); ctx.fill();
  // toran: a string of mango leaves and marigolds across the top
  ctx.strokeStyle = '#ffcf6b'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - 4, y + 12); ctx.quadraticCurveTo(x + w / 2, y + 20, x + w + 4, y + 12); ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const t = (i + 0.5) / 5, lx = x - 4 + t * (w + 8), ly = y + 12 + Math.sin(t * Math.PI) * 6;
    ctx.fillStyle = i % 2 ? '#ff9f1c' : '#3fa65a';
    if (i % 2) { ctx.beginPath(); ctx.arc(lx, ly + 3, 3, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(lx - 3, ly); ctx.lineTo(lx, ly + 9); ctx.lineTo(lx + 3, ly); ctx.fill(); }
  }
  if (d.evil) {
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const tx = x + 7 + i * 6.5;
      ctx.moveTo(tx, y + 34); ctx.lineTo(tx + 3.25, y + 42); ctx.lineTo(tx + 6.5, y + 34);
      ctx.moveTo(tx, y + 54); ctx.lineTo(tx + 3.25, y + 46); ctx.lineTo(tx + 6.5, y + 54);
    }
    ctx.fill();
    ctx.fillRect(x + 11, y + 24, 6, 5); ctx.fillRect(x + 23, y + 24, 6, 5);
  } else {
    ctx.fillStyle = '#ffcf6b'; ctx.beginPath(); ctx.arc(x + w - 13, y + h * 0.62, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

const HAZARD_DRAW = {
  train(h) {
    const { x, y, w } = h, hh = h.h;
    ctx.fillStyle = '#7a1f2b'; rrect(x, y, w, hh, 10); ctx.fill();
    ctx.fillStyle = '#f2c230'; ctx.fillRect(x, y + hh * 0.62, w, 7);
    ctx.fillStyle = '#2a1520';
    for (let wx = x + 18; wx < x + w - 30; wx += 34) ctx.fillRect(wx, y + 12, 22, 16);
    ctx.fillStyle = '#ffe9a8';
    const nose = h.vx < 0 ? x + 8 : x + w - 18;
    ctx.fillRect(nose, y + hh - 22, 10, 8);
  },
  auto(h) {
    const { x, y, w } = h, hh = h.h;
    ctx.fillStyle = '#2f8f4e'; rrect(x, y + hh * 0.35, w, hh * 0.45, 8); ctx.fill();
    ctx.fillStyle = '#f2c230'; rrect(x + 4, y, w - 8, hh * 0.42, 12); ctx.fill();
    ctx.fillStyle = '#1a1324';
    for (const wx of [x + 12, x + w - 12]) { ctx.beginPath(); ctx.arc(wx, y + hh - 7, 7, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(h.vx < 0 ? x : x + w - 6, y + hh * 0.45, 6, 6);
  },
  coconut(h) {
    const r = h.w / 2;
    ctx.fillStyle = '#6b4423'; ctx.beginPath(); ctx.arc(h.x + r, h.y + r, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2412';
    for (const a of [0, 2.1, 4.2]) { ctx.beginPath(); ctx.arc(h.x + r + Math.cos(a + h.rot) * r * 0.4, h.y + r + Math.sin(a + h.rot) * r * 0.4, 2.2, 0, Math.PI * 2); ctx.fill(); }
  },
  icicle(h) {
    ctx.fillStyle = '#bfefff';
    ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x + h.w, h.y); ctx.lineTo(h.x + h.w / 2, h.y + h.h); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(h.x + h.w * 0.3, h.y + 2, 2, h.h * 0.5);
  },
  snowball(h) { roundThing(h, '#f4f8fc', '#c9dcef'); },
  rock(h) { roundThing(h, '#8a6a52', '#5c4636'); },
  pigeon(h) {
    const cx = h.x + h.w / 2, cy = h.y + h.h / 2, flap = Math.sin(G.frame * 0.5) * 6, f = h.vx < 0 ? -1 : 1;
    ctx.fillStyle = '#8d93a3'; ctx.beginPath(); ctx.ellipse(cx, cy, h.w / 2, h.h / 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6c7283'; ctx.beginPath(); ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 6, cy - 6 - flap); ctx.lineTo(cx + 10, cy); ctx.fill();
    ctx.fillStyle = '#5a8f7b'; ctx.beginPath(); ctx.arc(cx + f * h.w * 0.42, cy - 3, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff9f1c'; ctx.fillRect(cx + f * (h.w * 0.42 + 4), cy - 3, 4 * f, 2);
  },
  water(h) {
    ctx.fillStyle = 'rgba(47,127,181,.85)';
    ctx.beginPath(); ctx.moveTo(h.x, h.y + h.h);
    for (let x = 0; x <= h.w; x += 12) ctx.lineTo(h.x + x, h.y + 4 + Math.sin((h.x + x) * 0.05 + G.frame * 0.08) * 3);
    ctx.lineTo(h.x + h.w, h.y + h.h); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    for (let x = 10; x < h.w; x += 40) ctx.fillRect(h.x + x + (G.frame * 0.3) % 20, h.y + 14, 14, 2);
  },
  fire(h) {
    for (let i = 0; i < Math.max(1, Math.round(h.w / 16)); i++) {
      const fx = h.x + 8 + i * 16, fl = Math.sin(G.frame * 0.3 + i * 2) * 3;
      ctx.fillStyle = '#ff7a1c'; ctx.beginPath(); ctx.moveTo(fx - 7, h.y + h.h); ctx.quadraticCurveTo(fx - 8, h.y + h.h * 0.4, fx + fl, h.y); ctx.quadraticCurveTo(fx + 8, h.y + h.h * 0.4, fx + 7, h.y + h.h); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(fx - 3, h.y + h.h); ctx.quadraticCurveTo(fx, h.y + h.h * 0.4, fx + fl * 0.5, h.y + h.h * 0.35); ctx.quadraticCurveTo(fx + 4, h.y + h.h * 0.6, fx + 3, h.y + h.h); ctx.fill();
    }
  },
  balloon(h) {      // Holi water balloon: bright, never red (red means a static trap)
    const cx = h.x + h.w / 2, cy = h.y + h.h * 0.45;
    ctx.fillStyle = ['#ff3fa4', '#2fd06b', '#ffd23f'][h.hue || 0];
    ctx.beginPath(); ctx.ellipse(cx, cy, h.w / 2, h.h * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(cx - 3, cy - 4, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fbeedd'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx, h.y + h.h * 0.9); ctx.lineTo(cx + 2, h.y + h.h); ctx.stroke();
  },
  bus(h) {          // hill bus: white with a green stripe
    const { x, y, w } = h, hh = h.h;
    ctx.fillStyle = '#eef0e6'; rrect(x, y, w, hh - 10, 8); ctx.fill();
    ctx.fillStyle = '#2f8f4e'; ctx.fillRect(x, y + hh * 0.55, w, 8);
    ctx.fillStyle = '#2a3440';
    for (let wx = x + 10; wx < x + w - 24; wx += 26) ctx.fillRect(wx, y + 8, 18, 14);
    ctx.fillStyle = '#1a1324';
    for (const wx of [x + 18, x + w - 18]) { ctx.beginPath(); ctx.arc(wx, y + hh - 9, 8, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(h.vx < 0 ? x : x + w - 6, y + hh * 0.4, 6, 7);
  },
  box(h) { ctx.fillStyle = RED; ctx.fillRect(h.x, h.y, h.w, h.h); },
};
function roundThing(h, a, b) {
  const r = h.w / 2, cx = h.x + r, cy = h.y + h.h / 2;
  ctx.fillStyle = a; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = b; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, h.rot, h.rot + 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, h.rot + 3, h.rot + 4.5); ctx.stroke();
}

function drawWind(z) {
  if (!z.fx) return;
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < z.w * z.h / 2400; i++) {
    const len = 18 + (i % 3) * 10;
    let x = (i * 53 + G.frame * z.fx * 2) % z.w; if (x < 0) x += z.w;
    const y = z.y + ((i * 37) % z.h);
    ctx.moveTo(z.x + x, y); ctx.lineTo(z.x + x - Math.sign(z.fx) * len, y);
  }
  ctx.stroke();
}

function drawFlood(fl) {
  if (fl.y > H) return;
  const lava = fl.kind === 'lava';
  ctx.fillStyle = lava ? '#ff3b6b' : 'rgba(47,127,181,.9)';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, fl.y + Math.sin(x * 0.04 + G.frame * 0.1) * 4);
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  for (let x = 0; x < W; x += 60) ctx.fillRect(x + ((G.frame * 0.5) % 60), fl.y + 18, 18, 3);
}

function drawLevel() {
  const L = G.L, th = themeOf(G.idx), pal = th.pal, wd = WORLDS[L.def.world];
  ctx.drawImage(background(wd.theme), 0, 0, W, H);
  if (th.live) th.live(ctx, G.frame);
  ctx.save();
  if (G.shake) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
  for (const s of L.signs) pill(s.text, s.x, s.y, 14, pal.text);
  for (const z of L.winds) drawWind(z);
  for (const d of L.doors) drawDoor(d);
  for (const sp of L.spikes) drawSpikes(sp);
  for (const h of L.hazards) if (h.kind === 'water') HAZARD_DRAW.water(h);
  for (const s of L.solids) drawSolid(s, pal);
  for (const h of L.hazards) if (h.kind !== 'water') (HAZARD_DRAW[h.kind] || HAZARD_DRAW.box)(h);
  if (L.flood) drawFlood(L.flood);
  if (G.state !== 'dead') drawPlayer(L, G.P);
  for (const p of G.particles) {
    ctx.globalAlpha = Math.min(1, p.life / 20);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // HUD
  ctx.fillStyle = 'rgba(20,12,24,.78)';
  rrect(10, 10, 380, 30, 15); ctx.fill();
  rrect(W - 230, 10, 220, 30, 15); ctx.fill();
  const lv = LEVELS[G.idx];
  text(lv.rooms ? `BOSS ${lv.name}  ·  kamra ${G.room + 1}/${lv.rooms.length}  ·  ${L.def.name}` : `${wd.name}  ${L.def.num + 1}/${wd.levels.length}  ·  ${L.def.name}`, 26, 26, 14, lv.rooms ? '#ffcf6b' : CREAM, 'left', 700);
  text(`yahan ☠ ${G.levelDeaths}`, W - 216, 26, 14, DIM, 'left', 700);
  text(`total ☠ ${save.deaths}`, W - 24, 26, 14, RED, 'right', 800);

  if (L.t < 100 && G.state === 'play') {
    ctx.globalAlpha = Math.min(1, (100 - L.t) / 30);
    if (lv.rooms && G.room === 0) { text(`BOSS: ${lv.name}`, W / 2, 130, 46, RED); text(`${wd.name} · ${lv.rooms.length} kamre, har kamre pe checkpoint`, W / 2, 175, 18, CREAM, 'center', 600); }
    else if (lv.rooms) text(L.def.name, W / 2, 150, 34, CREAM);
    else if (L.def.num === 0) { text(wd.name, W / 2, 130, 46, '#ffcf6b'); text(wd.tagline, W / 2, 175, 18, CREAM, 'center', 600); }
    else text(L.def.name, W / 2, 150, 34, CREAM);
    ctx.globalAlpha = 1;
  }
  if (L.msg && G.state !== 'dead') { ctx.globalAlpha = Math.min(1, L.msg.t / 30); pill(L.msg.text, W / 2, 215, 24, '#ffcf6b'); ctx.globalAlpha = 1; }
  if (G.state === 'dead') {
    ctx.fillStyle = 'rgba(20,12,24,.55)';
    ctx.fillRect(0, H / 2 - 40, W, 80);
    text(G.quip, W / 2, H / 2, 26, '#ffcf6b');
  }
  if (G.state === 'play' && canOfferSkip() && !G.paused) {
    ctx.fillStyle = 'rgba(20,12,24,.85)'; rrect(W - 230, 48, 220, 30, 15); ctx.fill();
    ctx.strokeStyle = '#ffcf6b'; ctx.lineWidth = 1.5; ctx.stroke();
    text('⏭ skip karo (ad dekho)  K', W - 120, 64, 13, '#ffcf6b', 'center', 700);
    button(W - 230, 48, 220, 30, skipLevel);
  }
  if (G.paused && !Ads.busy) {
    overlay('ruko zara...', '');
    const rows = [['wapas khelo  (P)', () => { G.paused = false; }], ['restart  (R)', restartLevel], ['settings  (O)', openSettings], ['menu  (ESC)', quitToMenu]];
    rows.forEach(([label, fn], i) => menuRow(label, W / 2 - 150, 290 + i * 50, 300, i === 0, fn));
  }
}

function menuRow(label, x, y, w, hot, fn) {
  ctx.fillStyle = hot ? '#ffcf6b' : 'rgba(251,238,221,.14)';
  rrect(x, y, w, 40, 20); ctx.fill();
  text(label, x + w / 2, y + 21, 17, hot ? INK : CREAM, 'center', 700);
  button(x, y, w, 40, fn);
}

function drawSettings() {
  const st = G.settings;
  ctx.fillStyle = 'rgba(20,12,24,.82)'; ctx.fillRect(0, 0, W, H);
  G.buttons = [];   // the panel is modal: nothing underneath is clickable
  text('settings', W / 2, 52, 34, '#ffcf6b');
  SETTINGS.forEach((row, i) => {
    const y = 86 + i * 54, on = i === st.sel;
    let label = row.label;
    if (row.key) label += save[row.key] ? '   ON' : '   OFF';
    if (row.skin) label = skinLabel();
    if (row.reset && st.confirmReset) label = 'pakka? sab progress mit jayega. phir dabao';
    ctx.fillStyle = on ? '#ffcf6b' : 'rgba(251,238,221,.12)';
    rrect(W / 2 - 230, y, 460, 44, 22); ctx.fill();
    text(label, W / 2, y + 23, 17, on ? INK : (row.key && !save[row.key] ? DIM : CREAM), 'center', 700);
    button(W / 2 - 230, y, 460, 44, () => (st.sel === i ? activateSetting(i) : (st.sel = i)));
  });
  text('↑ ↓ chuno  ·  ENTER badlo  ·  ESC wapas  ·  tap twice to change', W / 2, 482, 13, DIM, 'center', 600);
  const lv = Stats.data.levels, played = Object.keys(lv).length;
  if (played) {
    const worst = Object.entries(lv).sort((a, b) => b[1].deaths - a[1].deaths)[0];
    text(`is device pe: ${played} levels khele · sabse zyada ☠ ${worst[0]} (${worst[1].deaths})`, W / 2, 510, 12, DIM, 'center', 600);
  }
}

function drawAd() {
  ctx.fillStyle = 'rgba(10,6,14,.92)'; ctx.fillRect(0, 0, W, H);
  if (Ads.showing) {
    text(Ads.showing.type === 'rewarded' ? '📺 ad chal raha hai... phir level skip' : '📺 chhota sa break', W / 2, H / 2 - 10, 26, '#ffcf6b');
    if (Ads.provider === MockAds) text('(mock ad — the real one comes from the ad network)', W / 2, H / 2 + 30, 13, DIM, 'center', 600);
  } else text('ek second...', W / 2, H / 2, 22, CREAM);
}

function gearButton() {
  ctx.fillStyle = 'rgba(20,12,24,.7)';
  ctx.beginPath(); ctx.arc(W - 34, 34, 20, 0, Math.PI * 2); ctx.fill();
  text('⚙', W - 34, 35, 22, CREAM);
  button(W - 54, 14, 40, 40, openSettings);
}

function overlay(title, sub) {
  ctx.fillStyle = 'rgba(20,12,24,.7)'; ctx.fillRect(0, 0, W, H);
  text(title, W / 2, H / 2 - 20, 44, '#ffcf6b');
  text(sub, W / 2, H / 2 + 30, 16, CREAM, 'center', 600);
}

function button(x, y, w, h, fn) { G.buttons.push({ x, y, w, h, fn }); }

function drawTitle() {
  const wi = homeWorld();
  ctx.drawImage(background(WORLDS[wi].theme), 0, 0, W, H);
  ctx.fillStyle = 'rgba(20,12,24,.45)'; ctx.fillRect(0, 0, W, H);
  const bob = Math.sin(G.frame * 0.05) * 6;
  text('FLOOR PE DHOKHA', W / 2, 120 + bob, 68, '#ffcf6b');
  text('Chotu ki chai. aapka bharosa. dono girenge.', W / 2, 180, 19, CREAM, 'center', 600);
  ctx.save(); ctx.translate(W / 2, 330); ctx.scale(3, 3); drawChotu(PW, PH, Math.sin(G.frame * 0.02) > 0 ? 1 : -1, true); ctx.restore();
  ctx.fillStyle = THEMES[WORLDS[wi].theme].pal.block; ctx.fillRect(W / 2 - 90, 330, 180, 14);
  if (G.frame % 60 < 42) text('ENTER dabao  /  tap karo', W / 2, 400, 22, DOOR);
  text('← →  chalo   ·   SPACE / ↑  koodo   ·   R  restart   ·   P  pause   ·   O  settings   ·   M  mute', W / 2, 450, 14, DIM, 'center', 600);
  if (save.deaths) text(`ab tak ☠ ${save.deaths}`, W / 2, 490, 14, RED, 'center', 700);
  button(0, 0, W, H, openMenu);
  gearButton();
}

// After the last level of a world: celebrate, say what just opened up, then on to the next state.
function worldDoneNext() {
  const k = STATE_ORDER.find(wi => unlocked(wi) && !complete(wi));
  return k == null ? -1 : k;
}
function worldDoneGo() {
  const nx = worldDoneNext();
  G.newSkin = null;
  if (nx >= 0 && WORLDS[G.doneWorld].kind !== 'ut') goToLevel(nextIn(nx)); else openMenu(nx);
}
function drawWorldDone() {
  const prev = WORLDS[G.doneWorld], nx = worldDoneNext(), next = nx >= 0 ? WORLDS[nx] : null;
  ctx.drawImage(background((next || prev).theme), 0, 0, W, H);
  ctx.fillStyle = 'rgba(20,12,24,.62)'; ctx.fillRect(0, 0, W, H);
  text(prev.kind === 'ut' ? `${prev.name} boss — haraya!` : `${prev.name} — khatam!`, W / 2, 130, 44, DOOR);
  let y = 200;
  if (G.newSkin) {
    text(`inaam mila: ${SKINS[G.newSkin] || G.newSkin} Chotu!`, W / 2, y, 22, '#ffcf6b');
    ctx.save(); ctx.translate(W / 2, y + 112); ctx.scale(2.2, 2.2); drawChotu(PW, PH, 1, true, 0.74, G.newSkin); ctx.restore();
    text('settings mein badal sakte ho', W / 2, y + 134, 13, DIM, 'center', 600);
    y += 170;
  }
  // a boss that just became available (only right after the state that opened it)
  const boss = WORLDS.findIndex((w, wi) => w.kind === 'ut' && unlocked(wi) && !complete(wi));
  if (boss >= 0 && G.justDone && G.justDone.states < (WORLDS[boss].unlockAfter ?? 2) && prev.kind !== 'ut') {
    pill(`naya BOSS khula: ${WORLDS[boss].name} (naksha pe ★)`, W / 2, y, 16, '#ffcf6b'); y += 44;
  }
  if (next && prev.kind !== 'ut') {
    text('chai break le lo. agla stop:', W / 2, y + 10, 18, CREAM, 'center', 600);
    text(next.name, W / 2, y + 56, 40, '#ffcf6b');
    text(next.tagline, W / 2, y + 98, 16, DIM, 'center', 600);
  }
  if (G.frame % 60 < 42) text(next && prev.kind !== 'ut' ? 'ENTER / tap = aage · ESC = naksha' : 'ENTER / tap = naksha', W / 2, 500, 18, DOOR);
  button(0, 0, W, H, worldDoneGo);
}

function drawEnd() {
  ctx.drawImage(background(WORLDS[WORLDS.length - 1].theme), 0, 0, W, H);
  ctx.fillStyle = 'rgba(20,12,24,.6)'; ctx.fillRect(0, 0, W, H);
  const secs = Math.round((G.runEnd - G.runStart) / 60);
  text('CHOTU GHAR PAHUNCH GAYA!', W / 2, 140, 44, DOOR);
  text('floor ab bhi naraz hai.', W / 2, 190, 18, DIM, 'center', 600);
  text(`is run mein ☠ ${G.runDeaths}`, W / 2, 260, 24, CREAM);
  text(`samay: ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, W / 2, 296, 24, CREAM);
  text(G.runDeaths < 50 ? 'kya baat hai! ekdum jhakaas' : G.runDeaths < 200 ? 'mehnat ka phal meetha hota hai' : 'himmat ki daad deni padegi', W / 2, 346, 18, '#ffcf6b', 'center', 700);
  ctx.save(); ctx.translate(W / 2, 450); ctx.scale(2.5, 2.5); drawChotu(PW, PH, 1, true); ctx.restore();
  if (G.frame % 60 < 42) text('ENTER / tap', W / 2, 500, 18, DOOR);
  button(0, 0, W, H, openMenu);
}

function draw() {
  G.buttons = [];
  if (G.state === 'title') drawTitle();
  else if (G.state === 'map') drawMap();
  else if (G.state === 'worldDone') drawWorldDone();
  else if (G.state === 'end') drawEnd();
  else drawLevel();
  if (Ads.showing || G.state === 'adbreak') drawAd();
  else if (G.settings) drawSettings();
}

// ---------- boot (browser only) ----------
function boot() {
  // testing aid, local only: index.html?all unlocks every level (not saved until you beat one)
  if (IS_DEV && query.has('all')) WORLDS.forEach(w => { if (w.kind !== 'ut') save.done[w.id] = w.levels.length; });
  if (migrateSave.happened) persist();
  Stats.load();
  Stats.track('session_start', { level: null, unlocked: Object.values(save.done).reduce((a, b) => a + b, 0) });
  Ads.init();
  if (location.protocol.startsWith('http') && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  cv = document.getElementById('c');
  ctx = cv.getContext('2d');
  const resize = () => {
    // dpr capped at 2: 3x phones don't need a 9x-pixel canvas
    const dpr = Math.min(2, window.devicePixelRatio || 1), s = Math.min(innerWidth / W, innerHeight / H);
    cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
    cv.width = Math.round(W * s * dpr); cv.height = Math.round(H * s * dpr);
    ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
  };
  addEventListener('resize', resize);
  resize();

  addEventListener('keydown', e => {
    audioInit();
    const k = KEYMAP[e.code];
    if (k) { e.preventDefault(); if (G.state === 'play') press(k); }
    onKey(e);
  });
  addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) G.held[k] = false; });
  const releaseAll = () => { G.held.left = G.held.right = G.held.jump = false; };
  addEventListener('blur', () => { releaseAll(); if (G.state === 'play') G.paused = true; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') { releaseAll(); G.paused = true; } });
  addEventListener('pagehide', () => { if (G.state === 'play' || G.state === 'dead') Stats.track('level_quit', { level: levelId(G.idx), deaths: G.levelDeaths }); });

  const logical = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  cv.addEventListener('pointerdown', e => {
    audioInit();
    const [x, y] = logical(e);
    const b = [...G.buttons].reverse().find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (b) return b.fn();
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    mapPointer('down', e.pointerId, x, y);
  });
  cv.addEventListener('pointermove', e => { const [x, y] = logical(e); mapPointer('move', e.pointerId, x, y); });
  cv.addEventListener('pointerup', e => { const [x, y] = logical(e); mapPointer('up', e.pointerId, x, y); });
  cv.addEventListener('pointercancel', e => { const [x, y] = logical(e); mapPointer('cancel', e.pointerId, x, y); });
  cv.addEventListener('wheel', e => { if (G.state !== 'map') return; e.preventDefault(); const [x, y] = logical(e); mapWheel(x, y, e.deltaY); }, { passive: false });
  const touch = document.getElementById('touch');
  if (matchMedia('(pointer: coarse)').matches) touch.classList.add('on');
  for (const btn of touch.querySelectorAll('[data-k]')) {
    const k = btn.dataset.k;
    btn.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); if (!G.paused && !G.settings) press(k); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, () => { G.held[k] = false; });
  }
  touch.querySelector('[data-a=pause]').addEventListener('pointerdown', e => { e.preventDefault(); if (G.state === 'play') G.paused = !G.paused; });

  let last = performance.now(), acc = 0;
  const STEP = 1000 / 60;
  const loop = now => {
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= STEP) { update(); acc -= STEP; }
    touch.classList.toggle('playing', (G.state === 'play' || G.state === 'dead' || G.state === 'win') && !G.paused && !G.settings);
    const m = G.map, onMap = G.state === 'map' && m;
    const wi = onMap ? (m.zoom != null ? m.zoom : Math.max(0, regionWorld(m.sel))) : G.L && G.state !== 'title' ? G.L.def.world : homeWorld();
    Music.update(actx, save.music && !Portal.muted && !Ads.showing && !document.hidden, WORLDS[wi].theme);
    Portal.gameplay((G.state === 'play' || G.state === 'dead') && !G.paused && !G.settings && !Ads.showing);
    draw();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
if (typeof document !== 'undefined' && document.getElementById('c')) boot();
