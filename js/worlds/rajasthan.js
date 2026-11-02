'use strict';
// World 3: Rajasthan. Quicksand, camels that ride (or sit), sandstorms, fort gates and mirages.

// is the player touching this door? (doors are 40x60, shrunk a little like the engine does)
const rjTouch = (P, d) => P.x < d.x + d.w - 8 && P.x + P.w > d.x + 8 && P.y < d.y + d.h - 8 && P.y + P.h > d.y + 8;

world({
  id: 'rajasthan',
  theme: 'rajasthan',
  name: 'Rajasthan',
  tagline: 'padharo mhare des... dhyaan se',
  levels: [
    {
      name: 'Padharo',
      build(L) {
        L.solids = [block(0, FY, 300, 100), L.r.sand = block(300, FY + 10, 240, 100, { sink: true }), block(540, FY, 420, 100)];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 160, y: FY - 100, text: 'padharo mhare des!' }];
      },
      tick(L) { once(L, 'a', L.r.sand.depth > 10, () => say(L, 'registan mein bharosa?')); },
    },
    {
      name: 'Oasis',
      build(L) {
        L.solids = [
          block(0, FY, 380, 100),
          block(380, FY, 240, 100, { ghost: true }),
          block(620, FY, 340, 100),
          block(470, FY - 90, 60, 16),
        ];
        L.doors = [door(880, FY - 60), door(560, FY - 60, { fake: true })];
        L.signs = [{ x: 190, y: FY - 100, text: 'oasis aage hai, thanda paani →' }];
      },
      tick(L, P) { once(L, 'a', P.y > FY + 4, () => say(L, 'oasis nakli tha, bhai')); },
    },
    {
      name: 'Oont Baitha',
      build(L) {
        L.solids = [
          block(0, FY, 170, 100),
          block(170, FY + 10, 630, 100, { sink: true }),
          block(800, FY, 160, 100),
          block(640, FY - 90, 50, 100),
          L.r.camel = block(180, FY - 40, 90, 50, { kind: 'camel' }),
        ];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 420, y: FY - 160, text: 'oont pe baitho, aaram se jao' }];
      },
      tick(L, P) {
        const c = L.r.camel;
        once(L, 'go', P.ground === c, () => { c.vx = 2; say(L, 'chal mere oont!'); });
        once(L, 'sit', c.x > 470, () => {
          c.vx = 0; c.ox = c.x; c.oy = c.y;
          c.move = { dx: 0, dy: 160, period: 640 };
          say(L, 'oont kis karwat baithega? neeche.');
        });
      },
    },
    {
      name: 'Aandhi',
      build(L) {
        L.solids = [block(0, FY, 260, 100), block(460, FY, 500, 100)];
        L.winds = [L.r.w = wind(280, 60, 180, FY - 60, 2.4)];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 130, y: FY - 100, text: 'aandhi tumhare saath hai →' }];
      },
      tick(L, P) {
        // the first time you walk up, the storm turns on you. then it cycles: 90 frames against, 70 with.
        once(L, 'a', P.x > 150, () => { L.f.p = 0; say(L, 'aandhi palat gayi!'); sfx.trap(); });
        if (L.f.p == null) return;
        L.f.p = (L.f.p + 1) % 160;
        L.r.w.fx = L.f.p < 90 ? -3 : 2.4;
      },
    },
    {
      name: 'Mrigtrishna',
      build(L) {
        L.solids = [
          block(0, FY, 560, 100),
          block(560, FY + 10, 200, 100, { sink: true }),
          block(760, FY, 200, 100),
          block(640, 360, 90, 16),
          block(470, 280, 90, 16),
          block(300, 200, 90, 16),
          block(60, 130, 160, 16),
        ];
        L.doors = [L.r.fake = door(880, FY - 60, { fake: true }), L.r.real = door(100, 70, { hidden: true })];
        L.signs = [{ x: 260, y: FY - 100, text: 'darwaza saamne hai. pakka.' }];
      },
      tick(L, P) {
        once(L, 'a', rjTouch(P, L.r.fake), () => {
          L.r.fake.hidden = true; L.r.fake.alpha = 0;
          L.r.real.hidden = false;
          say(L, 'mrigtrishna! upar dekho');
          sfx.trap();
        });
      },
    },
    {
      name: 'Kila Ka Gate',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          L.r.gate = block(426, 200, 128, 110, { crusher: true, landY: FY - 110, kind: 'crate' }),
          block(420, 190, 140, 130),
          block(420, 320, 10, 120, { ghost: true }),       // gate posts (just paint)
          block(550, 320, 10, 120, { ghost: true }),
          block(230, 360, 80, 16),
          block(320, 280, 70, 16),
        ];
        L.hazards = [hazard(475, 160, 30, 30, { kind: 'fire' })];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 220, y: FY - 140, text: 'kila khula hai, andar aao' }];
      },
      tick(L, P) {
        once(L, 'a', P.x + P.w > 426 && P.x < 554 && P.y > 320, () => { drop(L.r.gate, 3); say(L, 'kila hai, mall nahi!'); });
      },
    },
    {
      name: 'Loo Lag Gayi',
      build(L) {
        L.start = [900, FY - PH];
        L.solids = [block(0, FY, 300, 100), block(300, FY + 10, 340, 100, { sink: true }), block(640, FY, 320, 100)];
        L.hazards = [hazard(455, FY - 18, 30, 28, { kind: 'fire' })];
        L.doors = [door(40, FY - 60)];
        L.signs = [{ x: 800, y: FY - 100, text: '← ghar. dhoop tez hai.' }];
      },
      tick(L, P) {
        once(L, 'a', P.x < 620, () => { L.reversed = true; say(L, 'loo lag gayi! ulta dimaag'); sfx.flip(); });
      },
    },
    {
      name: 'Kaunsa Oont?',
      build(L) {
        L.solids = [
          block(0, FY, 160, 100),
          block(160, FY + 10, 640, 100, { sink: true }),
          block(800, FY, 160, 100),
          block(520, FY - 40, 90, 50, { kind: 'camel', ghost: true }),
          block(650, FY - 40, 90, 50, { kind: 'camel' }),
          block(180, FY - 40, 90, 50, { kind: 'camel', move: { dx: 240, dy: 0, period: 300 } }),
        ];
        L.hazards = [hazard(160, FY - 10, 640, 20, { kind: 'fire' })];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 470, y: FY - 170, text: 'teen oont. asli kitne?' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 515 && P.x < 610 && P.y > FY - 40 && !P.onGround, () => say(L, 'mirage wala oont!'));
      },
    },
    {
      name: 'Bhaagta Oont',
      build(L) {
        L.solids = [
          block(0, FY, 400, 100),
          block(400, FY + 10, 560, 100, { sink: true }),
          L.r.camel = block(290, FY - 50, 90, 50, { kind: 'camel' }),
        ];
        L.doors = [L.r.d = door(315, FY - 110)];
        L.signs = [{ x: 150, y: FY - 100, text: 'darwaza oont pe hai. aaram se.' }];
      },
      tick(L, P) {
        const c = L.r.camel, d = L.r.d;
        once(L, 'run', P.x + P.w > 170, () => { c.vx = 2.2; say(L, 'oont bhi bhaagta hai!'); sfx.trap(); });
        if (c.vx && c.x > 680) { c.vx = 0; c.x = 680; }
        d.tx = c.x + 25; d.ty = c.y - 60;
      },
    },
    {
      name: 'Aakhri Safar',
      build(L) {
        L.solids = [
          block(0, FY, 240, 100),
          block(240, FY + 10, 160, 100, { sink: true }),
          block(400, FY, 320, 100),
          block(720, FY + 10, 140, 100, { sink: true }),
          block(860, FY, 100, 100),
          L.r.gate = block(565, 265, 110, 55, { crusher: true, landY: FY - 55, kind: 'crate' }),
          block(560, 260, 120, 60),
          block(560, 320, 8, 120, { ghost: true }),
          block(672, 320, 8, 120, { ghost: true }),
          block(470, 350, 70, 16),
          block(720, 340, 60, 16),
          block(760, FY - 40, 90, 50, { kind: 'camel' }),
        ];
        L.hazards = [hazard(585, 230, 30, 30, { kind: 'fire' }), hazard(720, FY - 10, 140, 20, { kind: 'fire' })];
        L.doors = [L.r.fake = door(900, FY - 60, { fake: true }), L.r.real = door(630, 200, { hidden: true })];
        L.signs = [{ x: 120, y: FY - 100, text: 'aakhri darwaza. kasam se.' }];
      },
      tick(L, P) {
        once(L, 'gate', P.x + P.w > 565 && P.x < 675 && P.y > 320, () => { drop(L.r.gate, 3); say(L, 'gate band. upar se jao!'); });
        once(L, 'fake', rjTouch(P, L.r.fake), () => {
          L.r.fake.hidden = true; L.r.fake.alpha = 0;
          L.r.real.hidden = false;
          L.winds.push(wind(0, 50, 960, FY - 50, 1));
          say(L, 'phir se mirage! aur aandhi bhi');
          sfx.trap();
        });
      },
    },
  ],
});
