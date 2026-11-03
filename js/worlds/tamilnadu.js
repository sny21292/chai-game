'use strict';
// Tamil Nadu: the Marina wind, a pot of filter kaapi, Mahabalipuram's butter ball, Jallikattu bulls,
// the Ooty toy train, Kanchipuram silk, Chennai rain and the Pamban bridge out to the sea.

world({
  id: 'tamilnadu',
  theme: 'tamilnadu',
  name: 'Tamil Nadu',
  region: 'TN', kind: 'state',
  tagline: 'vanakkam! floor bhi jhuk ke girta hai.',
  levels: [
    {
      // sand bars over the sea, and a wind off the Bay of Bengal that comes in gusts
      name: 'Marina',
      build(L) {
        L.solids = [block(0, FY, 240, 100), block(330, FY, 220, 100), block(650, FY, 310, 100)];
        L.hazards = [hazard(240, FY + 20, 90, 80, { kind: 'water' }), hazard(550, FY + 20, 100, 80, { kind: 'water' })];
        L.winds = [wind(0, 0, 960, 540, 0)];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 300, y: FY - 140, text: 'Marina: duniya ka lamba beach' }];
      },
      tick(L, P) {
        L.f.g = ((L.f.g || 0) + 1) % 100;
        L.winds[0].fx = L.f.g < 40 ? -3 : 0;
        once(L, 'a', L.f.g === 1 && P.x > 120, () => say(L, 'samundar ki hawa! ruko'));
      },
    },
    {
      // the kaapi is being poured from a height: it rises in the pit. climb out before it gets you
      name: 'Filter Kaapi',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          block(150, 380, 110, 14), block(320, 320, 100, 14),
          L.r.c = block(150, 260, 110, 14, { crumble: true, crumbleDelay: 14 }),
          block(320, 200, 100, 14), block(500, 170, 100, 14),
          block(680, 130, 280, 410),
        ];
        L.flood = { y: H + 20, speed: 0, stop: 140, kind: 'kaapi' };
        L.doors = [door(890, 70)];
        L.signs = [{ x: 560, y: 330, text: 'kaapi: garam, meethi, aur upar aati hui' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 120, () => { L.flood.speed = 0.55; say(L, 'kaapi aa rahi hai!'); sfx.trap(); });
        once(L, 'c', P.ground === L.r.c, () => say(L, 'yeh davara hil raha hai'));
      },
    },
    {
      // the huge round rock at Mahabalipuram has balanced for centuries. today it rolls
      name: 'Butter Ball',
      build(L) {
        L.solids = [block(0, FY, 960, 100), block(420, 330, 120, 14), block(760, FY - 50, 50, 50, { kind: 'crate' })];
        L.r.ball = hazard(W + 10, FY - 90, 90, 90, { kind: 'rock', active: false });
        L.hazards = [L.r.ball];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 200, y: FY - 110, text: 'makhan ka gola: 1300 saal se yahin hai' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 300, () => { L.r.ball.vx = -3.6; trigger(L.r.ball); say(L, 'gola chal pada!'); });
        once(L, 'b', L.r.ball.x < 300 && P.x > 560, () => { L.hazards.push(hazard(-60, FY - 36, 36, 36, { kind: 'rock', vx: 5 })); say(L, 'peeche se chhota gola!'); });
        L.hazards = L.hazards.filter(h => h.x > -120 && h.x < W + 120);
      },
    },
    {
      // Jallikattu: a bull charges in from the left, another from the right. hay bales are your friends
      name: 'Jallikattu',
      build(L) {
        L.solids = [block(0, FY, 960, 100), block(420, FY - 50, 60, 50, { kind: 'crate' }), block(740, FY - 50, 60, 50, { kind: 'crate' })];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 220, y: FY - 110, text: 'saand ko lal mat dikhana' }];
      },
      tick(L, P) {
        const fromLeft = () => hazard(-80, FY - 44, 70, 44, { kind: 'bull', vx: 6 }), fromRight = () => hazard(W + 20, FY - 44, 70, 44, { kind: 'bull', vx: -6 });
        const swap = L.try % 2 === 1;   // every other attempt the bulls come from the other side
        once(L, 'a', P.x > 260, () => { L.hazards.push(swap ? fromRight() : fromLeft()); say(L, swap ? 'is baar saamne se!' : 'saand aaya!'); sfx.horn(); });
        once(L, 'b', P.x > 640, () => { L.hazards.push(swap ? fromLeft() : fromRight()); say(L, 'doosra saand!'); sfx.horn(); });
        L.hazards = L.hazards.filter(h => h.x > -160 && h.x < W + 160);
      },
    },
    {
      // long level: the toy train runs over a field of thorns into a tunnel (get off on top), then tea terraces in the mist
      name: 'Ooty Train',
      screens: [
        {
          build(L) {
            L.solids = [
              block(0, FY, 140, 100),
              L.r.t = block(150, FY - 40, 180, 40, { kind: 'toytrain' }),
              block(140, FY, 820, 100),
              block(600, 310, 360, 40),
            ];
            L.spikes = [spikes(140, FY, 37), spikes(600, 350, 16, { dir: 'down' })];
            L.doors = [door(890, 250)];
            L.signs = [{ x: 300, y: 200, text: 'toy train: 10 km/h, full speed' }];
          },
          tick(L, P) {
            const t = L.r.t;
            once(L, 'a', P.ground === t, () => { t.vx = 2.4; say(L, 'chhuk chhuk!'); });
            once(L, 'b', t.x > 520, () => say(L, 'surang aa rahi hai!'));
            if (t.x > W + 20) t.vx = 0;
          },
        },
        {
          build(L) {
            const f = { fog: 160 };
            L.solids = [
              block(0, FY, 200, 100),
              block(240, 390, 120, 14, f), block(400, 330, 120, 14, f), L.r.c = block(560, 270, 120, 14, Object.assign({ crumble: true, crumbleDelay: 12 }, f)),
              block(720, 210, 240, 330),
            ];
            L.spikes = [spikes(200, FY, 24)];
            L.doors = [door(890, 150)];
            L.signs = [{ x: 140, y: FY - 110, text: 'chai bagaan: seedha upar' }];
          },
        },
      ],
    },
    {
      // silk sarees drying on lines: springy. real silk has a gold border; one of them is fake
      name: 'Kanchipuram',
      build(L) {
        L.solids = [
          block(0, FY, 160, 100),
          block(200, 400, 100, 12, { kind: 'saree', bounce: 13 }),
          block(330, 400, 100, 12, { kind: 'saree', fake: true, ghost: true }),
          block(450, 400, 100, 12, { kind: 'saree', bounce: 13 }),
          block(620, 400, 100, 12, { kind: 'saree', bounce: 13 }),
          block(790, FY, 170, 100),
        ];
        L.spikes = [spikes(160, FY, 28)];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 480, y: 160, text: 'asli silk mein zari hoti hai' }];
      },
    },
    {
      // the monsoon in Chennai: the street floods fast. up onto the rooftops; one sunshade is only a sunshade
      name: 'Chennai Baarish',
      build(L) {
        L.solids = [
          block(0, FY, 200, 100),
          block(200, 380, 140, 160), block(400, 320, 120, 220),
          L.r.sh = block(520, 300, 60, 10, { crumble: true, crumbleDelay: 8 }),
          block(600, 260, 140, 280), block(800, 200, 160, 340),
        ];
        L.flood = { y: H + 20, speed: 0, stop: 300 };
        L.doors = [door(890, 140)];
        L.signs = [{ x: 120, y: FY - 110, text: 'Chennai: garmi, garmi, baarish' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 150, () => { L.flood.speed = 1.1; say(L, 'baarish! paani bhar raha hai'); sfx.trap(); });
        once(L, 's', P.ground === L.r.sh, () => say(L, 'chhajja sirf dhoop ke liye hai'));
      },
    },
    {
      // long level, the finale: the Pamban bridge opens for a ship, a train comes up behind you, and the tide at Dhanushkodi
      name: 'Pamban Pul',
      screens: [
        {
          build(L) {
            L.solids = [block(0, FY, 380, 100), L.r.a = block(380, FY, 100, 20), L.r.b = block(480, FY, 100, 20), block(580, FY, 380, 100)];
            L.hazards = [hazard(380, FY + 30, 200, 70, { kind: 'water' })];
            L.doors = [door(890, FY - 60)];
            L.signs = [{ x: 200, y: FY - 110, text: 'Pamban: 100 saal purana pul' }];
            L.r.bolt = spikes(470, FY, 2, { hidden: true });
            L.spikes = [L.r.bolt];
          },
          tick(L, P) {
            const { a, b } = L.r;
            once(L, 'o', P.x > 120, () => { L.f.o = 0; say(L, 'jahaaz aa raha hai! pul khul raha hai'); sfx.horn(); });
            if (L.f.o != null && L.f.o < 220) {
              const o = ++L.f.o, up = o < 20 ? o * 6 : o < 160 ? 120 : Math.max(0, 120 - (o - 160) * 3);
              a.y = FY - up; b.y = FY - up;
              a.h = b.h = 20 + up;
            }
            once(L, 'j', L.f.o >= 200, () => { pop(L.r.bolt); say(L, 'pul ke jod mein keel!'); });
          },
        },
        {
          build(L) {
            L.solids = [block(0, FY, 260, 100), block(300, FY, 160, 100), L.r.c = block(500, FY, 80, 100, { crumble: true, crumbleDelay: 10 }), block(620, FY, 340, 100)];
            L.hazards = [hazard(-620, FY - 74, 560, 74, { kind: 'train', vx: 3.9 }), hazard(260, FY + 30, 360, 70, { kind: 'water' })];
            L.doors = [door(890, FY - 60)];
            L.signs = [{ x: 480, y: 200, text: 'pul pe paidal chalna mana hai' }];
          },
          tick(L, P) { once(L, 't', L.t > 20, () => say(L, 'peeche train!')); },
        },
        {
          build(L) {
            L.solids = [block(0, FY, 300, 100), block(360, 380, 60, 160, { kind: 'crate' }), block(480, 320, 80, 220), block(620, 260, 80, 280), block(760, 330, 200, 210)];
            L.flood = { y: H + 20, speed: 0, stop: 360 };
            L.doors = [door(890, 270)];
            L.signs = [{ x: 160, y: FY - 110, text: 'Dhanushkodi: zameen yahan khatam' }];
          },
          tick(L, P) {
            once(L, 'a', P.x > 250, () => { L.flood.speed = 0.9; say(L, 'jwaar aa gaya!'); sfx.trap(); });
            const d = L.doors[0];
            once(L, 'd', P.x > 600 && P.y < 300, () => { d.tx = 800; say(L, 'darwaza samundar dekh raha hai'); });
          },
        },
      ],
    },
  ],
});
