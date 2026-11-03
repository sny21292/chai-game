'use strict';
// Andhra Pradesh: Guntur chilli yards, the Borra caves, a submarine at Vizag, the hanging pillar of Lepakshi,
// Kuchipudi on brass plates, Kondapalli toys, the Araku hills and a Godavari boat ride through Papikondalu.

world({
  id: 'andhra',
  theme: 'andhra',
  name: 'Andhra Pradesh',
  region: 'AP', kind: 'state',
  tagline: 'mirchi bhi teekhi, floor bhi teekha.',
  levels: [
    {
      // heaps of red chillies drying in the yard. the smell makes you sneeze, right when you jump
      name: 'Guntur Mirchi',
      build(L) {
        L.solids = [block(0, FY, 960, 100)];
        L.hazards = [220, 440, 660].map(x => hazard(x, FY - 26, 60, 26, { kind: 'mirchi' }));
        L.winds = [wind(0, 0, 960, 540, 0)];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 480, y: 220, text: 'mirchi se chheenk aati hai' }];
      },
      tick(L, P) {
        const sh = [0, 40, -30, 20][L.try];   // the sneeze moves on every attempt: muscle memory won't help
        for (const [k, x] of [['a', 180], ['b', 400], ['c', 620]]) once(L, k, P.x > x + sh, () => { L.f.sn = 0; say(L, 'aaachhoo!'); });
        if (L.f.sn != null && L.f.sn < 12) L.f.sn++;
        L.winds[0].fx = L.f.sn != null && L.f.sn < 12 ? -5 : 0;
      },
    },
    {
      // long level: deep in the Borra caves. dark, dripping, and the stalactites let go as you pass
      name: 'Borra Gufa',
      screens: [
        {
          build(L) {
            const f = { fog: 140 };
            L.solids = [block(0, FY, 260, 100, f), block(330, FY - 40, 160, 140, f), block(560, FY, 160, 100, f), block(790, FY - 30, 170, 130, f)];
            L.r.st = [380, 600, 680].map(x => hazard(x, 30, 18, 40, { kind: 'icicle', active: false, grav: 0.6 }));
            L.hazards = [...L.r.st];
            L.doors = [door(890, FY - 90)];
            L.signs = [{ x: 140, y: FY - 110, text: 'Borra: 10 lakh saal purani gufa' }];
          },
          tick(L, P) { L.r.st.forEach((h, i) => once(L, 's' + i, P.x > h.x - 90, () => trigger(h))); },
        },
        {
          build(L) {
            L.solids = [
              block(0, FY, 180, 100),
              block(240, 410, 90, 30, { sink: true }), L.r.c = block(400, 380, 90, 14, { crumble: true, crumbleDelay: 10 }),
              block(560, 410, 90, 30, { sink: true }),
              block(720, FY, 240, 100),
            ];
            L.hazards = [hazard(180, FY + 10, 540, 90, { kind: 'water' })];
            L.doors = [door(890, FY - 60)];
            L.signs = [{ x: 480, y: 220, text: 'gufa ki nadi: keechad aur patthar' }];
          },
        },
      ],
    },
    {
      // the museum submarine takes you for a ride... and remembers it is a submarine
      name: 'Vizag Pandubbi',
      build(L) {
        L.solids = [
          block(0, FY, 160, 100),
          L.r.s = block(170, FY - 30, 200, 36, { kind: 'sub' }),
          block(600, 330, 50, 14), block(720, 280, 50, 14),
          block(830, 260, 130, 280),
        ];
        L.hazards = [hazard(160, FY + 10, 670, 90, { kind: 'water' })];
        L.doors = [door(890, 200)];
        L.signs = [{ x: 480, y: 160, text: 'INS pandubbi: museum hai, chalti nahi' }];
      },
      tick(L, P) {
        const s = L.r.s;
        once(L, 'a', P.ground === s, () => { s.vx = 2.2; say(L, 'yeh toh chal padi!'); });
        once(L, 'b', s.x > 360, () => { s.vx = 1; s.vy = 0.8; say(L, 'gotaa! pandubbi dub rahi hai'); sfx.trap(); });
        if (s.vy) s.y += s.vy;
        if (s.y > H + 40) { s.vx = s.vy = 0; }
      },
    },
    {
      // Lepakshi's famous pillar hangs without touching the floor. so do these. one swings, one falls
      name: 'Lepakshi',
      build(L) {
        L.start = [40, 360 - PH];
        L.solids = [
          block(0, 360, 140, 180),
          block(200, 330, 60, 90, { kind: 'pillar' }),
          block(340, 320, 60, 100, { kind: 'pillar', move: { dx: 60, dy: 0, period: 110 } }),
          L.r.f = block(520, 330, 60, 90, { kind: 'pillar', crumble: true, crumbleDelay: 14 }),
          block(660, 320, 60, 100, { kind: 'pillar' }),
          block(800, 360, 160, 180),
        ];
        L.spikes = [spikes(140, FY, 30)];
        L.doors = [door(890, 300)];
        L.signs = [{ x: 480, y: 170, text: 'latakta khamba: neeche kapda nikal lo' }];
      },
      tick(L, P) { once(L, 'f', P.ground === L.r.f, () => say(L, 'yeh khamba latakta nahi, girta hai!')); },
    },
    {
      // Kuchipudi: dance across the brass plates as they bob to the beat. the last one is pulled away
      name: 'Kuchipudi',
      build(L) {
        const plate = (x, ph) => block(x, 380, 70, 12, { kind: 'plate', move: { dx: 0, dy: 40, period: 70, phase: ph } });
        const ps = [plate(200, 0), plate(340, 0.5), plate(480, 0), plate(620, 0.5)];
        L.r.p = ps[L.try >= 1 ? 2 : 3];   // after a death, a different plate gets pulled
        L.r.stop = L.try >= 1 ? 400 : 520;
        L.solids = [block(0, FY, 160, 100), ...ps, block(800, FY, 160, 100)];
        L.spikes = [spikes(160, FY, 29)];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 480, y: 200, text: 'thaali pe naach: Kuchipudi' }];
      },
      tick(L, P) {
        const p = L.r.p;
        once(L, 'a', P.ground === p, () => { p.move.on = false; p.vx = -2; say(L, 'thaali khisak gayi!'); });
        if (p.vx && p.x < L.r.stop) p.vx = 0;
      },
    },
    {
      // painted Kondapalli toys pace back and forth over the thorns. ride them; one turns around early
      name: 'Kondapalli',
      build(L) {
        L.solids = [
          block(0, FY, 160, 100),
          L.r.t1 = block(180, FY - 50, 80, 50, { kind: 'toy' }),
          L.r.t2 = block(460, FY - 70, 80, 70, { kind: 'toy' }),
          block(760, FY, 200, 100),
        ];
        L.spikes = [spikes(160, FY, 27)];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 480, y: 200, text: 'Kondapalli khilone: lakdi ke, zinda nahi' }];
      },
      tick(L, P) {
        crabWalk(L, L.r.t1, 180, 380, 'a', 1.6);
        crabWalk(L, L.r.t2, 400, L.f.e ? 560 : 660, 'b', 1.6);
        once(L, 'e', P.ground === L.r.t2, () => say(L, 'khilona thak gaya'));
      },
    },
    {
      // long level: coffee sacks roll down the Araku slopes, then a bamboo bridge across the valley in the mist
      name: 'Araku Ghati',
      screens: [
        {
          build(L) {
            L.solids = [block(0, FY, 260, 100), block(260, 400, 180, 140), block(440, 360, 180, 180), block(620, 320, 340, 220)];
            L.doors = [door(890, 260)];
            L.signs = [{ x: 140, y: FY - 110, text: 'Araku coffee: pahad se seedha' }];
          },
          tick(L, P) {
            L.f.r = ((L.f.r || 0) + 1) % 110;
            if (L.f.r === 0 && P.x > 120) L.hazards.push(hazard(W + 10, 290, 36, 30, { kind: 'rock', vx: -3.5 }));
            for (const h of L.hazards) { const ground = h.x > 620 ? 320 : h.x > 440 ? 360 : h.x > 260 ? 400 : FY; h.y = ground - h.h; }
            L.hazards = L.hazards.filter(h => h.x > -60);
          },
        },
        {
          build(L) {
            const f = { fog: 150 };
            L.r.pl = [180, 300, 420, 540, 660].map(x => block(x, FY - 20, 100, 12, f));
            L.solids = [block(0, FY, 160, 100), ...L.r.pl, block(800, FY, 160, 100)];
            L.spikes = [spikes(160, FY + 60, 29)];
            L.doors = [door(890, FY - 60)];
            L.signs = [{ x: 480, y: 220, text: 'baans ka pul: dhundh mein' }];
          },
          tick(L, P) {
            domino(L, L.r.pl, P.ground === L.r.pl[0], 'dom', 22);
            once(L, 'r', L.f.dom === 1, () => say(L, 'pul gir raha hai! bhaago!'));
          },
        },
      ],
    },
    {
      // long level, the finale: a Godavari launch through Papikondalu, the rapids, and a sand island with the tide coming
      name: 'Papikondalu',
      screens: [
        {
          build(L) {
            L.solids = [block(0, FY, 160, 100), L.r.b = block(170, FY - 16, 160, 16, { kind: 'boat' }), block(660, FY - 40, 50, 140, { kind: 'boulder' }), block(820, FY, 140, 100)];
            L.hazards = [hazard(160, FY + 6, 660, 100, { kind: 'water' })];
            L.doors = [door(890, FY - 60)];
            L.signs = [{ x: 480, y: 220, text: 'Godavari: launch ki sawaari' }];
          },
          tick(L, P) {
            const b = L.r.b;
            once(L, 'a', P.ground === b, () => { b.vx = 2.4; });
            once(L, 'b', b.x > 420, () => { b.vx = 0; L.f.w = 0; say(L, 'driver chai peene ruka'); });
            if (L.f.w != null && L.f.w < 60 && ++L.f.w === 60) { b.vx = -2.4; say(L, 'launch wapas! chai khatam'); sfx.horn(); }
            if (b.vx < 0 && b.x <= 170) { b.vx = 0; b.x = 170; }
          },
        },
        {
          build(L) {
            L.solids = [
              block(0, FY, 140, 100),
              block(220, FY - 30, 60, 130, { kind: 'boulder' }),
              block(360, FY - 14, 100, 14, { kind: 'log', move: { dx: 80, dy: 0, period: 120 } }),
              block(560, FY - 40, 60, 140, { kind: 'boulder' }),
              L.r.lg = block(680, FY - 14, 90, 14, { kind: 'log', crumble: true, crumbleDelay: 16 }),
              block(820, FY, 140, 100),
            ];
            L.hazards = [hazard(140, FY + 6, 680, 100, { kind: 'water' })];
            L.winds = [wind(140, 200, 680, 240, 1.4)];
            L.doors = [door(890, FY - 60)];
            L.signs = [{ x: 480, y: 220, text: 'tez dhaara: sambhal ke' }];
          },
        },
        {
          build(L) {
            L.solids = [block(0, FY, 260, 100), block(320, 380, 100, 160), block(480, 330, 100, 210), block(640, 280, 100, 260), block(800, 330, 160, 210)];
            L.flood = { y: H + 20, speed: 0, stop: 340 };
            L.doors = [door(670, 220)];
            L.signs = [{ x: 140, y: FY - 110, text: 'ret ka tapu: thodi der ka' }];
          },
          tick(L, P) {
            once(L, 'a', P.x > 220, () => { L.flood.speed = 1; say(L, 'paani chadh raha hai!'); sfx.trap(); });
            const d = L.doors[0];
            once(L, 'd', P.x > 470 && P.y < 330, () => { d.tx = 880; d.ty = 270; say(L, 'darwaza bhi tapu badal raha hai'); });
          },
        },
      ],
    },
  ],
});
