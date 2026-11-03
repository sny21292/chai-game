'use strict';
// Per-world look: block palette, a static painted backdrop (cached once) and a few live animated touches.

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function skyGradient(c, stops) {
  const g = c.createLinearGradient(0, 0, 0, H);
  stops.forEach((col, i) => g.addColorStop(i / (stops.length - 1), col));
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}
function palm(c, x, base, h, lean, col) {
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 7; c.lineCap = 'round';
  const tx = x + lean, ty = base - h;
  c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x + lean * 0.2, base - h * 0.6, tx, ty); c.stroke();
  c.lineWidth = 4;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i / 6) * Math.PI, len = 46 + (i % 2) * 10;
    c.beginPath(); c.moveTo(tx, ty);
    c.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.5 - 12, tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.3 + 16);
    c.stroke();
  }
}

const THEMES = {
  mumbai: {
    pal: { block: '#cfc6b8', top: '#f2c230', shade: '#8f8578', text: '#fbeedd' },
    paint(c) {
      skyGradient(c, ['#1c1430', '#45233f', '#b4553f', '#e89a5a']);
      const r = seeded(7);
      c.fillStyle = '#f7c86a'; c.beginPath(); c.arc(720, 330, 46, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2b2a48'; c.fillRect(0, 360, W, H - 360);                       // the sea
      c.fillStyle = 'rgba(247,200,106,.25)';
      for (let i = 0; i < 14; i++) c.fillRect(660 + r() * 120, 368 + i * 6, 30 + r() * 40, 2);
      for (let x = 0; x < W;) {                                                        // skyline
        const w = 26 + r() * 50, h = 70 + r() * 210;
        c.fillStyle = r() < 0.5 ? '#231831' : '#2b1d38';
        c.fillRect(x, 380 - h, w, h + 160);
        c.fillStyle = 'rgba(255,207,107,.55)';
        for (let wy = 380 - h + 8; wy < 372; wy += 12) for (let wx = x + 5; wx < x + w - 6; wx += 9) if (r() < 0.32) c.fillRect(wx, wy, 4, 5);
        x += w + 2 + r() * 8;
      }
      c.strokeStyle = 'rgba(20,12,28,.8)'; c.lineWidth = 2;                         // overhead train wires
      for (let px = 60; px < W; px += 280) { c.fillStyle = '#140c1c'; c.fillRect(px, 40, 6, 400); c.fillRect(px - 20, 60, 46, 5); }
      for (const wy of [62, 76]) { c.beginPath(); c.moveTo(0, wy); for (let px = 60; px <= W + 280; px += 280) c.quadraticCurveTo(px - 140, wy + 14, px, wy); c.stroke(); }
    },
  },
  delhi: {
    pal: { block: '#b5533c', top: '#e08a5c', shade: '#7a3324', text: '#fbeedd' },
    paint(c) {
      skyGradient(c, ['#2a2236', '#6b3b4b', '#c96f4f', '#e7a865']);
      const r = seeded(11);
      for (let x = -20; x < W;) {                                                      // havelis with arches and jharokhas
        const w = 110 + r() * 90, h = 160 + r() * 140, top = 440 - h;
        c.fillStyle = r() < 0.5 ? '#4a2a2c' : '#55302f';
        c.fillRect(x, top, w, h + 100);
        c.fillStyle = '#3a1f22';
        for (let ax = x + 14; ax < x + w - 30; ax += 34) {
          for (let ay = top + 24; ay < 400; ay += 64) {
            c.beginPath(); c.moveTo(ax, ay + 36); c.lineTo(ax, ay + 10); c.arc(ax + 11, ay + 10, 11, Math.PI, 0); c.lineTo(ax + 22, ay + 36); c.fill();
            if (r() < 0.35) { c.fillStyle = 'rgba(255,190,110,.45)'; c.fillRect(ax + 4, ay + 14, 14, 18); c.fillStyle = '#3a1f22'; }
          }
        }
        c.fillStyle = '#5f3633';
        c.fillRect(x - 4, top - 8, w + 8, 10);
        if (r() < 0.6) { c.beginPath(); c.arc(x + w / 2, top - 8, 18, Math.PI, 0); c.fill(); }
        x += w + 6;
      }
      c.strokeStyle = 'rgba(15,8,10,.75)'; c.lineWidth = 1.5;                         // the famous tangle of wires
      for (let i = 0; i < 16; i++) {
        const y0 = 50 + r() * 120, y1 = 50 + r() * 120;
        c.beginPath(); c.moveTo(-10, y0); c.bezierCurveTo(300, y0 + 40 + r() * 60, 650, y1 + 40 + r() * 60, W + 10, y1); c.stroke();
      }
    },
    live(c, f) {
      const kites = [[180, 120, '#ff5d73'], [620, 90, '#3fd0c9'], [820, 150, '#ffd23f']];
      for (const [x0, y0, col] of kites) {
        const x = x0 + Math.sin(f * 0.02 + x0) * 14, y = y0 + Math.cos(f * 0.03 + y0) * 8;
        c.fillStyle = col;
        c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x + 11, y); c.lineTo(x, y + 14); c.lineTo(x - 11, y); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x, y + 14); c.quadraticCurveTo(x + 30, y + 80, x - 20, y + 200); c.stroke();
      }
    },
  },
  rajasthan: {
    pal: { block: '#e2b36f', top: '#f6d796', shade: '#a8773c', text: '#fff3dc' },
    paint(c) {
      skyGradient(c, ['#24163b', '#7a3558', '#e0705a', '#f6b45f']);
      c.fillStyle = '#ffd98a'; c.beginPath(); c.arc(300, 300, 70, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#5a2d3f';                                                         // fort on a hill
      c.beginPath(); c.moveTo(480, 400); c.quadraticCurveTo(700, 250, 960, 300); c.lineTo(960, 420); c.lineTo(480, 420); c.fill();
      c.fillRect(600, 230, 300, 80);
      for (let x = 600; x < 900; x += 16) c.fillRect(x, 222, 9, 10);
      for (const [x, s] of [[640, 1], [760, 1.4], [870, 1]]) {
        c.fillRect(x - 16 * s, 230 - 34 * s, 32 * s, 34 * s);
        c.beginPath(); c.arc(x, 230 - 34 * s, 18 * s, Math.PI, 0); c.fill();
        c.fillRect(x - 1, 230 - 64 * s, 2, 12 * s);
      }
      c.fillStyle = '#3e1f33';
      for (let x = 616; x < 890; x += 30) { c.beginPath(); c.moveTo(x, 300); c.lineTo(x, 286); c.arc(x + 6, 286, 6, Math.PI, 0); c.lineTo(x + 12, 300); c.fill(); }
      for (const [y, col, amp] of [[380, '#c8784a', 18], [420, '#a85d3a', 24]]) {        // dunes
        c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
        for (let x = 0; x <= W; x += 20) c.lineTo(x, y + Math.sin(x * 0.012 + y) * amp);
        c.lineTo(W, H); c.fill();
      }
    },
  },
  kerala: {
    pal: { block: '#a4553a', top: '#5c9a3f', shade: '#6b3322', text: '#f2fbe9' },
    paint(c) {
      skyGradient(c, ['#0f2633', '#1f4f5a', '#5f9c8a', '#d6c48a']);
      c.fillStyle = '#163a35'; c.fillRect(0, 330, W, 30);                             // far shore
      c.fillStyle = '#1d5466'; c.fillRect(0, 358, W, H - 358);                       // backwater
      const r = seeded(5);
      for (let i = 0; i < 9; i++) palm(c, 40 + i * 115 + r() * 30, 345, 90 + r() * 70, -30 + r() * 60, '#0c2427');
      c.fillStyle = '#2b1a14';                                                         // kettuvallam houseboat
      c.beginPath(); c.moveTo(560, 372); c.quadraticCurveTo(640, 392, 760, 372); c.lineTo(776, 360); c.lineTo(546, 360); c.fill();
      c.fillStyle = '#5a3a22';
      c.beginPath(); c.moveTo(580, 360); c.quadraticCurveTo(660, 318, 740, 360); c.fill();
    },
    live(c, f) {
      c.fillStyle = 'rgba(214,196,138,.22)';
      for (let i = 0; i < 18; i++) {
        const x = (i * 97 + f * 0.4) % (W + 60) - 30, y = 368 + (i % 6) * 12;
        c.fillRect(x, y, 26 + (i % 3) * 12, 2);
      }
    },
  },
  himalaya: {
    pal: { block: '#7f8ea3', top: '#f4f8fc', shade: '#4f5e72', text: '#f4f8fc' },
    paint(c) {
      skyGradient(c, ['#091426', '#1b3557', '#4d7aa6', '#a9c7e3']);
      const r = seeded(3);
      c.fillStyle = '#fff';
      for (let i = 0; i < 70; i++) c.fillRect(r() * W, r() * 200, 1.5, 1.5);
      for (const [base, col, snow, n] of [[330, '#5d7aa0', '#e8f1fa', 4], [400, '#3e5878', '#d3e2f0', 6]]) {
        for (let i = 0; i < n; i++) {
          const cx = (i + 0.5) * (W / n) + (r() - 0.5) * 60, h = 140 + r() * 120, hw = 120 + r() * 60;
          c.fillStyle = col;
          c.beginPath(); c.moveTo(cx - hw, base + 60); c.lineTo(cx, base - h); c.lineTo(cx + hw, base + 60); c.fill();
          c.fillStyle = snow;
          c.beginPath(); c.moveTo(cx - hw * 0.28, base - h * 0.62); c.lineTo(cx, base - h); c.lineTo(cx + hw * 0.28, base - h * 0.62);
          c.lineTo(cx + 8, base - h * 0.7); c.lineTo(cx - 6, base - h * 0.6); c.fill();
        }
      }
      const cols = ['#3b6fd8', '#f4f8fc', '#e2424f', '#3fa65a', '#f2c230'];     // prayer flags
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, 110); c.quadraticCurveTo(480, 190, W, 100); c.stroke();
      for (let i = 0; i < 36; i++) {
        const t = i / 36, x = t * W, y = (1 - t) * (1 - t) * 110 + 2 * (1 - t) * t * 190 + t * t * 100;
        c.fillStyle = cols[i % 5]; c.fillRect(x + 6, y, 14, 18);
      }
    },
    live(c, f) {
      c.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 60; i++) {
        const x = (i * 131 + Math.sin(f * 0.01 + i) * 30 + f * 0.3) % W, y = (i * 71 + f * (0.6 + (i % 4) * 0.25)) % H;
        c.fillRect(x, y, 2, 2);
      }
    },
  },
  up: {
    // Varanasi at dawn: ghat steps down to the Ganga, temple spires, boats and floating diyas
    pal: { block: '#c98e5a', top: '#efc184', shade: '#8a5a32', text: '#fff4e2' },
    paint(c) {
      skyGradient(c, ['#2a1d3d', '#7b3f5e', '#e2876a', '#f7c98a']);
      c.fillStyle = '#ffe2a0'; c.beginPath(); c.arc(760, 250, 44, 0, Math.PI * 2); c.fill();
      const r = seeded(21);
      for (let x = -10; x < W;) {                                                      // ghat buildings and shikharas
        const w = 70 + r() * 80, h = 90 + r() * 120, top = 330 - h;
        c.fillStyle = r() < 0.5 ? '#6a3b45' : '#5a3240';
        c.fillRect(x, top, w, h + 40);
        if (r() < 0.45) {
          c.beginPath(); c.moveTo(x + w * 0.2, top); c.quadraticCurveTo(x + w / 2, top - 90, x + w * 0.8, top); c.fill();
          c.fillStyle = '#f2b04a'; c.fillRect(x + w / 2 - 1, top - 98, 2, 12);
        } else {
          c.fillStyle = '#4c2a36';
          for (let cx = x + 12; cx < x + w - 14; cx += 26) { c.beginPath(); c.arc(cx + 7, top, 9, Math.PI, 0); c.fill(); }
        }
        c.fillStyle = 'rgba(255,200,120,.4)';
        for (let wy = top + 14; wy < 320; wy += 24) for (let wx = x + 8; wx < x + w - 10; wx += 18) if (r() < 0.25) c.fillRect(wx, wy, 6, 9);
        x += w + 4;
      }
      c.fillStyle = '#7a4a3c';                                                         // the ghat steps
      for (let i = 0; i < 6; i++) c.fillRect(0, 330 + i * 7, W, 7 - (i % 2));
      c.fillStyle = '#3b3a5c'; c.fillRect(0, 372, W, H - 372);                         // the river
      c.fillStyle = 'rgba(255,226,160,.28)';
      for (let i = 0; i < 12; i++) c.fillRect(700 + r() * 120, 380 + i * 6, 30 + r() * 40, 2);
      c.fillStyle = '#21182b';                                                          // a couple of boats
      for (const bx of [140, 470]) { c.beginPath(); c.moveTo(bx, 390); c.quadraticCurveTo(bx + 50, 404, bx + 110, 390); c.lineTo(bx + 116, 384); c.lineTo(bx - 6, 384); c.fill(); }
    },
    live(c, f) {
      for (let i = 0; i < 10; i++) {                                                   // diyas drifting downstream
        const x = (i * 113 + f * 0.25) % (W + 40) - 20, y = 392 + (i % 4) * 11;
        c.fillStyle = '#8a4a2a'; c.fillRect(x - 4, y, 8, 3);
        c.fillStyle = i % 2 ? '#ffd23f' : '#ff9f1c';
        c.beginPath(); c.ellipse(x, y - 3 + Math.sin(f * 0.2 + i) * 0.6, 2, 3.5, 0, 0, Math.PI * 2); c.fill();
      }
    },
  },
  uttarakhand: {
    // green hills, deodars, a rope bridge over a fast river
    pal: { block: '#7d7a68', top: '#9cc46a', shade: '#4f4c40', text: '#f3f8ea' },
    paint(c) {
      skyGradient(c, ['#13253b', '#2f5a72', '#7fb0b8', '#d8e6d0']);
      const r = seeded(31);
      for (const [base, col, amp] of [[250, '#5f8a8c', 60], [310, '#3f6a5e', 50], [370, '#2d4f43', 40]]) {
        c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
        for (let x = 0; x <= W; x += 16) c.lineTo(x, base - Math.abs(Math.sin(x * 0.006 + base)) * amp - Math.sin(x * 0.03) * 8);
        c.lineTo(W, H); c.fill();
      }
      c.fillStyle = '#1c3a30';                                                          // deodars
      for (let i = 0; i < 26; i++) {
        const x = r() * W, b = 360 + r() * 40, h = 40 + r() * 50;
        c.beginPath(); c.moveTo(x - h * 0.28, b); c.lineTo(x, b - h); c.lineTo(x + h * 0.28, b); c.fill();
      }
      c.fillStyle = '#3c7d8a'; c.fillRect(0, 392, W, H - 392);                          // the river
      c.strokeStyle = 'rgba(30,20,20,.6)'; c.lineWidth = 2;                             // rope bridge in the distance
      c.beginPath(); c.moveTo(560, 250); c.quadraticCurveTo(720, 300, 880, 250); c.stroke();
      c.beginPath(); c.moveTo(560, 270); c.quadraticCurveTo(720, 312, 880, 270); c.stroke();
      c.fillStyle = 'rgba(30,20,20,.6)'; c.fillRect(556, 240, 6, 40); c.fillRect(878, 240, 6, 40);
    },
    live(c, f) {
      c.fillStyle = 'rgba(255,255,255,.08)';                                            // mist
      for (let i = 0; i < 6; i++) {
        const x = (i * 210 + f * (0.2 + i * 0.05)) % (W + 300) - 150;
        c.beginPath(); c.ellipse(x, 220 + i * 30, 160, 18, 0, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = 'rgba(255,255,255,.3)';
      for (let i = 0; i < 14; i++) c.fillRect((i * 83 + f * 2) % W, 400 + (i % 5) * 26, 20, 2);
    },
  },
  chandigarh: {
    // the planned city: concrete, roundabouts, the Open Hand, Sukhna lake
    pal: { block: '#a9a497', top: '#e0d9c6', shade: '#6d695f', text: '#fbf7ec' },
    paint(c) {
      skyGradient(c, ['#2d3f5c', '#5f7f9e', '#b7c6c9', '#efe2c0']);
      c.fillStyle = '#6a7d6a'; c.fillRect(0, 300, W, 120);                              // the Shivalik foothills
      c.beginPath(); c.moveTo(0, 310);
      for (let x = 0; x <= W; x += 20) c.lineTo(x, 300 - Math.abs(Math.sin(x * 0.01)) * 50);
      c.lineTo(W, 320); c.fill();
      c.fillStyle = '#8c8a83';                                                          // concrete blocks, Capitol-style
      c.fillRect(80, 220, 260, 120); c.fillRect(60, 210, 300, 14);
      c.beginPath(); c.moveTo(60, 210); c.quadraticCurveTo(210, 170, 360, 210); c.fill();
      c.fillStyle = '#6d6b65';
      for (let x = 96; x < 330; x += 28) c.fillRect(x, 240, 14, 90);
      c.fillStyle = '#7b7972'; c.fillRect(620, 250, 200, 90);
      for (let y = 260; y < 330; y += 16) { c.fillStyle = '#5f5d57'; c.fillRect(630, y, 180, 6); }
      c.fillStyle = '#4b4a46';                                                          // the Open Hand on its mast
      c.fillRect(477, 180, 6, 130);
      c.beginPath(); c.moveTo(450, 182); c.lineTo(458, 120); c.lineTo(468, 150); c.lineTo(480, 108); c.lineTo(492, 150); c.lineTo(502, 120); c.lineTo(510, 182); c.closePath(); c.fill();
      c.fillStyle = '#5d8fa6'; c.fillRect(0, 360, W, H - 360);                          // Sukhna lake
      c.fillStyle = 'rgba(255,255,255,.25)';
      for (let i = 0; i < 16; i++) c.fillRect((i * 67) % W, 372 + (i % 5) * 9, 24, 2);
    },
  },

  goa: {
    // sunset over the Arabian Sea: palms, a beach shack, a whitewashed chapel on the headland
    pal: { block: '#e3c48a', top: '#f6e2b0', shade: '#b0905a', text: '#fff6e6' },
    paint(c) {
      skyGradient(c, ['#2a1a46', '#8a3a6a', '#f07a5a', '#ffc46b']);
      c.fillStyle = '#ffdd8a'; c.beginPath(); c.arc(560, 318, 54, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3b5f86'; c.fillRect(0, 320, W, H - 320);                         // the sea
      c.fillStyle = 'rgba(255,221,138,.35)';
      for (let i = 0; i < 16; i++) c.fillRect(500 + ((i * 37) % 120), 330 + i * 5, 30 + (i % 3) * 14, 2);
      c.fillStyle = '#2e2433';                                                         // headland and chapel
      c.beginPath(); c.moveTo(0, 330); c.quadraticCurveTo(120, 260, 260, 300); c.lineTo(300, 330); c.fill();
      c.fillStyle = '#f2ece0'; c.fillRect(120, 236, 46, 40);
      c.beginPath(); c.moveTo(116, 238); c.lineTo(143, 214); c.lineTo(170, 238); c.fill();
      c.fillRect(140, 198, 6, 18); c.fillRect(134, 204, 18, 5);
      c.fillStyle = '#6b4a3a'; c.fillRect(137, 254, 12, 22);
      c.fillStyle = '#e8c98e'; c.fillRect(0, 360, W, H - 360);                          // sand
      c.fillStyle = '#5a3a28';                                                          // beach shack
      c.fillRect(760, 300, 150, 70);
      c.fillStyle = '#c0392b'; c.beginPath(); c.moveTo(744, 302); c.lineTo(835, 266); c.lineTo(926, 302); c.fill();
      c.fillStyle = '#ffd23f'; for (let x = 770; x < 900; x += 22) c.fillRect(x, 304, 10, 6);
      palm(c, 40, 380, 150, 30, '#1f2a24'); palm(c, 680, 380, 170, -30, '#1f2a24'); palm(c, 930, 390, 130, -20, '#1f2a24');
    },
    live(c, f) {
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;                        // little waves on the shore
      for (let i = 0; i < 3; i++) {
        const y = 352 + Math.sin(f * 0.03 + i) * 4;
        c.beginPath(); for (let x = 0; x <= W; x += 24) c.lineTo(x, y + i * 3 + Math.sin(x * 0.05 + f * 0.05 + i) * 2); c.stroke();
      }
    },
  },
  gujarat: {
    // Uttarayan over old Ahmedabad: pol houses, a stepwell arch, kites everywhere
    pal: { block: '#d9b28a', top: '#f3d3a8', shade: '#9a7352', text: '#fff6ea' },
    paint(c) {
      skyGradient(c, ['#1f4f86', '#4f8fc0', '#9fd0e6', '#f4e3b8']);
      const r = seeded(41);
      for (let x = 0; x < W;) {                                                        // pol houses with carved balconies
        const w = 70 + r() * 60, h = 120 + r() * 90;
        c.fillStyle = ['#c98a5a', '#b9764e', '#d7a06a', '#a8674a'][Math.floor(r() * 4)];
        c.fillRect(x, 420 - h, w, h);
        c.fillStyle = 'rgba(60,30,20,.35)';
        for (let y = 440 - h; y < 400; y += 34) c.fillRect(x + 8, y, w - 16, 16);
        c.fillStyle = '#7a4a2a'; c.fillRect(x - 2, 420 - h - 6, w + 4, 8);
        x += w + 4;
      }
      for (let i = 0; i < 9; i++) {                                                    // kites
        const kx = 40 + r() * 880, ky = 40 + r() * 170, cols = ['#ff3fa4', '#ffd23f', '#2fd06b', '#ff7a1c', '#7b3fa0'];
        c.fillStyle = cols[i % 5];
        c.beginPath(); c.moveTo(kx, ky - 14); c.lineTo(kx + 11, ky); c.lineTo(kx, ky + 14); c.lineTo(kx - 11, ky); c.fill();
        c.strokeStyle = 'rgba(40,40,60,.35)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(kx, ky + 14); c.quadraticCurveTo(kx + 30, ky + 120, kx - 20 + r() * 80, 420); c.stroke();
      }
    },
    live(c, f) {
      c.fillStyle = '#ffd23f';
      for (let i = 0; i < 3; i++) {
        const kx = (i * 330 + f * 0.6) % (W + 60) - 30, ky = 90 + i * 40 + Math.sin(f * 0.04 + i) * 14;
        c.beginPath(); c.moveTo(kx, ky - 10); c.lineTo(kx + 8, ky); c.lineTo(kx, ky + 10); c.lineTo(kx - 8, ky); c.fill();
      }
    },
  },
  punjab: {
    // golden wheat and yellow mustard to the horizon, a tube-well hut, a big evening sky
    pal: { block: '#9a6b42', top: '#7fb04a', shade: '#6a4528', text: '#fffbea' },
    paint(c) {
      skyGradient(c, ['#28305e', '#5c6fa6', '#e4a96a', '#f8d98a']);
      c.fillStyle = '#ffe8a0'; c.beginPath(); c.arc(220, 300, 60, 0, Math.PI * 2); c.fill();
      for (const [y, col] of [[320, '#c8a94a'], [350, '#e4c84a'], [385, '#f2d22e'], [415, '#d9a63a']]) {   // field bands
        c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
        for (let x = 0; x <= W; x += 30) c.lineTo(x, y + Math.sin(x * 0.008 + y) * 6);
        c.lineTo(W, H); c.fill();
      }
      c.fillStyle = '#7a5a3a'; c.fillRect(700, 280, 70, 50);                           // tube-well hut
      c.fillStyle = '#5a3a28'; c.beginPath(); c.moveTo(690, 282); c.lineTo(735, 260); c.lineTo(780, 282); c.fill();
      c.fillStyle = '#3a5a3a';                                                          // kikar trees
      for (const [x, y] of [[90, 330], [520, 320], [880, 328]]) {
        c.fillRect(x - 2, y - 40, 4, 40);
        c.beginPath(); c.ellipse(x, y - 46, 34, 14, 0, 0, Math.PI * 2); c.fill();
      }
    },
    live(c, f) {
      c.fillStyle = 'rgba(30,30,40,.55)';                                              // birds heading home
      for (let i = 0; i < 5; i++) {
        const x = (i * 140 + f * 0.8) % (W + 100) - 50, y = 120 + (i % 3) * 22, w = Math.sin(f * 0.2 + i) * 4;
        c.fillRect(x - 6, y + w, 6, 2); c.fillRect(x, y - w, 6, 2);
      }
    },
  },
  karnataka: {
    // Mysore palace lit up for Dasara against a violet evening, Chamundi hill behind
    pal: { block: '#b98c6a', top: '#e8c27a', shade: '#7e5a42', text: '#fff4e2' },
    paint(c) {
      skyGradient(c, ['#1d1838', '#3d2a5e', '#7a4a7a', '#d9866a']);
      c.fillStyle = '#2a2244';                                                          // Chamundi hill
      c.beginPath(); c.moveTo(0, 330); c.quadraticCurveTo(260, 200, 560, 300); c.quadraticCurveTo(760, 250, W, 320); c.lineTo(W, H); c.lineTo(0, H); c.fill();
      const bulbs = (x0, x1, y) => { c.fillStyle = '#ffe7a0'; for (let x = x0; x <= x1; x += 9) c.fillRect(x - 1, y - 1, 3, 3); };
      c.fillStyle = '#3a2c4a';                                                          // the palace: wings, towers, domes
      c.fillRect(250, 250, 460, 150);
      c.fillRect(420, 190, 120, 210);
      for (const x of [250, 330, 610, 690]) c.fillRect(x - 12, 210, 24, 190);
      for (const [x, y, r] of [[480, 190, 40], [250, 210, 16], [330, 210, 16], [610, 210, 16], [690, 210, 16]]) { c.beginPath(); c.arc(x, y, r, Math.PI, 0); c.fill(); }
      c.fillRect(477, 128, 6, 26);
      bulbs(250, 710, 250); bulbs(420, 540, 190); bulbs(250, 710, 300); bulbs(250, 710, 350);
      for (const x of [250, 330, 610, 690]) for (let y = 214; y < 400; y += 10) { c.fillStyle = '#ffe7a0'; c.fillRect(x - 13, y, 3, 3); c.fillRect(x + 10, y, 3, 3); }
      c.strokeStyle = '#ffe7a0'; c.lineWidth = 2;
      c.beginPath(); c.arc(480, 190, 40, Math.PI, 0); c.stroke();
      for (let x = 290; x < 680; x += 46) { c.beginPath(); c.arc(x, 400, 16, Math.PI, 0); c.stroke(); }
      c.fillStyle = '#26213a'; c.fillRect(0, 400, W, H - 400);
      for (const x of [60, 150, 820, 900]) {                                              // coconut trees by the gate
        c.fillStyle = '#1c1830'; c.fillRect(x - 3, 300, 6, 100);
        c.beginPath(); c.ellipse(x, 300, 30, 10, 0, 0, Math.PI * 2); c.fill();
      }
    },
    live(c, f) {
      c.fillStyle = 'rgba(255,231,160,.5)';                                              // twinkles on the palace
      for (let i = 0; i < 8; i++) if ((f >> 3) % 8 === i) { const x = 250 + ((i * 61) % 460); c.beginPath(); c.arc(x, 250 + (i % 3) * 50, 4, 0, Math.PI * 2); c.fill(); }
    },
  },
  tamilnadu: {
    // sunrise over the Bay of Bengal: a painted temple tower, the Marina lighthouse, palms and fishing boats
    pal: { block: '#c9a27a', top: '#f0d8a8', shade: '#8a6a4a', text: '#fff7ea' },
    paint(c) {
      skyGradient(c, ['#3a2a6a', '#c0566a', '#f39a5a', '#ffd88a']);
      c.fillStyle = '#ffe8a8'; c.beginPath(); c.arc(700, 330, 50, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2f5f8a'; c.fillRect(0, 340, W, H - 340);
      c.fillStyle = 'rgba(255,232,168,.35)'; for (let i = 0; i < 14; i++) c.fillRect(650 + ((i * 29) % 100), 350 + i * 6, 34, 2);
      const tiers = [[180, 360, 150], [190, 330, 130], [200, 300, 110], [210, 270, 90], [220, 240, 70], [230, 212, 50]];   // temple tower
      const cols = ['#d9583a', '#f2b33d', '#3fa36b', '#3a7fc2', '#e86aa0', '#f2b33d'];
      tiers.forEach(([x, y, w], i) => { c.fillStyle = cols[i]; c.fillRect(x, y, w, 30); c.fillStyle = 'rgba(0,0,0,.15)'; for (let k = x + 6; k < x + w - 4; k += 12) c.fillRect(k, y + 6, 6, 18); });
      c.fillStyle = '#f2b33d'; c.beginPath(); c.ellipse(255, 206, 30, 10, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e8e2d6'; c.fillRect(520, 220, 26, 120); c.fillStyle = '#c0392b'; c.fillRect(516, 210, 34, 14);     // lighthouse
      c.fillStyle = '#e8cf9a'; c.fillRect(0, 380, W, H - 380);
      for (const [x, y] of [[620, 372], [820, 368]]) { c.fillStyle = '#5a3a28'; c.beginPath(); c.moveTo(x - 40, y); c.lineTo(x + 40, y); c.lineTo(x + 30, y + 12); c.lineTo(x - 30, y + 12); c.fill(); }
      palm(c, 60, 400, 150, 24, '#24302a'); palm(c, 900, 400, 140, -26, '#24302a');
    },
    live(c, f) {
      c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 2;
      for (let i = 0; i < 2; i++) { const y = 372 + Math.sin(f * 0.03 + i) * 3; c.beginPath(); for (let x = 0; x <= W; x += 24) c.lineTo(x, y + i * 4 + Math.sin(x * 0.05 + f * 0.05) * 2); c.stroke(); }
    },
  },
  telangana: {
    // Charminar at dusk over the old city, rooftops and a crescent moon, pigeons on the wires
    pal: { block: '#c8a888', top: '#ecd5b0', shade: '#8a6e56', text: '#fff6ea' },
    paint(c) {
      skyGradient(c, ['#1f2a5a', '#4a3f7a', '#c0707a', '#f2b98a']);
      c.fillStyle = '#fff1c8'; c.beginPath(); c.arc(820, 90, 22, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4a3f7a'; c.beginPath(); c.arc(830, 84, 20, 0, Math.PI * 2); c.fill();
      const r = seeded(19);
      for (let x = 0; x < W;) { const w = 50 + r() * 60, h = 50 + r() * 70; c.fillStyle = r() < 0.5 ? '#3a2f4e' : '#43365a'; c.fillRect(x, 400 - h, w, h); x += w; }
      c.fillStyle = '#d9c3a0';                                                          // Charminar: four minarets and arches
      c.fillRect(380, 230, 200, 170);
      for (const x of [372, 568]) { c.fillRect(x, 120, 20, 280); c.beginPath(); c.arc(x + 10, 120, 12, Math.PI, 0); c.fill(); for (let y = 160; y < 400; y += 60) c.fillRect(x - 4, y, 28, 6); }
      c.fillStyle = '#3a2f4e'; for (const x of [420, 480]) { c.beginPath(); c.moveTo(x, 400); c.lineTo(x, 320); c.quadraticCurveTo(x + 30, 270, x + 60, 320); c.lineTo(x + 60, 400); c.fill(); }
      c.fillStyle = '#c4ad88'; c.fillRect(380, 222, 200, 10);
      c.fillStyle = '#2a2240'; c.fillRect(0, 400, W, H - 400);
      c.strokeStyle = 'rgba(20,15,30,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 190); c.quadraticCurveTo(200, 210, 360, 196); c.stroke();
      c.fillStyle = '#2a2240'; for (const x of [80, 130, 170, 260, 300]) { c.beginPath(); c.ellipse(x, 197 + Math.sin(x) * 4, 6, 4, 0, 0, Math.PI * 2); c.fill(); }
    },
    live(c, f) {
      c.fillStyle = 'rgba(255,230,170,.7)';
      for (let i = 0; i < 12; i++) if (((f >> 4) + i * 7) % 5) c.fillRect(20 + i * 80, 360 + (i % 3) * 12, 4, 4);
    },
  },
  andhra: {
    // the Godavari at dusk between the Papikondalu hills, chilli fields on the bank
    pal: { block: '#b7926a', top: '#e2c08a', shade: '#7e6248', text: '#fff6e8' },
    paint(c) {
      skyGradient(c, ['#24305a', '#5a4a7a', '#e0806a', '#ffcf8a']);
      c.fillStyle = '#3a4a5a';
      c.beginPath(); c.moveTo(0, 320); c.quadraticCurveTo(120, 170, 260, 300); c.quadraticCurveTo(360, 200, 480, 300); c.quadraticCurveTo(620, 150, 760, 300); c.quadraticCurveTo(860, 220, W, 300); c.lineTo(W, 360); c.lineTo(0, 360); c.fill();
      c.fillStyle = '#2f3f4e'; c.beginPath(); c.moveTo(0, 340); c.quadraticCurveTo(220, 260, 420, 340); c.quadraticCurveTo(700, 270, W, 340); c.lineTo(W, 360); c.lineTo(0, 360); c.fill();
      c.fillStyle = '#4a7aa0'; c.fillRect(0, 350, W, 60);
      c.fillStyle = 'rgba(255,207,138,.35)'; for (let i = 0; i < 12; i++) c.fillRect(380 + ((i * 41) % 200), 356 + i * 4, 40, 2);
      c.fillStyle = '#6a8a3a'; c.fillRect(0, 400, W, H - 400);
      c.fillStyle = '#8a3a22'; for (let i = 0; i < 40; i++) c.fillRect((i * 97) % W, 412 + (i * 7) % 24, 6, 3);
    },
    live(c, f) {
      const x = (f * 0.4) % (W + 120) - 60;                                              // a launch far off on the river
      c.fillStyle = '#e8e2d6'; c.fillRect(x, 366, 50, 8); c.fillStyle = '#c0392b'; c.fillRect(x + 10, 358, 30, 8);
    },
  },
  andaman: {
    // turquoise water, green islands, a lighthouse on the point
    pal: { block: '#d7c08e', top: '#f4e6bc', shade: '#9c845a', text: '#f4fffb' },
    paint(c) {
      skyGradient(c, ['#2a6fb0', '#56a9d8', '#a6e0ec', '#e8f7f2']);
      c.fillStyle = '#1fa3a3'; c.fillRect(0, 300, W, H - 300);
      c.fillStyle = '#35c6b8'; c.fillRect(0, 360, W, H - 360);
      for (const [x, w, h] of [[80, 220, 60], [430, 160, 40], [720, 260, 70]]) {        // islands
        c.fillStyle = '#2f7a4a'; c.beginPath(); c.ellipse(x + w / 2, 304, w / 2, h, 0, Math.PI, 0); c.fill();
      }
      c.fillStyle = '#f2ece0'; c.fillRect(806, 150, 22, 90);                           // lighthouse
      c.fillStyle = '#c0392b'; for (let y = 160; y < 240; y += 24) c.fillRect(806, y, 22, 10);
      c.fillStyle = '#2a3440'; c.fillRect(802, 140, 30, 12);
      c.fillStyle = '#ffe88a'; c.fillRect(808, 128, 18, 12);
      c.fillStyle = 'rgba(255,255,255,.35)';
      for (let i = 0; i < 18; i++) c.fillRect((i * 71) % W, 320 + (i % 6) * 12, 26, 2);
    },
    live(c, f) {
      c.fillStyle = 'rgba(255,240,170,.18)';                                           // the lighthouse beam
      const a = Math.sin(f * 0.02) * 0.8;
      c.beginPath(); c.moveTo(817, 134); c.lineTo(817 - 400, 134 + Math.tan(a) * 400 - 40); c.lineTo(817 - 400, 134 + Math.tan(a) * 400 + 40); c.fill();
    },
  },
  kashmir: {
    // Dal Lake: snow peaks, chinar trees in autumn, houseboats on still water
    pal: { block: '#8a7a6a', top: '#e8eef2', shade: '#5a4e44', text: '#f6fbff' },
    paint(c) {
      skyGradient(c, ['#1e3a5f', '#3f6f9a', '#9cc2d8', '#e6eef0']);
      c.fillStyle = '#5d7088';                                                          // mountains with snow caps
      c.beginPath(); c.moveTo(0, 300);
      for (const [x, y] of [[90, 170], [200, 240], [330, 130], [470, 230], [610, 150], [760, 220], [880, 160], [960, 210]]) c.lineTo(x, y);
      c.lineTo(960, 320); c.lineTo(0, 320); c.fill();
      c.fillStyle = '#f4f8fb';
      for (const [x, y] of [[90, 170], [330, 130], [610, 150], [880, 160]]) { c.beginPath(); c.moveTo(x - 28, y + 30); c.lineTo(x, y); c.lineTo(x + 28, y + 30); c.fill(); }
      c.fillStyle = '#6f9ab0'; c.fillRect(0, 320, W, H - 320);                          // the lake
      c.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 12; i++) c.fillRect((i * 83) % W, 330 + (i % 4) * 14, 40, 2);
      for (const x of [120, 520, 780]) {                                                // houseboats
        c.fillStyle = '#7a4a2a'; c.fillRect(x, 300, 120, 24);
        c.fillStyle = '#c9a26a'; c.fillRect(x + 6, 286, 108, 14);
        c.fillStyle = '#5a3a20'; c.beginPath(); c.moveTo(x, 288); c.lineTo(x + 60, 270); c.lineTo(x + 120, 288); c.fill();
      }
      for (const [x, y] of [[40, 300], [360, 296], [690, 300], [930, 296]]) {           // chinar trees
        c.fillStyle = '#4a3020'; c.fillRect(x - 3, y - 40, 6, 40);
        c.fillStyle = '#d4602a'; c.beginPath(); c.arc(x, y - 56, 26, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#e8892b'; c.beginPath(); c.arc(x - 12, y - 48, 16, 0, Math.PI * 2); c.fill();
      }
    },
    live(c, f) {
      c.fillStyle = '#e8892b';                                                          // drifting leaves
      for (let i = 0; i < 7; i++) {
        const x = (i * 150 + Math.sin(f * 0.02 + i) * 30 + f * 0.3) % W, y = (i * 90 + f * 0.6) % 420;
        c.beginPath(); c.ellipse(x, y, 5, 3, f * 0.03 + i, 0, Math.PI * 2); c.fill();
      }
    },
  },
  ladakh: {
    // high desert: bare brown mountains, deep blue sky, a white stupa and prayer flags
    pal: { block: '#a08466', top: '#cdb08a', shade: '#6e5640', text: '#fdf7ee' },
    paint(c) {
      skyGradient(c, ['#0f2a6a', '#2459b0', '#6fa3e0', '#cfe0ef']);
      for (const [base, col, amp] of [[220, '#b7a48c', 90], [300, '#9a7f62', 70], [380, '#7c6249', 40]]) {
        c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
        for (let x = 0; x <= W; x += 20) c.lineTo(x, base - Math.abs(Math.sin(x * 0.007 + base)) * amp);
        c.lineTo(W, H); c.fill();
      }
      c.fillStyle = '#f4f2ec';                                                          // stupa
      c.fillRect(640, 300, 60, 16); c.beginPath(); c.arc(670, 300, 24, Math.PI, 0); c.fill();
      c.fillRect(666, 252, 8, 26); c.fillStyle = '#d4a23a'; c.fillRect(664, 246, 12, 8);
      c.strokeStyle = 'rgba(40,30,20,.5)'; c.lineWidth = 1;                             // prayer flags
      c.beginPath(); c.moveTo(300, 200); c.quadraticCurveTo(470, 250, 640, 280); c.stroke();
      const cols = ['#2f6fd0', '#f4f4f4', '#d9473a', '#2fae5a', '#f2c230'];
      for (let i = 0; i < 18; i++) {
        const t = i / 18, x = 300 + t * 340, y = 200 + t * 80 + Math.sin(t * Math.PI) * 18;
        c.fillStyle = cols[i % 5]; c.fillRect(x, y, 10, 13);
      }
    },
  },
};
