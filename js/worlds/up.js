'use strict';
// Uttar Pradesh: ghats, kites, cows and crowds. Five screens came from the old Delhi Gali world,
// five are new (the ghat flood, Lucknow's bhool bhulaiya, the mirror pool, Holi, the Ganga aarti finale).

world({
  id: 'up',
  theme: 'up',
  name: 'Uttar Pradesh',
  region: 'UP', kind: 'state',
  tagline: 'ghat, patang, gaay: sab ka apna mood',
  levels: [
    {
      // climb the haveli steps; landing on the middle one sends a pigeon across the top
      name: 'Guttur Goo',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          block(280, FY - 90, 130, 90),
          block(500, FY - 180, 130, 180),
          block(730, FY - 270, 230, 270),
        ];
        L.hazards = [L.r.pg = hazard(W + 30, FY - 300, 34, 24, { kind: 'pigeon', vx: -6, active: false })];
        L.doors = [door(890, FY - 330)];
        L.signs = [{ x: 200, y: FY - 200, text: 'chhat pe darwaza. seedhi chadho.' }];
      },
      tick(L, P) {
        once(L, 'a', P.onGround && P.y + P.h <= FY - 180 && P.x > 490, () => { trigger(L.r.pg); say(L, 'guttur goo!'); });
      },
    },
    {
      // walk down the ghat steps to the door by the river; the Ganga rises and the door runs back up to the top
      name: 'Ghat Ki Seedhi',
      build(L) {
        L.start = [40, 200 - PH];
        L.solids = [block(0, 200, 180, 340), block(180, 265, 130, 275), block(310, 350, 130, 190), block(440, FY, 520, 100)];
        L.doors = [door(700, FY - 60)];
        L.signs = [{ x: 620, y: FY - 120, text: 'Ganga ji ke darshan →' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 560, () => {
          L.flood = { y: H + 10, speed: 0.9, delay: 0, stop: 215 };
          const d = L.doors[0]; d.tx = 60; d.ty = 200 - 60;
          say(L, 'Ganga maiya aa gayi! upar bhaago');
        });
        if (L.flood) L.f.fl = Math.round(L.flood.y / 16);     // flood height is part of the state (for the solver)
      },
    },
    {
      // ride the kite across the rooftops, but it gets cut halfway: jump onto the wire
      name: 'Bo Kaata!',
      build(L) {
        L.start = [60, 300 - PH];
        L.solids = [
          block(0, 300, 200, 240),
          L.r.kite = block(206, 330, 120, 14, { move: { dx: 340, dy: -10, period: 340 } }),
          block(480, 240, 170, 8),
          block(760, 300, 200, 240),
        ];
        L.doors = [door(880, 240)];
        L.signs = [{ x: 260, y: 160, text: 'patang pe sawaari. 100% safe.' }, { x: 570, y: 222, text: 'bijli ka taar' }];
      },
      tick(L, P) {
        once(L, 'a', P.ground === L.r.kite && L.r.kite.x > 440, () => { drop(L.r.kite); say(L, 'BO KAATA!'); });
      },
    },
    {
      // spawn on the right; an auto charges from the left and only brakes for the cow
      name: 'Gaay Ki Dhaal',
      build(L) {
        L.start = [880, FY - PH];
        L.solids = [block(0, FY, 960, 100), L.r.cow = block(500, FY - 56, 90, 56, { kind: 'cow' })];
        L.hazards = [L.r.auto = hazard(-120, FY - 50, 70, 50, { kind: 'auto', vx: 8, active: false })];
        L.doors = [door(40, FY - 60)];
        L.signs = [{ x: 480, y: FY - 140, text: 'ghar ← udhar hai' }];
      },
      tick(L, P) {
        const a = L.r.auto;
        once(L, 'a', P.x < 700, () => { trigger(a); sfx.horn(); say(L, 'PEE PEE! one way hai!'); });
        once(L, 'b', a.vx > 0 && a.x + a.w >= L.r.cow.x - 4, () => { a.vx = 0; a.x = L.r.cow.x - 4 - a.w; L.f.w = 45; say(L, 'gaay ke aage sab rukte hain'); });
        if (L.f.w > 0 && --L.f.w === 0) { a.vx = -7; sfx.horn(); }
      },
    },
    {
      // Lucknow's maze: the door at the end of the corridor grows teeth; the real one is up the zig-zag stairs
      name: 'Bhool Bhulaiya',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          block(540, FY - 90, 110, 16),
          block(380, FY - 180, 110, 16, { crumble: true, crumbleDelay: 30 }),
          block(560, FY - 270, 150, 16),
        ];
        L.doors = [door(860, FY - 60), L.r.real = door(640, FY - 330, { hidden: true })];
        L.signs = [{ x: 200, y: FY - 100, text: 'bhool bhulaiya: seedha raasta' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 720, () => { L.doors[0].evil = true; L.r.real.hidden = false; say(L, 'yeh darwaza nahi, dhokha hai'); sfx.trap(); });
      },
    },
    {
      // the first tank falls on runners; after that, standing still calls a tank down on your head
      name: 'Paani Ki Tanki',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          block(240, 110, 130, 14), L.r.t1 = block(270, 50, 70, 60, { kind: 'crate' }),
          block(600, 130, 160, 14),
        ];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 680, y: 100, text: 'tanki bhari hai. ruko mat.' }];
      },
      tick(L, P) {
        const t1 = L.r.t1;
        once(L, 'a', P.x + P.w > 220, () => { t1.crusher = true; t1.landY = FY - 60; drop(t1, 4); say(L, 'tanki gir gayi!'); });
        if (P.x > 400 && P.onGround && Math.abs(P.vx) < 0.5) L.f.idle = (L.f.idle || 0) + 1;
        else if (L.f.idle) L.f.idle = 0;
        once(L, 'b', L.f.idle >= 24, () => {
          const t = block(P.x - 24, 60, 70, 60, { kind: 'crate', crusher: true, landY: FY - 60 });
          L.solids.push(t); drop(t, 6); say(L, 'ruko mat! tanki line mein hai');
        });
      },
    },
    {
      // the long reflecting pool: step on the first stone and everything goes mirror-image
      name: 'Aks Mein Ulta',
      build(L) {
        L.solids = [
          block(0, FY, 300, 100),
          L.r.s1 = block(350, FY - 10, 50, 14), block(480, FY - 10, 50, 14), block(610, FY - 10, 50, 14),
          block(700, FY, 260, 100),
        ];
        L.hazards = [hazard(300, FY + 14, 400, 90, { kind: 'water' })];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 480, y: 250, text: 'paani mein mahal ka aks' }];
      },
      tick(L, P) {
        once(L, 'a', P.ground === L.r.s1, () => { L.reversed = true; say(L, 'aks mein sab ulta!'); sfx.flip(); });
        once(L, 'b', L.f.a && P.onGround && P.x > 700, () => { L.reversed = false; say(L, 'seedha ho gaya. shayad.'); });
      },
    },
    {
      // the Aminabad market crowd pushes you back; ride the cow through it, then let the auto pass
      name: 'Bheed Bhaad',
      build(L) {
        L.start = [20, FY - PH];
        L.solids = [block(0, FY, 960, 100), L.r.cow = block(90, FY - 56, 90, 56, { kind: 'cow' })];
        L.winds = [wind(220, 50, 480, FY - 50, -4.8)];
        L.hazards = [L.r.auto = hazard(W + 40, FY - 50, 70, 50, { kind: 'auto', vx: -7, active: false })];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 460, y: 120, text: 'Aminabad ki bheed' }];
      },
      tick(L, P) {
        const c = L.r.cow;
        once(L, 'a', P.ground === c, () => { c.vx = 3; say(L, 'gaay ko koi nahi rokta'); });
        once(L, 'b', c.x >= 620, () => { c.vx = 0; trigger(L.r.auto); sfx.horn(); say(L, 'gaay ruk gayi. auto nahi.'); });
      },
    },
    {
      // kids on the roof throw colour balloons in a steady rhythm; dash between the shop awnings.
      // running flat out past the second awning gets you a balloon aimed where you're going to be
      name: 'Bura Na Mano',
      build(L) {
        L.solids = [block(0, FY, 960, 100), block(250, FY - 80, 120, 12), block(520, FY - 80, 120, 12)];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 140, y: FY - 120, text: 'holi hai! sab safe hai' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 120, () => say(L, 'bura na mano, holi hai!'));
        if (L.f.a) {
          L.f.c = ((L.f.c || 0) + 1) % 30;                       // a balloon every 30 frames, four throws in a cycle
          if (L.f.c === 1) {
            L.f.n = ((L.f.n || 0) + 1) % 4;
            L.hazards.push(hazard(W - 30, 90, 18, 22, { kind: 'balloon', vx: -[3.5, 5, 6.5, 8][L.f.n], vy: -2, grav: 0.22, hue: L.f.n % 3 }));
          }
        }
        // the sharpshooter on the corner roof leads a runner: a balloon dropped where you'll be in a second
        once(L, 's', P.x > 560 && P.vx > 3, () => {
          L.hazards.push(hazard(Math.min(W - 20, P.x + 222), 60, 18, 22, { kind: 'balloon', hue: 2, grav: 0.22 }));
          say(L, 'nishana pakka!');
        });
        // a balloon bursts on whatever it hits first: an awning or the street
        L.hazards = L.hazards.filter(h => h.kind !== 'balloon' || !(h.y + h.h >= FY || L.solids.some(s => s.y < FY && hit(h, s))));
      },
    },
    {
      // finale: the evening aarti. ride the boat, keep your head down when the pigeons come, and the last step is in a hurry too
      name: 'Ganga Aarti',
      build(L) {
        L.start = [40, FY - 60 - PH];
        L.solids = [
          block(0, FY - 60, 200, 160),
          L.r.boat = block(210, FY - 40, 110, 16, { kind: 'boat', move: { dx: 400, dy: 0, period: 420, on: false } }),
          L.r.s1 = block(720, FY - 90, 80, 150, { crumble: true, crumbleDelay: 22 }),
          block(800, FY - 170, 160, 270),
        ];
        L.hazards = [
          hazard(200, FY + 4, 520, 100, { kind: 'water' }),
          L.r.pg = hazard(W + 30, FY - 98, 34, 24, { kind: 'pigeon', vx: -6, active: false }),
        ];
        L.doors = [door(880, FY - 230)];
        L.signs = [{ x: 470, y: 230, text: 'aarti shuru. naav pe baitho.' }];
      },
      tick(L, P) {
        once(L, 'a', P.ground === L.r.boat, () => { L.r.boat.move.on = true; });
        once(L, 'p', L.f.a && L.r.boat.x > 380, () => { trigger(L.r.pg); say(L, 'guttur goo! sar neeche!'); });
        once(L, 'c', P.ground === L.r.s1, () => say(L, 'seedhi bhi aarti mein mast'));
        L.hazards = L.hazards.filter(h => h.kind !== 'pigeon' || h.x > -60);
      },
    },
  ],
});
