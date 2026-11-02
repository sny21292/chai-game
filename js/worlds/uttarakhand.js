'use strict';
// Uttarakhand: rope bridges, white water, landslides, temple monkeys, fog, hill buses and the climb to the top.

world({
  id: 'uttarakhand',
  theme: 'uttarakhand',
  name: 'Uttarakhand',
  region: 'UK', kind: 'state',
  tagline: 'pahad bulate hain. pahad girate bhi hain.',
  levels: [
    {
      // a swaying rope bridge over the river; one plank has clearly seen better days
      name: 'Jhoola Pul',
      build(L) {
        const sway = ph => ({ dx: 0, dy: 8, period: 110, phase: ph });
        L.solids = [
          block(0, FY, 160, 100),
          block(160, FY - 40, 160, 12, { move: sway(0) }),
          block(320, FY - 40, 160, 12, { move: sway(0.1) }),
          L.r.bad = block(480, FY - 40, 120, 12, { move: sway(0.2), crumble: true, crumbleDelay: 6 }),
          block(600, FY - 40, 200, 12, { move: sway(0.3) }),
          block(800, FY, 160, 100),
        ];
        L.hazards = [hazard(160, FY + 30, 640, 80, { kind: 'water' })];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 480, y: FY - 150, text: 'pul pe jhoolna mana hai' }];
      },
      tick(L, P) { once(L, 'a', P.ground === L.r.bad, () => say(L, 'yeh phatta toh gaya!')); },
    },
    {
      // white-water rafting: the raft goes where the river goes, rocks included. hop over them, land back on the raft
      name: 'Rafting',
      build(L) {
        L.start = [40, FY - 40 - PH];
        L.solids = [
          block(0, FY - 40, 130, 140),
          L.r.raft = block(134, FY - 14, 130, 14, { kind: 'boat' }),
          block(400, FY - 60, 44, 120, { kind: 'boulder' }),
          block(640, FY - 60, 44, 120, { kind: 'boulder' }),
          block(860, FY - 40, 100, 140),
        ];
        L.hazards = [hazard(130, FY + 6, 730, 100, { kind: 'water' })];
        L.doors = [door(900, FY - 100)];
        L.signs = [{ x: 480, y: 250, text: 'rafting: helmet compulsory' }];
      },
      tick(L, P) {
        once(L, 'a', P.ground === L.r.raft, () => { L.r.raft.vx = 2.6; say(L, 'chalo! Ganga ki sawaari'); });
        once(L, 'b', L.r.raft.x > 740, () => { L.r.raft.vx = 0; });
      },
    },
    {
      // landslide: boulders come down and stay as obstacles. the second one waits for whoever climbs the first
      name: 'Pahad Khiska',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          L.r.b1 = block(500, -120, 90, 80, { kind: 'boulder' }),
          L.r.b2 = block(680, -200, 100, 150, { kind: 'boulder' }),
        ];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 220, y: FY - 110, text: 'landslide zone. dheere chalein.' }];
      },
      tick(L, P) {
        const { b1, b2 } = L.r;
        once(L, 'a', P.x > 340, () => { b1.crusher = true; b1.landY = FY - 80; drop(b1, 4); say(L, 'pahad khisak raha hai!'); });
        once(L, 'b', P.ground === b1 || P.x > 600, () => { b2.crusher = true; b2.landY = FY - 150; drop(b2, 2); say(L, 'ek aur!'); });
      },
    },
    {
      // a temple monkey grabs the door and climbs the tree with it, then decides to bite
      name: 'Bandar Prasad',
      build(L) {
        L.solids = [block(0, FY, 960, 100), L.r.b1 = block(600, FY - 100, 110, 14), block(760, FY - 200, 140, 14)];
        L.doors = [door(860, FY - 60), L.r.real = door(40, FY - 60, { hidden: true })];
        L.signs = [{ x: 260, y: FY - 110, text: 'bandar ko prasad na dein' }];
      },
      tick(L, P) {
        const d = L.doors[0];
        once(L, 'a', P.x > 740, () => { d.tx = 850; d.ty = FY - 260; say(L, 'bandar darwaza le bhaaga!'); sfx.trap(); });
        once(L, 'b', L.f.a && P.ground === L.r.b1, () => { d.evil = true; L.r.real.hidden = false; say(L, 'bandar ne kaat liya. asli darwaza peeche hai'); sfx.trap(); });
      },
    },
    {
      // thick fog over the gorge: stones only show up close, and the obvious one is just more fog
      name: 'Kohra',
      build(L) {
        const fog = 170;
        L.solids = [
          block(0, FY, 180, 100),
          block(250, 400, 80, 14, { fog }), block(400, 370, 80, 14, { fog }),
          block(550, 350, 80, 14, { fog, ghost: true }), block(540, 290, 70, 14, { fog }),
          block(700, 330, 80, 14, { fog }),
          block(800, FY, 160, 100),
        ];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 120, y: FY - 110, text: 'kohra hai. sab dikhta hai.' }];
      },
      tick(L, P) { once(L, 'a', P.x > 120, () => say(L, 'kuch nahi dikh raha...')); },
    },
    {
      // the long climb: one step is only painted on, the real one is a little lower, and the last one is in a hurry
      name: 'Char Dham Seedhi',
      build(L) {
        L.solids = [
          block(0, FY, 200, 100),
          block(200, 385, 90, 155), block(290, 330, 90, 210),
          block(380, 275, 90, 14, { ghost: true }), L.r.hid = block(380, 300, 90, 14, { invisible: true }),
          block(470, 245, 90, 295),
          L.r.c = block(560, 190, 90, 14, { crumble: true, crumbleDelay: 12 }),
          block(650, 135, 310, 14),
        ];
        L.doors = [door(880, 75)];
        L.signs = [{ x: 200, y: 200, text: 'seedhi 108 saal purani' }];
      },
      tick(L, P) {
        once(L, 'a', P.ground === L.r.hid, () => say(L, 'seedhi nakli thi. yeh asli hai. shayad.'));
        once(L, 'b', P.ground === L.r.c, () => say(L, 'jaldi! yeh bhi purani hai'));
      },
    },
    {
      // a hill road one bus wide. buses don't brake; the milestones are the only lay-bys
      name: 'Pahadi Bus',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          block(420, FY - 64, 40, 64), block(700, FY - 64, 40, 64),
          L.r.bus1 = block(W + 40, FY - 60, 140, 60, { kind: 'bus' }),
          L.r.bus2 = block(W + 40, FY - 60, 140, 60, { kind: 'bus' }),
        ];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 230, y: FY - 110, text: 'one way. dono taraf se.' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 140, () => { L.r.bus1.vx = -3.5; sfx.horn(); say(L, 'PAAAN PAAAN! bus aayi!'); });
        once(L, 'b', P.x > 560, () => { L.r.bus2.vx = -3.5; sfx.horn(); say(L, 'ek aur bus! side lo!'); });
        L.solids = L.solids.filter(s => s.kind !== 'bus' || s.x > -200);
      },
    },
    {
      // finale: the climb to the top. a bridge with a bad plank, a landslide step, then the door goes up into the fog
      name: 'Chotu Ki Chadhai',
      build(L) {
        L.solids = [
          block(0, FY, 150, 100),
          block(150, FY - 40, 180, 12, { move: { dx: 0, dy: 8, period: 110 } }),
          L.r.bad = block(330, FY - 40, 90, 12, { crumble: true, crumbleDelay: 6 }),
          block(440, FY, 320, 100),
          L.r.b1 = block(600, -100, 80, 80, { kind: 'boulder' }),
          block(760, 280, 200, 260),
          L.r.top = block(760, 190, 90, 14, { fog: 150 }),
        ];
        L.hazards = [hazard(150, FY + 30, 290, 80, { kind: 'water' })];
        L.doors = [door(880, 220)];
        L.signs = [{ x: 600, y: 250, text: 'chai ki tapri: bas upar' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 470 && P.y > 300, () => { const b = L.r.b1; b.crusher = true; b.landY = FY - 80; drop(b, 4); say(L, 'pathar aaya! seedhi ban gayi'); });
        once(L, 'b', P.x > 820 && P.y < 280, () => { const d = L.doors[0]; d.tx = 790; d.ty = 130; say(L, 'darwaza baadal mein chala gaya'); sfx.trap(); });
      },
    },
  ],
});
