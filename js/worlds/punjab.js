'use strict';
// Punjab: mustard fields that hide ditches, tractors in reverse, slippery lassi, a dancing floor,
// tube-well jets, two stubborn buffaloes, flipping rotis and a door that does bhangra.

// a tube-well jet's height on a 120-frame cycle: on for 60 frames, off for 60 (offset by phase frames)
function jetHeight(t, phase, tall) {
  const k = (t + phase) % 120;
  return k < 60 ? tall * Math.min(1, k / 8, (60 - k) / 8) : 0;
}

world({
  id: 'punjab',
  theme: 'punjab',
  name: 'Punjab',
  region: 'PB', kind: 'state',
  tagline: 'balle balle! floor bhi nachega.',
  levels: [
    {
      // tall mustard hides the ditches in the field
      name: 'Sarson Ke Khet',
      build(L) {
        L.solids = [
          block(0, FY, 250, 100), block(330, FY, 200, 100), block(600, FY, 140, 100), block(800, FY, 160, 100),
          block(180, FY - 40, 580, 40, { ghost: true, kind: 'crop' }),
        ];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 110, y: FY - 110, text: 'sarson ke khet. bas khet.' }];
      },
      tick(L, P) { once(L, 'f', P.y > FY, () => say(L, 'khet mein khaai!')); },
    },
    {
      // the parked tractor reverses at you. too long to jump; ride on top
      name: 'Tractor',
      build(L) {
        L.solids = [block(0, FY, 960, 100), L.r.t = block(560, FY - 56, 130, 56, { kind: 'tractor' })];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 280, y: FY - 110, text: 'tractor parked hai. aaram se.' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 380, () => { L.r.t.vx = -3.2; say(L, 'reverse gear!'); sfx.horn(); });
        L.solids = L.solids.filter(s => s.kind !== 'tractor' || s.x > -200);
      },
    },
    {
      // dhaba lassi glasses over spikes. the malai on top is slippery, and one glass cracks
      name: 'Lassi',
      build(L) {
        L.solids = [
          block(0, FY, 140, 100), block(140, FY, 680, 100),
          block(200, 360, 60, 80, { ice: true, kind: 'lassi' }),
          block(340, 320, 60, 120, { ice: true, kind: 'lassi' }),
          L.r.cr = block(480, 340, 60, 100, { ice: true, kind: 'lassi', crumble: true, crumbleDelay: 8 }),
          block(620, 300, 60, 140, { ice: true, kind: 'lassi' }),
          block(760, 300, 200, 240),
        ];
        L.spikes = [spikes(140, FY, 31)];
        L.doors = [door(880, 240)];
        L.signs = [{ x: 480, y: 190, text: 'malai maar ke lassi. fisalti hai.' }];
      },
      tick(L, P) { once(L, 'c', P.ground === L.r.cr, () => say(L, 'kaanch ka glass, kaanch ka bharosa')); },
    },
    {
      // the floor does bhangra. ride the middle one too high and you meet the ceiling
      name: 'Bhangra',
      build(L) {
        const dance = phase => ({ dx: 0, dy: -110, period: 100, phase });
        L.solids = [
          block(0, FY, 160, 100),
          L.r.s1 = block(180, 400, 140, 14, { move: dance(0) }),
          block(360, 400, 140, 14, { move: dance(0.5) }),
          block(540, 400, 140, 14, { move: dance(0.25) }),
          block(720, FY, 240, 100),
        ];
        L.spikes = [spikes(360, 250, 6, { dir: 'down' })];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 480, y: 130, text: 'bhangra floor: balle balle!' }];
      },
      tick(L, P) { once(L, 'a', P.ground === L.r.s1, () => say(L, 'floor nach raha hai!')); },
    },
    {
      // the tube well is off. then the power comes back
      name: 'Tube Well',
      build(L) {
        L.solids = [block(0, FY, 960, 100)];
        L.hazards = [300, 520, 740].map(x => hazard(x, FY, 26, 0, { kind: 'jet' }));
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 150, y: FY - 110, text: 'tube well band hai. pakka.' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 200, () => { L.f.j = 0; say(L, 'bijli aa gayi!'); sfx.trap(); });
        if (L.f.j == null) return;
        L.f.j = (L.f.j + 1) % 120;
        L.hazards.forEach((h, i) => { h.h = jetHeight(L.f.j, [100, 60, 20][i], 220); h.y = FY - h.h; });
      },
    },
    {
      // two buffaloes walk in from both sides and meet in the middle. you're the middle
      name: 'Bhains',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          L.r.b1 = block(-110, FY - 56, 100, 56, { kind: 'bhains' }),
          L.r.b2 = block(W + 10, FY - 56, 100, 56, { kind: 'bhains' }),
        ];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 480, y: FY - 130, text: 'bhains apni marzi ki maalik' }];
      },
      tick(L, P) {
        const { b1, b2 } = L.r;
        once(L, 'a', P.x > 300, () => { b1.vx = 2.5; b2.vx = -2.5; say(L, 'bhains, bhains, beech mein Chotu'); });
        once(L, 'b', b1.x + b1.w >= b2.x, () => { b1.vx = b2.vx = 0; });
      },
    },
    {
      // rotis on a hot tawa flip over now and then. don't be on one when it does
      name: 'Tawa Roti',
      build(L) {
        L.r.rotis = [180, 300, 420, 540, 660].map((x, i) => block(x, i % 2 ? 330 : 360, 80, 12, { kind: 'roti', ph: i * 16 }));
        L.solids = [block(0, FY, 140, 100), block(140, FY + 20, 640, 80), ...L.r.rotis, block(780, 330, 180, 210)];
        L.hazards = [hazard(140, FY - 6, 640, 26, { kind: 'fire' })];
        L.doors = [door(880, 270)];
        L.signs = [{ x: 480, y: 200, text: 'garam tawa. roti palti jaati hai.' }];
      },
      tick(L, P) {
        L.f.r = ((L.f.r || 0) + 1) % 80;
        for (const r of L.r.rotis) r.ghost = r.dim = (L.f.r + r.ph) % 80 >= 50;
        once(L, 'a', P.x > 160 && L.f.r === 50, () => say(L, 'roti palat gayi!'));
      },
    },
    {
      // finale: a ditch in the mustard, a dancing floor, and a door that won't stop doing bhangra
      name: 'Balle Balle',
      build(L) {
        L.solids = [
          block(0, FY, 300, 100), block(370, FY, 230, 100),
          block(180, FY - 40, 400, 40, { ghost: true, kind: 'crop' }),
          block(620, 400, 90, 14, { move: { dx: 0, dy: -90, period: 100 } }),
          block(730, 360, 70, 14, { move: { dx: 0, dy: -90, period: 100, phase: 0.5 } }),
          block(820, 300, 140, 240),
        ];
        L.doors = [door(880, 240)];
        L.signs = [{ x: 120, y: FY - 110, text: 'aakhri khet. aakhri nach.' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 820 && P.y < 300, () => { L.f.d = 0; say(L, 'darwaza bhi bhangra kar raha hai!'); });
        if (L.f.d != null) { L.f.d = (L.f.d + 1) % 120; L.doors[0].ty = L.f.d < 60 ? 170 : 240; }
      },
    },
  ],
});
