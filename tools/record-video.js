// Portal preview videos (CrazyGames: 15-20 s, no sound, landscape 16:9 and portrait 2:3, 1080p).
// Plays real levels with the solver's inputs in headless Chrome, grabs every frame, and encodes with ffmpeg.
// usage: node tools/record-video.js     -> marketing/videos/preview-1920x1080.mp4, preview-1080x1620.mp4
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'marketing/videos');
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'fpd-video-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// the script: [level number, 'naive' (hold right into the trap) | 'solve', frames to linger after it ends]
const SHOTS = [[1, 'naive', 45], [1, 'solve', 30], [60, 'solve', 30], [73, 'solve', 30], [35, 'solve', 30]];
const COVER_FRAMES = 20;   // open on the static cover, as CrazyGames asks

// solver paths (one action per 4 frames)
const paths = {};
for (const [n, mode] of SHOTS) if (mode === 'solve' && !paths[n]) {
  const r = JSON.parse(execFileSync('node', [path.join(__dirname, 'solve.js'), '--one', String(n)], { encoding: 'utf8' }));
  if (!r.verified) throw new Error('level ' + n + ' has no verified solution');
  paths[n] = r.path;
}

const driver = `
window.__shots = ${JSON.stringify(SHOTS)}; window.__paths = ${JSON.stringify(paths)};
(async () => {
  const ACTIONS = []; for (const dir of [1, 0, -1]) for (const jump of [1, 0]) ACTIONS.push([dir, jump]);
  // render at exactly 1080p whatever the headless window size is
  cv.width = 1920; cv.height = 1080; ctx.setTransform(1920 / W, 0, 0, 1920 / W, 0, 0);
  const pc = document.createElement('canvas'); pc.width = 1080; pc.height = 1620;
  const px = pc.getContext('2d');
  const img = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const coverL = await img('marketing/covers/cover-1920x1080.png'), coverP = await img('marketing/covers/cover-800x1200.png');
  let n = 0, camX = null;
  const send = async () => {
    const body = JSON.stringify({ n: n++, l: cv.toDataURL('image/png'), p: pc.toDataURL('image/png') });
    await fetch('/frame', { method: 'POST', body });
  };
  // portrait: a 2:3 window of the 16:9 game that follows Chotu
  const portrait = () => {
    const k = cv.width / W, cw = cv.height * 2 / 3;
    const target = Math.max(0, Math.min(cv.width - cw, (G.P.x + G.P.w / 2) * k - cw / 2));
    camX = camX == null ? target : camX + (target - camX) * 0.12;
    px.drawImage(cv, camX, 0, cw, cv.height, 0, 0, pc.width, pc.height);
  };
  for (let i = 0; i < ${COVER_FRAMES}; i++) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(coverL, 0, 0, cv.width, cv.height); ctx.restore();
    px.drawImage(coverP, 0, 0, pc.width, pc.height);
    await send();
  }
  const frame = async () => { update(); draw(); portrait(); await send(); };
  for (const [lv, mode, linger] of __shots) {
    startAt(lv - 1); camX = null;
    Object.assign(G.held, { left: false, right: false, jump: false });
    if (mode === 'naive') {
      while (G.state === 'play') { G.held.right = true; await frame(); }
    } else {
      for (const a of __paths[lv]) {
        const [dir, jump] = ACTIONS[+a];
        for (let f = 0; f < 4 && G.state === 'play'; f++) {
          G.held.left = dir < 0; G.held.right = dir > 0;
          if (jump) press('jump'); else G.held.jump = false;
          await frame();
        }
        if (G.state !== 'play') break;
      }
    }
    Object.assign(G.held, { left: false, right: false, jump: false });
    for (let i = 0; i < linger; i++) await frame();
  }
  await fetch('/done', { method: 'POST' });
})();
`;

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .replace('<script src="js/game.js"></script>', '<script>window.requestAnimationFrame = () => 0;</script><script src="js/game.js"></script><script>' + driver + '</script>');

const types = { '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css', '.webmanifest': 'application/json' };
let chrome, frames = 0;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'POST') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      res.end('ok');
      if (url === '/done') return finish();
      const f = JSON.parse(Buffer.concat(chunks));
      const name = String(f.n).padStart(5, '0') + '.png';
      fs.writeFileSync(path.join(TMP, 'l' + name), Buffer.from(f.l.split(',')[1], 'base64'));
      fs.writeFileSync(path.join(TMP, 'p' + name), Buffer.from(f.p.split(',')[1], 'base64'));
      frames++;
    });
    return;
  }
  if (url === '/' || url === '/record.html') { res.setHeader('content-type', 'text/html'); return res.end(html); }
  if (url === '/sw.js') { res.statusCode = 404; return res.end(); }
  const file = path.join(ROOT, url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

function finish() {
  chrome.kill();
  server.close();
  fs.mkdirSync(OUT, { recursive: true });
  const enc = (prefix, out, size) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(TMP, prefix + '%05d.png'),
    '-vf', 'scale=' + size, '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', out]);
  enc('l', path.join(OUT, 'preview-1920x1080.mp4'), '1920:1080');
  enc('p', path.join(OUT, 'preview-1080x1620.mp4'), '1080:1620');
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`${frames} frames (${(frames / 60).toFixed(1)} s)`);
  console.log(path.join(OUT, 'preview-1920x1080.mp4'));
  console.log(path.join(OUT, 'preview-1080x1620.mp4'));
}

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--window-size=1920,1080', '--force-device-scale-factor=1',
    `--user-data-dir=${path.join(TMP, 'profile')}`, '--lang=en-US', `http://127.0.0.1:${port}/record.html`], { stdio: 'ignore' });
});
