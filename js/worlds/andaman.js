'use strict';
// Andaman & Nicobar (a UT): boss "Island Hopping", 4 rooms. A departing boat, a diving turtle over the reef,
// beach crabs with a falling coconut, and the lighthouse climb in the wind.

world({
  id: 'andaman',
  theme: 'andaman',
  name: 'Andaman & Nicobar',
  region: 'AN', kind: 'ut',
  unlockAfter: 5,
  reward: 'nariyal',   // beating the boss unlocks the coconut-shell Chotu
  tagline: 'neela paani, safed ret, laal kekde',
  levels: [
    {
      name: 'Island Hopping',
      rooms: [
        {
          // the jetty has a rotten plank, and the boat with the door on it is leaving
          name: 'Jetty',
          build(L) {
            L.solids = [
              block(0, FY, 260, 100),
              block(260, FY, 80, 100, { crumble: true, crumbleDelay: 10 }),
              block(340, FY, 240, 100),
              L.r.b = block(600, FY - 10, 160, 14, { kind: 'boat' }),
            ];
            L.hazards = [hazard(580, FY + 10, 380, 90, { kind: 'water' })];
            L.doors = [door(700, FY - 70)];
            L.signs = [{ x: 190, y: FY - 110, text: 'jetty: 100 saal purani' }];
          },
          tick(L, P) {
            const b = L.r.b, d = L.doors[0];
            once(L, 'a', P.x > 450, () => { b.vx = 1.2; say(L, 'boat chhoot jayegi!'); sfx.horn(); });
            once(L, 'b', b.x >= 780, () => { b.vx = 0; b.x = 780; });
            d.x = d.tx = b.x + 100;
          },
        },
        {
          // ride a turtle over the coral. halfway, the turtle decides to dive
          name: 'Coral Reef',
          build(L) {
            L.solids = [
              block(0, FY, 200, 100), block(200, FY, 560, 100), block(760, FY, 200, 100),
              L.r.t = block(210, FY - 40, 100, 18, { kind: 'turtle' }),
              block(560, 330, 40, 14),
            ];
            L.hazards = [hazard(200, FY - 18, 560, 18, { kind: 'coral' })];
            L.doors = [door(880, FY - 60)];
            L.signs = [{ x: 480, y: 220, text: 'coral ko mat chhuo' }];
          },
          tick(L, P) {
            const t = L.r.t;
            once(L, 'a', P.ground === t, () => { t.vx = 2.2; });
            once(L, 'b', t.x > 400, () => { t.vx = 0; drop(t); say(L, 'kachhua dubki maar gaya!'); });
          },
        },
        {
          // two crabs on the beach, and a coconut that drops behind you and stays put
          name: 'Radhanagar',
          build(L) {
            L.solids = [block(0, FY, 960, 100), block(800, 360, 160, 80)];
            L.hazards = [
              L.r.c1 = hazard(250, FY - 18, 30, 18, { kind: 'crab' }),
              L.r.c2 = hazard(690, FY - 18, 30, 18, { kind: 'crab' }),
              L.r.nut = hazard(600, 80, 24, 24, { kind: 'coconut', active: false, grav: 0.5, landY: FY - 24 }),
            ];
            L.doors = [door(880, 300)];
            L.signs = [{ x: 160, y: FY - 110, text: 'Asia ka best beach. shayad.' }];
          },
          tick(L, P) {
            crabWalk(L, L.r.c1, 250, 420, 'd1', 1.8);
            crabWalk(L, L.r.c2, 520, 690, 'd2', 1.8);
            once(L, 'n', P.x > 540, () => { trigger(L.r.nut); say(L, 'nariyal! sar bachao'); });
          },
        },
        {
          // up the lighthouse stairs: one step crumbles, and the sea wind gusts across the top
          name: 'Lighthouse',
          build(L) {
            L.solids = [
              block(0, FY, 960, 100),
              block(700, 380, 120, 14), block(480, 320, 120, 14), block(260, 260, 120, 14),
              L.r.c = block(480, 200, 120, 14, { crumble: true, crumbleDelay: 18 }),
              block(700, 150, 120, 14),
              block(840, 110, 120, 14),
            ];
            L.winds = [wind(0, 60, 960, 130, 0)];
            L.doors = [door(880, 50)];
            L.signs = [{ x: 220, y: FY - 110, text: 'lighthouse: sirf 200 seedhiyan' }];
          },
          tick(L, P) {
            once(L, 'c', P.ground === L.r.c, () => say(L, 'seedhi bhi chhutti pe hai'));
            // one strong gust off the sea once you're near the top: it shoves you back toward the edge
            once(L, 'w', P.y < 160, () => { L.f.g = 0; say(L, 'samundar ki hawa!'); });
            if (L.f.g != null && L.f.g < 70) L.f.g++;
            L.winds[0].fx = L.f.g != null && L.f.g < 70 ? -2.4 : 0;
          },
        },
      ],
    },
  ],
});
