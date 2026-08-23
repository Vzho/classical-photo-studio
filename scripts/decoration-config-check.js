const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const {
  CONFIGURABLE_ICON_NAMES,
  DEFAULT_DECORATION,
  normalizeDecoration
} = require(path.join(ROOT, 'miniprogram/utils/decoration.js'))
const {
  buildThemeStyle,
  getThemePreset
} = require(path.join(ROOT, 'miniprogram/utils/cos.js'))

const COMMERCIAL_SKIN_NAMES = ['oriental-premium', 'editorial-studio', 'luminous-portrait']
const LEGACY_SKIN_NAMES = ['minimal', 'film', 'bridal', 'family', 'oriental', 'luxury']
const SKIN_NAMES = [...COMMERCIAL_SKIN_NAMES, ...LEGACY_SKIN_NAMES]
const THEME_COLOR_FIELDS = [
  'primaryColor',
  'secondaryColor',
  'accentColor',
  'backgroundColor',
  'surfaceColor',
  'surfaceMutedColor',
  'textColor',
  'mutedTextColor',
  'dividerColor',
  'buttonTextColor'
]

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath))
}

function checkNormalization() {
  const normalized = normalizeDecoration({
    navigation: { portfolioText: '案例' },
    icons: {
      navigation: { portfolio: 'camera', about: 'invalid-icon' },
      quickJump: { trigger: 'sparkles' }
    },
    home: {
      sections: [
        { type: 'portfolio', enabled: false, title: '客片', icon: 'heart' },
        { type: 'hero', enabled: true }
      ]
    },
    booking: {
      fields: [
        { id: 'contact', icon: 'message-circle' },
        { id: 'name', icon: 'not-allowed' }
      ]
    }
  })

  assert.strictEqual(normalized.navigation.portfolioText, '案例')
  assert.strictEqual(normalized.navigation.aboutText, DEFAULT_DECORATION.navigation.aboutText)
  assert.strictEqual(normalized.terminology.packageLabel, DEFAULT_DECORATION.terminology.packageLabel)
  assert.deepStrictEqual(normalized.home.sections.slice(0, 2).map(item => item.type), ['portfolio', 'hero'])
  assert.strictEqual(normalized.home.sections[0].enabled, false)
  assert.strictEqual(normalized.home.sections[0].title, '客片')
  assert.strictEqual(normalized.home.sections[0].icon, 'heart')
  assert.strictEqual(normalized.icons.navigation.portfolio, 'camera')
  assert.strictEqual(normalized.icons.navigation.about, DEFAULT_DECORATION.icons.navigation.about)
  assert.strictEqual(normalized.icons.quickJump.trigger, 'sparkles')
  assert.strictEqual(normalized.booking.fields[0].icon, 'message-circle')
  assert.strictEqual(normalized.booking.fields[1].icon, DEFAULT_DECORATION.booking.fields.find(item => item.id === 'name').icon)
  assert.strictEqual(normalized.booking.fields.length, DEFAULT_DECORATION.booking.fields.length)
  assert.strictEqual(normalized.packages.layoutVariant, 'cards')
  assert.strictEqual(normalized.series.galleryVariant, 'immersive')
}

function checkConfig(relativePath, { requireLatest = false } = {}) {
  const config = readJson(relativePath)
  const decoration = normalizeDecoration(config.decoration)
  assert.match(config.configVersion, /^\d+\.\d+\.\d+$/, `${relativePath} must declare configVersion`)
  assert.ok(SKIN_NAMES.includes(config.theme?.preset || 'minimal'), `${relativePath} must use a supported skin`)
  if (requireLatest) {
    assert.strictEqual(config.configVersion, '2.5.0', `${relativePath} must use configVersion 2.5.0`)
    THEME_COLOR_FIELDS.forEach(field => {
      assert.match(config.theme[field], /^#[0-9a-f]{6}$/i, `${relativePath} theme.${field} must be a hex color`)
    })
    assert.ok(config.theme.headingStyle, `${relativePath} theme.headingStyle is required`)
    assert.ok(config.theme.quickJumpStyle, `${relativePath} theme.quickJumpStyle is required`)
  }
  assert.ok(config.decoration, `${relativePath} must include decoration`)
  Object.keys(DEFAULT_DECORATION.terminology).forEach(key => {
    assert.ok(String(decoration.terminology[key] || '').trim(), `${relativePath} terminology.${key} is required`)
  })
  Object.entries(DEFAULT_DECORATION.icons).forEach(([group, defaults]) => {
    Object.keys(defaults).forEach(key => {
      assert.ok(CONFIGURABLE_ICON_NAMES.includes(decoration.icons[group][key]), `${relativePath} decoration.icons.${group}.${key} must be configurable`)
    })
  })

  for (const pageKey of ['home', 'about', 'booking', 'packages', 'packageDetail', 'series', 'success']) {
    const sections = decoration[pageKey].sections
    const expected = DEFAULT_DECORATION[pageKey].sections.map(item => item.type).sort()
    const actual = sections.map(item => item.type).sort()
    assert.deepStrictEqual(actual, expected, `${relativePath} ${pageKey} sections must be complete`)
    assert.strictEqual(new Set(actual).size, actual.length, `${relativePath} ${pageKey} sections must be unique`)
  }

  const fieldIds = decoration.booking.fields.map(item => item.id)
  assert.deepStrictEqual(fieldIds.sort(), DEFAULT_DECORATION.booking.fields.map(item => item.id).sort())
  assert.strictEqual(new Set(fieldIds).size, fieldIds.length, `${relativePath} booking fields must be unique`)
}

function checkCmsIntegration() {
  const html = read('admin/index.html')
  const app = read('admin/app.js')
  const preview = read('admin/preview.css')
  const controlIds = [
    'themeSecondaryColor',
    'themeAccentColor',
    'themeSurfaceColor',
    'themeSurfaceMutedColor',
    'themeMutedTextColor',
    'themeDividerColor',
    'themeButtonTextColor',
    'themeHeadingStyle',
    'themeQuickJumpStyle',
    'skinPresetGrid',
    'skinLivePreview',
    'skinPreviewViewport',
    'skinPreviewBottomNav',
    'skinPreviewQuickJump',
    'navPortfolioText',
    'navAboutText',
    'navBookingText',
    'navStyle',
    'homeHeroVariant',
    'homeGalleryVariant',
    'homeGalleryColumns',
    'homeImageRatio',
    'aboutHeaderVariant',
    'bookingHeaderVariant',
    'bookingFormVariant',
    'packagesLayoutVariant',
    'packageDetailLayoutVariant',
    'seriesGalleryVariant',
    'successLayoutVariant',
    'term-workLabel',
    'term-packageLabel',
    'term-consultationLabel',
    'term-professionalLabel',
    'term-serviceLabel',
    'term-customerServiceLabel',
    'homeDecorationSections',
    'aboutDecorationSections',
    'bookingDecorationSections',
    'packagesDecorationSections',
    'packageDetailDecorationSections',
    'seriesDecorationSections',
    'successDecorationSections',
    'bookingFieldEditor',
    'navigationIconEditor',
    'quickJumpIconEditor',
    'contactIconEditor',
    'iconPickerModal',
    'iconPickerGrid'
  ]

  controlIds.forEach(id => {
    assert.ok(html.includes(`id="${id}"`), `CMS is missing #${id}`)
  })
  assert.ok(html.includes('页面装修'))
  assert.ok(app.includes('normalizeDecorationConfig'))
  assert.ok(app.includes('renderDecorationSectionEditor'))
  assert.ok(app.includes('moveDecorationSection'))
  assert.ok(app.includes('moveBookingField'))
  assert.ok(app.includes('openIconPicker'))
  assert.ok(app.includes('normalizeConfigurableIcon'))
  assert.ok(app.includes('restoreOriginalThemeSettings'))
  assert.ok(app.includes('renderThemePresetCards'))
  assert.ok(app.includes('updateThemePreview'))
  COMMERCIAL_SKIN_NAMES.forEach(name => assert.ok(app.includes(`'${name}'`), `CMS is missing commercial skin ${name}`))
  assert.ok(app.includes('东方高定'))
  assert.ok(app.includes('时尚画册'))
  assert.ok(app.includes('清透客片'))
  assert.ok(app.includes('getSkinPreviewImages'))
  assert.ok(app.includes('renderSkinPreviewHome'))
  assert.ok(app.includes('renderSkinPreviewAbout'))
  assert.ok(app.includes('renderSkinPreviewBooking'))
  assert.ok(app.includes('switchSkinPreviewPage'))
  assert.ok(html.includes('顾客端实时预览'))
  assert.ok(html.includes('preview.css'))
  const variantSource = app.slice(
    app.indexOf('const DECORATION_PRESET_VARIANTS'),
    app.indexOf('const DECORATION_SECTION_NAMES')
  )
  assert.match(variantSource, /'oriental-premium':\s*\{[^}]*homeColumns:\s*1,/s)
  assert.match(variantSource, /'editorial-studio':\s*\{[^}]*homeHero:\s*'editorial',/s)
  assert.match(variantSource, /'luminous-portrait':\s*\{[^}]*homeHero:\s*'compact',/s)
  assert.ok(preview.includes('inset: 0 0 0 46%'), 'editorial preview must use a split hero')
  assert.ok(
    preview.includes('[data-skin="oriental-premium"] .customer-preview-work-grid.columns-1'),
    'oriental preview must support a single-column lookbook'
  )
  assert.match(
    html,
    /\.decoration-modal\s*>\s*\.form-actions\s*\{[^}]*position:\s*static;/,
    'page decoration actions must not cover the customer preview'
  )
  assert.ok(app.includes('portfolioData.configVersion = DEFAULT_V11_CONFIG.configVersion'))
  assert.ok(!app.includes("portfolioData.configVersion = '1.1.0'"))
  assert.ok(!/customCss|自定义\s*CSS/i.test(html), 'CMS must not expose arbitrary CSS editing')

  function getSelectValues(id) {
    const match = html.match(new RegExp(`<select id="${id}"[^>]*>([\\s\\S]*?)<\\/select>`))
    assert.ok(match, `CMS is missing select #${id}`)
    return [...match[1].matchAll(/<option value="([^"]+)"/g)].map(item => item[1])
  }

  assert.deepStrictEqual(getSelectValues('navStyle'), ['line', 'quiet'])
  assert.deepStrictEqual(getSelectValues('themePreset'), SKIN_NAMES)
  assert.deepStrictEqual(getSelectValues('homeHeroVariant'), ['editorial', 'immersive', 'compact'])
  assert.deepStrictEqual(getSelectValues('homeGalleryVariant'), ['editorial', 'masonry', 'cards'])
  assert.deepStrictEqual(getSelectValues('homeImageRatio'), ['portrait', 'natural', 'square'])
  assert.deepStrictEqual(getSelectValues('aboutHeaderVariant'), ['editorial', 'portrait', 'minimal'])
  assert.deepStrictEqual(getSelectValues('bookingHeaderVariant'), ['editorial', 'image', 'compact'])
  assert.deepStrictEqual(getSelectValues('bookingFormVariant'), ['lines', 'soft'])
  assert.deepStrictEqual(getSelectValues('packagesLayoutVariant'), ['cards', 'list'])
  assert.deepStrictEqual(getSelectValues('packageDetailLayoutVariant'), ['editorial', 'compact'])
  assert.deepStrictEqual(getSelectValues('seriesGalleryVariant'), ['immersive', 'framed'])
  assert.deepStrictEqual(getSelectValues('successLayoutVariant'), ['centered', 'compact'])
}

function checkPageIntegration() {
  const pages = ['portfolio', 'about', 'booking']
  pages.forEach(page => {
    const wxml = read(`miniprogram/pages/${page}/${page}.wxml`)
    assert.ok(wxml.includes('wx:for="{{'), `${page} must render configurable sections`)
    assert.ok(wxml.includes('terminology.'), `${page} must use shared terminology`)
  })

  const secondaryPages = ['packages', 'package-detail', 'series', 'success']
  secondaryPages.forEach(page => {
    const wxml = read(`miniprogram/pages/${page}/${page}.wxml`)
    const wxss = read(`miniprogram/pages/${page}/${page}.wxss`)
    assert.ok(wxml.includes('wx:for="{{decoration.sections}}"'), `${page} must render decoration.sections`)
    assert.ok(/(?:layout|gallery)-\{\{decoration\.(?:layoutVariant|galleryVariant)\}\}/.test(wxml), `${page} must apply its visual variant`)
    assert.ok(wxml.includes('theme-{{themePreset}}'), `${page} must apply the shared commercial skin class`)
    assert.ok(!wxml.includes('CMS'), `${page} must not expose CMS wording to customers`)
    assert.ok(!/position\s*:\s*fixed/.test(wxss), `${page} must not add a competing fixed action bar`)
  })

  const appConfig = readJson('miniprogram/app.json')
  assert.strictEqual(appConfig.usingComponents['app-icon'], '/components/app-icon/app-icon')
  assert.strictEqual(appConfig.usingComponents['quick-jump'], '/components/quick-jump/quick-jump')

  const quickJump = read('miniprogram/components/quick-jump/quick-jump.wxml')
  assert.ok(quickJump.includes("open ? 'x' : triggerIcon"))
  assert.ok(quickJump.includes('name="{{bookingIcon}}"'))
  assert.ok(quickJump.includes('name="{{portfolioIcon}}"'))
  assert.ok(quickJump.includes("appearance === 'outline'"))

  ;[...pages, ...secondaryPages].forEach(page => {
    const wxml = read(`miniprogram/pages/${page}/${page}.wxml`)
    assert.ok(wxml.includes('appearance="{{quickJump.appearance}}"'), `${page} must pass the skin appearance to quick-jump`)
  })

  const tabBar = read('miniprogram/custom-tab-bar/index.ts')
  assert.ok(tabBar.includes('icons.navigation.portfolio'))
  assert.ok(tabBar.includes('icons.navigation.about'))
  assert.ok(tabBar.includes('icons.navigation.booking'))

  const skinStyles = read('miniprogram/styles/commercial-skins.wxss')
  const commercialPageRoots = [
    'portfolio-page',
    'about-page',
    'booking-page',
    'packages-page',
    'package-detail-page',
    'series-page',
    'success-page'
  ]
  COMMERCIAL_SKIN_NAMES.forEach(name => {
    assert.ok(skinStyles.includes(`theme-${name}`), `commercial layout stylesheet is missing ${name}`)
    commercialPageRoots.forEach(root => {
      assert.ok(skinStyles.includes(`.${root}.theme-${name}`), `${name} is missing the ${root} layout`)
    })
  })
  assert.ok(skinStyles.includes('margin-left: 46%'), 'editorial mini program must use a split hero')
  assert.ok(skinStyles.includes('theme-oriental-premium.columns-1'), 'oriental mini program must support a single-column lookbook')
  assert.ok(skinStyles.includes('theme-luminous-portrait.hero-compact'), 'luminous mini program must use a compact hero')
  const tabBarStyles = read('miniprogram/custom-tab-bar/index.wxss')
  COMMERCIAL_SKIN_NAMES.forEach(name => {
    assert.ok(tabBarStyles.includes(`.theme-${name}`), `tab bar is missing ${name}`)
  })
  assert.ok(read('miniprogram/app.wxss').startsWith('@import "./styles/commercial-skins.wxss";'))
}

function checkSkinRuntime() {
  assert.strictEqual(getThemePreset({ preset: 'luxury' }), 'luxury')
  COMMERCIAL_SKIN_NAMES.forEach(name => assert.strictEqual(getThemePreset({ preset: name }), name))
  assert.strictEqual(getThemePreset({ preset: 'unknown' }), 'minimal')

  const style = buildThemeStyle({
    preset: 'luxury',
    surfaceColor: '#123456',
    surfaceMutedColor: '#234567',
    mutedTextColor: '#345678',
    dividerColor: '#456789',
    buttonTextColor: '#fefefe',
    headingStyle: 'ornate',
    quickJumpStyle: 'outline'
  })
  assert.ok(style.includes('--surface: #123456'))
  assert.ok(style.includes('--surface-muted: #234567'))
  assert.ok(style.includes('--text-muted: #345678'))
  assert.ok(style.includes('--divider: #456789'))
  assert.ok(style.includes('--button-text: #fefefe'))
  assert.ok(style.includes('--heading-accent-width: 56rpx'))
  assert.ok(style.includes('--quick-jump-trigger-bg: #123456'))
  assert.ok(style.includes('--quick-jump-trigger-shadow: none'))

  const editorialStyle = buildThemeStyle({ preset: 'editorial-studio' })
  assert.ok(editorialStyle.includes('--primary: #111111'))
  assert.ok(editorialStyle.includes('--accent: #D4F238'))
  assert.ok(editorialStyle.includes('--quick-jump-trigger-radius: 2rpx'))
}

function checkIcons() {
  const staticIconNames = new Set()
  const pageRoot = path.join(ROOT, 'miniprogram')

  function walk(folder) {
    fs.readdirSync(folder, { withFileTypes: true }).forEach(entry => {
      const fullPath = path.join(folder, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        return
      }
      if (!entry.name.endsWith('.wxml')) return
      const source = fs.readFileSync(fullPath, 'utf8')
      for (const match of source.matchAll(/<app-icon\s+name="([a-z0-9-]+)"/g)) {
        staticIconNames.add(match[1])
      }
    })
  }

  walk(pageRoot)
  staticIconNames.forEach(name => {
    const iconPath = path.join(ROOT, 'miniprogram/assets/icons', `${name}.svg`)
    assert.ok(fs.existsSync(iconPath), `missing icon: ${name}.svg`)
  })
  DEFAULT_DECORATION.booking.fields.forEach(field => {
    const iconPath = path.join(ROOT, 'miniprogram/assets/icons', `${field.icon}.svg`)
    assert.ok(fs.existsSync(iconPath), `missing booking field icon: ${field.icon}.svg`)
  })
  CONFIGURABLE_ICON_NAMES.forEach(name => {
    const iconPath = path.join(ROOT, 'miniprogram/assets/icons', `${name}.svg`)
    assert.ok(fs.existsSync(iconPath), `missing configurable icon: ${name}.svg`)
  })

  const server = read('admin/server.js')
  assert.ok(server.includes("app.use('/mini-icons'"), 'admin must expose local icon previews')
}

function main() {
  checkNormalization()
  checkConfig('miniprogram/data/portfolio-config.template.json', { requireLatest: true })
  checkConfig('miniprogram/data/portfolio-config.json')
  checkCmsIntegration()
  checkPageIntegration()
  checkIcons()
  checkSkinRuntime()
  console.log('decoration-config-check: PASS')
}

main()
