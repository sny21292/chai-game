'use strict';
// Gujarat: springy dhokla, Uttarayan kite strings, the white Rann, Gir lions, a stepwell, garba on the beat.

// a kite string that rises and falls on a 120-frame cycle between y=lo and y=hi
function manjaSwing(L, m, lo, hi) {
  L.f.m = ((L.f.m || 0) + 1) % 120;
  m.y = lo + (hi - lo) * (0.5 - 0.5 * Math.cos(2 * Math.PI * L.f.m / 120));
}
// garba tiles: group 0 is solid for the first half of each beat, group 1 for the second
function garbaBeat(L, tiles, period) {
  L.f.b = ((L.f.b || 0) + 1) % period;
  const first = L.f.b < period / 2;
  for (const t of tiles) t.ghost = t.dim = (t.grp === 0) !== first;
}

world({
  id: 'gujarat',
  theme: 'gujarat',
  name: 'Gujarat',
  region: 'GJ', kind: 'state',
  tagline: 'kem cho? floor: majama. Chotu: nahi.',
  levels: [
    {
      // two snacks that look the same: the khaman just sits there, the dhokla bounces you over the wall
      name: 'Kem Cho',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          L.r.k = block(260, FY - 20, 70, 20, { kind: 'dhokla' }),
          block(400, FY - 20, 70, 20, { kind: 'dhokla', bounce: 15 }),
          block(540, 280, 60, 160),
        ];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 190, y: 300, text: 'dhokla: soft aur spongy' }];
      },
      tick(L, P) { once(L, 'k', P.ground === L.r.k, () => say(L, 'yeh khaman hai, dhokla nahi!')); },
    },
    {
      // Uttarayan on the rooftops: the kite string rises and falls, so jump when it's up. the door flies too
      name: 'Manja',
      build(L) {
        L.solids = [block(0, FY, 260, 100), block(260, 360, 160, 180), block(540, 300, 160, 240), block(800, 340, 160, 200)];
        L.hazards = [L.r.m = hazard(260, 250, 440, 6, { kind: 'manja' })];
        L.doors = [door(880, 280)];
        L.signs = [{ x: 130, y: FY - 110, text: 'Uttarayan: aasmaan mein patang' }];
      },
      tick(L, P) {
        manjaSwing(L, L.r.m, 150, 250);
        once(L, 'a', P.ground && P.x > 260 && P.y < 360, () => say(L, 'manja tez hai. sar neeche!'));
        once(L, 'd', P.x > 800 && P.y < 340, () => { L.doors[0].ty = 230; say(L, 'kaapyo che! darwaza bhi patang hai'); sfx.trap(); });
      },
    },
    {
      // the white Rann: some salt tiles crack, one isn't there at all, and underneath is marsh
      name: 'Rann Utsav',
      build(L) {
        const t = (i, o = {}) => block(i * 120, FY, 120, 100, o);
        L.solids = [
          t(0), t(1), t(2, { crumble: true, crumbleDelay: 6 }), t(3), t(4, { ghost: true }), t(5), t(6, { crumble: true, crumbleDelay: 6 }), t(7),
          block(240, FY + 10, 120, 90, { sink: true }), block(480, FY + 10, 120, 90, { sink: true }), block(720, FY + 10, 120, 90, { sink: true }),
        ];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 300, y: FY - 140, text: 'safed registan. sab saaf dikhta hai.' }];
      },
      tick(L, P) { once(L, 's', P.ground && P.ground.sink, () => say(L, 'namak pe bharosa? daldal!')); },
    },
    {
      // a sleeping Gir lion blocks the path. too long to jump; step on it and it wakes. go through the tree
      name: 'Gir Ka Sher',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          block(250, FY - 60, 60, 60, { kind: 'boulder' }),
          block(330, 300, 300, 14),
          L.r.lion = block(420, FY - 60, 140, 60, { kind: 'lion' }),
        ];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 150, y: FY - 110, text: 'neeche se jao, sher so raha hai' }];
      },
      tick(L, P) {
        const s = L.r.lion;
        once(L, 'w', P.ground === s, () => {
          L.solids = L.solids.filter(o => o !== s);
          L.hazards.push(hazard(s.x, s.y - 10, s.w, s.h + 10, { kind: 'lion' }));
          say(L, 'DHAAAD!'); sfx.trap(); G.shake = 10;
        });
      },
    },
    {
      // down the stepwell for a cool drink... the water comes up to meet you and the door runs back upstairs
      name: 'Rani Ki Vav',
      build(L) {
        L.start = [40, 200 - PH];
        L.solids = [block(0, 200, 200, 340), block(200, 260, 120, 280), block(320, 320, 120, 220), block(440, 380, 120, 160), block(560, FY, 400, 100)];
        L.flood = { y: H + 40, speed: 0, stop: 210 };
        L.doors = [door(860, FY - 60)];
        L.signs = [{ x: 480, y: 150, text: 'neeche thanda paani →' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 620 && P.y > 380, () => {
          L.flood.speed = 1.1;
          const d = L.doors[0]; d.tx = 80; d.ty = 140;
          say(L, 'vav bhar gayi! darwaza upar bhaaga'); sfx.trap();
        });
      },
    },
    {
      // garba night: the dance floor lights up on the beat. stand on a dark tile and you drop
      name: 'Garba Raat',
      build(L) {
        L.r.tiles = [];
        for (let i = 0; i < 8; i++) L.r.tiles.push(block(160 + i * 80, FY, 80, 14, { kind: 'tile', hue: i % 4, grp: i % 2 }));
        L.solids = [block(0, FY, 160, 100), ...L.r.tiles, block(800, FY, 160, 100)];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 480, y: FY - 150, text: 'garba: taal pe chalo' }];
      },
      tick(L, P) {
        garbaBeat(L, L.r.tiles, 90);
        once(L, 'a', P.x > 140, () => say(L, 'dhol baja! taal pakdo'));
      },
    },
    {
      // the dhokla factory: bounce across the spikes. one dhokla is stale
      name: 'Dhokla Factory',
      build(L) {
        L.solids = [
          block(0, FY, 140, 100),
          block(140, FY, 680, 100),
          block(200, 380, 70, 20, { kind: 'dhokla', bounce: 13 }),
          block(360, 340, 70, 20, { kind: 'dhokla', bounce: 13 }),
          L.r.basi = block(520, 320, 70, 20, { kind: 'dhokla', crumble: true, crumbleDelay: 10 }),
          block(660, 360, 70, 20, { kind: 'dhokla', bounce: 15 }),
          block(820, 300, 140, 240),
        ];
        L.spikes = [spikes(140, FY, 31)];
        L.doors = [door(880, 240)];
        L.signs = [{ x: 480, y: 150, text: 'dhokla factory: quality guaranteed' }];
      },
      tick(L, P) { once(L, 'b', P.ground === L.r.basi, () => say(L, 'basi dhokla! bounce nahi')); },
    },
    {
      // finale: a dhokla up to the roof, a kite string over it, garba tiles across, and a door that flies like a kite
      name: 'Kaapyo Che!',
      build(L) {
        L.r.tiles = [];
        for (let i = 0; i < 4; i++) L.r.tiles.push(block(540 + i * 70, 300, 70, 14, { kind: 'tile', hue: i % 4, grp: i % 2 }));
        L.solids = [
          block(0, FY, 200, 100),
          block(220, FY - 20, 70, 20, { kind: 'dhokla', bounce: 15 }),
          block(320, 260, 200, 280),
          ...L.r.tiles,
          block(840, 260, 120, 280),
        ];
        L.hazards = [L.r.m = hazard(320, 200, 200, 6, { kind: 'manja' })];
        L.doors = [door(880, 200)];
        L.signs = [{ x: 110, y: FY - 110, text: 'aakhri patang. aakhri pech.' }];
      },
      tick(L, P) {
        manjaSwing(L, L.r.m, 140, 205);
        garbaBeat(L, L.r.tiles, 80);
        once(L, 'd', P.x > 840 && P.y < 260, () => { L.doors[0].ty = 140; say(L, 'kaapyo che! darwaza udd gaya'); sfx.trap(); });
      },
    },
  ],
});
