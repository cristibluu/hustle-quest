// Renders the rank-5 pixel hero into PNG app icons (no dependencies).
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { drawHero } from '../js/sprite.js';

function hex(c) {
  const m = c.replace('#', '');
  const a = m.length === 8 ? parseInt(m.slice(6), 16) / 255 : 1;
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16), a];
}
function fakeCanvas() {
  const cv = { width: 0, height: 0, px: null };
  const ctx = {
    fillStyle: '#000', imageSmoothingEnabled: false,
    clearRect() { cv.px = new Float32Array(cv.width * cv.height * 4); },
    fillRect(x, y, w, h) {
      const [r, g, b, a] = hex(this.fillStyle);
      for (let j = Math.max(0, y); j < Math.min(cv.height, y + h); j++) for (let i = Math.max(0, x); i < Math.min(cv.width, x + w); i++) {
        const k = (j * cv.width + i) * 4, oa = cv.px[k + 3];
        cv.px[k] = r * a + cv.px[k] * (1 - a); cv.px[k + 1] = g * a + cv.px[k + 1] * (1 - a); cv.px[k + 2] = b * a + cv.px[k + 2] * (1 - a); cv.px[k + 3] = a + oa * (1 - a);
      }
    },
  };
  cv.getContext = () => ctx;
  return cv;
}
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(size) {
  const hero = fakeCanvas();
  const scale = Math.floor(size * 0.6 / 32);
  drawHero(hero, 5, 0, scale);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const ox = Math.floor((size - hero.width) / 2), oy = Math.floor((size - hero.height) / 2);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      // background: deep indigo with a soft gold glow
      const d = Math.hypot(x - size / 2, y - size * 0.45) / (size * 0.5);
      let r = 21 + Math.max(0, 1 - d) * 40, g = 18 + Math.max(0, 1 - d) * 22, b = 42 + Math.max(0, 1 - d) * 50;
      const hx = x - ox, hy = y - oy;
      if (hx >= 0 && hy >= 0 && hx < hero.width && hy < hero.height) {
        const k = (hy * hero.width + hx) * 4, a = hero.px[k + 3];
        r = hero.px[k] * a + r * (1 - a); g = hero.px[k + 1] * a + g * (1 - a); b = hero.px[k + 2] * a + b * (1 - a);
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const s of [192, 512]) writeFileSync(new URL(`../icons/icon-${s}.png`, import.meta.url), png(s));
console.log('icons written');
