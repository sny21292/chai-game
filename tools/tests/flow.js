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
const open = () => run(`WORLDS.filter((w, i) => unlocked(i)).map(w => w.id)`);
check('fresh: only Maharashtra open', open(), ['mumbai']);
check('fresh: level 2 locked', run(`levelUnlocked(1)`), false);
run(`save.done.mumbai = 10`);
check('Maharashtra done opens Rajasthan, not Delhi', open(), ['mumbai', 'rajasthan']);
run(`save.done.rajasthan = 10`);
check('2 states done opens Delhi + Kerala', open(), ['mumbai', 'delhi', 'rajasthan', 'kerala']);
check('home world is Kerala', run(`WORLDS[homeWorld()].id`), 'kerala');
run(`save.done.kerala = 10; save.done.himalaya = 10`);
check('Himachal done opens Uttar Pradesh (appended to the chain)', open(), ['mumbai', 'delhi', 'rajasthan', 'kerala', 'himalaya', 'up', 'chandigarh']);
check('Chandigarh boss needs 4 states', run(`[WORLDS[${W('chandigarh')}].unlockAfter, statesDone()]`), [4, 4]);
run(`save.done.up = 10`);
check('UP done opens Uttarakhand', run(`unlocked(${W('uttarakhand')})`), true);
check('5 states done opens the Andaman boss', run(`unlocked(${W('andaman')})`), true);
check('J&K boss still locked at 5 states', run(`unlocked(${W('kashmir')})`), false);
run(`save.done.uttarakhand = 8`);
check('Uttarakhand done opens Goa', run(`unlocked(${W('goa')})`), true);
run(`save.done.goa = 8`);
check('7 states: Gujarat and the J&K boss open, Ladakh not yet', run(`[unlocked(${W('gujarat')}), unlocked(${W('kashmir')}), unlocked(${W('ladakh')})]`), [true, true, false]);
run(`save.done.gujarat = 8`);
check('Gujarat done opens Punjab', run(`unlocked(${W('punjab')})`), true);
run(`save.done.punjab = 8`);
check('all 9 states open Ladakh', run(`[statesDone(), unlocked(${W('ladakh')})]`), [9, true]);

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
reset(); run(`['mumbai', 'rajasthan', 'kerala', 'himalaya'].forEach(id => save.done[id] = 10)`);
const cb = run(`LEVELS.findIndex(l => l.rooms && WORLDS[l.world].id === 'chandigarh')`);
run(`startAt(${cb}); for (let r = 0; r < 4; r++) { win(); for (let i = 0; i < 60; i++) update(); }`);
check('Chandigarh 4 rooms -> steel tumbler', run(`[G.state, complete(${W('chandigarh')}), save.skins.includes('steel')]`), ['worldDone', true, true]);
for (const [id, skin] of [['andaman', 'nariyal'], ['kashmir', 'kahwa'], ['ladakh', 'gurgur']]) {
  reset(); run(`STATE_ORDER.forEach(wi => save.done[WORLDS[wi].id] = WORLDS[wi].levels.length)`);
  const bi = run(`LEVELS.findIndex(l => l.rooms && WORLDS[l.world].id === '${id}')`);
  run(`startAt(${bi}); for (let r = 0; r < LEVELS[${bi}].rooms.length; r++) { win(); for (let i = 0; i < 60; i++) update(); }`);
  check(`${id} boss -> ${skin} Chotu`, run(`[complete(${W(id)}), save.skins.includes('${skin}'), save.skin]`), [true, true, skin]);
}
reset();

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
for (const c of ['MH', 'RJ', 'KL', 'HP', 'DL', 'UP', 'UK', 'CH', 'GA', 'SK', 'TR', 'PY', 'LD', 'AN', 'LA', 'JK', 'MP', 'WB'])
  check(`tap on ${c} hits ${c}`, tap(c), c);
check('tap in the sea hits nothing', run(`regionAt(MAP_AREA.x + 500, MAP_AREA.y + 500)`), null);
run(`mapTap(...toScreen(G.map.cam, ...MAP_BY_CODE.MP.c))`);
check('greyed state: selected, toast says coming soon', run(`[G.map.sel, G.map.zoom, /coming soon/.test(G.map.toast.text)]`), ['MP', null, true]);
run(`const p = toScreen(G.map.cam, ...MAP_BY_CODE.MH.c); mapTap(...p); mapTap(...p);`);
check('double tap on Maharashtra zooms in', run(`G.map.zoom`), 0);


// --- one tap from the title into play ---
reset(); run(`G.state = 'title'; playNow()`);
check('fresh: title tap starts Maharashtra 1', run(`[G.state, G.idx]`), ['play', 0]);
reset(); run(`save.done.mumbai = 10; save.done.rajasthan = 3; G.state = 'title'; playNow()`);
check('returning: title tap continues at Rajasthan 4', run(`[G.state, LEVELS[G.idx].world, LEVELS[G.idx].num]`), ['play', W('rajasthan'), 3]);
run(`G.state = 'title'; onKey({ code: 'KeyQ' })`);
check('Q on the title opens the map', run(`G.state`), 'map');

// --- pause, Escape and the rewarded skip ---
reset(); run(`startAt(0); onKey({ code: 'Escape' })`);
check('Escape pauses (never quits)', run(`[G.state, G.paused]`), ['play', true]);
run(`onKey({ code: 'KeyQ' })`);
check('Q in pause goes to the map', run(`G.state`), 'map');
reset(); run(`Ads.provider = { rewarded: async () => true, interstitial: async () => {} }; startAt(0); G.levelDeaths = 5`);
run(`skipLevel()`);
check('no skip while playing (only from the pause menu)', run(`Ads.busy`), false);
run(`G.paused = true; skipLevel()`);
check('skip from pause asks for an ad', run(`Ads.busy`), true);
run(`Ads.ended('adsDisabled')`);
check('adsDisabled hides every ad offer', run(`[Ads.blocked, Ads.available]`), [true, false]);
run(`Ads.provider = null; Ads.blocked = false; Ads.busy = false`);

// --- language ---
reset();
check('English by default', run(`T('chai thandi ho gayi')`), 'the chai went cold');
run(`setAutoLang('hi-IN')`);
check('hi locale gets Hinglish', run(`T('chai thandi ho gayi')`), 'chai thandi ho gayi');
run(`setAutoLang('en-US'); save.lang = 'hi'`);
check('Settings choice wins over locale', run(`T('chai thandi ho gayi')`), 'chai thandi ho gayi');
run(`save.lang = null`);
check('placeholders', run(`T('ab tak ☠ {n}', { n: 7 })`), 'deaths so far ☠ 7');

// --- portal cloud save: the one with more progress wins ---
reset(); run(`save.done.mumbai = 2; portalSave(JSON.stringify({ done: { mumbai: 10, rajasthan: 1 }, deaths: 40 }))`);
check('cloud save with more progress is loaded', run(`[save.done.mumbai, save.done.rajasthan, save.deaths]`), [10, 1, 40]);
run(`portalSave(JSON.stringify({ done: { mumbai: 1 } }))`);
check('cloud save with less progress is ignored', run(`save.done.mumbai`), 10);

// --- south batch: the chain continues after Punjab ---
reset(); run(`['mumbai', 'rajasthan', 'kerala', 'himalaya', 'up', 'uttarakhand', 'goa', 'gujarat', 'punjab'].forEach(id => save.done[id] = WORLDS[${W('mumbai')}] && 10)`);
check('Punjab done opens Karnataka', run(`unlocked(${W('karnataka')})`), true);
check('Tamil Nadu waits for Karnataka', run(`unlocked(${W('tamilnadu')})`), false);
run(`save.done.karnataka = 8; save.done.tamilnadu = 8; save.done.telangana = 8`);
check('chain: Tamil Nadu -> Telangana -> Andhra', run(`[unlocked(${W('tamilnadu')}), unlocked(${W('telangana')}), unlocked(${W('andhra')})]`), [true, true, true]);

// --- long levels: screens without checkpoints ---
reset(); run(`save.done.karnataka = 1; G.paused = false; G.settings = null; Ads.showing = false`);
const metro = run(`LEVELS.findIndex(l => l.long && WORLDS[l.world].id === 'karnataka')`);
check('long level is not a boss', run(`[isBoss(LEVELS[${metro}]), levelId(${metro})]`), [false, 'karnataka:2']);
run(`startAt(${metro}); win(); for (let i = 0; i < 60; i++) update();`);
check('door -> screen 2, level not done yet', run(`[G.state, G.room, doneIn(${W('karnataka')})]`), ['play', 1, 1]);
run(`die(); for (let i = 0; i < 60; i++) update();`);
check('death on screen 2 sends you back to screen 1', run(`[G.state, G.room]`), ['play', 0]);
run(`win(); for (let i = 0; i < 60; i++) update(); restartLevel()`);
check('R on screen 2 restarts the whole level', run(`G.room`), 0);
run(`win(); for (let i = 0; i < 60; i++) update(); win(); for (let i = 0; i < 60; i++) update();`);
check('last screen door -> next level, level done', run(`[G.state, G.L.def.num, doneIn(${W('karnataka')})]`), ['play', 2, 2]);

// --- Dhokha Mode ---
reset(); run(`save.dhokha = true; startAt(0)`);
check('Dhokha Mode makes small ledges crumble or adds door spikes', run(`!!G.L.dk || G.L.solids.some(s => s.crumbleDelay === 26)`), true);
run(`save.dhokha = false; startAt(0)`);
check('normal mode untouched', run(`!!G.L.dk`), false);

console.log(fails ? `\n${fails} FAILED` : '\nall flow tests passed');
process.exit(fails ? 1 : 0);
