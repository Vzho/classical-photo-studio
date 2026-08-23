const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const WIDTH = 600
const HEIGHT = 480

function crc32(buffer) {
  let crc = 0xffffffff

  for (const value of buffer) {
    crc ^= value
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)

  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))

  return Buffer.concat([length, typeBuffer, data, crc])
}

function pixelColor(x, y) {
  const border = x < 12 || y < 12 || x >= WIDTH - 12 || y >= HEIGHT - 12
  const frame = x >= 92 && x < WIDTH - 92 && y >= 72 && y < HEIGHT - 72
  const frameEdge = frame && (x < 104 || x >= WIDTH - 104 || y < 84 || y >= HEIGHT - 84)
  const leftAccent = x >= 132 && x < 170 && y >= 125 && y < HEIGHT - 125
  const rightAccent = x >= WIDTH - 170 && x < WIDTH - 132 && y >= 125 && y < HEIGHT - 125

  if (border) return [47, 62, 58, 255]
  if (frameEdge) return [165, 92, 76, 255]
  if (leftAccent) return [91, 130, 112, 255]
  if (rightAccent) return [188, 146, 71, 255]
  if (frame) return [232, 236, 233, 255]
  return [248, 248, 246, 255]
}

const stride = WIDTH * 4 + 1
const raw = Buffer.alloc(stride * HEIGHT)

for (let y = 0; y < HEIGHT; y += 1) {
  const row = y * stride
  raw[row] = 0

  for (let x = 0; x < WIDTH; x += 1) {
    const offset = row + 1 + x * 4
    const color = pixelColor(x, y)
    raw[offset] = color[0]
    raw[offset + 1] = color[1]
    raw[offset + 2] = color[2]
    raw[offset + 3] = color[3]
  }
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(WIDTH, 0)
ihdr.writeUInt32BE(HEIGHT, 4)
ihdr[8] = 8
ihdr[9] = 6

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
])

const target = path.resolve(__dirname, '../miniprogram/assets/share-default.png')
fs.mkdirSync(path.dirname(target), { recursive: true })
fs.writeFileSync(target, png)

console.log(`Generated ${target} (${WIDTH}x${HEIGHT})`)
