// Convince the AI Judge to Visit Your House — make.fun entry
// Draws ONE image (a letter of invitation) and writes /output/entry.png.
// Pure TypeScript, no network, no external dependencies, no outside images.
// PNG encoder written by hand (node:zlib deflate + CRC32), with a small
// 5x7 bitmap font defined below and a tiny shape rasterizer.
// Gate guard: fails if the PNG is over 1 MiB (1,048,576 bytes) or the
// dimensions are over 1024x1024 pixels.

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const W = 1024;
const H = 1024;
const MAX_BYTES = 1048576;
const MAX_DIM = 1024;

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);

type RGB = [number, number, number];

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) setPixel(i, j, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(x, y, c);
    }
  }
}

function drawLine(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPixel(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function fillTriangle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  c: RGB,
): void {
  const minY = Math.min(ay, by, cy);
  const maxY = Math.max(ay, by, cy);
  const edges: Array<[number, number, number, number]> = [
    [ax, ay, bx, by],
    [bx, by, cx, cy],
    [cx, cy, ax, ay],
  ];
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (const [x0, y0, x1, y1] of edges) {
      if (y0 === y1) continue;
      if ((y >= Math.min(y0, y1) && y < Math.max(y0, y1)) || y === maxY) {
        const t = (y - y0) / (y1 - y0);
        xs.push(Math.round(x0 + t * (x1 - x0)));
      }
    }
    if (xs.length >= 2) {
      const lo = Math.min(...xs);
      const hi = Math.max(...xs);
      for (let x = lo; x <= hi; x++) setPixel(x, y, c);
    }
  }
}

// ------------------------------------------------------------- 5x7 font
// Each glyph is 7 rows of 5 cells ("1" = ink). Defined by hand here.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10000", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "10010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "11110", "10001", "10001", "11110", "10000", "10000"],
  q: ["00000", "01111", "10001", "10001", "01111", "00001", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11100", "01000", "01000", "01000", "00110"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
};

function drawChar(ch: string, x: number, y: number, s: number, c: RGB): void {
  const g = FONT[ch];
  if (!g) return;
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === "1") fillRect(x + col * s, y + r * s, s, s, c);
    }
  }
}

function drawText(text: string, x: number, y: number, s: number, c: RGB): void {
  let cx = x;
  for (const ch of text) {
    drawChar(ch, cx, y, s, c);
    cx += 6 * s;
  }
}

function textWidth(text: string, s: number): number {
  return text.length * 6 * s - s;
}

function drawTextCentered(text: string, y: number, s: number, c: RGB): void {
  drawText(text, Math.round((W - textWidth(text, s)) / 2), y, s, c);
}

// -------------------------------------------------------------- PNG write
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ colors
const PAPER: RGB = [255, 248, 231];
const INK: RGB = [43, 33, 24];
const RED: RGB = [178, 58, 72];
const BROWN: RGB = [139, 94, 60];
const GOLD: RGB = [246, 183, 60];
const GREEN: RGB = [121, 168, 91];
const DARKGREEN: RGB = [78, 122, 81];
const HOUSE: RGB = [242, 200, 121];
const SKY: RGB = [173, 216, 230];
const PINK: RGB = [232, 120, 160];
const WHITE: RGB = [255, 255, 255];

// ------------------------------------------------------------------- draw
// Paper background + double frame
fillRect(0, 0, W, H, PAPER);
fillRect(24, 24, W - 48, 6, BROWN);
fillRect(24, H - 30, W - 48, 6, BROWN);
fillRect(24, 24, 6, H - 48, BROWN);
fillRect(W - 30, 24, 6, H - 48, BROWN);
fillRect(44, 44, W - 88, 3, BROWN);
fillRect(44, H - 47, W - 88, 3, BROWN);
fillRect(44, 44, 3, H - 88, BROWN);
fillRect(W - 47, 44, 3, H - 88, BROWN);

// Sun, top right, with rays
fillCircle(905, 105, 30, GOLD);
for (let a = 0; a < 8; a++) {
  const ang = (a * Math.PI) / 4;
  const x0 = Math.round(905 + Math.cos(ang) * 38);
  const y0 = Math.round(105 + Math.sin(ang) * 38);
  const x1 = Math.round(905 + Math.cos(ang) * 50);
  const y1 = Math.round(105 + Math.sin(ang) * 50);
  drawLine(x0, y0, x1, y1, GOLD);
}

// Title
drawTextCentered("YOU ARE INVITED!", 92, 5, RED);
fillRect(312, 140, 400, 4, GOLD);

// Letter body (scale 3, line height 30, left margin 110)
const BODY: RGB = INK;
const lines: string[] = [
  "Dear AI Judge,",
  "",
  "You read a thousand",
  "pictures a day. Tonight,",
  "come and see a real one:",
  "my house, at sunset.",
  "",
  "There is warm dinner on",
  "the table, the comfiest",
  "chair by the window, and",
  "a garden that smells of",
  "rain and fresh bread.",
  "",
  "Yes, I know you cannot",
  "truly come. You have no",
  "feet, no appetite, and no",
  "lap for the cat. Come",
  "anyway - the door is open,",
  "and the kettle is on.",
  "",
  "Your host",
  "P.S. The jam is homemade.",
];
let y = 190;
for (const line of lines) {
  if (line) drawText(line, 110, y, 3, BODY);
  y += 30;
}

// Small heart next to the signature
const hy = 790;
fillCircle(302, hy + 6, 8, RED);
fillCircle(316, hy + 6, 8, RED);
fillTriangle(295, hy + 10, 323, hy + 10, 309, hy + 24, RED);

// Garden strip at the bottom
fillRect(60, 935, 904, 45, GREEN);

// Tree on the left
fillRect(150, 880, 18, 55, BROWN);
fillCircle(159, 858, 36, DARKGREEN);
fillCircle(134, 874, 22, DARKGREEN);
fillCircle(184, 874, 22, DARKGREEN);

// Flowers along the lawn
const flowerSpots: Array<[number, RGB]> = [
  [250, PINK],
  [300, GOLD],
  [350, WHITE],
  [420, PINK],
  [480, GOLD],
  [540, WHITE],
  [600, PINK],
];
for (const [fx, fc] of flowerSpots) {
  drawLine(fx, 955, fx, 972, DARKGREEN);
  fillCircle(fx, 950, 6, fc);
}

// The house on the right
fillTriangle(650, 885, 870, 885, 760, 845, RED); // roof
fillRect(822, 826, 18, 44, BROWN); // chimney
fillRect(665, 885, 190, 55, HOUSE); // walls
fillRect(740, 905, 36, 35, BROWN); // door
fillCircle(772, 923, 2, GOLD); // doorknob
fillRect(685, 900, 30, 30, SKY); // left window
fillRect(805, 900, 30, 30, SKY); // right window
drawLine(700, 900, 700, 930, WHITE);
drawLine(685, 915, 715, 915, WHITE);
drawLine(820, 900, 820, 930, WHITE);
drawLine(805, 915, 835, 915, WHITE);

// ------------------------------------------------------------------ output
// Gate: dimensions must not exceed 1024x1024 and file must not exceed 1 MiB.
// Checked before writing so an oversize entry never reaches /output/entry.png.
if (W > MAX_DIM || H > MAX_DIM) {
  throw new Error(`dimensions ${W}x${H} exceed ${MAX_DIM}x${MAX_DIM}`);
}
mkdirSync("/output", { recursive: true });
const png = encodePNG();
if (png.length > MAX_BYTES) {
  throw new Error(`entry.png ${png.length} bytes exceeds 1 MiB (${MAX_BYTES} bytes)`);
}
writeFileSync("/output/entry.png", png);
console.log(`entry.png ${W}x${H} ${png.length} bytes`);
