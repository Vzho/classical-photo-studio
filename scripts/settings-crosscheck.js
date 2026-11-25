// 交叉核对：渲染器读取的 settings 键 vs schema 声明的键 vs 模板使用的键
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SHARED = path.join(ROOT, 'shared/decoration')

const registry = JSON.parse(fs.readFileSync(path.join(SHARED, 'registry.json'), 'utf-8'))

// 1. schema 声明的键
const schemaKeys = {}
for (const [type, meta] of Object.entries(registry.blocks)) {
  const s = JSON.parse(fs.readFileSync(path.join(SHARED, meta.settingsSchema), 'utf-8'))
  schemaKeys[type] = Object.keys(s.properties || {})
}

// 2. 渲染器实际读取的键（index.ts / index.js / index.wxml）
const rendererKeys = {}
const BLOCKS_DIR = path.join(ROOT, 'miniprogram/components/v3/blocks')
for (const type of Object.keys(registry.blocks)) {
  const meta = registry.blocks[type]
  const dir = path.join(BLOCKS_DIR, meta.rendererKey.replace('-block', '') + '-block')
  const found = new Set()
  let scanned = false
  for (const f of ['index.ts', 'index.js', 'index.wxml']) {
    const p = path.join(dir, f)
    if (!fs.existsSync(p)) continue
    scanned = true
    const src = fs.readFileSync(p, 'utf-8')
    for (const m of src.matchAll(/settings\??\.([a-zA-Z][a-zA-Z0-9]*)/g)) found.add(m[1])
    for (const m of src.matchAll(/settings\??\?\.\[?'([a-zA-Z][a-zA-Z0-9]*)'\]?/g)) found.add(m[1])
  }
  rendererKeys[type] = { keys: [...found].sort(), scanned }
}

// 3. 模板使用的键
const templatesDir = path.join(SHARED, 'templates')
const templateKeys = {}
for (const entry of fs.readdirSync(templatesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const m = JSON.parse(fs.readFileSync(path.join(templatesDir, entry.name, 'manifest.json'), 'utf-8'))
  const used = {}
  for (const [pk, pv] of Object.entries(m.pages || {})) {
    for (const b of pv.blocks || []) {
      for (const k of Object.keys(b.settings || {})) {
        used[k] = used[k] || []
        used[k].push(`${entry.name}/${pk}/${b.type}`)
      }
    }
  }
  templateKeys[entry.name] = used
}

console.log('='.repeat(78))
console.log('A. schema 声明 vs 渲染器读取')
console.log('='.repeat(78))
for (const type of Object.keys(registry.blocks)) {
  const sk = schemaKeys[type] || []
  const rk = new Set(rendererKeys[type].keys)
  const schemaOnly = sk.filter((k) => !rk.has(k))
  const rendererOnly = rendererKeys[type].keys.filter((k) => !sk.includes(k))
  const tag = rendererOnly.length ? '  <== 渲染器读了但 schema 没声明' : ''
  console.log(`\n[${type}]`)
  console.log(`  schema  : ${sk.join(', ') || '(无)'}`)
  console.log(`  renderer: ${[...rk].join(', ') || '(无)'}`)
  if (schemaOnly.length) console.log(`  schema有但渲染器未读: ${schemaOnly.join(', ')}`)
  if (rendererOnly.length) console.log(`  renderer有但schema缺: ${rendererOnly.join(', ')}${tag}`)
}

console.log('\n' + '='.repeat(78))
console.log('B. 模板使用的键 -> 是否受控')
console.log('='.repeat(78))
const allUncontrolled = new Map()
for (const [tpl, used] of Object.entries(templateKeys)) {
  const lines = []
  for (const [key, where] of Object.entries(used)) {
    const type = where[0].split('/')[2]
    const controlled = (schemaKeys[type] || []).includes(key)
    if (!controlled) {
      allUncontrolled.set(key, (allUncontrolled.get(key) || []).concat(where))
    }
    lines.push(`  ${controlled ? 'OK ' : 'BAD'} ${key.padEnd(22)} [${type}]  x${where.length}`)
  }
  console.log(`\n[${tpl}]`)
  lines.forEach((l) => console.log(l))
}

console.log('\n' + '='.repeat(78))
console.log('C. 未受控键汇总（跨模板）')
console.log('='.repeat(78))
for (const [k, where] of [...allUncontrolled].sort()) {
  const types = [...new Set(where.map((w) => w.split('/')[2]))]
  console.log(`  ${k.padEnd(24)} types=[${types.join(',')}]  refs=${where.length}`)
}
