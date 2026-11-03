'use strict';
// Goa: tides, crabs, the river ferry, a sleepy door, beach shacks, waves and the carnival.

world({
  id: 'goa',
  theme: 'goa',
  name: 'Goa',
  region: 'GA', kind: 'state',
  tagline: 'susegad life. floor bhi susegad.',
  levels: [
    {
      // high tide comes in early: get up the lifeguard tower, wait for it to go out
      name: 'Beach Pe Chalo',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          block(380, 370, 140, 14),
          block(388, 384, 6, 56, { ghost: true }), block(506, 384, 6, 56, { ghost: true }),
        ];
        L.flood = { y: H + 40, speed: 0, stop: 0 };
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 190, y: FY - 110, text: 'high tide: shaam 5 baje. abhi 4 baje hain.' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 300, () => { L.f.c = 0; say(L, 'high tide jaldi aa gaya!'); sfx.trap(); });
        if (L.f.c != null && L.f.c < 260) {
          const c = ++L.f.c;
          L.flood.y = c < 60 ? H - c * 2.4 : c < 150 ? 396 : 396 + (c - 150) * 2.4;
        }
        once(L, 'b', L.f.c >= 175, () => say(L, 'tide gaya. susegad.'));
      },
    },
    {
      // a crab patrols under the shack. jump over it and it jumps too; walk over the shack roof instead
      name: 'Kekda',
      build(L) {
        L.solids = [block(0, FY, 960, 100), block(250, FY - 50, 50, 50, { kind: 'crate' }), block(320, 340, 280, 14)];
        L.hazards = [L.r.crab = hazard(300, FY - 18, 30, 18, { kind: 'crab' })];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 460, y: 290, text: 'kekde sirf side mein chalte hain' }];
      },
      tick(L, P) {
        const c = L.r.crab;
        crabWalk(L, c, 300, 540);
        once(L, 'j', Math.abs(P.x + P.w / 2 - (c.x + c.w / 2)) < 40 && P.y + P.h < c.y - 4 && P.y > 320, () => {
          c.vy = -11; c.grav = 0.6; c.landY = FY - 18; say(L, 'kekda bhi koodta hai!'); sfx.trap();
        });
      },
    },
    {
      // the river ferry turns back halfway. hop off onto the channel posts
      name: 'Ferry',
      build(L) {
        L.solids = [
          block(0, FY, 160, 100),
          L.r.f = block(164, FY - 16, 130, 16, { kind: 'boat' }),
          L.r.p1 = block(600, FY - 60, 36, 14, { crumble: true, crumbleDelay: 14 }),
          block(720, FY - 60, 36, 14),
          block(800, FY, 160, 100),
        ];
        L.hazards = [hazard(160, FY + 6, 640, 100, { kind: 'water' })];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 480, y: 250, text: 'ferry: har 10 minute. pakka.' }];
      },
      tick(L, P) {
        const f = L.r.f;
        once(L, 'a', P.ground === f, () => { f.vx = 2.5; say(L, 'ferry chali!'); });
        once(L, 'b', f.x > 420, () => { f.vx = -2.5; say(L, 'ferry wapas! chai break'); sfx.horn(); });
        once(L, 'c', L.f.b && f.x < 164, () => { f.vx = 0; f.x = 164; });
        once(L, 'p', P.ground === L.r.p1, () => say(L, 'khamba bhi susegad hai'));
      },
    },
    {
      // the door is asleep. wait quietly next to it... but not under the palm
      name: 'Susegad',
      build(L) {
        L.solids = [block(0, FY, 960, 100)];
        L.hazards = [L.r.nut = hazard(780, 110, 26, 26, { kind: 'coconut', active: false, grav: 0.5, landY: FY - 26 })];
        L.doors = [door(880, FY - 60, { fake: true })];
        L.signs = [{ x: 220, y: FY - 110, text: 'Goa: yahan sab aaram se hota hai' }, { x: 720, y: FY - 170, text: 'shhh... darwaza so raha hai' }];
      },
      tick(L, P) {
        const still = Math.abs(P.x + P.w / 2 - 880) < 130 && P.onGround && Math.abs(P.vx) < 0.3;
        if (!L.f.w) L.f.s = still ? Math.min(70, (L.f.s || 0) + 1) : 0;
        once(L, 'n', L.f.s >= 25, () => { trigger(L.r.nut); say(L, 'nariyal alarm!'); });
        once(L, 'w', L.f.s >= 60, () => { L.doors[0].fake = false; L.f.w = 1; say(L, 'darwaza jaag gaya. susegad!'); });
      },
    },
    {
      // up to the rooftop party. the edge of the roof is only a tarp
      name: 'Chhat Pe Party',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          block(200, FY - 50, 50, 50, { kind: 'crate' }),
          block(300, 340, 100, 14),
          L.r.h = block(520, 290, 120, 12, { move: { dx: 0, dy: 16, period: 90 } }),
          block(700, 220, 50, 14, { ghost: true }),
          block(750, 220, 210, 220),
        ];
        L.doors = [door(880, 160)];
        L.signs = [{ x: 840, y: 110, text: 'chhat pe party →' }];
      },
      tick(L, P) {
        once(L, 'h', P.ground === L.r.h, () => say(L, 'hammock pe aaram...'));
        once(L, 't', L.f.h && P.x > 690 && P.x < 750 && P.y > 230 && P.y < 320, () => say(L, 'woh chhat nahi, tirpal tha'));
      },
    },
    {
      // sandbars and waves that push you out, then pull you back
      name: 'Lehrein',
      build(L) {
        L.solids = [block(0, FY, 200, 100), block(300, FY, 120, 100), block(520, FY, 120, 100), block(740, FY, 220, 100)];
        L.hazards = [hazard(200, FY + 20, 540, 80, { kind: 'water' })];
        L.winds = [wind(0, 120, 960, 420, 0)];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 110, y: FY - 110, text: 'lehron ke saath chalo →' }];
      },
      tick(L, P) {
        L.f.w = ((L.f.w || 0) + 1) % 120;
        L.winds[0].fx = L.f.w < 60 ? 1.3 : -1.3;
        once(L, 'r', L.f.w === 60 && P.x > 150, () => say(L, 'lehrein palat gayi!'));
      },
    },
    {
      // the carnival parade comes up behind you. the street ends at a wall
      name: 'Carnival',
      build(L) {
        L.solids = [block(0, FY, 960, 100), block(600, 320, 60, 120), L.r.fl = block(-240, FY - 70, 200, 70, { kind: 'float' })];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 300, y: FY - 110, text: 'carnival: sab nachte hain' }];
      },
      tick(L, P) {
        const fl = L.r.fl;
        once(L, 'a', P.x > 250, () => { fl.vx = 3; say(L, 'parade aa gayi! side ho jao'); sfx.horn(); });
        once(L, 'b', fl.x + fl.w >= 598, () => { fl.vx = 0; fl.x = 398; });
      },
    },
    {
      // finale: the tide keeps rising. rocks, a crab, a crumbly rock, and a door busy watching the sunset
      name: 'Sunset Point',
      build(L) {
        L.solids = [
          block(0, FY, 200, 100),
          block(240, 380, 100, 14),
          block(400, 320, 120, 14),
          block(580, 260, 100, 14, { crumble: true, crumbleDelay: 12 }),
          block(740, 200, 90, 14),
          block(870, 150, 90, 390),
        ];
        L.hazards = [L.r.crab = hazard(400, 302, 30, 18, { kind: 'crab' })];
        L.flood = { y: 560, speed: 0.4, stop: 330 };
        L.doors = [door(900, 90), L.r.real = door(770, 140, { hidden: true })];
        L.signs = [{ x: 300, y: 130, text: 'Goa ka sunset: miss mat karna' }];
      },
      tick(L, P) {
        crabWalk(L, L.r.crab, 400, 490, 'd', 1.4);
        once(L, 'a', P.x > 860 && P.y < 150, () => {
          L.doors[0].evil = true; L.r.real.hidden = false;
          say(L, 'yeh darwaza sunset dekh raha hai. peeche wala lo'); sfx.trap();
        });
      },
    },
  ],
});
