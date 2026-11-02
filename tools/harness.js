// Loads the game's scripts (in index.html order) into a headless VM so tools can drive the simulation.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const src = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n');

const sandbox = { console, Math, JSON, Object, Array, Number, String, Set, Map, structuredClone, URLSearchParams };
vm.createContext(sandbox);
vm.runInContext(src + '\n;globalThis.API = { G, LEVELS, WORLDS, loadLevel, step, press };', sandbox, { filename: 'game' });

// run(code): evaluate code inside the game's scope (for flow tests: progress, rooms, map hit-tests)
sandbox.API.run = code => vm.runInContext(code, sandbox);
module.exports = sandbox.API;
