// Headless flow tests for progress, unlocks, save migration, boss rooms and map hit-testing.
// usage: node tools/tests/flow.js      (exits 1 on any failure)
'use strict';
const { run } = require('../harness');
let fails = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};
const reset = () => run(`Object.assign(save, { done: {}, deaths: 0, skipped: [], skin: 'glass', skins: ['glass'] }); G.map = null; G.justDone = null; G.newSkin = null;`);
const W = id => run(`WORLDS.findIndex(w => w.id === '${id}')`);

// --- save migration from the old linear index (5 worlds x 10) ---
check('migrate level 0', run(`(() => { const s = { level: 0, done: {} }; migrateSave(s); return s; })()`), { done: {} });
check('migrate mid-Rajasthan', run(`(() => { const s = { level: 23, done: {} }; migrateSave(s); return s.done; })()`), { mumbai: 10, rajasthan: 3 });
check('migrate everything', run(`(() => { const s = { level: 49, done: {} }; migrateSave(s); return s.done; })()`), { mumbai: 10, rajasthan: 10, kerala: 10, himalaya: 9 });
check('new saves untouched', run(`migrateSave({ done: { kerala: 2 } })`), false);

// --- unlock chain ---
reset();
check('fresh: only Maharashtra open', run(`WORLDS.map((w, i) => unlocked(i))`), [true, false, false, false, false]);
check('fresh: level 2 locked', run(`levelUnlocked(1)`), false);
run(`save.done.mumbai = 10`);
check('Maharashtra done opens Rajasthan, not Delhi', run(`WORLDS.map((w, i) => unlocked(i))`), [true, false, true, false, false]);
run(`save.done.rajasthan = 10`);
check('2 states done opens Delhi + Kerala', run(`WORLDS.map((w, i) => unlocked(i))`), [true, true, true, true, false]);
check('home world is Kerala', run(`WORLDS[homeWorld()].id`), 'kerala');

// --- playing through a state's last level goes to the khatam screen ---
reset(); run(`save.done.mumbai = 9`);
run(`startAt(9); win(); for (let i = 0; i < 60; i++) update();`);
check('last Maharashtra level -> worldDone', run(`G.state`), 'worldDone');
check('Rajasthan now open', run(`unlocked(${W('rajasthan')})`), true);
run(`worldDoneGo()`);
check('ENTER on khatam -> Rajasthan level 1', run(`[G.state, WORLDS[G.L.def.world].id, G.L.def.num]`), ['play', 'rajasthan', 0]);

// --- boss rooms: checkpoints, deaths, skips, reward ---
reset(); run(`save.done.mumbai = 10; save.done.rajasthan = 10;`);
const boss = run(`LEVELS.findIndex(l => l.rooms)`);
run(`startAt(${boss})`);
check('boss starts in room 1', run(`[G.room, G.L.def.name]`), [0, 'Gaay Ka Raasta']);
run(`win(); for (let i = 0; i < 60; i++) update();`);
check('door -> room 2', run(`[G.state, G.room, G.L.def.name]`), ['play', 1, 'Side Dena']);
check('room clear does not finish the boss', run(`complete(${W('delhi')})`), false);
run(`die(); for (let i = 0; i < 60; i++) update();`);
check('death respawns at the room 2 checkpoint', run(`[G.state, G.room, G.levelDeaths]`), ['play', 1, 1]);
run(`restartLevel()`);
check('R restarts the current room', run(`G.room`), 1);
run(`for (let r = 1; r < 5; r++) { win(); for (let i = 0; i < 60; i++) update(); }`);
check('last room door -> worldDone', run(`G.state`), 'worldDone');
check('boss complete + kulhad unlocked + equipped', run(`[complete(${W('delhi')}), save.skins, save.skin, G.newSkin]`), [true, ['glass', 'kulhad'], 'kulhad', 'kulhad']);
check('boss stats id', run(`levelId(${boss})`), 'delhi:boss');
run(`worldDoneGo()`);
check('after boss -> map, zoomed into the next state (Kerala)', run(`[G.state, G.map.zoom]`), ['map', W('kerala')]);

// --- quitting mid-level returns to the map zoomed into that world ---
reset(); run(`startAt(3); quitToMenu();`);
check('quit -> map zoomed into Maharashtra, level kept', run(`[G.state, G.map.zoom, G.sel]`), ['map', 0, 0]);

// --- map: keyboard + hit tests ---
reset(); run(`openMenu()`);
check('map opens on Maharashtra', run(`[G.map.sel, G.map.zoom]`), ['MH', null]);
run(`mapKey('ArrowRight')`);
check('arrow steps to next playable region', run(`G.map.sel`), 'DL');
run(`mapKey('Enter')`);
check('locked boss: ENTER does not zoom', run(`[G.map.zoom, !!G.map.toast]`), [null, true]);
run(`G.map.sel = 'MH'; mapKey('Enter')`);
check('ENTER zooms into Maharashtra', run(`[G.map.zoom, G.sel]`), [0, 0]);
run(`mapKey('ArrowRight')`);
check('locked level not selectable', run(`G.sel`), 0);
run(`mapKey('Escape')`);
check('ESC back to India', run(`G.map.zoom`), null);
run(`G.map.cam = camHome()`);
const tap = code => run(`(() => { const r = MAP_BY_CODE['${code}'], p = toScreen(G.map.cam, ...(r.kind === 'ut' ? r.pin : r.c)); return regionAt(p[0], p[1]); })()`);
for (const c of ['MH', 'RJ', 'KL', 'HP', 'DL', 'GA', 'SK', 'TR', 'CH', 'PY', 'LD', 'AN', 'LA', 'JK', 'UP', 'WB'])
  check(`tap on ${c} hits ${c}`, tap(c), c);
check('tap in the sea hits nothing', run(`regionAt(MAP_AREA.x + 500, MAP_AREA.y + 500)`), null);
run(`mapTap(...toScreen(G.map.cam, ...MAP_BY_CODE.UP.c))`);
check('greyed state: selected, toast says jald aa raha hai', run(`[G.map.sel, G.map.zoom, /jald aa raha hai/.test(G.map.toast.text)]`), ['UP', null, true]);
run(`const p = toScreen(G.map.cam, ...MAP_BY_CODE.MH.c); mapTap(...p); mapTap(...p);`);
check('double tap on Maharashtra zooms in', run(`G.map.zoom`), 0);

console.log(fails ? `\n${fails} FAILED` : '\nall flow tests passed');
process.exit(fails ? 1 : 0);
