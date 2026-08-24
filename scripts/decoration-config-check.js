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

const COMMERCIAL_SKIN_NAMES = [
  'oriental-premium',
  'editorial-studio',
  'luminous-portrait',
  'cinematic-story',
  'gallery-monograph'
]
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
      navigationCustom: { portfolio: 'icon/custom-nav.png', about: 'not-an-icon-path.jpg' },
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
  assert.strictEqual(normalized.navigation.packagesText, DEFAULT_DECORATION.navigation.packagesText)
  assert.strictEqual(normalized.navigation.storesText, DEFAULT_DECORATION.navigation.storesText)
  assert.deepStrictEqual(normalized.navigation.items, DEFAULT_DECORATION.navigation.items)
  assert.strictEqual(normalized.terminology.packageLabel, DEFAULT_DECORATION.terminology.packageLabel)
  assert.strictEqual(normalized.home.sections[0].type, 'hero')
  const hiddenPortfolio = normalized.home.sections.find(item => item.type === 'portfolio')
  assert.ok(hiddenPortfolio)
  assert.strictEqual(hiddenPortfolio.enabled, false)
  assert.strictEqual(hiddenPortfolio.title, '客片')
  assert.strictEqual(hiddenPortfolio.icon, 'heart')
  assert.strictEqual(normalized.icons.navigation.portfolio, 'camera')
  assert.strictEqual(normalized.icons.navigation.about, DEFAULT_DECORATION.icons.navigation.about)
  assert.strictEqual(normalized.icons.navigation.packages, DEFAULT_DECORATION.icons.navigation.packages)
  assert.strictEqual(normalized.icons.navigation.stores, DEFAULT_DECORATION.icons.navigation.stores)
  assert.strictEqual(normalized.icons.navigationCustom.portfolio, 'icon/custom-nav.png')
  assert.strictEqual(normalized.icons.navigationCustom.about, '')
  assert.strictEqual(normalized.icons.quickJump.trigger, 'sparkles')
  assert.strictEqual(normalized.booking.fields[0].icon, 'message-circle')
  assert.strictEqual(normalized.booking.fields[1].icon, DEFAULT_DECORATION.booking.fields.find(item => item.id === 'name').icon)
  assert.strictEqual(normalized.booking.fields.length, DEFAULT_DECORATION.booking.fields.length)
  assert.strictEqual(normalized.packages.layoutVariant, 'cards')
  assert.strictEqual(normalized.series.galleryVariant, 'immersive')

  const homeLayout = normalizeDecoration({
    home: {
      template: 'gallery-wall',
      galleryColumns: 4,
      cardContent: 'image-only',
      galleryGap: 'tight'
    }
  }).home
  assert.strictEqual(homeLayout.template, 'gallery-wall')
  assert.strictEqual(homeLayout.galleryColumns, 4)
  assert.strictEqual(homeLayout.cardContent, 'image-only')
  assert.strictEqual(homeLayout.showTitle, false)
  assert.strictEqual(homeLayout.showCategory, false)
  assert.strictEqual(homeLayout.showDescription, false)
  assert.strictEqual(homeLayout.galleryGap, 'tight')

  const customHomeLayout = normalizeDecoration({
    home: {
      galleryVariant: 'horizontal',
      galleryColumns: 3,
      cardContent: 'custom',
      showTitle: true,
      showCategory: false,
      showDescription: true
    }
  }).home
  assert.strictEqual(customHomeLayout.galleryVariant, 'horizontal')
  assert.strictEqual(customHomeLayout.galleryColumns, 3)
  assert.strictEqual(customHomeLayout.cardContent, 'custom')
  assert.strictEqual(customHomeLayout.showTitle, true)
  assert.strictEqual(customHomeLayout.showCategory, false)
  assert.strictEqual(customHomeLayout.showDescription, true)

  const fallbackHomeLayout = normalizeDecoration({
    home: {
      template: 'unknown-template',
      galleryColumns: 8,
      cardContent: 'everything',
      galleryGap: 'none'
    }
  }).home
  assert.strictEqual(fallbackHomeLayout.template, DEFAULT_DECORATION.home.template)
  assert.strictEqual(fallbackHomeLayout.galleryColumns, DEFAULT_DECORATION.home.galleryColumns)
  assert.strictEqual(fallbackHomeLayout.cardContent, DEFAULT_DECORATION.home.cardContent)
  assert.strictEqual(fallbackHomeLayout.galleryGap, DEFAULT_DECORATION.home.galleryGap)

  const customNavigation = normalizeDecoration({
    navigation: {
      items: [
        { key: 'booking', enabled: true },
        { key: 'packages', enabled: true },
        { key: 'about', enabled: false },
        { key: 'portfolio', enabled: false }
      ]
    }
  }).navigation.items
  assert.deepStrictEqual(customNavigation.map(item => item.key), ['booking', 'packages', 'about', 'portfolio', 'stores'])
  assert.strictEqual(customNavigation.filter(item => item.enabled).length, 2)
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
      const value = decoration.icons[group][key]
      if (group === 'navigationCustom') {
        assert.ok(
          value === '' || /^icon\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.png$/i.test(value) || /^https?:\/\//i.test(value),
          `${relativePath} decoration.icons.${group}.${key} must be an empty or valid custom icon path`
        )
      } else {
        assert.ok(CONFIGURABLE_ICON_NAMES.includes(value), `${relativePath} decoration.icons.${group}.${key} must be configurable`)
      }
    })
  })
  assert.strictEqual(decoration.navigation.items.filter(item => item.enabled).length >= 2, true)
  assert.strictEqual(decoration.navigation.items.length, 5)
  assert.strictEqual(new Set(decoration.navigation.items.map(item => item.key)).size, 5)
  assert.ok(['editorial-cover', 'split-catalog', 'gallery-wall', 'service-led'].includes(decoration.home.template))
  assert.ok([1, 2, 3, 4].includes(decoration.home.galleryColumns))
  assert.ok(['full', 'compact', 'image-only'].includes(decoration.home.cardContent))
  assert.ok(['tight', 'standard', 'airy'].includes(decoration.home.galleryGap))

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
  const portfolioWxml = read('miniprogram/pages/portfolio/portfolio.wxml')
  const controlIds = [
    'themeSecondaryColor',
    'themeAccentColor',
    'themePrimaryColorValue',
    'themeSecondaryColorValue',
    'themeAccentColorValue',
    'themeBackgroundColorValue',
    'themeTextColorValue',
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
    'skinPreviewMorePage',
    'skinPreviewPhoneShell',
    'navigationConfigEditor',
    'navStyle',
    'homeTemplate',
    'homeTemplateSummary',
    'homeHeroVariant',
    'homeGalleryVariant',
    'homeGalleryColumns',
    'homeImageRatio',
    'homeCardContent',
    'homeShowTitle',
    'homeShowCategory',
    'homeShowDescription',
    'homeContentVisibilityHint',
    'homeGalleryGap',
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
    'quickJumpIconEditor',
    'contactIconEditor',
    'decorationSaveStatus',
    'decorationStageScroll',
    'decorationPreviousStep',
    'decorationStageProgress',
    'decorationNextStep',
    'decorationCurrentPageName',
    'decorationCurrentPageDescription',
    'decorationMobilePreviewButton',
    'iconPickerModal',
    'iconPickerGrid',
    'customNavigationIconInput'
  ]

  controlIds.forEach(id => {
    assert.ok(html.includes(`id="${id}"`), `CMS is missing #${id}`)
  })
  assert.ok(html.includes('页面装修'))
  assert.ok(html.includes('首页文案与分享'))
  assert.ok(html.includes('标题下方全局说明（可选）'))
  assert.ok(html.includes('未单独填写说明的作品集不会显示这一行'))
  assert.ok(html.includes('首页大图单独说明（可选）'))
  assert.ok(!app.includes('!banner.logoText || !banner.tagText || !banner.description'))
  assert.ok(portfolioWxml.includes('wx:if="{{bannerItem.bannerDescription || homeBanner.description}}"'))
  assert.ok(portfolioWxml.includes('wx:if="{{homeBanner.description}}"'))
  assert.ok(app.includes('normalizeDecorationConfig'))
  assert.ok(app.includes('renderDecorationSectionEditor'))
  assert.ok(app.includes('moveDecorationSection'))
  assert.ok(app.includes('removeDecorationSection'))
  assert.ok(app.includes('addDecorationSection'))
  assert.ok(app.includes('focusDecorationSectionFromPreview'))
  assert.ok(app.includes('bindSkinPreviewSectionNavigation'))
  assert.ok(app.includes('moveBookingField'))
  assert.ok(app.includes('moveNavigationItem'))
  assert.ok(app.includes('toggleNavigationItem'))
  assert.ok(app.includes('renderNavigationEditor'))
  assert.ok(app.includes('navigation-config-card-title'), 'navigation cards must isolate title text from controls')
  assert.ok(app.includes('navigation-config-order-actions'), 'navigation reorder buttons must use a separate action row')
  assert.ok(app.includes('HOME_TEMPLATE_PRESETS'))
  assert.ok(app.includes('applyHomeTemplate'))
  assert.ok(app.includes('reorderHomeSections'))
  assert.ok(app.includes('openIconPicker'))
  assert.ok(app.includes('normalizeConfigurableIcon'))
  assert.ok(app.includes('handleCustomNavigationIconSelected'))
  assert.ok(app.includes('navigationCustom'))
  assert.ok(app.includes('switchDecorationStage'))
  assert.ok(app.includes('goToPreviousDecorationStage'))
  assert.ok(app.includes('goToNextDecorationStage'))
  assert.ok(app.includes('updateDecorationStageNavigation'))
  assert.ok(app.includes('setDecorationSaveState'))
  assert.ok(app.includes('decorationHasUnsavedChanges'))
  assert.ok(app.includes('restoreOriginalThemeSettings'))
  assert.ok(app.includes('renderThemePresetCards'))
  assert.ok(app.includes('updateThemePreview'))
  assert.ok(app.includes('syncThemeColorOutputs'))
  assert.ok(app.includes('toggleDecorationMobilePreview'))
  assert.ok(app.includes('adminInitializationPromise'))
  assert.ok(app.includes('decoration-row-details'))
  assert.ok(app.includes('decorationChangeRegistry'))
  assert.ok(app.includes('updateDecorationChangeSummary'))
  assert.ok(app.includes('applyPendingDecorationPreviewFeedback'))
  assert.ok(app.includes('data-preview-section'))
  assert.ok(app.includes('data-preview-field'))
  COMMERCIAL_SKIN_NAMES.forEach(name => assert.ok(app.includes(`'${name}'`), `CMS is missing commercial skin ${name}`))
  assert.ok(app.includes('东方高定'))
  assert.ok(app.includes('时尚画册'))
  assert.ok(app.includes('清透客片'))
  assert.ok(app.includes('电影叙事'))
  assert.ok(app.includes('影像艺廊'))
  assert.ok(app.includes('getSkinPreviewImages'))
  assert.ok(app.includes('renderSkinPreviewHome'))
  assert.ok(app.includes('renderSkinPreviewAbout'))
  assert.ok(app.includes('renderSkinPreviewBooking'))
  assert.ok(app.includes('renderSkinPreviewPackages'))
  assert.ok(app.includes('renderSkinPreviewPackageDetail'))
  assert.ok(app.includes('renderSkinPreviewSeries'))
  assert.ok(app.includes('renderSkinPreviewSuccess'))
  assert.ok(app.includes('switchSkinPreviewPage'))
  ;['packages', 'packageDetail', 'series', 'success'].forEach(page => {
    assert.ok(app.includes(`activeSkinPreviewPage === '${page}'`), `CMS preview is missing ${page}`)
  })
  assert.ok(html.includes('顾客端实时预览'))
  ;['editorial-cover', 'split-catalog', 'gallery-wall', 'service-led'].forEach(template => {
    assert.ok(html.includes(`data-home-template="${template}"`), `CMS is missing home template ${template}`)
    assert.ok(preview.includes(`data-template="${template}"`), `preview is missing home template ${template}`)
  })
  assert.ok(html.includes('预览更多页面'))
  assert.ok(html.includes('常用门店文字模板'))
  assert.ok(html.includes('data-terminology-preset="photography"'))
  assert.ok(html.includes('data-terminology-preset="styling"'))
  assert.ok(html.includes('data-terminology-preset="experience"'))
  assert.ok(html.includes('rel="icon" href="/mini-icons/camera.svg"'))
  assert.ok(app.includes('applyTerminologyPreset'))
  assert.ok(app.includes('updateTerminologyPresetState'))
  assert.ok(app.includes('function updateSkinPreviewScale'))
  assert.ok(app.includes('new ResizeObserver(updateSkinPreviewScale)'))
  assert.ok(html.includes('customer-preview-native-navbar'), 'preview must render native navigation for non-custom pages')
  assert.ok(app.includes('PREVIEW_SYSTEM_ICON_NAMES'), 'preview must preserve internal system icons')
  assert.ok(app.includes('CUSTOM_NAVIGATION_PREVIEW_PAGES'), 'preview must distinguish custom navigation pages')
  assert.ok(app.includes('preview.dataset.navigationMode'), 'preview must expose the active navigation mode')
  assert.ok(
    app.includes("event.target.closest('.customer-preview-page-tabs')"),
    'preview page controls must not be consumed by decoration form listeners'
  )
  assert.ok(
    preview.includes('[data-navigation-mode="custom"] .customer-preview-statusbar'),
    'custom-navigation preview must overlay the status bar on page content'
  )
  assert.ok(preview.includes('width: 393px'), 'preview device width must match a modern WeChat device')
  assert.ok(preview.includes('height: 852px'), 'preview device height must match a modern WeChat device')
  ;['appearance', 'copy', 'navigation', 'pages'].forEach(stage => {
    assert.ok(html.includes(`data-decoration-stage="${stage}"`), `CMS is missing stage tab ${stage}`)
    assert.ok(html.includes(`data-decoration-stage-panel="${stage}"`), `CMS is missing stage panel ${stage}`)
    assert.ok(html.includes(`data-decoration-change-count="${stage}"`), `CMS is missing change count ${stage}`)
  })
  assert.ok(html.includes('装修步骤'))
  assert.ok(html.includes('主要页面'))
  assert.ok(html.includes('更多页面'))
  assert.ok(html.includes('preview.css'))
  const variantSource = app.slice(
    app.indexOf('const DECORATION_PRESET_VARIANTS'),
    app.indexOf('const DECORATION_SECTION_NAMES')
  )
  assert.match(variantSource, /'oriental-premium':\s*\{[^}]*homeColumns:\s*1,/s)
  assert.match(variantSource, /'editorial-studio':\s*\{[^}]*homeHero:\s*'editorial',/s)
  assert.match(variantSource, /'luminous-portrait':\s*\{[^}]*homeHero:\s*'compact',/s)
  assert.match(variantSource, /'cinematic-story':\s*\{[^}]*homeHero:\s*'immersive',/s)
  assert.match(variantSource, /'gallery-monograph':\s*\{[^}]*homeRatio:\s*'square',/s)
  assert.ok(preview.includes('left: 45%'), 'editorial preview must use the balanced split hero')
  assert.ok(preview.includes('height: calc(100% - 82px)'), 'luminous preview must use a photo-print caption band')
  assert.ok(preview.includes('writing-mode: vertical-rl'), 'oriental preview must use vertical brand typography')
  assert.ok(preview.includes('data-skin="cinematic-story"'), 'cinematic preview must have a dedicated layout')
  assert.ok(preview.includes('data-skin="gallery-monograph"'), 'gallery preview must have a dedicated layout')
  assert.match(preview, /data-skin="cinematic-story"\] \.customer-preview-hero::before,/s)
  assert.match(preview, /data-skin="gallery-monograph"\] \.customer-preview-profile\s*\{[^}]*grid-template-columns:\s*56% 44%;/s)
  assert.match(preview, /data-skin="oriental-premium"\] \.customer-preview-notice\s*\{[^}]*background:\s*var\(--preview-secondary\)/s)
  assert.ok(preview.includes('customer-preview-feedback-pulse'), 'preview must highlight changed areas')
  assert.ok(html.includes('decoration-editor-feedback-pulse'), 'editor must highlight changed controls')
  assert.ok(
    preview.includes('[data-skin="oriental-premium"] .customer-preview-work-grid.columns-1'),
    'oriental preview must support a single-column lookbook'
  )
  assert.match(
    html,
    /\.decoration-modal\s*>\s*\.form-actions\s*\{[^}]*position:\s*static;/,
    'page decoration actions must not cover the customer preview'
  )
  assert.match(
    html,
    /\.navigation-config-card-head\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s,
    'navigation card headers must stack identity and controls when space is tight'
  )
  assert.match(
    html,
    /\.navigation-config-card-title strong\s*\{[^}]*white-space:\s*nowrap;[^}]*text-overflow:\s*ellipsis;/s,
    'navigation card titles must not overlap controls'
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
  assert.deepStrictEqual(getSelectValues('homeGalleryVariant'), ['editorial', 'masonry', 'cards', 'horizontal', 'mixed'])
  assert.deepStrictEqual(getSelectValues('homeGalleryColumns'), ['1', '2', '3', '4'])
  assert.deepStrictEqual(getSelectValues('homeImageRatio'), ['portrait', 'natural', 'square'])
  assert.deepStrictEqual(getSelectValues('homeCardContent'), ['full', 'compact', 'image-only', 'custom'])
  assert.deepStrictEqual(getSelectValues('homeGalleryGap'), ['tight', 'standard', 'airy'])
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

  const portfolioWxml = read('miniprogram/pages/portfolio/portfolio.wxml')
  const portfolioWxss = read('miniprogram/pages/portfolio/portfolio.wxss')
  assert.ok(portfolioWxml.includes('homeDecoration.showTitle'))
  assert.ok(portfolioWxml.includes('homeDecoration.showCategory'))
  assert.ok(portfolioWxml.includes('homeDecoration.showDescription'))
  assert.ok(portfolioWxml.includes('homeShortcuts'))
  assert.ok(portfolioWxml.includes('home-section-schedule'))
  assert.ok(portfolioWxml.includes('home-section-testimonials'))
  assert.ok(portfolioWxss.includes('.portfolio-page.gallery-horizontal'))
  assert.ok(portfolioWxss.includes('.portfolio-page.gallery-mixed'))

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
  assert.deepStrictEqual(
    appConfig.tabBar.list.map(item => item.pagePath),
    ['pages/portfolio/portfolio', 'pages/about/about', 'pages/packages/packages', 'pages/booking/booking', 'pages/stores/stores']
  )

  const storesWxml = read('miniprogram/pages/stores/stores.wxml')
  assert.ok(storesWxml.includes('openStoreLocation'))
  assert.ok(storesWxml.includes('callStorePhone'))
  assert.ok(storesWxml.includes('appearance="{{quickJump.appearance}}"'))

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
  assert.ok(tabBar.includes('navigation.items'))
  assert.ok(tabBar.includes('NAVIGATION_PAGES'))
  assert.ok(tabBar.includes('syncSelected'))
  assert.ok(tabBar.includes('icons.navigation[item.key]'))
  assert.ok(tabBar.includes('icons.navigationCustom[item.key]'))
  assert.ok(read('miniprogram/custom-tab-bar/index.wxml').includes('src="{{item.customIcon}}"'))
  const appIcon = read('miniprogram/components/app-icon/app-icon.wxml')
  assert.ok(appIcon.includes('wx:if="{{src || name}}"'), 'empty configurable icons must not request /assets/icons/.svg')
  assert.ok(appIcon.includes("src ? src : '/assets/icons/' + name + '.svg'"))

  const skinStyles = read('miniprogram/styles/commercial-skins.wxss')
  const portfolioStyles = read('miniprogram/pages/portfolio/portfolio.wxss')
  const portfolioMarkup = read('miniprogram/pages/portfolio/portfolio.wxml')
  assert.ok(portfolioMarkup.includes('template-{{homeDecoration.template}}'))
  assert.ok(portfolioMarkup.includes('content-{{homeDecoration.cardContent}}'))
  assert.ok(portfolioMarkup.includes('gap-{{homeDecoration.galleryGap}}'))
  ;['editorial-cover', 'split-catalog', 'gallery-wall', 'service-led'].forEach(template => {
    assert.ok(portfolioStyles.includes(`.template-${template}`), `mini program is missing home template ${template}`)
  })
  assert.ok(portfolioStyles.includes('.columns-3 .portfolio-grid'))
  assert.ok(portfolioStyles.includes('.columns-4 .portfolio-grid'))
  assert.ok(
    !/\.[A-Za-z0-9_-]+\s+\*(?:\s*[,{}])/.test(skinStyles),
    'commercial skins must not use descendant universal selectors unsupported by WXSS'
  )
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
  assert.ok(skinStyles.includes('left: 45%'), 'editorial mini program must use the balanced split hero')
  assert.ok(skinStyles.includes('right: 55%'), 'editorial title column must leave enough room for Chinese titles')
  assert.ok(skinStyles.includes('height: calc(100% - 164rpx)'), 'luminous mini program must use a photo-print caption band')
  assert.ok(skinStyles.includes('.portfolio-page.theme-luminous-portrait .hero-meta {\n  position: static;'), 'luminous caption metadata must not overlap the title')
  assert.ok(skinStyles.includes('writing-mode: vertical-rl'), 'oriental mini program must use vertical brand typography')
  assert.ok(skinStyles.includes('theme-oriental-premium.columns-1'), 'oriental mini program must support a single-column lookbook')
  assert.ok(skinStyles.includes('theme-luminous-portrait.hero-compact'), 'luminous mini program must use a compact hero')
  assert.ok(skinStyles.includes('theme-cinematic-story .hero-section::before'), 'cinematic mini program must use widescreen framing')
  assert.ok(skinStyles.includes('theme-gallery-monograph .item-index'), 'gallery mini program must show work numbering')
  const tabBarStyles = read('miniprogram/custom-tab-bar/index.wxss')
  COMMERCIAL_SKIN_NAMES.forEach(name => {
    assert.ok(tabBarStyles.includes(`.theme-${name}`), `tab bar is missing ${name}`)
  })
  assert.ok(
    tabBarStyles.includes('height: calc(var(--tab-bar-height, 108rpx) + env(safe-area-inset-bottom));'),
    'tab bar must add the safe area outside its 108rpx content height'
  )
  assert.ok(read('miniprogram/app.wxss').startsWith('@import "./styles/commercial-skins.wxss";'))
  const previewStyles = read('admin/preview.css')
  assert.ok(previewStyles.includes('.customer-preview-phone[data-skin="gallery-monograph"] .customer-preview-quick-trigger .customer-preview-icon'))
  assert.ok(previewStyles.includes('filter: none;'), 'gallery preview quick-jump icon must remain visible on a light button')
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
  assert.ok(editorialStyle.includes('--primary: #101010'))
  assert.ok(editorialStyle.includes('--secondary: #2D4BFF'))
  assert.ok(editorialStyle.includes('--accent: #D9FF3F'))
  assert.ok(editorialStyle.includes('--quick-jump-trigger-radius: 2rpx'))

  const orientalStyle = buildThemeStyle({ preset: 'oriental-premium' })
  assert.ok(orientalStyle.includes('--primary: #8A302B'))
  assert.ok(orientalStyle.includes('--secondary: #142C27'))
  assert.ok(orientalStyle.includes('--accent: #C6A96B'))

  const luminousStyle = buildThemeStyle({ preset: 'luminous-portrait' })
  assert.ok(luminousStyle.includes('--primary: #3F6658'))
  assert.ok(luminousStyle.includes('--secondary: #B66F7D'))
  assert.ok(luminousStyle.includes('--accent: #8CB7C1'))

  const cinematicStyle = buildThemeStyle({ preset: 'cinematic-story' })
  assert.ok(cinematicStyle.includes('--primary: #A63D40'))
  assert.ok(cinematicStyle.includes('--secondary: #17302B'))
  assert.ok(cinematicStyle.includes('--accent: #E2C86F'))
  assert.ok(cinematicStyle.includes('--quick-jump-trigger-radius: 2rpx'))

  const galleryStyle = buildThemeStyle({ preset: 'gallery-monograph' })
  assert.ok(galleryStyle.includes('--primary: #C53B32'))
  assert.ok(galleryStyle.includes('--secondary: #244D46'))
  assert.ok(galleryStyle.includes('--accent: #91A9C6'))
  assert.ok(galleryStyle.includes('--quick-jump-trigger-radius: 0'))
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
  assert.ok(server.includes("'icon'"), 'admin must allow custom icon uploads')
  assert.ok(server.includes('512 * 1024'), 'admin must limit custom icon upload size')
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
