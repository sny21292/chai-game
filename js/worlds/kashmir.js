'use strict';
// Jammu & Kashmir (a UT): boss "Kashmir Ki Sair", 4 rooms. Shikaras on Dal Lake, a gondola with a power cut,
// drifting chinar leaves, and snowballs on the ice at Gulmarg.

world({
  id: 'kashmir',
  theme: 'kashmir',
  name: 'Jammu & Kashmir',
  region: 'JK', kind: 'ut',
  unlockAfter: 7,
  reward: 'kahwa',   // beating the boss unlocks the copper kahwa cup Chotu
  tagline: 'jheel, barf, chinar: sab khoobsurat, sab khatarnak',
  levels: [
    {
      name: 'Kashmir Ki Sair',
      rooms: [
        {
          // hop across the shikaras. the second one stops: the boatman wants to sell you flowers
          name: 'Dal Lake',
          build(L) {
            L.solids = [
              block(0, FY, 140, 100),
              block(160, FY - 16, 120, 16, { kind: 'shikara', move: { dx: 180, dy: 0, period: 200 } }),
              L.r.s2 = block(520, FY - 16, 120, 16, { kind: 'shikara', move: { dx: 140, dy: 0, period: 160, phase: 0.5 } }),
              block(820, FY, 140, 100),
            ];
            L.hazards = [hazard(140, FY + 6, 680, 100, { kind: 'water' })];
            L.doors = [door(880, FY - 60)];
            L.signs = [{ x: 480, y: 260, text: 'shikara ride: aaram se, dheere dheere' }];
          },
          tick(L, P) {
            const s2 = L.r.s2;
            once(L, 'a', P.ground === s2, () => { s2.move.on = false; L.f.v = 0; say(L, 'phool le lo, phool! taaza phool!'); });
            if (L.f.v != null && L.f.v < 70 && ++L.f.v === 70) s2.move.on = true;
          },
        },
        {
          // the Gulmarg gondola stops halfway (power cut), then carries on. an icicle waits at the top
          name: 'Gondola',
          build(L) {
            L.solids = [
              block(0, FY, 160, 100),
              L.r.g = block(150, 380, 80, 24, { kind: 'gondola', move: { dx: 300, dy: -150, period: 400, on: false } }),
              block(560, 160, 400, 380),
            ];
            L.hazards = [L.r.ic = hazard(604, 60, 18, 40, { kind: 'icicle', active: false, grav: 0.5 })];
            L.doors = [door(880, 100)];
            L.signs = [{ x: 330, y: 470, text: 'gondola: bilkul safe' }];
          },
          tick(L, P) {
            const g = L.r.g;
            once(L, 'a', P.ground === g, () => { g.move.on = true; });
            once(L, 'b', g.move.t >= 90, () => { g.move.on = false; L.f.p = 0; say(L, 'bijli gayi! gondola ruka'); sfx.trap(); });
            if (L.f.p != null && L.f.p < 80 && ++L.f.p === 80) { g.move.on = true; say(L, 'bijli aayi. chalo.'); }
            once(L, 'i', P.x > 570 && P.y < 160, () => trigger(L.r.ic));
          },
        },
        {
          // chinar leaves drift down slowly. ride them across; the old one falls faster
          name: 'Chinar',
          build(L) {
            L.r.leaves = [[190, 150], [340, 190], [490, 150], [640, 190]].map(([x, y], i) => block(x, y, 70, 12, { kind: 'leaf', crumble: i === 2, crumbleDelay: 14 }));
            L.start = [40, 200 - PH];
            L.solids = [block(0, 200, 140, 340), ...L.r.leaves, block(820, 360, 140, 180)];
            L.doors = [door(880, 300)];
            L.signs = [{ x: 480, y: 90, text: 'chinar ke patte: naram aur mazboot' }];
          },
          tick(L, P) {
            for (const s of L.r.leaves) {
              if (s.falling) continue;
              s.y += 0.8;
              if (s.y > 500) s.y = 100;
            }
            once(L, 'c', P.ground === L.r.leaves[2], () => say(L, 'yeh patta thoda purana tha'));
          },
        },
        {
          // Gulmarg on ice: snowballs roll in. the last one is huge; hide on the hut roof
          name: 'Barfbaari',
          build(L) {
            L.solids = [
              block(0, FY, 960, 100, { ice: true }),
              block(600, 330, 120, 14),
              block(606, 344, 6, 96, { ghost: true }), block(708, 344, 6, 96, { ghost: true }),
            ];
            L.doors = [door(880, FY - 60)];
            L.signs = [{ x: 200, y: FY - 110, text: 'Gulmarg: barf ka maza lo' }];
          },
          tick(L, P) {
            once(L, 'a', P.x > 150, () => { L.hazards.push(hazard(W + 20, FY - 36, 36, 36, { kind: 'snowball', vx: -5 })); say(L, 'gola!'); });
            once(L, 'b', P.x > 380, () => L.hazards.push(hazard(W + 20, FY - 36, 36, 36, { kind: 'snowball', vx: -5 })));
            once(L, 'c', P.x > 560, () => { L.hazards.push(hazard(W + 20, FY - 90, 90, 90, { kind: 'snowball', vx: -4 })); say(L, 'yeh gola nahi, pahad hai!'); sfx.trap(); });
            L.hazards = L.hazards.filter(h => h.x > -120);
          },
        },
      ],
    },
  ],
});
