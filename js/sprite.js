// Pixel hero, 24x32 grid. Gear upgrades with rank (0 Broke .. 5 Wealthy).
const W = 24, H = 32;
const SKIN = '#f1c49a', SKIN_D = '#d39b72', HAIR = '#3b2414', EYE = '#1a1020';

const OUTFITS = [
  { shirt: '#8d8a7e', shirtD: '#6d6a5f', pants: '#4a4033', shoes: null, patch: '#b0a58c' },          // Broke
  { shirt: '#3a4a8a', shirtD: '#2b376b', pants: '#2b2b3a', shoes: '#e8e8e8', hood: true },          // Hustler
  { shirt: '#e9ecf2', shirtD: '#c3c8d4', pants: '#24263a', shoes: '#2a1a12', tie: '#c8323a' },        // Closer
  { shirt: '#e9ecf2', shirtD: '#c3c8d4', pants: '#1e2238', shoes: '#1a1010', tie: '#2f6bd8', blazer: '#2b3256' }, // Operator
  { shirt: '#f3f3f3', shirtD: '#cfcfcf', pants: '#141414', shoes: '#0c0c0c', tie: '#111', blazer: '#191919', chain: true, cape: '#7a1630' }, // Boss
  { shirt: '#f3f3f3', shirtD: '#cfcfcf', pants: '#1a1236', shoes: '#0c0c0c', tie: '#ffc83d', blazer: '#3b1f6e', chain: true, cape: '#c9961d', crown: true }, // Wealthy
];

export function drawHero(canvas, rank = 0, frame = 0, scale = 8) {
  const o = OUTFITS[Math.max(0, Math.min(5, rank))];
  canvas.width = W * scale; canvas.height = H * scale;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, canvas.width, canvas.height);
  const bob = frame % 2 ? 1 : 0;
  const p = (x, y, w, h, c) => { if (!c) return; g.fillStyle = c; g.fillRect(x * scale, (y + (y < 22 ? bob : 0)) * scale, w * scale, h * scale); };

  // shadow
  g.fillStyle = '#00000055'; g.fillRect(6 * scale, 31 * scale, 12 * scale, scale);

  // cape behind
  if (o.cape) { p(5, 13, 14, 15, o.cape); p(4, 15, 1, 12, o.cape); p(19, 15, 1, 12, o.cape); }

  // legs + shoes
  p(8, 22, 3, 7, o.pants); p(13, 22, 3, 7, o.pants);
  if (o.shoes) { p(7, 29, 4, 2, o.shoes); p(13, 29, 4, 2, o.shoes); }
  else { p(8, 29, 3, 2, SKIN_D); p(13, 29, 3, 2, SKIN_D); }
  if (rank === 0) { p(9, 26, 1, 1, '#2e271e'); p(14, 24, 1, 1, '#2e271e'); } // torn spots

  // torso
  p(7, 13, 10, 9, o.shirt); p(7, 20, 10, 2, o.shirtD);
  if (o.blazer) { p(7, 13, 3, 9, o.blazer); p(14, 13, 3, 9, o.blazer); }
  if (o.tie) { p(11, 13, 2, 1, o.tie); p(11, 14, 2, 5, o.tie); p(11, 19, 2, 1, o.shirtD); }
  if (o.hood) { p(8, 12, 8, 2, o.shirtD); p(10, 16, 4, 2, o.shirtD); }
  if (o.patch) { p(13, 16, 2, 2, o.patch); p(8, 19, 2, 1, o.patch); }
  if (o.chain) { p(9, 14, 1, 1, '#ffd34d'); p(10, 15, 1, 1, '#ffd34d'); p(13, 15, 1, 1, '#ffd34d'); p(14, 14, 1, 1, '#ffd34d'); p(11, 16, 2, 1, '#ffd34d'); }

  // arms
  const arm = o.blazer || o.shirt;
  p(5, 13, 2, 7, arm); p(17, 13, 2, 7, arm);
  p(5, 20, 2, 2, SKIN); p(17, 20, 2, 2, SKIN);

  // head
  p(11, 12, 2, 1, SKIN_D);
  p(8, 4, 8, 8, SKIN);
  p(8, 3, 8, 2, HAIR); p(7, 4, 1, 4, HAIR); p(16, 4, 1, 3, HAIR); p(9, 5, 3, 1, HAIR);
  p(10, 7, 1, 2, EYE); p(13, 7, 1, 2, EYE);
  p(11, 10, 2, 1, rank >= 2 ? '#a0523c' : '#8a5a4a');
  if (rank >= 3) p(10, 10, 1, 1, '#a0523c'); // smirk widens
  if (rank === 0) p(9, 9, 1, 1, '#c9a07c'); // dirt smudge

  // crown
  if (o.crown) { p(8, 1, 8, 2, '#ffc83d'); p(8, 0, 1, 1, '#ffc83d'); p(11, 0, 2, 1, '#ffc83d'); p(15, 0, 1, 1, '#ffc83d'); p(11, 1, 2, 1, '#e8433c'); }

  // hand items
  if (rank === 0) { p(19, 15, 1, 12, '#7a5530'); p(19, 14, 1, 1, '#9b7044'); }              // walking stick
  if (rank === 1) { p(2, 17, 3, 5, '#1d1d24'); p(3, 18, 1, 3, '#46d6c4'); }                  // phone
  if (rank >= 2) { p(18, 21, 5, 4, rank >= 4 ? '#2a1a12' : '#6a3f1f'); p(19, 20, 3, 1, '#333'); if (rank >= 4) p(20, 22, 1, 1, '#ffc83d'); } // briefcase
  if (rank >= 3) { p(1, 16, 4, 3, '#2d2d38'); p(1, 19, 5, 1, '#55556a'); p(2, 17, 2, 1, '#46d6c4'); } // laptop
  if (rank === 5 && frame % 4 < 2) { p(21, 4, 1, 1, '#fff6b0'); p(2, 8, 1, 1, '#fff6b0'); p(20, 11, 1, 1, '#fff6b0'); } // sparkle
}
