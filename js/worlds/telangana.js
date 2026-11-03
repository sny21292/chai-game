'use strict';
// Telangana: the bangle lanes by Charminar, a pot of dum biryani, the clapping trick at Golconda, HITEC City lifts,
// Irani chai with Osmania biscuits, Ramoji's film sets, Hussain Sagar, and the Nizam's treasure vault.

world({
  id: 'telangana',
  theme: 'telangana',
  name: 'Telangana',
  region: 'TG', kind: 'state',
  tagline: 'kya miyan, floor pe bharosa? hau?',
  levels: [
    {
      // glass-bangle shelves over the broken glass of Laad Bazaar. bangles are pretty; not strong
      name: 'Charminar',
      build(L) {
        L.solids = [
          block(0, FY, 200, 100),
          ...[[240, 380], [380, 330], [520, 380], [660, 330]].map(([x, y]) => block(x, y, 90, 14, { kind: 'bangles', crumble: true, crumbleDelay: 12 })),
          block(780, FY, 180, 100),
        ];
        L.spikes = [spikes(200, FY, 26)];
        L.hazards = [L.r.pg = hazard(W + 30, L.try >= 1 ? 300 : 270, 34, 24, { kind: 'pigeon', vx: -5, active: false })];   // lower once you've met it
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 480, y: 170, text: 'Laad Bazaar: choodi le lo, choodi' }];
      },
      tick(L, P) { once(L, 'p', P.x > (L.try >= 1 ? 330 : 420), () => { trigger(L.r.pg); say(L, 'kabootar!'); }); },
    },
    {
      // the handi lid jumps when the steam builds. it's sealed for dum half the time
      name: 'Dum Biryani',
      build(L) {
        L.solids = [
          block(0, FY, 380, 100),
          block(380, 350, 200, 190, { kind: 'handi' }),
          L.r.lid = block(400, 336, 160, 14, { kind: 'lid' }),
          block(620, 160, 340, 380),
        ];
        L.spikes = [spikes(580, FY, 2)];
        L.doors = [door(890, 100)];
        L.signs = [{ x: 200, y: FY - 110, text: 'dum biryani: dhakkan mat kholna' }];
      },
      tick(L, P) {
        L.f.s = ((L.f.s || 0) + 1) % 120;
        const open = L.f.s >= 60;
        L.r.lid.bounce = open ? 17 : 0;
        L.r.lid.dim = !open;
        once(L, 'd', !open && P.ground === L.r.lid, () => say(L, 'abhi dum pe hai. ruko'));
      },
    },
    {
      // long level: at Golconda a clap at the gate is heard at the top. the door up there waits for it
      name: 'Golconda',
      screens: [
        {
          build(L) {
            L.solids = [
              block(0, FY, 960, 100),
              block(300, 380, 120, 14), block(460, 320, 120, 14), block(620, 260, 120, 14), block(780, 200, 180, 340),
            ];
            L.r.clap = { x: 70, w: 70 };
            L.doors = [L.r.d = door(890, 140, { hidden: true })];
            L.signs = [{ x: 105, y: FY - 130, text: 'yahan taali bajao (koodo)' }, { x: 860, y: 90, text: 'darwaza sunta hai' }];
          },
          tick(L, P) {
            const c = L.r.clap;
            once(L, 'c', P.vy < -4 && P.x + P.w > c.x && P.x < c.x + c.w && P.y > FY - 80, () => { L.r.d.hidden = false; say(L, 'taali upar tak gayi!'); sfx.win(); });
            once(L, 't', !L.f.c && P.x > 780 && P.y < 200, () => say(L, 'darwaza nahi aaya? taali kahan hai?'));
          },
        },
        {
          build(L) {
            L.solids = [
              block(0, FY, 960, 100),
              L.r.c1 = block(300, -60, 90, 80, { kind: 'boulder' }),
              L.r.c2 = block(560, -60, 90, 80, { kind: 'boulder' }),
              block(700, 360, 60, 80),
            ];
            L.doors = [door(890, FY - 60)];
            L.signs = [{ x: 160, y: FY - 110, text: 'qile ki deewar: 400 saal purani' }];
          },
          tick(L, P) {
            const { c1, c2 } = L.r;
            once(L, 'a', P.x > 250, () => { c1.crusher = true; c1.landY = FY - 80; drop(c1, 6); say(L, 'deewar gir rahi hai!'); });
            once(L, 'b', P.x > 500, () => { c2.crusher = true; c2.landY = FY - 80; drop(c2, 6); });
          },
        },
      ],
    },
    {
      // HITEC City: ride the office lifts. the second one is "under maintenance"
      name: 'HITEC City',
      build(L) {
        L.solids = [
          block(0, FY, 200, 100),
          block(210, FY - 14, 90, 14, { kind: 'lift', move: { dx: 0, dy: -200, period: 220 } }),
          block(320, 240, 220, 300),
          L.r.l2 = block(560, 240, 90, 14, { kind: 'lift', move: { dx: 0, dy: -100, period: 160 } }),
          block(680, 160, 280, 380),
        ];
        L.spikes = [spikes(200, FY, 5)];
        L.doors = [door(890, 100)];
        L.signs = [{ x: 430, y: 180, text: 'HITEC City: lift hai, WFH nahi' }];
      },
      tick(L, P) {
        const l2 = L.r.l2;
        if (P.ground === l2 && !l2.falling) L.f.l = (L.f.l || 0) + 1;
        once(L, 'f', L.f.l >= 20, () => { l2.move.on = false; drop(l2); say(L, 'lift under maintenance!'); });
      },
    },
    {
      // Osmania biscuits floating in Irani chai: they go soggy fast
      name: 'Irani Chai',
      build(L) {
        L.solids = [
          block(0, FY, 180, 100),
          ...[240, 380, 520, 660].map(x => block(x, 410, 70, 30, { kind: 'biscuit', sink: true })),
          block(780, FY, 180, 100),
        ];
        L.flood = { y: 452, speed: 0, stop: 0, kind: 'kaapi' };
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 480, y: 220, text: 'ek chai, do Osmania' }];
      },
      tick(L, P) { once(L, 's', P.ground && P.ground.sink && P.ground.depth > 12, () => say(L, 'biscuit gal raha hai!')); },
    },
    {
      // long level: Ramoji film sets. painted ledges are only paint; the real ones are invisible. then: action!
      name: 'Film City',
      screens: [
        {
          build(L) {
            L.solids = [
              block(0, FY, 180, 100),
              block(240, 380, 100, 14, { kind: 'set', ghost: true }), block(240, 360, 100, 14, { invisible: true }),
              block(400, 300, 100, 14, { kind: 'set' }),
              block(560, 300, 100, 14, { kind: 'set', ghost: true }), block(580, 380, 100, 14, { invisible: true }),
              block(760, FY, 200, 100),
            ];
            L.spikes = [spikes(180, FY, 26)];
            L.doors = [door(890, FY - 60)];
            L.signs = [{ x: 480, y: 170, text: 'film set: sab nakli. sab?' }];
          },
        },
        {
          build(L) {
            L.solids = [block(0, FY, 960, 100), block(460, 340, 100, 14)];
            L.r.fires = [260, 380, 620, 740].map(x => hazard(x, -1000, 40, 40, { kind: 'fire' }));
            L.hazards = [...L.r.fires];
            L.doors = [door(890, FY - 60)];
            L.signs = [{ x: 140, y: FY - 110, text: 'lights, camera...' }];
          },
          tick(L, P) {
            once(L, 'a', P.x > 160, () => { L.f.b = 0; say(L, 'action! dhamaake!'); sfx.trap(); });
            if (L.f.b != null && L.f.b < 400) {
              const b = ++L.f.b;
              L.r.fires.forEach((h, i) => { const t = (b - i * 24) % 96; h.y = b >= i * 24 && t < 48 ? FY - 40 : -1000; });
            }
          },
        },
      ],
    },
    {
      // Hussain Sagar: a boat to the middle of the lake, a breeze, and a boat back that keeps its own timetable
      name: 'Hussain Sagar',
      build(L) {
        L.solids = [
          block(0, FY, 160, 100),
          L.r.b1 = block(170, FY - 14, 120, 14, { kind: 'boat' }),
          block(440, 380, 90, 60, { crumble: true, crumbleDelay: 30 }),
          block(570, FY - 14, 120, 14, { kind: 'boat', move: { dx: 110, dy: 0, period: 200 } }),
          block(820, FY, 140, 100),
        ];
        L.hazards = [hazard(160, FY + 6, 660, 100, { kind: 'water' })];
        L.winds = [wind(160, 200, 660, 240, -0.8)];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 480, y: 220, text: 'boating: 5 minute, 50 rupaye' }];
      },
      tick(L, P) {
        const b = L.r.b1;
        once(L, 'a', P.ground === b, () => { b.vx = 2; say(L, 'naav chali'); });
        once(L, 'b', b.x > 330, () => { b.vx = -2; say(L, 'naav ka time khatam!'); sfx.horn(); });
        if (b.vx < 0 && b.x <= 170) { b.vx = 0; b.x = 170; }
      },
    },
    {
      // long level, the finale: the Nizam's vault. laser beams, then vault doors, then a door made of gold
      name: 'Nizam Ka Khazana',
      screens: [
        {
          build(L) {
            L.solids = [block(0, FY, 960, 100), block(430, 360, 100, 14)];
            L.r.lz = [[260, 0], [380, 1], [580, 0], [720, 1]].map(([x, ph]) => Object.assign(hazard(x, 140, 8, 300, { kind: 'laser' }), { ph }));
            L.hazards = [...L.r.lz];
            L.doors = [door(890, FY - 60)];
            L.signs = [{ x: 130, y: FY - 110, text: 'khazana: chhoona mana hai' }];
          },
          tick(L, P) {
            L.f.z = ((L.f.z || 0) + 1) % 100;
            for (const h of L.r.lz) h.y = (L.f.z < 50) === (h.ph === 0) ? 140 : -1000;
          },
        },
        {
          build(L) {
            L.solids = [
              block(0, FY, 960, 100),
              L.r.v1 = block(320, 40, 80, 80, { kind: 'vault' }),
              L.r.v2 = block(600, 40, 80, 80, { kind: 'vault' }),
            ];
            L.r.lz = hazard(470, 140, 8, 300, { kind: 'laser' });
            L.hazards = [L.r.lz];
            L.doors = [door(890, FY - 60)];
          },
          tick(L, P) {
            const { v1, v2 } = L.r;
            once(L, 'a', P.x > 220, () => { v1.crusher = true; v1.landY = FY - 80; drop(v1, 5); say(L, 'tijori ka darwaza!'); });
            once(L, 'b', P.x > 500, () => { v2.crusher = true; v2.landY = FY - 80; drop(v2, 5); });
            L.f.z = ((L.f.z || 0) + 1) % 90;
            L.r.lz.y = L.f.z < 45 ? 140 : -1000;
          },
        },
        {
          build(L) {
            L.solids = [block(0, FY, 960, 100), L.r.chest = block(460, FY - 40, 60, 40, { kind: 'crate' }), block(600, 340, 140, 14), block(780, 270, 180, 14)];
            L.doors = [door(880, 210), L.r.real = door(40, FY - 60, { hidden: true })];
            L.signs = [{ x: 480, y: 160, text: 'sone ka darwaza: Nizam ka' }];
          },
          tick(L, P) {
            once(L, 'g', P.x > 840 && P.y < 270, () => { L.doors[0].evil = true; L.r.real.hidden = false; say(L, 'sone ka darwaza kaatta hai! asli wala shuru mein hai'); sfx.trap(); });
          },
        },
      ],
    },
  ],
});
