'use strict';
// Karnataka: Bengaluru traffic and potholes, Namma Metro, Mysore palace lights, Hampi boulders,
// Coorg coffee in the fog, Jog Falls, the Dasara elephants and the climb up Nandi Hills.
// Harder than the north: three long levels (2-3 screens, no checkpoint) and more sudden drops.

world({
  id: 'karnataka',
  theme: 'karnataka',
  name: 'Karnataka',
  region: 'KA', kind: 'state',
  tagline: 'swalpa adjust maadi. floor nahi karega.',
  levels: [
    {
      // a jam of buses: walk over the roofs. the road beyond has a pothole, and an auto comes the wrong way
      name: 'Silk Board',
      build(L) {
        // after a death the pothole moves to where you now land, and the auto leaves earlier
        const hx = L.try >= 1 ? 710 : 780;
        L.solids = [
          block(0, FY, hx, 100),
          L.r.hole = block(hx, FY, 70, 100, { crumble: true, crumbleDelay: 4 }),
          block(hx + 70, FY, 960 - hx - 70, 100),
          block(200, FY - 70, 150, 70, { kind: 'bus' }), block(380, FY - 70, 150, 70, { kind: 'bus' }), block(560, FY - 70, 150, 70, { kind: 'bus' }),
        ];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 450, y: 250, text: 'Silk Board: 2 km, 2 ghante' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > (L.try >= 1 ? 420 : 560), () => { L.hazards.push(hazard(W + 20, FY - 40, 60, 40, { kind: 'auto', vx: -6 })); say(L, 'auto wala ulta aa raha hai!'); sfx.horn(); });
        once(L, 'h', P.ground === L.r.hole, () => say(L, L.try >= 1 ? 'gaddha shift ho gaya!' : 'gaddha! namma road.'));
        L.hazards = L.hazards.filter(h => h.x > -100);
      },
    },
    {
      // long level: ride the metro over the yard (the doors open on the left: so do your controls), then the exit escalator
      name: 'Namma Metro',
      screens: [
        {
          build(L) {
            L.start = [50, 360 - PH];
            L.solids = [
              block(0, 360, 160, 180),
              L.r.m = block(170, 330, 200, 30, { kind: 'metro' }),
              block(820, 360, 140, 180),
            ];
            L.spikes = [spikes(160, FY + 100, 30)];
            L.hazards = [hazard(160, FY + 60, 660, 40, { kind: 'water' })];
            L.doors = [door(880, 300)];
            L.signs = [{ x: 480, y: 160, text: 'agla station: Majestic' }];
          },
          tick(L, P) {
            const m = L.r.m;
            once(L, 'a', P.ground === m, () => { m.vx = 2.6; say(L, 'metro chali'); });
            once(L, 'b', m.x >= 600, () => { m.vx = 0; m.x = 600; L.reversed = true; say(L, 'darwaze baayein taraf khulenge'); sfx.flip(); });
          },
        },
        {
          // the escalator is running the wrong way, and one step is out of order
          build(L) {
            const steps = [];
            for (let i = 0; i < 6; i++) steps.push(block(200 + i * 80, FY - 40 - i * 34, 80, 40 + i * 34, i === 3 ? { crumble: true, crumbleDelay: 10 } : {}));
            L.solids = [block(0, FY, 200, 100), ...steps, block(680, FY - 220, 280, 320)];
            L.winds = [wind(200, 100, 480, 340, -1.6)];
            L.doors = [door(880, FY - 280)];
            L.signs = [{ x: 120, y: FY - 110, text: 'exit →' }, { x: 440, y: 120, text: 'escalator: neeche jaane wala' }];
          },
          tick(L, P) { once(L, 'c', P.ground && P.ground.crumble, () => say(L, 'yeh seedhi kharab hai')); },
        },
      ],
    },
    {
      // the palace bulbs blink on and off. the steps are there in the dark too; the brightest one is not there at all
      name: 'Mysore Palace',
      build(L) {
        L.r.steps = [[260, 380], [400, 320], [540, 380], [680, 320]].map(([x, y]) => block(x, y, 80, 14, { kind: 'bulbs' }));
        L.solids = [block(0, FY, 200, 100), ...L.r.steps, block(470, 230, 70, 14, { kind: 'bulbs', ghost: true }), block(780, FY, 180, 100)];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 480, y: 130, text: 'Dasara: 1 lakh bulb, sab jalte hain' }];
      },
      tick(L, P) {
        L.f.c = ((L.f.c || 0) + 1) % 120;
        const dark = L.f.c >= 70;
        for (const s of L.r.steps) s.fog = dark ? 1 : 0;
        once(L, 'a', dark && P.x > 200, () => say(L, 'bijli gayi! seedhiyan wahi hain'));
      },
    },
    {
      // Hampi: stepping boulders over a bed of thorns. the balancing rock stops balancing, and a boulder rolls in
      name: 'Hampi',
      build(L) {
        L.solids = [
          block(0, FY, 300, 100),
          block(320, 380, 70, 60, { kind: 'boulder' }),
          L.r.bal = block(470, 360, 70, 80, { kind: 'boulder', crumble: true, crumbleDelay: 18 }),
          block(620, 370, 70, 70, { kind: 'boulder' }),
          block(700, FY, 260, 100),
        ];
        L.spikes = [spikes(300, FY, 18)];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 480, y: 200, text: 'balancing rock: 500 saal se balanced' }];
      },
      tick(L, P) {
        once(L, 'b', P.ground === L.r.bal, () => say(L, 'aaj balance gaya'));
        once(L, 'r', P.x > 600, () => {
          L.hazards.push(L.try >= 1 ? hazard(-60, FY - 36, 36, 36, { kind: 'rock', vx: 4.5 }) : hazard(W + 20, FY - 36, 36, 36, { kind: 'rock', vx: -4.5 }));
          say(L, L.try >= 1 ? 'is baar peeche se!' : 'patthar aaya!');
        });
        L.hazards = L.hazards.filter(h => h.x > -80 && h.x < W + 80);
      },
    },
    {
      // long level: a coffee estate lost in the fog, then the slippery bean-drying yard
      name: 'Coorg Kohra',
      screens: [
        {
          build(L) {
            const fogged = (x, y, o = {}) => block(x, y, 70, 14, Object.assign({ fog: 150 }, o));
            L.solids = [
              block(0, FY, 160, 100),
              fogged(220, 400), fogged(360, 350), L.r.old = fogged(500, 300, { crumble: true, crumbleDelay: 12 }), fogged(640, 350), fogged(780, 400),
              block(870, FY, 90, 100),
            ];
            L.spikes = [spikes(160, FY, 32)];
            L.doors = [door(900, FY - 60)];
            L.signs = [{ x: 480, y: 160, text: 'Coorg: kohra aur coffee' }];
          },
          tick(L, P) { once(L, 'o', P.ground === L.r.old, () => say(L, 'purana patthar!')); },
        },
        {
          build(L) {
            L.solids = [block(0, FY, 300, 100, { ice: true }), block(380, FY, 240, 100, { ice: true }), block(700, FY, 260, 100, { ice: true }), block(480, FY - 50, 50, 50, { kind: 'crate' })];
            L.doors = [door(890, FY - 60)];
            L.signs = [{ x: 160, y: FY - 110, text: 'coffee sukh rahi hai. fisalna mat.' }];
          },
        },
      ],
    },
    {
      // logs ride the river to the falls. the first one goes over the edge
      name: 'Jog Falls',
      build(L) {
        L.solids = [
          block(0, FY, 160, 100),
          L.r.log = block(170, FY - 14, 110, 14, { kind: 'log' }),
          block(420, FY - 30, 50, 130, { kind: 'boulder' }),
          block(530, FY - 14, 110, 14, { kind: 'log', move: { dx: 100, dy: 0, period: 150 } }),
          block(800, FY, 160, 100),
        ];
        L.hazards = [hazard(160, FY + 6, 640, 100, { kind: 'water' })];
        L.winds = [wind(160, 300, 640, 140, 0.9)];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 480, y: 220, text: 'Jog Falls: 253 meter neeche' }];
      },
      tick(L, P) {
        const g = L.r.log;
        once(L, 'a', P.ground === g, () => { g.vx = 2.2; say(L, 'lakdi ki naav chali'); });
        once(L, 'b', g.x > 470, () => { g.vx = 0; drop(g, 1); say(L, 'lakdi waterfall dekhne gayi!'); });
      },
    },
    {
      // start on the right. ride an elephant of the Dasara procession over the thorns; it stops for the aarti and turns back
      name: 'Dasara Haathi',
      build(L) {
        L.start = [880, FY - PH];
        L.solids = [
          block(0, FY, 160, 100),
          block(800, FY, 160, 100),
          L.r.e = block(680, FY - 90, 110, 90, { kind: 'haathi' }),
          block(280, FY - 150, 90, 14),
        ];
        L.spikes = [spikes(160, FY, 29)];
        L.doors = [door(40, FY - 60)];
        L.signs = [{ x: 480, y: 160, text: '← jamboo savari' }];
      },
      tick(L, P) {
        const e = L.r.e;
        once(L, 'a', P.ground === e, () => { e.vx = -1.5; say(L, 'haathi chala!'); });
        once(L, 'b', e.x < 330, () => { e.vx = 0; L.f.w = 0; say(L, 'aarti ka time'); });
        if (L.f.w != null && L.f.w < 50 && ++L.f.w === 50) { e.vx = 1.5; say(L, 'haathi wapas ghar ja raha hai!'); sfx.horn(); }
        if (e.vx > 0 && e.x >= 680) { e.vx = 0; e.x = 680; }
      },
    },
    {
      // long level, the finale: hairpin bends, a blind ridge in the fog, and a door that wants to see the sunrise
      name: 'Nandi Hills',
      screens: [
        {
          build(L) {
            L.solids = [
              block(0, FY, 960, 100),
              block(200, 380, 140, 14),
              block(420, 320, 120, 14, { crumble: true, crumbleDelay: 14 }),
              block(220, 250, 120, 14),
              block(420, 180, 120, 14),
              block(640, 140, 320, 300),
            ];
            L.spikes = [spikes(560, FY, 3)];
            L.doors = [door(890, 80)];
            L.signs = [{ x: 760, y: 360, text: 'hairpin: 40 mod' }];
          },
        },
        {
          build(L) {
            const f = { fog: 150 };
            L.solids = [block(0, FY, 220, 100, f), block(300, FY, 180, 100, f), L.r.c = block(560, FY - 60, 140, 160, Object.assign({ crumble: true, crumbleDelay: 20 }, f)), block(780, FY, 180, 100, f)];
            L.doors = [door(890, FY - 60)];
            L.signs = [{ x: 480, y: 200, text: 'kohra itna ki pair bhi na dikhe' }];
          },
          tick(L, P) { once(L, 'c', P.ground === L.r.c, () => say(L, 'chattaan khisak rahi hai!')); },
        },
        {
          build(L) {
            L.solids = [block(0, FY, 700, 100), L.r.deck = block(720, 360, 120, 14, { crumble: true, crumbleDelay: 22 })];
            L.r.sp = spikes(500, FY, 4, { hidden: true });
            L.spikes = [L.r.sp];
            L.doors = [door(620, FY - 60)];
            L.signs = [{ x: 260, y: FY - 110, text: 'sunrise point: 6 baje' }];
          },
          tick(L, P) {
            const d = L.doors[0];
            once(L, 'a', P.x > 420, () => { d.tx = 760; d.ty = 300; pop(L.r.sp); say(L, 'darwaza bhi sunrise dekhne gaya'); });
          },
        },
      ],
    },
  ],
});
