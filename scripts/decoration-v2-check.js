const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const FRAMEWORK_IDS = [
  'cinematic-gallery',
  'editorial-journal',
  'atelier-conversion'
]
const PAGE_ROOTS = [
  'miniprogram/pages/portfolio/portfolio.wxml',
  'miniprogram/pages/about/about.wxml',
  'miniprogram/pages/booking/booking.wxml',
  'miniprogram/pages/gallery/gallery.wxml',
  'miniprogram/pages/packages/packages.wxml',
  'miniprogram/pages/package-detail/package-detail.wxml',
  'miniprogram/pages/series/series.wxml',
  'miniprogram/pages/stores/stores.wxml',
  'miniprogram/pages/success/success.wxml'
]

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath))
}

function checkFrameworkRegistry() {
  const runtime = read('miniprogram/utils/decoration.ts')
  const admin = read('admin/app.js')
  const html = read('admin/index.html')
  const preview = read('admin/preview.css')
  const wxss = read('miniprogram/styles/decoration-frameworks.wxss')

  FRAMEWORK_IDS.forEach(id => {
    assert.ok(runtime.includes(`'${id}'`), `mini-program runtime is missing ${id}`)
    assert.ok(admin.includes(`'${id}'`), `admin framework registry is missing ${id}`)
    assert.ok(html.includes(`data-framework="${id}"`), `admin selector is missing ${id}`)
    assert.ok(preview.includes(`data-framework="${id}"`), `admin preview is missing ${id}`)
    assert.ok(wxss.includes(`framework-${id}`), `mini-program styles are missing ${id}`)
  })

  ;[
    'frameworkId',
    'mediaHeroFocalPoint',
    'mediaGalleryFocalPoint',
    'mediaHeroOverlay',
    'frameworkSectionRhythm',
    'frameworkMotion'
  ].forEach(id => {
    assert.ok(html.includes(`id="${id}"`), `admin is missing #${id}`)
  })

  assert.ok(admin.includes('schemaVersion = 3'), 'admin must persist schema version 3')
  assert.ok(admin.includes("source.siteTemplate === 'dark-gallery'"), 'admin must migrate the legacy dark template')
  assert.ok(
    admin.includes("document.querySelectorAll('.framework-card[data-framework]')"),
    'framework selection must only target framework buttons'
  )
  assert.ok(
    admin.includes('Object.assign(decorationEditorState.navigation, preset.navigationLabels)'),
    'framework switching must apply deterministic navigation labels'
  )
  assert.ok(runtime.includes("input.siteTemplate === 'dark-gallery'"), 'runtime must migrate the legacy dark template')
}

function checkRuntimeWiring() {
  PAGE_ROOTS.forEach(relativePath => {
    const wxml = read(relativePath)
    assert.ok(wxml.includes('decorationClass'), `${relativePath} is missing decorationClass`)
    assert.ok(wxml.includes('decorationStyle'), `${relativePath} is missing decorationStyle`)
  })

  const tabBar = read('miniprogram/custom-tab-bar/index.wxml')
  assert.ok(tabBar.includes('decorationClass'), 'custom tab bar is missing framework class')
  assert.ok(
    read('miniprogram/app.wxss').includes('@import "./styles/decoration-frameworks.wxss";'),
    'app.wxss must import decoration framework styles'
  )
}

function checkConfigMigrationContract() {
  ;[
    'miniprogram/data/portfolio-config.json',
    'miniprogram/data/portfolio-config.template.json'
  ].forEach(relativePath => {
    const config = readJson(relativePath)
    const decoration = config.decoration
    assert.strictEqual(decoration.schemaVersion, 3, `${relativePath} must use decoration schema v3`)
    assert.ok(decoration.pages && decoration.pages.home && decoration.pages.gallery, `${relativePath} must include V3 pages`)
    assert.ok(
      ['legacy-classic', ...FRAMEWORK_IDS].includes(decoration.framework.id),
      `${relativePath} has an unsupported framework`
    )
    assert.ok(['none', 'subtle'].includes(decoration.framework.motion), `${relativePath} has invalid motion`)
    assert.ok(['tight', 'balanced', 'airy'].includes(decoration.framework.sectionRhythm), `${relativePath} has invalid rhythm`)
    assert.ok(['center', 'top', 'bottom', 'left', 'right'].includes(decoration.media.heroFocalPoint), `${relativePath} has invalid hero focal point`)
    assert.ok(['center', 'top', 'bottom', 'left', 'right'].includes(decoration.media.galleryFocalPoint), `${relativePath} has invalid gallery focal point`)
    assert.ok(['light', 'balanced', 'strong'].includes(decoration.media.heroOverlay), `${relativePath} has invalid hero overlay`)
  })

  const {
    getDecorationRuntime,
    normalizeDecoration
  } = require(path.join(ROOT, 'miniprogram/utils/decoration.js'))
  const migratedDark = normalizeDecoration({ siteTemplate: 'dark-gallery' })
  assert.strictEqual(migratedDark.schemaVersion, 3)
  assert.strictEqual(migratedDark.framework.id, 'cinematic-gallery')
  assert.strictEqual(migratedDark.siteTemplate, 'dark-gallery')

  const migratedClassic = normalizeDecoration({
    framework: { id: 'editorial-journal', motion: 'subtle', sectionRhythm: 'airy' }
  })
  assert.strictEqual(migratedClassic.siteTemplate, 'classic')
  const runtime = getDecorationRuntime(migratedClassic)
  assert.ok(runtime.className.includes('framework-editorial-journal'))
  assert.ok(runtime.className.includes('rhythm-airy'))
  assert.ok(runtime.style.includes('--hero-object-position'))
}

checkFrameworkRegistry()
checkRuntimeWiring()
checkConfigMigrationContract()

console.log('Decoration V2 compatibility checks passed on V3 runtime.')
