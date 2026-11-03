'use strict';
// Ladakh (a UT): boss "Khardung La", 4 rooms, opens once every state is done. Cracking ice on Pangong,
// the magnetic hill that pulls you up, prayer flags in the wind, and thin air at the top of the pass.

world({
  id: 'ladakh',
  theme: 'ladakh',
  name: 'Ladakh',
  region: 'LA', kind: 'ut',
  unlockAfter: 9,
  reward: 'gurgur',   // beating the boss unlocks the wooden butter-tea cup Chotu
  tagline: 'hawa kam, pahad zyada, chai sabse zaroori',
  levels: [
    {
      name: 'Khardung La',
      rooms: [
        {
          // the frozen lake: slippery all the way, and two slabs crack under you
          name: 'Pangong',
          build(L) {
            const ice = i => block(120 + i * 120, FY, 120, 14, { ice: true, crumble: i === 1 || i === 3, crumbleDelay: 20 });
            L.r.cr = [ice(1), ice(3)];
            L.solids = [block(0, FY, 120, 100), ice(0), L.r.cr[0], ice(2), L.r.cr[1], ice(4), ice(5), block(840, FY, 120, 100)];
            L.hazards = [hazard(120, FY + 20, 720, 80, { kind: 'water' })];
            L.doors = [door(880, FY - 60)];
            L.signs = [{ x: 300, y: FY - 140, text: 'Pangong: rang badalti jheel' }];
          },
          tick(L, P) { once(L, 'c', L.r.cr.includes(P.ground), () => say(L, 'barf chatak rahi hai!')); },
        },
        {
          // the magnetic hill pulls Chotu up to the ceiling. mind the gap up there
          name: 'Magnetic Hill',
          build(L) {
            L.solids = [block(0, FY, 960, 100), block(240, 60, 300, 14), block(620, 60, 340, 14)];
            L.doors = [door(880, 74, { flip: true })];
            L.signs = [{ x: 160, y: FY - 110, text: 'magnetic hill: gaadi khud chalti hai' }];
          },
          tick(L, P) { once(L, 'a', P.x > 320, () => { L.gravity = -1; say(L, 'magnetic hill! Chotu upar khinch gaya'); sfx.flip(); }); },
        },
        {
          // ropes of prayer flags over the drop, gusts of wind, and one old rope
          name: 'Prayer Flags',
          build(L) {
            L.start = [40, 340 - PH];
            L.solids = [
              block(0, 340, 140, 200),
              block(180, 330, 160, 8, { kind: 'flags', move: { dx: 0, dy: 20, period: 100 } }),
              block(400, 300, 160, 8, { kind: 'flags', move: { dx: 0, dy: 20, period: 100, phase: 0.5 } }),
              L.r.f3 = block(620, 330, 160, 8, { kind: 'flags', crumble: true, crumbleDelay: 12 }),
              block(820, 340, 140, 200),
            ];
            L.winds = [wind(0, 0, 960, 540, 0)];
            L.doors = [door(880, 280)];
            L.signs = [{ x: 480, y: 160, text: 'hawa mein duaayein' }];
          },
          tick(L, P) {
            L.f.g = ((L.f.g || 0) + 1) % 120;
            L.winds[0].fx = L.f.g < 40 ? -2.2 : 0;
            once(L, 'c', P.ground === L.r.f3, () => say(L, 'yeh rassi purani thi'));
          },
        },
        {
          // the top of the pass: thin air makes every jump smaller, and a yak owns the road
          name: 'Khardung La',
          build(L) {
            L.solids = [block(0, FY, 300, 100), block(300, 390, 120, 150), block(420, 340, 120, 200), block(540, 290, 420, 250)];
            L.hazards = [L.r.yak = hazard(820, 250, 60, 40, { kind: 'yak' })];
            L.doors = [door(880, 230)];
            L.signs = [{ x: 150, y: FY - 110, text: 'Khardung La: bahut oonchi sadak' }];
          },
          tick(L, P) {
            crabWalk(L, L.r.yak, 570, 820, 'y', 1.5);
            once(L, 'a', P.x > 200, () => { L.gravity = 0.7; say(L, 'hawa patli hai. Chotu thak gaya'); });
          },
        },
      ],
    },
  ],
});
