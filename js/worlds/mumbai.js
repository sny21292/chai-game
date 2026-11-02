'use strict';
// World 1: Mumbai Local. Teaches the basic tricks: falling floors, popping spikes, runaway doors.

world({
  id: 'mumbai',
  theme: 'mumbai',
  name: 'Mumbai Local',
  tagline: 'platform pe dhakka, floor pe dhokha',
  levels: [
    {
      name: 'Platform No. 1',
      build(L) {
        L.solids = [block(0, FY, 380, 100), L.r.trap = block(380, FY, 140, 100), block(520, FY, 440, 100)];
        L.doors = [door(860, FY - 60)];
        L.signs = [{ x: 190, y: FY - 100, text: 'ghar → seedha. easy.' }];
      },
      tick(L, P) { once(L, 'a', P.x > 388, () => drop(L.r.trap)); },
    },
    {
      name: 'Khile',
      build(L) {
        L.solids = [block(0, FY, 960, 100)];
        L.spikes = [L.r.s1 = spikes(680, FY, 4, { hidden: true }), L.r.s2 = spikes(300, FY, 3, { hidden: true })];
        L.doors = [door(860, FY - 60)];
      },
      tick(L, P) {
        once(L, 'a', P.x + P.w > 600, () => pop(L.r.s1));
        once(L, 'b', P.x > 790, () => { L.doors[0].tx = 40; say(L, 'pakad ke dikhao!'); sfx.trap(); });
        once(L, 'c', L.f.b && P.x < 430, () => pop(L.r.s2));
      },
    },
    {
      name: 'Upar Dekho',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          L.r.c = block(430, 0, 100, 70, { crusher: true, landY: FY - 70, kind: 'crate' }),
          block(640, FY - 140, 40, 140),
        ];
        L.doors = [door(860, FY - 60)];
        L.signs = [{ x: 800, y: FY - 175, text: 'deewar oonchi hai. hmm.' }];
      },
      tick(L, P) { once(L, 'a', P.x + P.w > 400, () => drop(L.r.c, 4)); },
    },
    {
      name: 'Local Aa Gayi',
      build(L) {
        L.solids = [block(0, FY, 960, 100), block(200, FY - 60, 80, 60), block(280, 320, 300, 16)];
        L.hazards = [L.r.train = hazard(W + 40, FY - 74, 560, 74, { kind: 'train', vx: -15, active: false })];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 430, y: 270, text: 'foot over bridge' }];
      },
      tick(L, P) { once(L, 'a', P.x > 330, () => { trigger(L.r.train); sfx.horn(); say(L, 'TRAIN!!'); }); },
    },
    {
      name: 'Nakli Kaante',
      build(L) {
        L.solids = [block(0, FY, 960, 100)];
        L.spikes = [spikes(220, FY, 20, { fake: true }), L.r.sp = spikes(740, FY, 2, { hidden: true })];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 440, y: FY - 120, text: 'itna lamba? koodna mat.' }];
      },
      tick(L, P) { once(L, 'a', P.x + P.w > 680, () => pop(L.r.sp)); },
    },
    {
      name: 'Ulta Pulta',
      build(L) {
        L.solids = [block(0, FY, 500, 100), block(620, FY, 340, 100)];
        L.spikes = [spikes(740, FY, 2)];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 170, y: FY - 100, text: 'sab normal hai' }];
      },
      tick(L, P) { once(L, 'a', P.x > 250, () => { L.reversed = true; say(L, '← → ?'); sfx.flip(); }); },
    },
    {
      name: 'Peak Hour',
      build(L) {
        L.solids = [block(0, FY, 480, 100), block(560, FY, 140, 100), block(760, FY, 200, 100)];
        L.winds = [L.r.crowd = wind(560, 0, 400, FY, -2)];
        L.doors = [door(900, FY - 60)];
        L.signs = [{ x: 240, y: FY - 100, text: 'thoda dhakka lagega' }];
      },
      tick(L, P) { once(L, 'a', P.x > 770 && P.onGround, () => { L.r.crowd.fx = -3.2; say(L, 'PEAK HOUR!'); }); },
    },
    {
      name: 'Sharmila Darwaza',
      build(L) {
        L.solids = [block(0, FY, 960, 100)];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 480, y: FY - 120, text: 'darwaza sharmata hai. paas mat jaana.' }];
      },
      tick(L, P) {
        const d = L.doors[0];
        if (d.x !== d.tx) return;
        const gap = Math.max(d.x - (P.x + P.w), P.x - (d.x + d.w));
        if (gap < 110 && P.onGround) {
          d.tx = d.x > W / 2 ? 60 : 880;
          L.f.n = (L.f.n || 0) + 1;
          sfx.trap();
          say(L, L.f.n >= 2 ? 'psst: hawa mein tumhe dekh nahi pata' : 'eek!');
        }
      },
    },
    {
      name: 'Bhaago!',
      build(L) {
        for (let i = 0; i < 12; i++) L.solids.push(L.r['t' + i] = block(i * 80, FY, 80, 100));
        L.spikes = [spikes(408, FY, 2, { on: L.r.t5 }), spikes(648, FY, 2, { on: L.r.t8 })];
        L.doors = [door(890, FY - 60)];
      },
      tick(L) {
        if (L.t === 45) say(L, 'train chhoot jayegi! BHAAGO');
        const k = (L.t - 60) / 20;
        if (Number.isInteger(k) && k >= 0 && k < 11) drop(L.r['t' + k]);
      },
    },
    {
      name: 'Aakhri Local',
      build(L) {
        L.solids = [block(0, FY, 300, 100), L.r.gap = block(300, FY, 140, 100), block(440, FY, 520, 100)];
        L.doors = [L.r.fake = door(860, FY - 60), L.r.real = door(40, FY - 60, { hidden: true })];
        L.spikes = [L.r.sp = spikes(790, FY, 3, { hidden: true })];
        L.signs = [{ x: 560, y: FY - 100, text: 'last door. pakka promise.' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 700, () => {
          L.r.fake.evil = true;
          L.r.real.hidden = false;
          pop(L.r.sp);
          drop(L.r.gap);
          say(L, 'yeh darwaza nahi, dhokha hai');
        });
      },
    },
  ],
});
