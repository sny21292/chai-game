'use strict';
// World 5: Himalaya. The final climb: ice, icicles, avalanches, blizzards and plain mountain madness.

world({
  id: 'himalaya',
  theme: 'himalaya',
  name: 'Himachal Pradesh',
  region: 'HP', kind: 'state',
  tagline: 'bas thoda aur upar, phir chai',
  levels: [
    {
      // Ice intro: spikes pop late, and on ice you cannot just let go and stop.
      name: 'Thand Rakh',
      build(L) {
        L.solids = [block(0, FY, 240, 100), block(240, FY, 720, 100, { ice: true })];
        L.spikes = [L.r.sp = spikes(600, FY, 3, { hidden: true })];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 150, y: FY - 100, text: 'thand rakh, bhai. dheere.' }];
      },
      tick(L, P) { once(L, 'a', P.x > 500, () => { pop(L.r.sp); say(L, 'brake? barf pe? haha'); }); },
    },
    {
      // Spawn on the right; icicles drop just ahead of a runner. Walk up, let them fall, then go.
      name: 'Kulfi Kaante',
      build(L) {
        L.start = [880, FY - PH];
        L.solids = [block(0, FY, 960, 100), block(180, 50, 600, 200)];
        for (let i = 0; i < 4; i++) L.hazards.push(L.r['i' + i] = hazard(640 - i * 120, 250, 18, 40, { kind: 'icicle', grav: 0.6, active: false }));
        L.doors = [door(40, FY - 60)];
        L.signs = [{ x: 480, y: 350, text: 'free kulfi upar latki hai' }];
      },
      tick(L, P) {
        for (let i = 0; i < 4; i++) {
          const ic = L.r['i' + i];
          once(L, 'i' + i, P.x < ic.x + 18 + 70, () => { trigger(ic); if (i === 0) say(L, 'kulfi nahi, kaanta!'); });
        }
      },
    },
    {
      // Blizzard gusts come and go. Cross the gaps while it is calm.
      name: 'Barfeeli Hawa',
      build(L) {
        L.solids = [block(0, FY, 300, 100), block(420, FY, 200, 100), block(740, FY, 220, 100)];
        L.winds = [L.r.z = wind(290, -1000, 460, 390, 0)];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 150, y: FY - 100, text: 'mausam ekdum saaf hai' }];
      },
      tick(L) {
        const c = (L.t - 50) % 170, on = L.t >= 50 && c < 70;
        L.r.z.fx = on ? -3 : 0;
        L.r.z.y = on ? 50 : -1000;
        L.f.g = L.t < 50 ? -1 : Math.floor(c / 10);
        once(L, 'a', on, () => say(L, 'SAAAAAN! toofan!'));
      },
    },
    {
      // A snowball chases from behind. Get up high and let it roll past.
      name: 'Gola Aaya',
      build(L) {
        L.solids = [block(0, FY, 960, 100), block(320, FY - 80, 70, 14), block(440, FY - 160, 130, 14)];
        L.hazards = [L.r.ball = hazard(-320, FY - 110, 110, 110, { kind: 'snowball', active: false })];
        L.doors = [door(880, FY - 60)];
        L.signs = [{ x: 760, y: FY - 110, text: 'maggi point aage hai →' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 180, () => { L.r.ball.vx = 7; trigger(L.r.ball); say(L, 'peeche dekh! GOLA!'); });
      },
    },
    {
      // Gravity flips and Chotu walks on the sky. The sky has a hole in it.
      name: 'Ulta Pahad',
      build(L) {
        L.solids = [block(0, FY, 960, 100), block(0, 50, 420, 40), block(540, 50, 420, 40)];
        L.spikes = [spikes(700, 90, 2, { dir: 'down' })];
        L.doors = [door(880, 90, { flip: true })];
        L.signs = [{ x: 180, y: FY - 100, text: 'oxygen kam hai, dimaag bhi' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 220, () => { L.gravity = -1; say(L, 'pahad pe sab ulta!'); sfx.flip(); });
      },
    },
    {
      // Controls reverse on ice: correcting takes ages. Then they flip back.
      name: 'Ulta Fisal',
      build(L) {
        L.solids = [block(0, FY, 160, 100), block(160, FY, 420, 100, { ice: true }), block(680, FY, 280, 100, { ice: true })];
        L.spikes = [L.r.sp = spikes(0, FY, 6, { hidden: true })];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 380, y: FY - 100, text: 'barf pe sab seedha chalta hai' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 300, () => { L.reversed = true; pop(L.r.sp); say(L, '← → ? thand lag gayi'); sfx.flip(); });
        once(L, 'b', P.x > 720 && P.onGround, () => { L.reversed = false; say(L, 'ab theek ho gaya. shayad.'); sfx.flip(); });
      },
    },
    {
      // Prayer-flag ropes crumble under you; at the top an avalanche comes the other way.
      name: 'Jhandiyan',
      build(L) {
        L.solids = [
          block(0, FY, 960, 100),
          block(170, 360, 110, 12, { crumble: true }),
          block(350, 290, 110, 12, { crumble: true }),
          block(170, 220, 110, 12, { crumble: true }),
          block(350, 150, 110, 12, { crumble: true }),
          block(540, 150, 420, 16),
        ];
        L.spikes = [spikes(150, FY, 36)];
        L.hazards = [L.r.ball = hazard(W + 20, 90, 60, 60, { kind: 'snowball', active: false })];
        L.doors = [door(890, 90)];
        L.signs = [{ x: 720, y: 250, text: 'bas thoda aur upar' }];
      },
      tick(L, P) {
        once(L, 'a', P.onGround && P.y < 130 && P.x > 560, () => { L.r.ball.vx = -5; trigger(L.r.ball); say(L, 'upar se bhi gola?!'); });
      },
    },
    {
      // Small snowballs keep coming; jump them. The big one: hide in the trench.
      name: 'Gole Hi Gole',
      build(L) {
        L.solids = [block(0, FY, 680, 100), block(680, FY + 50, 50, 50), block(730, FY, 230, 100)];
        L.doors = [door(890, FY - 60)];
        L.signs = [{ x: 705, y: FY + 80, text: 'garhda' }, { x: 200, y: FY - 100, text: 'chhote gole, chhoti baat' }];
      },
      tick(L, P) {
        const k = L.t - 40;
        if (k >= 0 && k % 100 === 0 && !L.f.big) L.hazards.push(hazard(W + 10, FY - 50, 50, 50, { kind: 'snowball', vx: -4.5 }));
        L.f.w = k < 0 ? -1 : Math.floor(k / 10) % 10;
        once(L, 'big', P.x > 560, () => {
          L.hazards.push(hazard(W + 10, FY - 160, 160, 160, { kind: 'snowball', vx: -4.5 }));
          say(L, 'yeh wala chhota nahi hai');
        });
      },
    },
    {
      // Ice steps over spikes with icicles above: chain-jumping walks into them, so brake on the ice and wait.
      name: 'Fisalti Seedhi',
      build(L) {
        L.solids = [
          block(0, FY, 200, 100), block(200, FY, 760, 100),
          block(220, 50, 560, 30),
          L.r.s1 = block(250, 380, 120, 16),
          L.r.s2 = block(440, 320, 120, 16, { ice: true }),
          L.r.s3 = block(630, 260, 120, 16, { ice: true }),
          block(810, 200, 150, 16),
        ];
        L.spikes = [spikes(200, FY, 34)];
        for (let i = 0; i < 3; i++) {
          L.hazards.push(L.r['a' + i] = hazard(452 + i * 38, 80, 18, 40, { kind: 'icicle', grav: 0.6, active: false }));
          L.hazards.push(L.r['b' + i] = hazard(642 + i * 38, 80, 18, 40, { kind: 'icicle', grav: 0.6, active: false }));
        }
        L.doors = [door(900, 140)];
        L.signs = [{ x: 100, y: FY - 100, text: 'seedhi hai. fisalti hai.' }];
      },
      tick(L, P) {
        // landing on a step starts a staggered curtain of icicles over the next step
        // landing on a step starts a staggered curtain of icicles over the next step (ca/cb count frames since)
        once(L, 'a', P.onGround && P.ground === L.r.s1, () => { L.f.ca = 0; });
        once(L, 'b', P.onGround && P.ground === L.r.s2, () => { L.f.cb = 0; say(L, 'ruk ja! (agar ruk sake)'); });
        for (const c of ['a', 'b']) {
          const k = 'c' + c;
          if (L.f[k] == null || L.f[k] > 40) continue;
          L.f[k]++;
          for (let i = 0; i < 3; i++) if (L.f[k] === 6 + i * 12) trigger(L.r[c + i]);
          if (L.f[k] > 40) L.f[k] = 99;
        }
      },
    },
    {
      // Finale: outrun the avalanche, tiptoe over icy ground under an icicle,
      // jump to the summit, then the door floats up and Chotu falls into the sky.
      name: 'Chotu Ki Choti',
      build(L) {
        L.solids = [
          block(0, FY, 380, 100),
          block(290, FY - 70, 90, 70),
          block(380, 300, 220, 240, { ice: true }),
          block(430, 50, 180, 110),
          block(680, 230, 280, 310),
          L.r.cloud = block(800, 50, 150, 14, { invisible: true }),
        ];
        L.hazards = [
          L.r.ball = hazard(-260, FY - 120, 120, 120, { kind: 'snowball', active: false }),
          L.r.ic = hazard(490, 160, 18, 40, { kind: 'icicle', grav: 0.6, active: false }),
          L.r.ic2 = hazard(560, 160, 18, 40, { kind: 'icicle', grav: 0.6, active: false }),
        ];
        L.spikes = [L.r.sp = spikes(770, 230, 3, { hidden: true })];
        L.doors = [L.r.d = door(870, 170)];
        L.signs = [{ x: 770, y: 130, text: 'choti! last door!' }];
      },
      tick(L, P) {
        once(L, 'a', P.x > 120, () => { L.r.ball.vx = 6; trigger(L.r.ball); say(L, 'aakhri gola, aakhri baar'); });
        once(L, 'smash', L.r.ball.x + L.r.ball.w > 395, () => { L.hazards = L.hazards.filter(h => h !== L.r.ball); G.shake = 10; sfx.thud(); });
        once(L, 'b', P.x > 420 && P.y < 300, () => trigger(L.r.ic));
        once(L, 'b2', P.x > 490 && P.y < 300, () => trigger(L.r.ic2));
        once(L, 'p', P.x > 680 && P.onGround && P.y < 230, () => pop(L.r.sp));
        once(L, 'c', P.x > 850 && P.onGround && P.y < 230, () => {
          L.r.d.flip = true; L.r.d.ty = 64;
          say(L, 'bas thoda aur upar...');
        });
        once(L, 'd', L.f.c && L.r.d.y < 70, () => { L.gravity = -1; L.r.cloud.revealed = true; sfx.flip(); say(L, 'CHOTU UD GAYA!'); });
      },
    },
  ],
});
