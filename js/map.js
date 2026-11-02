'use strict';
// The menu: a map of India. States with levels are stages, UTs are boss pins, everything else is greyed
// out ("jald aa raha hai"). Tap a state to select it, tap again (or ENTER) to zoom in and pick a level.
// Outlines come from js/map-data.js (generated from Survey of India data by tools/build-map.js).
//
// G.map = { sel: region code, zoom: world index | null, cam, goal, toast, ptrs, drag }
//   cam/goal: { x, y, s } = map point at the centre of MAP_AREA, and screen px per map unit.
// While zoomed into a world, G.sel is the selected level index (as before the map existed).

const MAP_AREA = { x: 10, y: 10, w: 540, h: 520 };
const PANEL = { x: 566, w: 380 };
const MAP_BY_CODE = {};
for (const r of MAP_REGIONS) MAP_BY_CODE[r.code] = r;
const regionWorld = code => WORLDS.findIndex(w => w.region === code);
// regions you can actually play, in play order: what the arrow keys step through
const PLAYABLE = WORLDS.map(w => w.region).filter(c => MAP_BY_CODE[c]);

function regionStatus(code) {
  const wi = regionWorld(code);
  if (wi < 0) return 'soon';
  return !unlocked(wi) ? 'locked' : complete(wi) ? 'done' : 'open';
}

// ---------- camera ----------
function camFit(box, pad, maxS = 7) {
  const s = Math.min((MAP_AREA.w - 2 * pad) / Math.max(1, box[2]), (MAP_AREA.h - 2 * pad) / Math.max(1, box[3]), maxS);
  return { x: box[0] + box[2] / 2, y: box[1] + box[3] / 2, s };
}
const camHome = () => camFit([0, 0, MAP_W, MAP_H], 4);
const toScreen = (cam, mx, my) => [MAP_AREA.x + MAP_AREA.w / 2 + (mx - cam.x) * cam.s, MAP_AREA.y + MAP_AREA.h / 2 + (my - cam.y) * cam.s];
const toMap = (cam, sx, sy) => [(sx - MAP_AREA.x - MAP_AREA.w / 2) / cam.s + cam.x, (sy - MAP_AREA.y - MAP_AREA.h / 2) / cam.s + cam.y];
function clampCam(c) {
  const home = camHome();
  c.s = Math.max(home.s, Math.min(9, c.s));
  c.x = Math.max(0, Math.min(MAP_W, c.x));
  c.y = Math.max(0, Math.min(MAP_H, c.y));
  return c;
}
function regionCam(code) {
  const r = MAP_BY_CODE[code];
  return r.rings.length ? camFit(r.box, 60, 6) : { x: r.pin[0], y: r.pin[1], s: 4 };
}

// ---------- opening, selecting, zooming ----------
// openMenu(wi): show the map; with a world index, zoom straight into it (e.g. after quitting a level)
function openMenu(wi) {
  const home = homeWorld();
  if (!G.map) G.map = { sel: WORLDS[home].region, zoom: null, cam: camHome(), goal: camHome(), toast: null, ptrs: new Map(), drag: null };
  G.state = 'map';
  G.paused = false;
  if (wi != null && wi >= 0 && unlocked(wi)) zoomInto(wi);
  else { G.map.zoom = null; G.map.goal = camHome(); if (wi != null && wi >= 0) G.map.sel = WORLDS[wi].region; }
}
function zoomInto(wi) {
  const m = G.map;
  m.zoom = wi; m.sel = WORLDS[wi].region;
  m.goal = regionCam(m.sel);
  const cur = LEVELS[G.sel];
  if (!cur || cur.world !== wi || !levelUnlocked(G.sel)) G.sel = nextIn(wi);
  sfx.click();
}
function zoomOut() { const m = G.map; m.zoom = null; m.goal = camHome(); sfx.click(); }
function toast(text) { G.map.toast = { text, t: 130 }; }

function selectRegion(code) {
  const m = G.map, st = regionStatus(code), r = MAP_BY_CODE[code];
  const again = m.sel === code;
  m.sel = code;
  if (st === 'soon') { toast(`${r.name}: jald aa raha hai`); sfx.click(); return; }
  if (st === 'locked') { toast(lockedReason(regionWorld(code))); sfx.click(); return; }
  if (again) zoomInto(regionWorld(code)); else sfx.click();
}
function lockedReason(wi) {
  const w = WORLDS[wi];
  if (w.kind === 'ut') return `boss: pehle ${w.unlockAfter ?? 2} states khatam karo (${statesDone()}/${w.unlockAfter ?? 2})`;
  const prev = WORLDS[STATE_ORDER[STATE_ORDER.indexOf(wi) - 1]];
  return `pehle ${prev.name} khatam karo`;
}

// ---------- keyboard ----------
function mapKey(c) {
  const m = G.map;
  if (m.zoom == null) {
    const step = { ArrowLeft: -1, KeyA: -1, ArrowUp: -1, KeyW: -1, ArrowRight: 1, KeyD: 1, ArrowDown: 1, KeyS: 1 }[c];
    if (step) {
      const k = PLAYABLE.indexOf(m.sel);
      m.sel = PLAYABLE[((k < 0 ? 0 : k + step) + PLAYABLE.length) % PLAYABLE.length];
      sfx.click();
    }
    if (c === 'Enter' || c === 'Space') {
      const wi = regionWorld(m.sel);
      if (wi >= 0 && unlocked(wi)) zoomInto(wi); else selectRegion(m.sel);
    }
    if (c === 'Escape') G.state = 'title';
    return;
  }
  const wi = m.zoom, first = firstLevel(wi), n = WORLDS[wi].levels.length;
  const move = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1, ArrowUp: -5, KeyW: -5, ArrowDown: 5, KeyS: 5 }[c];
  if (move) {
    const to = Math.max(first, Math.min(first + n - 1, G.sel + move));
    if (levelUnlocked(to)) { G.sel = to; sfx.click(); }
  }
  if (c === 'Enter' || c === 'Space') startAt(G.sel);
  if (c === 'Escape' || c === 'Backspace') zoomOut();
}

// ---------- pointer: tap to select, drag to pan, pinch / wheel to zoom ----------
const inMapArea = (x, y) => x >= MAP_AREA.x && x <= MAP_AREA.x + MAP_AREA.w && y >= MAP_AREA.y && y <= MAP_AREA.y + MAP_AREA.h;
function mapPointer(type, id, x, y) {
  const m = G.map;
  if (!m || G.state !== 'map' || G.settings) return;
  if (type === 'down') {
    if (!inMapArea(x, y)) return;
    m.ptrs.set(id, { x, y });
    m.drag = { moved: 0, cam: { ...m.cam }, start: [...m.ptrs.values()].map(p => ({ ...p })) };
    return;
  }
  if (!m.ptrs.has(id)) return;
  if (type === 'move') {
    const p = m.ptrs.get(id), d = m.drag;
    d.moved += Math.hypot(x - p.x, y - p.y);
    p.x = x; p.y = y;
    const pts = [...m.ptrs.values()];
    if (pts.length !== d.start.length) { d.start = pts.map(q => ({ ...q })); d.cam = { ...m.cam }; return; }
    const c = { ...d.cam };
    if (pts.length >= 2) {
      const [a, b] = pts, [a0, b0] = d.start;
      const mid0 = [(a0.x + b0.x) / 2, (a0.y + b0.y) / 2], mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
      const anchor = toMap(d.cam, mid0[0], mid0[1]);
      c.s = d.cam.s * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(10, Math.hypot(a0.x - b0.x, a0.y - b0.y));
      clampCam(c);
      // keep the map point under the fingers' midpoint under the midpoint
      c.x = anchor[0] - (mid[0] - MAP_AREA.x - MAP_AREA.w / 2) / c.s;
      c.y = anchor[1] - (mid[1] - MAP_AREA.y - MAP_AREA.h / 2) / c.s;
    } else {
      c.x = d.cam.x - (x - d.start[0].x) / c.s;
      c.y = d.cam.y - (y - d.start[0].y) / c.s;
    }
    if (d.moved > 6) { m.cam = clampCam(c); m.goal = { ...m.cam }; }
    return;
  }
  // up / cancel
  const single = m.ptrs.size === 1, d = m.drag;
  m.ptrs.delete(id);
  if (type === 'up' && single && d && d.moved <= 6) mapTap(x, y);
  if (!m.ptrs.size) m.drag = null;
}
function mapWheel(x, y, dy) {
  const m = G.map;
  if (!m || G.state !== 'map' || G.settings || !inMapArea(x, y)) return;
  const anchor = toMap(m.cam, x, y), c = { ...m.cam, s: m.cam.s * Math.exp(-dy * 0.0015) };
  clampCam(c);
  c.x = anchor[0] - (x - MAP_AREA.x - MAP_AREA.w / 2) / c.s;
  c.y = anchor[1] - (y - MAP_AREA.y - MAP_AREA.h / 2) / c.s;
  m.cam = clampCam(c); m.goal = { ...m.cam };
}

// What's under a tap: UT pins first (generous 20px), then small states by centroid (14px), then outlines.
function regionAt(x, y) {
  const cam = G.map.cam;
  let best = null, bd = 20;
  for (const r of MAP_REGIONS) {
    if (r.kind !== 'ut') continue;
    const [px, py] = toScreen(cam, r.pin[0], r.pin[1]), d = Math.hypot(x - px, y - py);
    if (d < bd) { bd = d; best = r.code; }
  }
  if (best) return best;
  bd = 14;
  for (const r of MAP_REGIONS) {
    if (r.kind === 'ut' || Math.max(r.box[2], r.box[3]) * cam.s > 28) continue;
    const [px, py] = toScreen(cam, r.c[0], r.c[1]), d = Math.hypot(x - px, y - py);
    if (d < bd) { bd = d; best = r.code; }
  }
  if (best) return best;
  const [mx, my] = toMap(cam, x, y);
  for (const r of MAP_REGIONS) {
    if (mx < r.box[0] || my < r.box[1] || mx > r.box[0] + r.box[2] || my > r.box[1] + r.box[3]) continue;
    let inside = false;
    for (const g of r.rings) {
      for (let i = 0, j = g.length - 2; i < g.length; j = i, i += 2) {
        if ((g[i + 1] > my) !== (g[j + 1] > my) && mx < (g[j] - g[i]) * (my - g[i + 1]) / (g[j + 1] - g[i + 1]) + g[i]) inside = !inside;
      }
    }
    if (inside) return r.code;
  }
  return null;
}
function mapTap(x, y) {
  const code = regionAt(x, y);
  if (!code) { if (G.map.zoom != null) zoomOut(); return; }
  if (G.map.zoom != null && code === G.map.sel) return;
  if (G.map.zoom != null) G.map.zoom = null;
  selectRegion(code);
}

function mapUpdate() {
  const m = G.map;
  if (!m) return;
  if (!m.ptrs.size) for (const k of ['x', 'y', 's']) {
    m.cam[k] += (m.goal[k] - m.cam[k]) * 0.16;
    if (Math.abs(m.goal[k] - m.cam[k]) < 1e-3) m.cam[k] = m.goal[k];
  }
  if (m.toast && --m.toast.t <= 0) m.toast = null;
}

// ---------- drawing ----------
const MAP_COLORS = {
  sea: '#16202f', soon: '#3a3148', soonEdge: '#55496a',
  locked: '#7b6450', open: '#e9a23b', done: '#3fae7c', edge: '#1a1324',
};
let mapPaths = null;
function buildMapPaths() {
  mapPaths = {};
  for (const r of MAP_REGIONS) {
    const p = new Path2D();
    for (const g of r.rings) { p.moveTo(g[0], g[1]); for (let i = 2; i < g.length; i += 2) p.lineTo(g[i], g[i + 1]); p.closePath(); }
    mapPaths[r.code] = p;
  }
}

function drawMap() {
  const m = G.map, cam = m.cam, zoomed = m.zoom != null;
  if (!mapPaths) buildMapPaths();
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  ctx.save();
  rrect(MAP_AREA.x, MAP_AREA.y, MAP_AREA.w, MAP_AREA.h, 18); ctx.fillStyle = MAP_COLORS.sea; ctx.fill(); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1;            // faint sea swell
  for (let y = MAP_AREA.y + 14; y < MAP_AREA.y + MAP_AREA.h; y += 22) {
    ctx.beginPath();
    for (let x = MAP_AREA.x; x <= MAP_AREA.x + MAP_AREA.w; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.05 + y + G.frame * 0.02) * 2);
    ctx.stroke();
  }
  ctx.translate(MAP_AREA.x + MAP_AREA.w / 2, MAP_AREA.y + MAP_AREA.h / 2);
  ctx.scale(cam.s, cam.s);
  ctx.translate(-cam.x, -cam.y);
  ctx.lineJoin = 'round';
  for (const r of MAP_REGIONS) {
    if (!r.rings.length) continue;
    const st = regionStatus(r.code), focus = zoomed && r.code === m.sel;
    let fill = st === 'soon' ? MAP_COLORS.soon : MAP_COLORS[st];
    ctx.globalAlpha = zoomed && !focus ? 0.45 : 1;
    ctx.fillStyle = fill;
    ctx.fill(mapPaths[r.code], 'evenodd');
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = MAP_COLORS.edge; ctx.lineWidth = 1 / cam.s;
  for (const r of MAP_REGIONS) if (r.rings.length) ctx.stroke(mapPaths[r.code]);
  const sel = MAP_BY_CODE[m.sel];
  if (sel && sel.rings.length) {
    ctx.strokeStyle = '#ffcf6b'; ctx.lineWidth = 2.5 / cam.s;
    ctx.stroke(mapPaths[sel.code]);
  }
  ctx.restore();

  // labels and pins in screen space, so they stay the same size at any zoom
  ctx.save();
  rrect(MAP_AREA.x, MAP_AREA.y, MAP_AREA.w, MAP_AREA.h, 18); ctx.clip();
  for (const code of PLAYABLE) {
    const r = MAP_BY_CODE[code];
    if (r.kind === 'ut' || (zoomed && code !== m.sel)) continue;
    const [x, y] = toScreen(cam, r.c[0], r.c[1]), st = regionStatus(code);
    pill((st === 'locked' ? '🔒 ' : st === 'done' ? '✓ ' : '') + WORLDS[regionWorld(code)].name, x, y, zoomed ? 15 : 11, code === m.sel ? '#ffcf6b' : CREAM);
  }
  for (const r of MAP_REGIONS) {
    if (r.kind !== 'ut') continue;
    const [x, y] = toScreen(cam, r.pin[0], r.pin[1]), st = regionStatus(r.code), on = r.code === m.sel;
    const boss = st !== 'soon', rad = boss ? 10 : 5.5;
    if (on) { ctx.strokeStyle = '#ffcf6b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, rad + 5 + Math.sin(G.frame * 0.1) * 1.5, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = !boss ? '#6c6080' : st === 'locked' ? MAP_COLORS.locked : st === 'done' ? MAP_COLORS.done : RED;
    ctx.strokeStyle = boss ? CREAM : '#a99cbc'; ctx.lineWidth = boss ? 2 : 1.2;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (boss) text(st === 'locked' ? '🔒' : st === 'done' ? '✓' : '★', x, y + 1, 11, CREAM, 'center', 800);
    if (boss && !zoomed) pill(`BOSS: ${r.name}`, x, y - 22, 11, on ? '#ffcf6b' : CREAM);
  }
  ctx.restore();

  if (m.toast) {
    ctx.globalAlpha = Math.min(1, m.toast.t / 25);
    pill(m.toast.text, MAP_AREA.x + MAP_AREA.w / 2, MAP_AREA.y + MAP_AREA.h - 30, 15, '#ffcf6b', 'rgba(20,12,24,.9)');
    ctx.globalAlpha = 1;
  }
  if (zoomed) drawRegionPanel(); else drawIndiaPanel();
  gearButton();
}

function panelButton(label, x, y, w, h, hot, fn) {
  ctx.fillStyle = hot ? '#ffcf6b' : 'rgba(251,238,221,.14)';
  rrect(x, y, w, h, h / 2); ctx.fill();
  text(label, x + w / 2, y + h / 2 + 1, 16, hot ? INK : CREAM, 'center', 800);
  button(x, y, w, h, fn);
}
function wrapText(str, x, y, maxW, size, color, lh = size * 1.35) {
  ctx.font = `600 ${size}px ${FONT}`;
  let line = '', yy = y;
  for (const word of str.split(' ')) {
    const t = line ? line + ' ' + word : word;
    if (ctx.measureText(t).width > maxW && line) { text(line, x, yy, size, color, 'left', 600); line = word; yy += lh; } else line = t;
  }
  if (line) text(line, x, yy, size, color, 'left', 600);
  return yy + lh;
}

function drawIndiaPanel() {
  const m = G.map, r = MAP_BY_CODE[m.sel], wi = regionWorld(m.sel), st = regionStatus(m.sel), x = PANEL.x;
  text('kahan chalein?', x, 38, 28, '#ffcf6b', 'left');
  text('Bharat darshan, ek troll level at a time', x, 68, 13, DIM, 'left', 600);
  // card for the selected region
  ctx.fillStyle = 'rgba(251,238,221,.07)'; rrect(x, 92, PANEL.w, 236, 18); ctx.fill();
  const tag = r.kind === 'ut' ? (wi >= 0 ? 'UT · BOSS LEVEL' : 'UNION TERRITORY') : 'STATE';
  text(tag, x + 20, 118, 12, r.kind === 'ut' && wi >= 0 ? RED : DIM, 'left', 800);
  ctx.font = `800 26px ${FONT}`;
  const size = ctx.measureText(r.name).width > PANEL.w - 40 ? 19 : 26;
  text(r.name, x + 20, 150, size, CREAM, 'left');
  if (wi < 0) {
    text('jald aa raha hai', x + 20, 196, 20, '#ffcf6b', 'left', 700);
    wrapText('Chotu yahan bhi aayega. abhi ke liye rangeen states mein khelo.', x + 20, 232, PANEL.w - 40, 14, DIM);
  } else {
    const w = WORLDS[wi], n = w.levels.length, done = doneIn(wi);
    wrapText(w.tagline, x + 20, 184, PANEL.w - 40, 14, DIM);
    if (w.kind === 'ut') {
      const rooms = w.levels[0].rooms ? w.levels[0].rooms.length : 1;
      text(`${rooms} kamre · har kamre pe checkpoint`, x + 20, 222, 14, CREAM, 'left', 700);
      if (w.reward) text(save.skins.includes(w.reward) ? `inaam: ${w.reward} Chotu ✓ mil gaya` : `inaam: ${w.reward} Chotu`, x + 20, 246, 14, '#ffcf6b', 'left', 700);
    } else {
      ctx.fillStyle = 'rgba(251,238,221,.12)'; rrect(x + 20, 214, PANEL.w - 40, 10, 5); ctx.fill();
      if (done) { ctx.fillStyle = DOOR; rrect(x + 20, 214, (PANEL.w - 40) * done / n, 10, 5); ctx.fill(); }
      text(`${done}/${n} paar`, x + 20, 242, 14, done >= n ? DOOR : CREAM, 'left', 700);
    }
    if (st === 'locked') wrapText('🔒 ' + lockedReason(wi), x + 20, 280, PANEL.w - 40, 14, DIM);
    else panelButton(st === 'done' ? 'phir se khelo ▶' : 'andar chalo ▶', x + 20, 272, PANEL.w - 40, 40, true, () => zoomInto(wi));
  }
  // legend
  const lg = [[MAP_COLORS.open, 'khula'], [MAP_COLORS.done, 'khatam'], [MAP_COLORS.locked, 'band'], [MAP_COLORS.soon, 'jald aa raha hai']];
  let lx = x;
  for (const [c, label] of lg) {
    ctx.fillStyle = c; rrect(lx, 350, 14, 14, 4); ctx.fill();
    ctx.font = `600 12px ${FONT}`;
    text(label, lx + 20, 358, 12, DIM, 'left', 600);
    lx += 20 + ctx.measureText(label).width + 16;
  }
  ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(x + 7, 386, 7, 0, Math.PI * 2); ctx.fill();
  text('UT = boss level (optional, inaam milega)', x + 20, 387, 12, DIM, 'left', 600);
  text(`☠ ${save.deaths}  ·  states khatam ${statesDone()}/${STATE_ORDER.length}`, x, 430, 14, CREAM, 'left', 700);
  if (G.frame % 60 < 42) text('tap = chuno · dobara tap = andar', x, 470, 14, DOOR, 'left', 700);
  text('← → chuno · ENTER andar · ESC wapas · pinch/scroll zoom', x, 500, 12, DIM, 'left', 600);
}

function drawRegionPanel() {
  const m = G.map, wi = m.zoom, w = WORLDS[wi], x = PANEL.x, first = firstLevel(wi);
  panelButton('← naksha', x, 16, 120, 34, false, zoomOut);
  text(w.name, x, 82, w.name.length > 14 ? 24 : 30, '#ffcf6b', 'left');
  wrapText(w.tagline, x, 112, PANEL.w, 13, DIM);
  const lv0 = LEVELS[first];
  if (lv0.rooms) {
    // a boss: one big tile
    const on = G.sel === first, y = 150;
    ctx.fillStyle = on ? '#ffcf6b' : 'rgba(251,238,221,.14)'; rrect(x, y, PANEL.w, 150, 18); ctx.fill();
    text('BOSS', x + 20, y + 28, 13, on ? INK : RED, 'left', 800);
    text(lv0.name, x + 20, y + 62, 28, on ? INK : CREAM, 'left');
    text(`${lv0.rooms.length} kamre · har kamre pe checkpoint`, x + 20, y + 96, 14, on ? INK : CREAM, 'left', 700);
    if (complete(wi)) text('✓ haraya!', x + PANEL.w - 20, y + 28, 14, on ? INK : DOOR, 'right', 800);
    if (w.reward) text(save.skins.includes(w.reward) ? `inaam: ${w.reward} Chotu ✓` : `inaam: ${w.reward} Chotu`, x + 20, y + 124, 13, on ? INK : '#ffcf6b', 'left', 700);
    button(x, y, PANEL.w, 150, () => (G.sel === first ? startAt(first) : (G.sel = first)));
  } else {
    const tw = 64, gap = (PANEL.w - tw * 5) / 4;
    w.levels.forEach((lv, li) => {
      const i = first + li, tx = x + (li % 5) * (tw + gap), ty = 150 + Math.floor(li / 5) * (tw + 14);
      const locked = !levelUnlocked(i), done = li < doneIn(wi), on = i === G.sel;
      ctx.fillStyle = locked ? 'rgba(20,12,24,.6)' : on ? '#ffcf6b' : 'rgba(251,238,221,.14)';
      rrect(tx, ty, tw, tw, 14); ctx.fill();
      if (locked) { ctx.strokeStyle = 'rgba(251,238,221,.12)'; ctx.lineWidth = 1; ctx.stroke(); }
      text(locked ? '🔒' : String(li + 1), tx + tw / 2, ty + (done ? 27 : 33), locked ? 18 : 24, on ? INK : locked ? DIM : CREAM);
      if (done) text('✓', tx + tw / 2, ty + 50, 13, on ? INK : DOOR, 'center', 800);
      if (!locked) button(tx, ty, tw, tw, () => { if (G.sel === i) startAt(i); else { G.sel = i; sfx.click(); } });
    });
  }
  const lv = LEVELS[G.sel];
  if (lv && lv.world === wi && !lv.rooms) text(lv.name, x, 330, 20, CREAM, 'left');
  panelButton('khelo ▶', x, 360, PANEL.w, 44, true, () => startAt(G.sel));
  if (G.frame % 60 < 42) text('ENTER se khelo · tile pe dobara tap', x, 440, 14, DOOR, 'left', 700);
  text('arrows se chuno · ESC naksha · O settings', x, 470, 12, DIM, 'left', 600);
}
