'use strict';
// Delhi (a UT): one boss level, "Dilli Darshan", made of 5 rooms joined by doors, with a checkpoint per room.
// Cows that shove, autos that honk, pigeons that swoop and monkeys that steal the door.
// The other 5 old Delhi Gali screens now live in Uttar Pradesh (js/worlds/up.js).

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
});
