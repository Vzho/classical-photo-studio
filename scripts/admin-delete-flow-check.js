const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const {
  removePhotoFromConfig,
  removeSeriesFromConfig,
  removeThemeFromConfig,
  reconcileMissingPhotoReferences
} = require(path.join(ROOT, 'admin/portfolio-delete'))

function fixture() {
  return {
    themes: [
      {
        id: 'theme-a',
        series: [
          {
            id: 'series-a',
            title: '作品集 A',
            photos: ['a.jpg', 'shared.jpg'],
            hiddenPhotos: ['a.jpg'],
            homeFeaturedPhotos: ['a.jpg', 'shared.jpg'],
            featuredOnHome: true
          },
          {
            id: 'series-b',
            title: '作品集 B',
            photos: ['shared.jpg', 'missing.jpg'],
            hiddenPhotos: ['missing.jpg'],
            homeFeaturedPhotos: ['shared.jpg', 'missing.jpg'],
            featuredOnHome: true
          }
        ]
      }
    ],
    packages: [
      { id: 'package-a', relatedSeriesIds: ['series-a', 'series-theme-a-series-a', 'series-theme-a-series-b'] }
    ],
    testimonials: [
      { id: 'review-a', relatedSeriesId: 'series-theme-a-series-a' }
    ],
    photographers: [
      { id: 'photographer-a', relatedSeriesIds: ['series-theme-a-series-a', 'series-theme-a-series-b'] }
    ]
  }
}

function checkPhotoDeletion() {
  const original = fixture()
  const result = removePhotoFromConfig(original, {
    themeId: 'theme-a',
    seriesId: 'series-a',
    photoName: 'a.jpg'
  })

  assert.deepStrictEqual(original.themes[0].series[0].photos, ['a.jpg', 'shared.jpg'], 'helper must not mutate the input')
  assert.deepStrictEqual(result.config.themes[0].series[0].photos, ['shared.jpg'])
  assert.strictEqual(result.config.themes[0].series[0].hiddenPhotos, undefined)
  assert.deepStrictEqual(result.config.themes[0].series[0].homeFeaturedPhotos, ['shared.jpg'])
  assert.strictEqual(result.config.themes[0].series[0].featuredOnHome, true)
  assert.deepStrictEqual(result.cosDeleteCandidates, ['a.jpg'])

  const shared = removePhotoFromConfig(original, {
    themeId: 'theme-a',
    seriesId: 'series-a',
    photoName: 'shared.jpg'
  })
  assert.deepStrictEqual(shared.cosDeleteCandidates, [], 'a shared COS object must not be deleted')
}

function checkSeriesDeletion() {
  const result = removeSeriesFromConfig(fixture(), {
    themeId: 'theme-a',
    seriesId: 'series-a'
  })

  assert.deepStrictEqual(result.config.themes[0].series.map(item => item.id), ['series-b'])
  assert.deepStrictEqual(result.cosDeleteCandidates, ['a.jpg'])
  assert.deepStrictEqual(result.config.packages[0].relatedSeriesIds, ['series-theme-a-series-b'])
  assert.strictEqual(result.config.testimonials[0].relatedSeriesId, '')
  assert.deepStrictEqual(result.config.photographers[0].relatedSeriesIds, ['series-theme-a-series-b'])
}

function checkThemeDeletion() {
  const result = removeThemeFromConfig(fixture(), { themeId: 'theme-a' })

  assert.deepStrictEqual(result.config.themes, [])
  assert.deepStrictEqual(result.cosDeleteCandidates.sort(), ['a.jpg', 'missing.jpg', 'shared.jpg'])
  assert.deepStrictEqual(result.config.packages[0].relatedSeriesIds, [])
  assert.strictEqual(result.config.testimonials[0].relatedSeriesId, '')
  assert.deepStrictEqual(result.config.photographers[0].relatedSeriesIds, [])
}

function checkMissingReferenceReconciliation() {
  const result = reconcileMissingPhotoReferences(fixture(), new Set(['a.jpg', 'shared.jpg']))
  const seriesB = result.config.themes[0].series[1]

  assert.strictEqual(result.removedReferenceCount, 1)
  assert.deepStrictEqual(result.removedPhotoNames, ['missing.jpg'])
  assert.deepStrictEqual(seriesB.photos, ['shared.jpg'])
  assert.strictEqual(seriesB.hiddenPhotos, undefined)
  assert.deepStrictEqual(seriesB.homeFeaturedPhotos, ['shared.jpg'])
  assert.strictEqual(seriesB.featuredOnHome, true)
}

function checkIntegration() {
  const app = fs.readFileSync(path.join(ROOT, 'admin/app.js'), 'utf8')
  const server = fs.readFileSync(path.join(ROOT, 'admin/server.js'), 'utf8')
  const html = fs.readFileSync(path.join(ROOT, 'admin/index.html'), 'utf8')

  assert.ok(app.includes('deletePhotoPermanently'), 'CMS must expose permanent photo deletion')
  assert.ok(app.includes('deleteSeriesPermanently'), 'CMS must expose permanent series deletion')
  assert.ok(app.includes('deleteThemePermanently'), 'CMS must expose permanent theme deletion')
  assert.ok(app.includes('reconcileMissingCosPhotos'), 'CMS must expose COS reference reconciliation')
  assert.ok(server.includes("app.delete('/api/portfolio/photo'"), 'server must delete photo config and COS together')
  assert.ok(server.includes("app.delete('/api/portfolio/series'"), 'server must delete series config and COS together')
  assert.ok(server.includes("app.delete('/api/portfolio/theme'"), 'server must delete theme config and COS together')
  assert.ok(server.includes("app.post('/api/photos/reconcile-missing'"), 'server must reconcile manually deleted COS photos')
  assert.ok(html.includes('同步已删除照片'), 'CMS must explain the COS reconciliation action')
}

function main() {
  checkPhotoDeletion()
  checkSeriesDeletion()
  checkThemeDeletion()
  checkMissingReferenceReconciliation()
  checkIntegration()
  console.log('admin-delete-flow-check: PASS')
}

main()
