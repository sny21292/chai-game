// Builds js/map-data.js (the India map on the menu) from the Survey of India state boundary shapefile.
//
// Source: Survey of India "StateBoundary" download (indiamaps.gov.in/soiapp), mirrored by DataMeet at
//   https://github.com/datameet/maps/tree/master/Survey-of-India-Index-Maps/StateBoundary
// It is in Web Mercator metres, so the projection here is just a linear fit.
//
// usage: node tools/build-map.js <dir containing StateBoundary.shp/.dbf>
//        TOL=1.2 node tools/build-map.js ...   simplification tolerance in map units (map is 1000 units tall)
'use strict';
const fs = require('fs'), path = require('path');

const dir = process.argv[2];
if (!dir) { console.error('usage: node tools/build-map.js <dir with StateBoundary.shp>'); process.exit(1); }
const TOL = +process.env.TOL || 0.9;
const MIN_AREA = 0.6;    // drop islands smaller than this (map units², 1 unit ≈ 2 km); a region always keeps its largest ring

// Source name → [code, display name, kind]. Two source rows can share one code (merged UTs).
const REGIONS = {
  'ANDAMAN & NICOBAR': ['AN', 'Andaman & Nicobar', 'ut'],
  'ANDHRA PRADESH': ['AP', 'Andhra Pradesh', 'state'],
  'ARUNACHAL PRADESH': ['AR', 'Arunachal Pradesh', 'state'],
  'ASSAM': ['AS', 'Assam', 'state'],
  'BIHAR': ['BR', 'Bihar', 'state'],
  'CHANDIGARH': ['CH', 'Chandigarh', 'ut'],
  'CHHATTISGARH': ['CG', 'Chhattisgarh', 'state'],
  'DADAR & NAGAR HAVELI': ['DH', 'Dadra Nagar Haveli aur Daman Diu', 'ut'],
  'DAMAN & DIU': ['DH', 'Dadra Nagar Haveli aur Daman Diu', 'ut'],
  'DELHI': ['DL', 'Delhi', 'ut'],
  'GOA': ['GA', 'Goa', 'state'],
  'GUJARAT': ['GJ', 'Gujarat', 'state'],
  'HARYANA': ['HR', 'Haryana', 'state'],
  'HIMACHAL PRADESH': ['HP', 'Himachal Pradesh', 'state'],
  // The source predates the 2019 split into the J&K and Ladakh UTs, so they share one outline for now.
  'JAMMU & KASHMIR': ['JK', 'Jammu & Kashmir', 'ut'],
  'JHARKHAND': ['JH', 'Jharkhand', 'state'],
  'KARNATAKA': ['KA', 'Karnataka', 'state'],
  'KERALA': ['KL', 'Kerala', 'state'],
  'LAKSHADWEEP': ['LD', 'Lakshadweep', 'ut'],
  'MADHYA PRADESH': ['MP', 'Madhya Pradesh', 'state'],
  'MAHARASHTRA': ['MH', 'Maharashtra', 'state'],
  'MANIPUR': ['MN', 'Manipur', 'state'],
  'MEGHALAYA': ['ML', 'Meghalaya', 'state'],
  'MIZORAM': ['MZ', 'Mizoram', 'state'],
  'NAGALAND': ['NL', 'Nagaland', 'state'],
  'ODISHA': ['OD', 'Odisha', 'state'],
  'PUDUCHERRY': ['PY', 'Puducherry', 'ut'],
  'PUNJAB': ['PB', 'Punjab', 'state'],
  'RAJASTHAN': ['RJ', 'Rajasthan', 'state'],
  'SIKKIM': ['SK', 'Sikkim', 'state'],
  'TAMIL NADU': ['TN', 'Tamil Nadu', 'state'],
  'TELANGANA': ['TG', 'Telangana', 'state'],
  'TRIPURA': ['TR', 'Tripura', 'state'],
  'UTTAR PRADESH': ['UP', 'Uttar Pradesh', 'state'],
  'UTTARAKHAND': ['UK', 'Uttarakhand', 'state'],
  'WEST BENGAL': ['WB', 'West Bengal', 'state'],
};

// ---------- read the shapefile (polygons only) and its dbf ----------
function readDbf(file) {
  const b = fs.readFileSync(file), n = b.readUInt32LE(4), hlen = b.readUInt16LE(8), rlen = b.readUInt16LE(10);
  const fields = [];
  for (let o = 32; b[o] !== 0x0d; o += 32) fields.push({ name: b.toString('latin1', o, o + 11).replace(/\0.*$/, ''), len: b[o + 16] });
  const rows = [];
  for (let i = 0; i < n; i++) {
    let o = hlen + i * rlen + 1;
    const row = {};
    for (const f of fields) { row[f.name] = b.toString('latin1', o, o + f.len).trim(); o += f.len; }
    rows.push(row);
  }
  return rows;
}
function readShp(file) {
  const b = fs.readFileSync(file), shapes = [];
  for (let o = 100; o < b.length;) {
    const len = b.readInt32BE(o + 4) * 2, c = o + 8, type = b.readInt32LE(c);
    if (type !== 5) throw new Error('expected polygons, got shape type ' + type);
    const np = b.readInt32LE(c + 36), npts = b.readInt32LE(c + 40), parts = [];
    for (let i = 0; i < np; i++) parts.push(b.readInt32LE(c + 44 + i * 4));
    const p0 = c + 44 + np * 4, rings = [];
    for (let i = 0; i < np; i++) {
      const ring = [];
      for (let k = parts[i]; k < (parts[i + 1] ?? npts); k++) ring.push([b.readDoubleLE(p0 + k * 16), b.readDoubleLE(p0 + k * 16 + 8)]);
      rings.push(ring);
    }
    shapes.push(rings);
    o = c + len;
  }
  return shapes;
}

// ---------- geometry ----------
const area = r => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return a / 2; };
function centroid(r) {
  let a = 0, x = 0, y = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
    a += f; x += (r[j][0] + r[i][0]) * f; y += (r[j][1] + r[i][1]) * f;
  }
  return [x / (3 * a), y / (3 * a)];
}
function simplify(pts, tol) {               // Douglas-Peucker, iterative
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]], t2 = tol * tol;
  while (stack.length) {
    const [a, z] = stack.pop();
    const [ax, ay] = pts[a], [zx, zy] = pts[z], dx = zx - ax, dy = zy - ay, L2 = dx * dx + dy * dy;
    let best = -1, bd = t2;
    for (let i = a + 1; i < z; i++) {
      const [px, py] = pts[i];
      let t = L2 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
      const ex = ax + t * dx - px, ey = ay + t * dy - py, d = ex * ex + ey * ey;
      if (d > bd) { bd = d; best = i; }
    }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, z]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function simplifyRing(r, tol) {
  // split a closed ring at its farthest point from the start so both halves keep their shape
  let far = 0, fd = -1;
  for (let i = 1; i < r.length; i++) { const d = (r[i][0] - r[0][0]) ** 2 + (r[i][1] - r[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  const out = simplify(r.slice(0, far + 1), tol).concat(simplify(r.slice(far), tol).slice(1));
  return out.length >= 4 ? out : null;
}

// ---------- build ----------
const rows = readDbf(path.join(dir, 'StateBoundary.dbf')), shapes = readShp(path.join(dir, 'StateBoundary.shp'));
let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
for (const s of shapes) for (const r of s) for (const [x, y] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
const k = 1000 / (y1 - y0);                       // map is 1000 units tall, y grows downward
const proj = ([x, y]) => [(x - x0) * k, (y1 - y) * k];

const byCode = {};
rows.forEach((row, i) => {
  const name = row.state || Object.values(row)[0], meta = REGIONS[name];
  if (!meta) throw new Error('unknown region in source: ' + name);
  const [code, label, kind] = meta;
  const g = byCode[code] || (byCode[code] = { code, name: label, kind, rings: [] });
  for (const r of shapes[i]) g.rings.push(r.map(proj));
});

let pts = 0, raw = 0;
let out = Object.values(byCode).sort((a, b) => a.code.localeCompare(b.code)).map(g => {
  const sized = g.rings.map(r => ({ r, a: Math.abs(area(r)) })).sort((a, b) => b.a - a.a);
  const main = sized[0].r;
  const total = sized.reduce((s, x) => s + x.a, 0);
  const rings = [];
  sized.forEach(({ r, a }, i) => {
    raw += r.length;
    if (i > 0 && a < Math.min(MIN_AREA, total / 40)) return;   // tiny island UTs keep their islands
    const s = simplifyRing(r, Math.min(TOL, Math.sqrt(a) / 6)) || (i === 0 ? r.slice(0, 4) : null);
    if (!s) return;
    const flat = [];
    for (const [x, y] of s) flat.push(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
    rings.push(flat);
    pts += s.length;
  });
  let bx = Infinity, by = Infinity, ex = -Infinity, ey = -Infinity;
  for (const r of g.rings) for (const [x, y] of r) { bx = Math.min(bx, x); by = Math.min(by, y); ex = Math.max(ex, x); ey = Math.max(ey, y); }
  const bw = ex - bx, bh = ey - by;
  const [cx, cy] = centroid(main);
  const r1 = v => Math.round(v * 10) / 10;
  return { code: g.code, name: g.name, kind: g.kind, area: Math.round(total), c: [r1(cx), r1(cy)], box: [bx, by, bw, bh].map(r1), rings };
});

// Pins: where a UT's boss marker sits (lon, lat). Others use the centroid of their largest piece.
// Ladakh has no outline of its own in this source, so it is a pin-only region inside the J&K outline.
const R = 6378137, merc = ([lon, lat]) => [R * lon * Math.PI / 180, R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))];
const PINS = { JK: [74.80, 34.08], LA: [77.58, 34.16], AN: [92.73, 11.62], LD: [72.64, 10.57], DL: [77.21, 28.61], CH: [76.78, 30.73], PY: [79.83, 11.93], DH: [73.02, 20.27] };
for (const g of out) if (PINS[g.code]) g.pin = proj(merc(PINS[g.code])).map(v => Math.round(v * 10) / 10);
const la = proj(merc(PINS.LA)).map(v => Math.round(v * 10) / 10);
out.push({ code: 'LA', name: 'Ladakh', kind: 'ut', area: 0, c: la, pin: la, box: [la[0] - 20, la[1] - 20, 40, 40], rings: [] });
out.find(g => g.code === 'JK').name = 'Jammu & Kashmir';

const W = Math.round((x1 - x0) * k * 10) / 10;
const js = `'use strict';
// GENERATED by tools/build-map.js from the Survey of India state boundary data. Do not edit by hand.
// Map units: ${W} wide x 1000 tall, y down (Web Mercator, linear). Each ring is a flat [x,y,x,y,...] list.
// Note: the source predates the 2019 J&K/Ladakh split and the 2020 Dadra Nagar Haveli + Daman Diu merger;
// the merger is applied here, the J&K/Ladakh internal line is not (see .claude/docs/phase-1-india-map.md).
const MAP_W = ${W}, MAP_H = 1000;
const MAP_REGIONS = ${JSON.stringify(out)};
`;
fs.writeFileSync(path.join(__dirname, '..', 'js', 'map-data.js'), js);
console.log(`wrote js/map-data.js: ${out.length} regions, ${pts} points (from ${raw}), ${(js.length / 1024).toFixed(1)} KB, tol ${TOL}`);
