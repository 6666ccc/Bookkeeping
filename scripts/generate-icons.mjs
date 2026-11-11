import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const BACKGROUND = [30, 75, 58]
const FOREGROUND = [241, 243, 236]

// ¥ 由五段等宽圆头笔画组成，坐标按 0–1 归一化
const STROKES = [
  [0.5, 0.38, 0.5, 0.84, 0.075],
  [0.5, 0.38, 0.255, 0.17, 0.075],
  [0.5, 0.38, 0.745, 0.17, 0.075],
  [0.29, 0.52, 0.71, 0.52, 0.062],
  [0.29, 0.64, 0.71, 0.64, 0.062],
]

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, crc])
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function insideRoundedSquare(x, y, radius) {
  const dx = Math.max(radius - x, 0, x - (1 - radius))
  const dy = Math.max(radius - y, 0, y - (1 - radius))
  return Math.hypot(dx, dy) <= radius
}

function distanceToStroke(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1
  const vy = y2 - y1
  const t = Math.max(
    0,
    Math.min(1, ((px - x1) * vx + (py - y1) * vy) / (vx * vx + vy * vy)),
  )
  return Math.hypot(px - (x1 + t * vx), py - (y1 + t * vy))
}

function isGlyph(x, y) {
  return STROKES.some(
    ([x1, y1, x2, y2, width]) => distanceToStroke(x, y, x1, y1, x2, y2) <= width / 2,
  )
}

function render(size, { maskable = false } = {}) {
  const samples = 4
  const data = Buffer.alloc(size * size * 4)
  const radius = 0.2

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let covered = 0
      let glyph = 0

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = (x + (sx + 0.5) / samples) / size
          const py = (y + (sy + 0.5) / samples) / size
          if (!maskable && !insideRoundedSquare(px, py, radius)) continue
          covered += 1
          if (isGlyph(px, py)) glyph += 1
        }
      }

      const alpha = covered / (samples * samples)
      const mix = covered > 0 ? glyph / covered : 0
      const offset = (y * size + x) * 4
      data[offset] = Math.round(BACKGROUND[0] + (FOREGROUND[0] - BACKGROUND[0]) * mix)
      data[offset + 1] = Math.round(BACKGROUND[1] + (FOREGROUND[1] - BACKGROUND[1]) * mix)
      data[offset + 2] = Math.round(BACKGROUND[2] + (FOREGROUND[2] - BACKGROUND[2]) * mix)
      data[offset + 3] = Math.round(alpha * 255)
    }
  }

  return encodePng(size, size, data)
}

const files = [
  ['icon-32.png', render(32)],
  ['icon-192.png', render(192)],
  ['icon-512.png', render(512)],
  ['icon-maskable-512.png', render(512, { maskable: true })],
  ['apple-touch-icon.png', render(180, { maskable: true })],
]

for (const [name, buffer] of files) {
  writeFileSync(join(outDir, name), buffer)
  console.log(`wrote ${name} (${buffer.length} bytes)`)
}
