const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const serverSource = fs.readFileSync(path.join(ROOT, 'admin/server.js'), 'utf8')
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin/package.json'), 'utf8'))

assert.match(serverSource, /const HOST = process\.env\.HOST \|\| '127\.0\.0\.1'/)
assert.match(serverSource, /app\.listen\(PORT, HOST,/)
assert.doesNotMatch(serverSource, /app\.use\(cors\(\)\)/)
assert.doesNotMatch(serverSource, /express\.static\(path\.join\(__dirname\)\)/)
assert.doesNotMatch(serverSource, /fs\.writeFile\(CONFIG\.projectConfigPath/)
assert.match(serverSource, /fs\.writeFile\(CONFIG\.projectPrivateConfigPath/)
assert.strictEqual(packageJson.dependencies?.cors, undefined)

assert.match(serverSource, /express\.json\(\{ limit: '2mb' \}\)/)
assert.match(serverSource, /fileSize: MAX_UPLOAD_FILE_SIZE/)
assert.match(serverSource, /ALLOWED_IMAGE_MIME_TYPES\.has\(file\.mimetype\)/)

const remoteReadBlock = serverSource.match(/async function readConfigForAdmin\(\) \{[\s\S]*?\n\}/)?.[0] || ''
assert.match(remoteReadBlock, /normalizePortfolioConfig\(remoteConfig\)/)
assert.doesNotMatch(remoteReadBlock, /writeConfig\(remoteConfig\)/)

const writeBlock = serverSource.match(/async function writeConfig\(config\) \{[\s\S]*?\n\}/)?.[0] || ''
assert.match(writeBlock, /if \(hasCosConfig\(\)\)/)
assert.match(writeBlock, /return normalizedConfig/)

const localConfigReads = Array.from(serverSource.matchAll(/await readConfig\(\)/g))
assert.strictEqual(localConfigReads.length, 1, 'only the explicit local fallback may read the tracked config directly')

console.log('admin server safety checks passed')
