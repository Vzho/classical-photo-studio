const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const share = require(path.join(ROOT, 'miniprogram/utils/share.js'))

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function checkTitles() {
  assert.strictEqual(share.buildShareTitle('portfolio', '妆造作品合集'), '妆造作品合集')
  assert.strictEqual(share.buildShareTitle('series', '妆造作品合集', '虞姬'), '虞姬｜妆造作品合集')
  assert.strictEqual(share.buildShareTitle('about', '妆造作品合集'), '妆造师介绍｜妆造作品合集')
  assert.strictEqual(share.buildShareTitle('packages', '妆造作品合集'), '拍摄套餐｜妆造作品合集')
  assert.strictEqual(share.buildShareTitle('package-detail', '妆造作品合集', '基础套餐'), '基础套餐｜妆造作品合集')
  assert.strictEqual(share.buildShareTitle('booking', '妆造作品合集'), '预约咨询｜妆造作品合集')
  assert.strictEqual(share.buildShareTitle('portfolio', ''), '妆造作品合集')
}

function checkImageFormats() {
  assert.strictEqual(share.isSupportedShareImage('https://example.com/a.JPG?x=1'), true)
  assert.strictEqual(share.isSupportedShareImage('https://example.com/a.jpeg'), true)
  assert.strictEqual(share.isSupportedShareImage('/assets/share-default.png'), true)
  assert.strictEqual(share.isSupportedShareImage('https://example.com/a.webp'), false)
  assert.strictEqual(share.isSupportedShareImage('https://example.com/a.gif'), false)
}

async function checkImageFallbackOrder() {
  const requestedUrls = []
  global.wx = {
    downloadFile(options) {
      requestedUrls.push(options.url)
      if (options.url.includes('missing-global.jpg')) {
        options.fail(new Error('not found'))
        return
      }

      options.success({ statusCode: 200, tempFilePath: '/tmp/featured.jpg' })
    }
  }

  try {
    const message = share.createShareMessage({
      pageType: 'portfolio',
      share: {
        title: '妆造作品合集',
        imagePath: 'https://example.com/missing-global.jpg',
        fallbackImageUrl: 'https://example.com/featured.jpg'
      },
      path: '/pages/portfolio/portfolio',
      imagePriority: 'global-first'
    })
    const resolved = await message.promise

    assert.deepStrictEqual(requestedUrls, [
      'https://example.com/missing-global.jpg',
      'https://example.com/featured.jpg'
    ])
    assert.strictEqual(resolved.imageUrl, '/tmp/featured.jpg')
  } finally {
    delete global.wx
  }
}

function checkFallbackImage() {
  const imagePath = path.join(ROOT, 'miniprogram/assets/share-default.png')
  const image = fs.readFileSync(imagePath)
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  assert.ok(image.subarray(0, 8).equals(pngSignature), 'fallback must be a PNG')
  assert.strictEqual(image.readUInt32BE(16), 600, 'fallback width must be 600')
  assert.strictEqual(image.readUInt32BE(20), 480, 'fallback height must be 480')
}

function checkPageIntegration() {
  const pageFiles = [
    'miniprogram/pages/portfolio/portfolio.ts',
    'miniprogram/pages/series/series.ts',
    'miniprogram/pages/about/about.ts',
    'miniprogram/pages/packages/packages.ts',
    'miniprogram/pages/package-detail/package-detail.ts',
    'miniprogram/pages/booking/booking.ts'
  ]

  for (const file of pageFiles) {
    const source = read(file)
    const shareHandlerStart = source.indexOf('onShareAppMessage()')
    assert.ok(shareHandlerStart >= 0, `${file} must define onShareAppMessage`)
    const shareHandler = source.slice(shareHandlerStart, shareHandlerStart + 1200)
    assert.ok(shareHandler.includes('createShareMessage'), `${file} must use createShareMessage`)
    assert.ok(!shareHandler.includes('摄影作品合集'), `${file} must not hard-code the old share title`)
  }
}

function checkCmsIntegration() {
  const html = read('admin/index.html')
  const app = read('admin/app.js')
  const server = read('admin/server.js')

  assert.ok(html.includes('id="homeShareTitle"'), 'CMS must expose the share title')
  assert.ok(html.includes('id="homeShareImagePath"'), 'CMS must expose the share cover path')
  assert.ok(html.includes('aspect-ratio: 5 / 4'), 'CMS preview must use a stable 5:4 ratio')
  assert.ok(app.includes('DEFAULT_SHARE_CONFIG'), 'CMS must normalize share defaults')
  assert.ok(app.includes("apiUrl: '/api'"), 'CMS must call the backend on the current origin')
  assert.ok(!app.includes('http://localhost:8080/api'), 'CMS must not hard-code the backend port')
  assert.ok(server.includes("'share'"), 'server must allow the share folder')
  assert.ok(server.includes('分享封面只支持 JPG 或 PNG'), 'server must reject unsupported share images')
}

function checkDefaultConfigs() {
  const template = JSON.parse(read('miniprogram/data/portfolio-config.template.json'))
  const local = JSON.parse(read('miniprogram/data/portfolio-config.json'))

  assert.strictEqual(template.share.title, '妆造作品合集')
  assert.strictEqual(local.share.title, '妆造作品合集')
  assert.strictEqual(typeof template.share.imagePath, 'string')
  assert.strictEqual(typeof local.share.imagePath, 'string')
}

async function main() {
  checkTitles()
  checkImageFormats()
  await checkImageFallbackOrder()
  checkFallbackImage()
  checkPageIntegration()
  checkCmsIntegration()
  checkDefaultConfigs()

  console.log('share-runtime-check: PASS')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
