// Checks that every player-facing string has an English entry in js/lang.js.
//   node tools/tests/i18n.js
// Covers: world taglines, every sign in every level and boss room (built for real), every say() message in the
// world files, the death quips, and every T('...') literal in the engine and map.
'use strict';
const fs = require('fs'), path = require('path');
const api = require('../harness');
const root = path.join(__dirname, '..', '..');
const EN = api.run('EN');
const missing = new Set();
const need = (s, where) => { if (!(s in EN)) missing.add(`${where}: ${JSON.stringify(s)}`); };

// taglines and signs, from the levels as built
api.WORLDS.forEach(w => need(w.tagline, w.id));
api.LEVELS.forEach((lv, i) => {
  const rooms = lv.rooms ? lv.rooms.length : 1;
  for (let r = 0; r < rooms; r++) {
    api.loadLevel(i, false, r);
    for (const s of api.G.L.signs) need(s.text, `${lv.name} r${r + 1} sign`);
  }
});

// say(L, '...') messages, including both sides of a ternary
for (const f of fs.readdirSync(path.join(root, 'js/worlds'))) {
  const src = fs.readFileSync(path.join(root, 'js/worlds', f), 'utf8');
  for (const m of src.matchAll(/say\(L,([^;]*?)\)\s*;/g)) {
    const lits = [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)].map(x => x[1] ?? x[2]);
    if (!lits.length) missing.add(`${f}: say() without a literal: ${m[0]}`);
    lits.forEach(s => need(s, `${f} say`));
  }
}

api.run('QUIPS').forEach(q => need(q, 'quip'));

for (const f of ['js/game.js', 'js/map.js']) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of src.matchAll(/\bT\(\s*'((?:[^'\\]|\\.)*)'/g)) need(m[1], f);
  // T(cond ? 'a' : 'b')
  for (const m of src.matchAll(/\bT\(\s*[^'()]+\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*(?:[^'()]+\?\s*)?'((?:[^'\\]|\\.)*)'/g)) { need(m[1], f); need(m[2], f); }
}
for (const row of api.run('SETTINGS')) need(row.label, 'settings');

if (missing.size) { console.log([...missing].join('\n')); console.log(`\n${missing.size} missing`); process.exit(1); }
console.log('i18n ok: every string has an English entry');
