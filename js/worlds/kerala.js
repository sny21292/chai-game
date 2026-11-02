'use strict';
// World 4: Kerala. Backwaters, falling coconuts, houseboats, river currents and a rising monsoon flood.

{
const nut = (x, y, o = {}) => hazard(x, y, 22, 22, Object.assign({ kind: 'coconut', grav: 0.5, active: false }, o));
const frond = (x, y, w) => block(x, y, w, 10);

world({
  id: 'kerala',
  theme: 'kerala',
  name: 'Kerala',
  region: 'KL', kind: 'state',
  tagline: 'nariyal upar, paani neeche, Chotu beech mein',
  levels: [
    {
      name: 'Nariyal Pe Dhyan',
      build(L) {
        L.solids = [block(0, FY, 960, 100), frond(240, 50, 140), frond(470, 50, 120)];
        L.hazards = [L.r.n1 = nut(300, 62), L.r.n2 = nut(520, 62, { landY: FY - 22 })];
        L.doors = [door(860, FY - 60)];
        L.signs = [{ x: 310, y: 170, text: 'nariyal pe dhyan do ↑' }];
      },
      tick(L, P) {
        once(L, 'a', P.x + P.w > 400, () => { trigger(L.r.n2); say(L, 'arre, DOOSRA wala!'); });
        once(L, 'b', P.x > 600, () => { trigger(L.r.n1); say(L, 'pehla wala bhi gir gaya. late.'); });
      },
    },
    {
      name: 'Monsoon Aa Gaya',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          block(700, 370, 110, 16), block(520, 300, 110, 16), block(340, 230, 110, 16), block(160, 160, 110, 16),
        ];
        L.doors = [door(880, FY - 60)];
        L.flood = { y: H + 30, speed: 0, stop: 250 };
        L.signs = [{ x: 200, y: 330, text: 'seedha ghar. aaj dhoop hai.' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 660, () => {
          const d = L.doors[0];
          d.tx = 195; d.ty = 100;
          L.flood.speed = 0.9;
          sfx.trap(); say(L, 'MONSOON AA GAYA!');
        });
      },
    },
    {
      name: 'VIP Houseboat',
      build(L) {
        L.solids = [
          block(0, FY, 240, 100), block(720, FY, 240, 100),
          L.r.vip = block(250, FY, 150, 14, { kind: 'boat', crumble: true }),
          block(420, FY + 2, 100, 14, { kind: 'log', move: { dx: 200, dy: 0, period: 160 } }),
        ];
        L.hazards = [hazard(240, FY + 8, 480, 92, { kind: 'water' })];
        L.doors = [door(860, FY - 60)];
        L.signs = [{ x: 325, y: FY - 70, text: 'VIP houseboat. AC. wifi.' }];
      },
      tick(L, P) {
        const b = L.r.vip;
        if (b.stood && b.timer == null) b.timer = 40;            // a slow leak instead of the usual crumble
        once(L, 'a', b.falling, () => say(L, 'boat mein chhed hai!'));
      },
    },
    {
      name: 'Ulta Bahav',
      build(L) {
        L.solids = [block(0, FY, 200, 100), block(760, FY, 200, 100), block(310, FY - 14, 56, 114), block(530, FY - 14, 56, 114)];
        L.hazards = [hazard(200, FY + 8, 560, 92, { kind: 'water' })];
        L.winds = [wind(200, 120, 110, FY - 120, 1.6), wind(366, 120, 164, FY - 120, 1.6), wind(586, 120, 174, FY - 120, 1.6)];
        L.doors = [door(860, FY - 60)];
        L.signs = [{ x: 480, y: 90, text: 'bahav ke saath chalo →' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 150, () => { L.f.a = L.t; say(L, 'ulta bahav!'); sfx.flip(); });
        if (!L.f.a) return;
        L.f.ph = Math.floor((L.t - L.f.a) / 20) % 10;          // kept in L.f so the solver can tell the moments apart
        for (const z of L.winds) z.fx = L.f.ph >= 5 ? 1.6 : -2.2;
      },
    },
    {
      name: 'Nariyal Ki Chhat',
      build(L) {
        L.solids = [block(0, FY, 300, 100), block(364, FY, 236, 100), block(664, FY, 296, 100), frond(250, 286, 170), frond(550, 286, 170)];
        L.hazards = [hazard(300, FY + 8, 64, 92, { kind: 'water' }), hazard(600, FY + 8, 64, 92, { kind: 'water' })];
        for (const x0 of [256, 556]) for (let i = 0; i < 7; i++) L.hazards.push(nut(x0 + i * 23, 296));
        L.doors = [door(860, FY - 60)];
        L.signs = [{ x: 150, y: 300, text: 'sar bachao. bas itna.' }];
      },
    },
    {
      name: 'Kettuvallam',
      build(L) {
        L.solids = [block(0, FY, 180, 100), block(720, FY, 240, 100), L.r.b = block(186, FY, 150, 14, { kind: 'boat', move: { dx: 300, dy: 0, period: 260, phase: 0.85 } }), frond(320, 50, 330)];
        L.hazards = [hazard(180, FY + 8, 540, 92, { kind: 'water' })];
        for (const [i, x] of [380, 480, 580].entries()) L.hazards.push(L.r['n' + i] = nut(x, 62));
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 140, y: 300, text: 'houseboat ride. aaram se.' }];
      },
      tick(L, P) {
        const b = L.r.b;                                          // nuts aim at the middle of the boat
        once(L, 'go', b.stood, () => {});
        for (let i = 0; i < 3; i++) {
          const n = L.r['n' + i];
          once(L, 'n' + i, L.f.go && b.x + 64 + Math.max(0, b.dx) * 36 >= n.x, () => { trigger(n); if (!i) say(L, 'nariyal pe dhyan do!'); });
        }
      },
    },
    {
      name: 'Geeli Seedhi',
      build(L) {
        L.solids = [block(0, FY, 960, 100), L.r.top = block(760, 135, 200, 16)];
        for (const [x, y] of [[150, 380], [300, 315], [450, 250], [600, 185]]) L.solids.push(block(x, y, 90, 16, { crumble: true }));
        L.hazards = [L.r.n = nut(800, 60, { landY: 135 - 22 })];
        L.doors = [door(880, 75)];
        L.flood = { y: H + 30, speed: 0.55, delay: 90, stop: 215 };
        L.signs = [{ x: 420, y: 420, text: 'ghat ki seedhiyan. geeli hain.' }];
      },
      tick(L, P) {
        for (const s of L.solids) if (s.crumble && s.stood && s.timer == null) s.timer = 30;
        once(L, 'm', L.t > 90, () => say(L, 'monsoon aa gaya!'));
        once(L, 'n', P.ground === L.r.top, () => trigger(L.r.n));
      },
    },
    {
      name: 'Ulta Chappu',
      build(L) {
        L.start = [880, FY - PH];
        L.solids = [block(0, FY, 160, 100), block(800, FY, 160, 100)];
        [680, 530, 380, 230].forEach((x, i) => L.solids.push(block(x, FY + 2, 80, 14, { kind: 'log', move: { dx: 0, dy: 4, period: 90, phase: i * 0.25 } })));
        L.hazards = [hazard(160, FY + 8, 640, 92, { kind: 'water' })];
        L.winds = [wind(160, 200, 640, FY - 200, 0.8)];
        L.doors = [door(50, FY - 60)];
        L.signs = [{ x: 860, y: 330, text: '← chappu chalao' }];
      },
      tick(L, P) {
        once(L, 'a', P.ground && P.ground.kind === 'log', () => { L.reversed = true; sfx.flip(); say(L, 'chill maadi... wait, wrong state'); });
      },
    },
    {
      name: 'Naav Pe Darwaza',
      build(L) {
        L.solids = [block(0, FY, 160, 100), block(820, FY - 40, 140, 140), L.r.b = block(180, FY, 180, 14, { kind: 'boat', move: { dx: 380, dy: 0, period: 360, phase: 0.92 } })];
        L.hazards = [hazard(160, FY + 8, 660, 92, { kind: 'water' })];
        L.winds = [wind(740, 120, 80, FY - 120, -1.4)];
        L.doors = [door(300, FY - 60)];
        L.signs = [{ x: 110, y: 330, text: 'darwaza naav pe. chill.' }];
      },
      tick(L, P) {
        const b = L.r.b, d = L.doors[0];
        once(L, 'a', P.ground === b, () => { d.tx = 880; d.ty = FY - 100; sfx.trap(); say(L, 'darwaza tair ke bhaaga!'); });
        if (!L.f.a) { d.x = d.tx = b.x + 120; d.y = d.ty = b.y - 60; }
      },
    },
    {
      name: 'Aakhri Baarish',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100), block(170, 370, 100, 16),
          block(320, 360, 90, 14, { kind: 'log', move: { dx: 0, dy: -150, period: 240 } }),
          L.r.p2 = block(460, 215, 120, 16), block(650, 215, 70, 16, { crumble: true }), block(790, 150, 170, 16), frond(500, 50, 100),
        ];
        L.hazards = [L.r.n = nut(556, 62, { landY: 215 - 22 })];
        L.winds = [wind(580, 60, 210, 155, -1.5)];
        L.doors = [door(900, 90)];
        L.flood = { y: H + 30, speed: 0.5, delay: 100, stop: 225 };
        L.signs = [{ x: 660, y: 330, text: 'aaj mausam bada... geela hai' }];
      },
      tick(L, P) {
        once(L, 'm', L.t > 100, () => say(L, 'MONSOON. FINAL. BOSS.'));
        once(L, 'n', P.ground === L.r.p2 && P.x > 470, () => trigger(L.r.n));
      },
    },
  ],
});
}
