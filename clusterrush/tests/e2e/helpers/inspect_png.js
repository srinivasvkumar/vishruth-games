#!/usr/bin/env node
/**
 * Minimal PNG pixel inspector (no deps): decodes a PNG with zlib and prints
 * average RGB for a list of viewport rectangles so we can read the canvas UI
 * without the vision service.
 *
 * Usage: node inspect_png.js <file.png> x1 y1 x2 y2 [x1 y1 x2 y2 ...]
 */
const fs = require('fs');
const zlib = require('zlib');

function parsePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const chunks = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
    }
    if (type === 'IDAT') chunks.push(data);
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (!channels || bitDepth !== 8) throw new Error(`unsupported bitDepth=${bitDepth} colorType=${colorType}`);
  const stride = width * channels + 1;
  const out = Buffer.alloc(width * height * channels);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const row = raw.subarray(pos, pos + width * channels);
    pos += width * channels;
    for (let x = 0; x < width * channels; x++) {
      const a = x >= channels ? out[y * stride2() + x - channels] : 0; // left
      const b = y > 0 ? out[(y - 1) * stride2() + x] : 0;            // up
      const c = x >= channels && y > 0 ? out[(y - 1) * stride2() + x - channels] : 0;
      const d = x + channels < width * channels && y > 0 ? out[(y - 1) * stride2() + x + channels] : 0;
      let v;
      switch (filter) {
        case 0: v = row[x]; break;
        case 1: v = row[x] + a; break;
        case 2: v = row[x] + b; break;
        case 3: v = row[x] + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          v = row[x] + pr;
          break;
        }
        default: throw new Error('bad filter ' + filter);
      }
      out[y * stride2() + x] = v & 0xff;
    }
  }
  function stride2() { return width * channels; }
  return { width, height, channels, data: out };
}

function rectAvg(img, x1, y1, x2, y2) {
  const { width, height, channels, data } = img;
  const x1c = Math.max(0, x1), x2c = Math.min(width - 1, x2);
  const y1c = Math.max(0, y1), y2c = Math.min(height - 1, y2);
  if (x2c <= x1c || y2c <= y1c) return { r: 0, g: 0, b: 0, n: 0 };
  let r = 0, g = 0, b = 0, n = 0;
  // sample every 4th pixel for speed
  for (let y = y1c; y <= y2c; y += 2) {
    for (let x = x1c; x <= x2c; x += 2) {
      const i = (y * width + x) * channels;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
  }
  if (!n) return { r: 0, g: 0, b: 0, n: 0 };
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n), n };
}

const file = process.argv[2];
const args = process.argv.slice(3);
const img = parsePng(fs.readFileSync(file));
console.log(`# ${file} ${img.width}x${img.height} channels=${img.channels}`);
for (let i = 0; i < args.length; i += 4) {
  const [x1, y1, x2, y2] = args.slice(i, i + 4).map(Number);
  const a = rectAvg(img, x1, y1, x2, y2);
  console.log(`rect(${x1},${y1},${x2},${y2}) = rgb(${a.r},${a.g},${a.b}) [samples=${a.n}]`);
}
