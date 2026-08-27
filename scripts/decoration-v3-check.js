const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PAGE_KEYS = [
  'home',
  'gallery',
  'series',
  'about',
  'packages',
  'packageDetail',
  'booking',
  'stores',
  'success'
]

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

const runtime = require(path.join(ROOT, 'miniprogram/utils/decoration.js'))
const {
  DEFAULT_DECORATION,
  PAGE_SKELETON_REGISTRY,
  REPEATABLE_MODULE_TYPES,
  applyPageSkeleton,
  createDecorationModule,
  normalizeDecoration,
  validateNavigationLabels
} = runtime

function checkV2Migration() {
  const migrated = normalizeDecoration({
    schemaVersion: 2,
    home: {
      template: 'gallery-wall',
      sections: [
        { id: 'portfolio', type: 'portfolio', enabled: true, title: '本周精选', icon: 'sparkles', variant: 'masonry' },
        { id: 'hero', type: 'hero', enabled: false, title: '品牌首图' }
      ]
    },
    navigation: {
      portfolioText: '首页',
      aboutText: '品牌',
      bookingText: '预约'
    }
  })

  assert.strictEqual(migrated.schemaVersion, 3)
  assert.strictEqual(migrated.pages.home.skeleton, 'wall')
  assert.deepStrictEqual(migrated.pages.home.modules.slice(0, 2).map(item => item.type), ['portfolio', 'hero'])
  assert.strictEqual(migrated.pages.home.modules[0].content.title, '本周精选')
  assert.strictEqual(migrated.pages.home.modules[0].content.icon, 'sparkles')
  assert.strictEqual(migrated.pages.home.modules[1].enabled, false)
  assert.ok(migrated.pages.home.modules.every(item => item.id.startsWith('legacy-home-')))
  assert.strictEqual(migrated.home.sections[0].title, '本周精选')
}

function checkV3AuthorityAndFallback() {
  const custom = normalizeDecoration({
    schemaVersion: 3,
    pages: {
      home: {
        skeleton: 'editorial',
        modules: [
          createDecorationModule('home', 'portfolio', {
            id: 'module-kept',
            content: { title: '只保留作品' }
          })
        ]
      }
    }
  })

  assert.deepStrictEqual(custom.pages.home.modules.map(item => item.type), ['portfolio'])
  assert.strictEqual(custom.pages.home.modules[0].id, 'module-kept')
  assert.strictEqual(custom.pages.home.modules[0].content.title, '只保留作品')
  PAGE_KEYS.forEach(pageKey => {
    assert.ok(custom.pages[pageKey], `${pageKey} page must exist`)
    assert.ok(custom.pages[pageKey].modules.some(item => item.enabled), `${pageKey} must have one enabled module`)
  })
  assert.strictEqual(custom.pages.about.modules.length, 1, 'missing V3 pages must use only the minimum safe module')
  assert.strictEqual(custom.pages.about.modules[0].type, PAGE_SKELETON_REGISTRY.about['portrait-story'].minimumModule)

  const damaged = normalizeDecoration({
    schemaVersion: 3,
    pages: {
      about: { skeleton: 'portrait-story', modules: [{ nope: true }] }
    }
  })
  assert.strictEqual(damaged.pages.about.modules.length, 1)
  assert.strictEqual(damaged.pages.about.modules[0].type, PAGE_SKELETON_REGISTRY.about['portrait-story'].minimumModule)
}

function checkModuleContract() {
  const first = createDecorationModule('home', 'gallery')
  const second = createDecorationModule('home', 'gallery')
  assert.notStrictEqual(first.id, second.id)
  assert.ok(REPEATABLE_MODULE_TYPES.includes('gallery'))

  const normalized = normalizeDecoration({
    schemaVersion: 3,
    pages: {
      home: {
        skeleton: 'full-image',
        modules: [
          {
            id: 'hero-a',
            type: 'hero',
            enabled: true,
            variant: 'immersive',
            content: { title: '封面' },
            layout: { columns: 4, mode: 'grid', ratio: '16:9', gap: 'tight', showText: true },
            source: { mode: 'photos', seriesIds: ['series-1'], photos: [{ seriesId: 'series-1', photoName: 'one.jpg' }] },
            media: { ratio: '4:5', overlay: 99, brightness: -99, focusX: 140, focusY: -20 }
          }
        ]
      }
    }
  }).pages.home.modules[0]

  assert.strictEqual(normalized.layout.columns, 4)
  assert.strictEqual(normalized.layout.showText, false)
  assert.strictEqual(normalized.media.focusX, 100)
  assert.strictEqual(normalized.media.focusY, 0)
  assert.strictEqual(normalized.media.overlay, 80)
  assert.strictEqual(normalized.media.brightness, -40)
  assert.deepStrictEqual(normalized.source.photos, [{ seriesId: 'series-1', photoName: 'one.jpg' }])
  assert.ok(!JSON.stringify(normalized.source).includes('q-sign-'))

  const duplicateTypes = normalizeDecoration({
    schemaVersion: 3,
    pages: {
      home: {
        skeleton: 'full-image',
        modules: [
          createDecorationModule('home', 'hero', { id: 'hero-one' }),
          createDecorationModule('home', 'hero', { id: 'hero-two' }),
          createDecorationModule('home', 'richText', { id: 'copy-one' }),
          createDecorationModule('home', 'richText', { id: 'copy-two' })
        ]
      }
    }
  }).pages.home.modules
  assert.strictEqual(duplicateTypes.filter(item => item.type === 'hero').length, 1, 'unique business modules must be deduplicated')
  assert.strictEqual(duplicateTypes.filter(item => item.type === 'richText').length, 2, 'repeatable modules must remain repeatable')
}

function checkSkeletonSwitch() {
  const before = normalizeDecoration({
    schemaVersion: 3,
    pages: {
      home: {
        skeleton: 'full-image',
        modules: [
          createDecorationModule('home', 'gallery', { id: 'custom-gallery', content: { title: '指定客片' } }),
          createDecorationModule('home', 'richText', { id: 'custom-copy', content: { title: '品牌故事' } })
        ]
      }
    }
  })
  const switched = applyPageSkeleton(before.pages.home, 'home', 'conversion')
  assert.strictEqual(switched.skeleton, 'conversion')
  assert.strictEqual(switched.modules.find(item => item.id === 'custom-gallery').content.title, '指定客片')
  assert.ok(switched.modules.some(item => item.id === 'custom-copy'))
  PAGE_SKELETON_REGISTRY.home.conversion.recommendedModules.forEach(type => {
    assert.ok(switched.modules.some(item => item.type === type), `conversion skeleton must include ${type}`)
  })
}

function checkSkeletonRegistry() {
  const expected = {
    home: ['full-image', 'editorial', 'wall', 'conversion'],
    gallery: ['top-categories', 'sidebar', 'immersive'],
    series: ['cinematic-story', 'continuous', 'editorial-album'],
    about: ['portrait-story', 'brand-studio', 'store-service'],
    packages: ['premium-cards', 'price-catalog', 'comparison'],
    packageDetail: ['editorial-detail', 'compact-conversion'],
    booking: ['form-first', 'package-guided', 'minimal-contact'],
    stores: ['location-list', 'studio-profile'],
    success: ['centered-result', 'compact-contact']
  }
  Object.entries(expected).forEach(([pageKey, skeletons]) => {
    assert.deepStrictEqual(Object.keys(PAGE_SKELETON_REGISTRY[pageKey]), skeletons)
  })
}

function checkNavigationValidation() {
  assert.deepStrictEqual(validateNavigationLabels({ portfolioText: '作品首页', bookingText: '预约咨询' }), [])
  const errors = validateNavigationLabels({ portfolioText: '这是超过六个字的首页名称' })
  assert.strictEqual(errors.length, 1)
  assert.ok(errors[0].includes('最多 6 个中文字符'))

  const navigation = normalizeDecoration({
    schemaVersion: 3,
    navigation: {
      items: [
        { key: 'portfolio', enabled: true },
        { key: 'gallery', enabled: true },
        { key: 'about', enabled: true },
        { key: 'packages', enabled: true },
        { key: 'booking', enabled: true },
        { key: 'stores', enabled: true }
      ]
    }
  }).navigation.items
  assert.strictEqual(navigation.filter(item => item.enabled).length, 5)
  assert.strictEqual(navigation.find(item => item.key === 'stores').enabled, false)

  const twoItems = normalizeDecoration({
    schemaVersion: 3,
    navigation: {
      items: [
        { key: 'portfolio', enabled: true },
        { key: 'booking', enabled: true },
        { key: 'about', enabled: false }
      ]
    }
  }).navigation.items
  assert.strictEqual(twoItems.filter(item => item.enabled).length, 2)
}

function checkAdminWorkbench() {
  const app = read('admin/app.js')
  const html = read('admin/index.html')
  const css = read('admin/workbench.css')
  ;[
    'PAGE_SKELETON_REGISTRY',
    'applyDecorationSkeleton',
    'renderDecorationModuleTree',
    'renderDecorationModuleInspector',
    'duplicateDecorationModule',
    'deleteDecorationModule',
    'updateDecorationModuleFocus',
    'validateDecorationBeforeSave'
  ].forEach(token => assert.ok(app.includes(token), `admin is missing ${token}`))
  ;[
    'decorationPageSelect',
    'decorationFrameworkSelect',
    'decorationSkeletonSelect',
    'decorationModuleTree',
    'decorationModuleInspector',
    'decorationPreviewDrawerButton'
  ].forEach(id => assert.ok(html.includes(`id="${id}"`), `admin is missing #${id}`))
  assert.ok(css.includes('--decoration-editor-width: 70%'))
  assert.ok(css.includes('@media (max-width: 1100px)'))
  assert.ok(app.includes('55') && app.includes('82'), 'splitter must enforce 55/45 to 82/18 limits')
}

function checkConfigFixtures() {
  for (const relativePath of [
    'miniprogram/data/portfolio-config.json',
    'miniprogram/data/portfolio-config.template.json'
  ]) {
    const config = JSON.parse(read(relativePath))
    assert.strictEqual(config.decoration.schemaVersion, 3, `${relativePath} must be V3`)
    PAGE_KEYS.forEach(pageKey => assert.ok(config.decoration.pages[pageKey]))
    assert.ok(!JSON.stringify(config.decoration.pages).includes('q-sign-'), `${relativePath} must not persist signed URLs`)
  }
}

function checkCustomerRuntimeBindings() {
  const pageFiles = {
    home: 'portfolio',
    gallery: 'gallery',
    series: 'series',
    about: 'about',
    packages: 'packages',
    packageDetail: 'package-detail',
    booking: 'booking',
    stores: 'stores',
    success: 'success'
  }

  Object.entries(pageFiles).forEach(([pageKey, folder]) => {
    const json = JSON.parse(read(`miniprogram/pages/${folder}/${folder}.json`))
    const wxml = read(`miniprogram/pages/${folder}/${folder}.wxml`)
    assert.ok(json.usingComponents?.['decoration-block'], `${pageKey} must register decoration-block`)
    assert.ok(wxml.includes('skeleton-{{'), `${pageKey} must render its selected skeleton`)
    assert.ok(wxml.includes('decoration-block'), `${pageKey} must render repeatable modules`)
  })

  const component = read('miniprogram/components/decoration-block/decoration-block.wxml')
  const componentRuntime = read('miniprogram/components/decoration-block/decoration-block.ts')
  const componentStyle = read('miniprogram/components/decoration-block/decoration-block.wxss')
  ;['richText', 'image', 'gallery', 'action', 'divider', 'spacer'].forEach(type => {
    assert.ok(component.includes(`module.type === '${type}'`), `repeatable component must support ${type}`)
  })
  ;['1-1', '3-4', '4-5', '16-9'].forEach(ratio => {
    assert.ok(componentStyle.includes(`ratio-${ratio}`), `repeatable component must support ${ratio}`)
  })
  assert.ok(component.includes("module.layout.mode === 'horizontal'"))
  assert.ok(componentRuntime.includes('navigateToSitePage(pageKey as NavigationItemKey)'), 'module actions must use the shared tab-aware router')

  const cosRuntime = read('miniprogram/utils/cos.ts')
  assert.ok(cosRuntime.includes("`${item.seriesId || ''}\\u0000${item.photoName || ''}`"))
  assert.ok(cosRuntime.includes('resolveDecorationModuleRuntime'))

  const adminRuntime = read('admin/app.js')
  assert.ok(!adminRuntime.includes('return choices.slice(0, 80)'), 'the photo picker must not hide photos after the first 80')
  assert.ok(adminRuntime.includes('loading="lazy"'), 'the complete photo picker must lazy-load thumbnails')

  const about = read('miniprogram/pages/about/about.wxml')
  const series = read('miniprogram/pages/series/series.wxml')
  const seriesRuntime = read('miniprogram/pages/series/series.ts')
  const homeRuntime = read('miniprogram/pages/portfolio/portfolio.ts')
  const booking = read('miniprogram/pages/booking/booking.wxml')
  const stores = read('miniprogram/pages/stores/stores.wxml')
  const gallery = read('miniprogram/pages/gallery/gallery.wxml')
  const galleryStyle = read('miniprogram/pages/gallery/gallery.wxss')
  const seriesStyle = read('miniprogram/pages/series/series.wxss')
  assert.ok(about.includes('wx:for="{{aboutSections}}"'), 'dark about page must follow the module tree')
  assert.ok(series.includes('wx:for="{{decoration.sections}}"'), 'dark series page must follow the module tree')
  assert.ok(seriesRuntime.includes('navigateToSitePage(pageKey as NavigationItemKey)'), 'series actions must use the shared tab-aware router')
  assert.ok(homeRuntime.includes('configuredHeroItems'), 'the home hero must honor its selected photo source')
  assert.ok(booking.includes("section.source.mode !== 'auto' && section.resolvedItems.length"), 'the booking hero must honor selected photos')
  assert.ok(stores.includes("moduleItem.source.mode !== 'auto' && moduleItem.resolvedItems.length"), 'the stores hero must honor selected photos')
  assert.ok(gallery.includes('class="gallery-content {{moduleItem.layoutClass}}"'), 'gallery layout classes must match preview/runtime classes')
  assert.ok(galleryStyle.includes('.gallery-content.columns-4 .gallery-grid'), 'gallery must support four columns')
  assert.ok(series.includes('hideFirstGalleryPhoto'), 'independent hero and gallery sources must not drop the first gallery photo')
  assert.ok(seriesStyle.includes('.dark-series-images.columns-4'), 'dark series galleries must support four columns')
}

checkV2Migration()
checkV3AuthorityAndFallback()
checkModuleContract()
checkSkeletonSwitch()
checkSkeletonRegistry()
checkNavigationValidation()
checkAdminWorkbench()
checkConfigFixtures()
checkCustomerRuntimeBindings()

console.log('Decoration V3 contract checks passed.')
