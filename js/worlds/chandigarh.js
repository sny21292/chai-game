'use strict';
// Chandigarh (a UT): boss level "City Beautiful", 4 rooms. The planned city, where nothing goes to plan.
// Opens after 4 states; beating it unlocks the steel tumbler Chotu.

world({
  id: 'chandigarh',
  theme: 'chandigarh',
  name: 'Chandigarh',
  region: 'CH', kind: 'ut',
  unlockAfter: 4,
  reward: 'steel',
  tagline: 'planned city. unplanned Chotu.',
  levels: [
    {
      name: 'City Beautiful',
      rooms: [
        {
          // Rock Garden: sculptures made of broken crockery. most of the sharp bits are harmless. most.
          name: 'Rock Garden',
          build(L) {
            L.solids = [block(0, FY, 960, 100)];
            L.spikes = [
              spikes(250, FY, 4, { fake: true }),
              spikes(470, FY, 3),
              spikes(620, FY, 4, { fake: true }),
              L.r.pop = spikes(790, FY, 2, { hidden: true }),
            ];
            L.doors = [door(880, FY - 60)];
            L.signs = [{ x: 330, y: FY - 110, text: 'sab tukde nakli hain. sab.' }];
          },
          tick(L, P) {
            once(L, 'a', P.x > 700, () => { pop(L.r.pop); say(L, 'yeh wale asli the. sorry.'); });
          },
        },
        {
          // Sukhna Lake: paddle boats drift back and forth. the second one is taking on water
          name: 'Sukhna Lake',
          build(L) {
            L.solids = [
              block(0, FY, 160, 100),
              block(180, FY - 10, 110, 14, { kind: 'boat', move: { dx: 200, dy: 0, period: 240 } }),
              L.r.leaky = block(600, FY - 10, 110, 14, { kind: 'boat', move: { dx: -160, dy: 0, period: 200, phase: 0.5 }, crumble: true, crumbleDelay: 40 }),
              block(800, FY, 160, 100),
            ];
            L.hazards = [hazard(160, FY + 8, 640, 100, { kind: 'water' })];
            L.doors = [door(880, FY - 60)];
            L.signs = [{ x: 480, y: 260, text: 'boating: Rs 50. doobna free.' }];
          },
          tick(L, P) { once(L, 'a', P.ground === L.r.leaky, () => say(L, 'naav mein chhed hai!')); },
        },
        {
          // Gol Chakkar: platforms going round and round, and after a few rounds so is your head
          name: 'Gol Chakkar',
          build(L) {
            L.solids = [
              block(0, FY, 200, 100),
              block(200, FY + 40, 600, 60),
              block(240, 380, 90, 14, { move: { dx: 0, dy: -70, period: 160 } }),
              L.r.mid = block(420, 300, 90, 14, { move: { dx: 120, dy: 0, period: 200 } }),
              block(680, 260, 90, 14, { move: { dx: 0, dy: 70, period: 160, phase: 0.5 } }),
              L.r.end = block(800, 300, 160, 240),
            ];
            L.spikes = [spikes(200, FY + 40, 27)];
            L.doors = [door(880, 240)];
            L.signs = [{ x: 480, y: 200, text: 'roundabout: right of way kiska?' }];
          },
          tick(L, P) {
            once(L, 'a', P.ground === L.r.mid, () => { L.reversed = true; say(L, 'chakkar aa gaya!'); sfx.flip(); });
            once(L, 'b', L.f.a && P.ground === L.r.end, () => { L.reversed = false; say(L, 'ab theek hai. shayad.'); });
          },
        },
        {
          // the Open Hand waves, and the wind changes sides every time. the door ends up in the palm
          name: 'Khula Haath',
          build(L) {
            L.solids = [
              block(0, FY, 260, 100),
              block(360, FY, 200, 100),
              block(640, FY, 320, 100),
              block(700, FY - 70, 60, 14),
              block(800, FY - 140, 140, 14),
            ];
            L.winds = [L.r.z = wind(180, 50, 520, FY - 50, 0)];
            L.doors = [door(880, FY - 60)];
            L.signs = [{ x: 120, y: FY - 110, text: 'haath hila ke swagat' }];
          },
          tick(L, P) {
            L.f.w = ((L.f.w || 0) + 1) % 140;                      // the hand waves: 70 frames each way
            L.r.z.fx = L.f.w < 70 ? -2.4 : 2.4;
            once(L, 'a', P.x > 760 && P.y > FY - 60, () => { const d = L.doors[0]; d.tx = 850; d.ty = FY - 200; say(L, 'darwaza haath mein!'); sfx.trap(); });
          },
        },
      ],
    },
  ],
});
