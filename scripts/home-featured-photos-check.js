const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const ROOT = path.resolve(__dirname, '..')
const appSource = fs.readFileSync(path.join(ROOT, 'admin/app.js'), 'utf8')
const adminHtml = fs.readFileSync(path.join(ROOT, 'admin/index.html'), 'utf8')
const serverSource = fs.readFileSync(path.join(ROOT, 'admin/server.js'), 'utf8')
const cosTs = fs.readFileSync(path.join(ROOT, 'miniprogram/utils/cos.ts'), 'utf8')
const cosJs = fs.readFileSync(path.join(ROOT, 'miniprogram/utils/cos.js'), 'utf8')
const portfolioTs = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/portfolio/portfolio.ts'), 'utf8')
const portfolioJs = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/portfolio/portfolio.js'), 'utf8')

const context = {
  console,
  setTimeout,
  clearTimeout,
  window: { addEventListener() {} }
}

vm.createContext(context)
vm.runInContext(appSource, context)

assert.strictEqual(typeof context.getHomeFeaturedPhotos, 'function')
assert.strictEqual(typeof context.setPhotoFeaturedOnHome, 'function')

const legacySeries = {
  photos: ['cover.jpg', 'detail.jpg'],
  hiddenPhotos: [],
  featuredOnHome: true
}
assert.deepStrictEqual(Array.from(context.getHomeFeaturedPhotos(legacySeries)), ['cover.jpg'])

context.setPhotoFeaturedOnHome(legacySeries, 'detail.jpg', true)
assert.deepStrictEqual(Array.from(legacySeries.homeFeaturedPhotos), ['cover.jpg', 'detail.jpg'])
assert.strictEqual(legacySeries.featuredOnHome, true)

context.setPhotoFeaturedOnHome(legacySeries, 'cover.jpg', false)
assert.deepStrictEqual(Array.from(legacySeries.homeFeaturedPhotos), ['detail.jpg'])

const explicitSeries = {
  photos: ['one.jpg', 'two.jpg', 'three.jpg'],
  hiddenPhotos: ['two.jpg'],
  homeFeaturedPhotos: ['two.jpg', 'three.jpg', 'missing.jpg', 'three.jpg'],
  featuredOnHome: true
}
assert.deepStrictEqual(Array.from(context.getHomeFeaturedPhotos(explicitSeries)), ['three.jpg'])

assert.ok(appSource.includes('首页精选照片'))
assert.ok(appSource.includes('点击照片左上角星标选择'))
assert.ok(adminHtml.includes('.photo-feature-action'))
assert.ok(appSource.includes('togglePhotoFeatured'))
assert.ok(appSource.includes('maxHomeFeaturedPhotos: 12'))
assert.ok(appSource.includes('getSkinPreviewFeaturedItems'))
assert.ok(!adminHtml.includes('id="seriesFeaturedOnHome"'))
assert.ok(!adminHtml.includes('id="editSeriesFeaturedOnHome"'))
assert.ok(serverSource.includes('Array.isArray(series?.homeFeaturedPhotos)'))

for (const source of [cosTs, cosJs]) {
  assert.ok(source.includes('homeFeaturedPhotos'))
  assert.ok(source.includes('homeFeaturedItems'))
  assert.ok(source.includes('homePhotoSort'))
  assert.ok(source.includes('photos.slice(0, 1)'))
}

for (const source of [portfolioTs, portfolioJs]) {
  assert.ok(source.includes('homeFeaturedItems'))
  assert.ok(source.includes('selectedHomePhotos'))
  assert.ok(source.includes('.slice(0, 12)'))
}

console.log('home-featured-photos-check: PASS')
