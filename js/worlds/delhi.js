'use strict';
// Delhi (a UT): one boss level, "Dilli Darshan", made of 5 rooms joined by doors, with a checkpoint per room.
// Cows that shove, autos that honk, pigeons that swoop and monkeys that steal the door.
// `spare` holds the other old Delhi Gali screens, kept for Uttar Pradesh later. The engine ignores it.

world({
  id: 'delhi',
  theme: 'delhi',
  name: 'Delhi',
  region: 'DL', kind: 'ut',
  reward: 'kulhad',   // beating the boss unlocks the kulhad Chotu
  tagline: 'gaay, auto, kabootar: sab tumhare khilaaf',
  levels: [
    {
      name: 'Dilli Darshan',
      rooms: [
        {
          // the cow walks toward you: hold right and it pins you to the edge of the screen.
          // boss twist: once you're past, the door bolts back toward the middle of the road
          name: 'Gaay Ka Raasta',
          build(L) {
            L.solids = [block(0, FY, 960, 100), L.r.cow = block(440, FY - 56, 90, 56, { kind: 'cow' })];
            L.doors = [door(860, FY - 60)];
            L.signs = [{ x: 480, y: FY - 130, text: 'gaay ka raasta hai. side ho jao.' }];
          },
          tick(L, P) {
            once(L, 'a', P.x + P.w > 300, () => { L.r.cow.vx = -2.5; say(L, 'MOOO! tum side ho jao'); sfx.trap(); });
            once(L, 'd', P.x > 770, () => { L.doors[0].tx = 560; say(L, 'darwaza bhi gaay se darta hai'); sfx.trap(); });
          },
        },
        {
          // an auto comes from behind: hop onto the chai stall roof and let it pass
          name: 'Side Dena',
          build(L) {
            L.solids = [
              block(0, FY, 960, 100),
              block(560, FY - 84, 150, 14),
              block(566, FY - 70, 6, 70, { ghost: true }), block(698, FY - 70, 6, 70, { ghost: true }),
            ];
            L.hazards = [
              L.r.a1 = hazard(-120, FY - 50, 70, 50, { kind: 'auto', vx: 8, active: false }),
              L.r.a2 = hazard(-260, FY - 50, 70, 50, { kind: 'auto', vx: 8, active: false }),
            ];
            L.doors = [door(880, FY - 60)];
            L.signs = [{ x: 635, y: FY - 120, text: 'chai stall' }, { x: 240, y: FY - 160, text: 'shaant gali. koi traffic nahi.' }];
          },
          tick(L, P) {
            once(L, 'a', P.x > 330, () => { trigger(L.r.a1); trigger(L.r.a2); sfx.horn(); say(L, 'PEE PEEEE! bhaiya side dena!'); });
          },
        },
        {
          // a monkey runs off with the door to a balcony and leaves thorns behind
          name: 'Bandar Raj',
          build(L) {
            L.solids = [
              block(0, FY, 960, 100),
              block(560, FY - 90, 110, 16),
              block(370, FY - 180, 110, 16),
              block(80, FY - 270, 200, 16),
            ];
            L.spikes = [L.r.sp = spikes(770, FY, 6, { hidden: true })];
            L.doors = [door(870, FY - 60)];
            L.signs = [{ x: 180, y: FY - 60, text: 'bandaron se saavdhan' }];
          },
          tick(L, P) {
            once(L, 'a', P.x > 690 && P.y > FY - 120, () => {
              const d = L.doors[0];
              d.tx = 160; d.ty = FY - 270 - 60;
              pop(L.r.sp);
              say(L, 'bandar darwaza le gaya!');
            });
          },
        },
        {
          // crumbling chhajjas; the middle one snaps at once, an invisible net catches you, and it crumbles too
          name: 'Purana Chhajja',
          build(L) {
            L.solids = [
              block(0, FY, 200, 100),
              block(250, 370, 90, 14, { crumble: true }),
              L.r.b = block(430, 330, 90, 14),
              L.r.net = block(400, 470, 160, 14, { invisible: true, crumble: true }),
              block(610, 380, 90, 14, { crumble: true }),
              block(760, FY, 200, 100),
            ];
            L.doors = [door(880, FY - 60)];
            L.signs = [{ x: 480, y: 250, text: 'chhajja 1950 ka hai. pakka hai.' }];
          },
          tick(L, P) {
            once(L, 'a', P.ground === L.r.b, () => { drop(L.r.b); say(L, 'chhajja gaya!'); });
            once(L, 'b', P.ground === L.r.net, () => say(L, 'bach gaye? abhi nahi...'));
          },
        },
        {
          // finale: cow, pigeon, crumbling chhajja, then a monkey drops the door into the path of an auto
          name: 'Chandni Chowk',
          build(L) {
            L.solids = [
              block(0, FY, 960, 100),
              L.r.cow = block(300, FY - 56, 90, 56, { kind: 'cow' }),
              L.r.roof = block(540, FY - 84, 140, 14),
              block(546, FY - 70, 6, 70, { ghost: true }), block(668, FY - 70, 6, 70, { ghost: true }),
              L.r.ledge = block(720, 270, 80, 14, { crumble: true }),
              block(820, 180, 140, 14),
            ];
            L.hazards = [
              L.r.pg = hazard(W + 30, 236, 34, 24, { kind: 'pigeon', vx: -6, active: false }),
              L.r.a2 = hazard(W + 40, FY - 50, 70, 50, { kind: 'auto', vx: -4, active: false }),
            ];
            L.doors = [door(890, 120)];
            L.signs = [{ x: 610, y: FY - 120, text: 'chhole bhature break' }];
          },
          tick(L, P) {
            once(L, 'a', P.x + P.w > 170, () => { L.r.cow.vx = -3; say(L, 'gaay ka raasta hai!'); sfx.trap(); });
            once(L, 'p', P.ground === L.r.roof, () => { trigger(L.r.pg); say(L, 'guttur goo!'); });
            once(L, 'c', P.ground === L.r.ledge, () => {
              const d = L.doors[0];
              d.ty = FY - 60;
              trigger(L.r.a2); sfx.horn();
              say(L, 'bandar darwaza neeche le gaya!');
            });
            // whatever has left the screen is gone for good
            L.solids = L.solids.filter(s => s.x > -120);
            L.hazards = L.hazards.filter(h => !h.active || !(h.vx < 0 ? h.x < -120 : h.x > W + 20));
          },
        },
      ],
    },
  ],
  spare: [
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
      // the Chandni Chowk crowd pushes you back; ride the cow through it, then let the auto pass
      name: 'Bheed Bhaad',
      build(L) {
        L.start = [20, FY - PH];
        L.solids = [block(0, FY, 960, 100), L.r.cow = block(90, FY - 56, 90, 56, { kind: 'cow' })];
        L.winds = [wind(220, 50, 480, FY - 50, -4.8)];
        L.hazards = [L.r.auto = hazard(W + 40, FY - 50, 70, 50, { kind: 'auto', vx: -7, active: false })];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 460, y: 120, text: 'Chandni Chowk ki bheed' }];
      },
      tick(L, P) {
        const c = L.r.cow;
        once(L, 'a', P.ground === c, () => { c.vx = 3; say(L, 'gaay ko koi nahi rokta'); });
        once(L, 'b', c.x >= 620, () => { c.vx = 0; trigger(L.r.auto); sfx.horn(); say(L, 'gaay ruk gayi. auto nahi.'); });
      },
    },
  ],
});
