'use strict';
// Shared constants, level-building helpers and the world registry.
// World files (js/worlds/*.js) call world({...}) and are loaded before game.js.

const W = 960, H = 540, FY = 440;           // logical screen size, default floor surface y
const GRAV = 0.62, JUMP = 11.6, SPEED = 4.3, MAXFALL = 14;
const SPH = 22;                              // spike height (and width per tooth)
const PW = 22, PH = 30;                      // player hitbox

const WORLDS = [];
function world(def) { WORLDS.push(def); }

// ---------- entity constructors ----------
// Solid block. Options:
//   crumble          falls ~16 frames (or crumbleDelay) after first being stood on
//   invisible        not drawn until touched
//   ghost            drawn but not solid (fake platform)
//   ice              slippery to walk on
//   sink             quicksand: player sinks while standing on it, buried at depth 30
//   crusher, landY   once dropped, falls fast and kills on contact until it lands at landY
//   move:{dx,dy,period,phase,on}  oscillates between its start and start+(dx,dy); on:false waits for a trigger
//   vx               constant horizontal speed (set it from a trigger to make something walk)
//   fog              only drawn when the player is within this many px horizontally (still solid)
//   kind             cosmetic: 'cow' | 'boat' | 'camel' | 'crate' | 'log' | 'boulder' | 'bus'
const block = (x, y, w, h, o = {}) => Object.assign({ x, y, w, h, vx: 0, vy: 0, falling: false, depth: 0 }, o, { ox: x, oy: y });

// Spike row of n teeth with its base at y. dir 'up' (on a floor) or 'down' (hanging from a ceiling).
//   hidden  pops up when pop() is called     fake  harmless, crumbles on touch     on  solid it rides with
const spikes = (x, y, n, o = {}) => Object.assign({ x, y, w: n * SPH, dir: 'up', hidden: false }, o, { pop: o.hidden ? 0 : 1 });

// Exit door, 40x60, (x,y) = top-left. Set d.tx / d.ty to slide it.
//   flip  hangs from a ceiling     fake  does nothing     evil  kills     hidden  invisible until hidden=false
const door = (x, y, o = {}) => Object.assign({ x, y, w: 40, h: 60, tx: x, ty: y, flip: false, fake: false, evil: false, hidden: false }, o, { alpha: o.hidden ? 0 : 1 });

// Anything that kills on touch. Moves by vx/vy, accelerates down by grav once active.
//   kind: 'train' | 'auto' | 'coconut' | 'icicle' | 'snowball' | 'rock' | 'pigeon' | 'water' | 'fire' | 'balloon' | 'bus' | 'box'
//   active:false  frozen until trigger(h)      landY  stops falling there (stays deadly)
const hazard = (x, y, w, h, o = {}) => Object.assign({ x, y, w, h, vx: 0, vy: 0, grav: 0, active: true, kind: 'box', rot: 0 }, o);

// Horizontal push zone (crowds, wind, river current). fx px/frame, negative pushes left.
const wind = (x, y, w, h, fx, o = {}) => Object.assign({ x, y, w, h, fx }, o);

// ---------- trigger helpers (use inside a level's tick) ----------
function once(L, key, cond, fn) { if (!L.f[key] && cond) { L.f[key] = 1; fn(); } }
function drop(s, vy = 0) { s.falling = true; s.vy = vy; sfx.trap(); }
function pop(sp) { if (sp.hidden) { sp.hidden = false; sfx.trap(); } }
function trigger(h) { if (!h.active) { h.active = true; sfx.trap(); } }
function say(L, text, t = 110) { L.msg = { text, t }; }
