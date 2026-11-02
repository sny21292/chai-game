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
};