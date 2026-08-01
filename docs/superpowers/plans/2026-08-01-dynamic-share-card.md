# Dynamic WeChat Share Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CMS-editable WeChat share titles and covers, automatic page-aware titles, content-aware images, and a reliable local 5:4 fallback image.

**Architecture:** Extend the existing COS configuration payload with normalized `share` data returned by every page loader. A focused `utils/share.ts` module owns title composition, image candidate ordering, network download, timeout, and package fallback; pages only provide context. The existing CMS home modal edits the global values and uploads JPG/PNG assets to a restricted `share/` COS folder.

**Tech Stack:** WeChat Mini Program TypeScript, WeChat `onShareAppMessage` Promise API, Node.js/Express, browser JavaScript CMS, Tencent COS, Node built-in `zlib` test asset generator.

**Working-tree note:** The current checkout contains pre-existing uncommitted edits in several target files. Preserve them. Before any commit, inspect the exact staged diff; if a feature-only commit cannot be isolated without including existing work, leave implementation changes uncommitted.

---

### Task 1: Add executable share behavior checks and package fallback asset

**Files:**
- Create: `scripts/generate-share-fallback.js`
- Create: `scripts/share-runtime-check.js`
- Create (generated): `miniprogram/assets/share-default.png`

- [ ] **Step 1: Add the fallback image generator**

Create a dependency-free Node script that writes a valid 600x480 PNG. The PNG must use filter byte `0` per row, a light neutral background, a restrained border, and no customer photo or text. Implement PNG chunks and CRC32 directly so source-package generation is reproducible:

```js
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
  if (border) return [126, 104, 89, 255]
  if (frameEdge) return [196, 174, 158, 255]
  if (frame) return [232, 223, 215, 255]
  return [248, 246, 243, 255]
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
```

- [ ] **Step 2: Generate the fallback image**

Run:

```powershell
node scripts/generate-share-fallback.js
```

Expected: `miniprogram/assets/share-default.png` exists and its IHDR reports 600x480.

- [ ] **Step 3: Add the failing runtime check**

Create `scripts/share-runtime-check.js`. It must require the compiled `miniprogram/utils/share.js`, assert all title mappings, verify extension handling with uppercase paths and query strings, inspect fallback PNG dimensions, and scan the six TypeScript pages for direct hard-coded `摄影作品合集` inside their share handlers:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const share = require('../miniprogram/utils/share.js')

assert.strictEqual(share.buildShareTitle('portfolio', '妆造作品合集'), '妆造作品合集')
assert.strictEqual(share.buildShareTitle('series', '妆造作品合集', '虞姬'), '虞姬｜妆造作品合集')
assert.strictEqual(share.buildShareTitle('about', '妆造作品合集'), '妆造师介绍｜妆造作品合集')
assert.strictEqual(share.buildShareTitle('packages', '妆造作品合集'), '拍摄套餐｜妆造作品合集')
assert.strictEqual(share.buildShareTitle('package-detail', '妆造作品合集', '基础套餐'), '基础套餐｜妆造作品合集')
assert.strictEqual(share.buildShareTitle('booking', '妆造作品合集'), '预约咨询｜妆造作品合集')
assert.strictEqual(share.isSupportedShareImage('https://example.com/a.JPG?x=1'), true)
assert.strictEqual(share.isSupportedShareImage('https://example.com/a.webp'), false)
```

- [ ] **Step 4: Run the check to verify it fails**

Run:

```powershell
Set-Location miniprogram
npm run compile
Set-Location ..
node scripts/share-runtime-check.js
```

Expected: FAIL because `miniprogram/utils/share.js` does not exist.

---

### Task 2: Normalize share configuration and implement the common share module

**Files:**
- Modify: `miniprogram/utils/cos.ts`
- Create: `miniprogram/utils/share.ts`

- [ ] **Step 1: Define normalized share configuration in `cos.ts`**

Add:

```ts
export interface ShareContent {
  title: string
  imagePath: string
  fallbackImageUrl?: string
}

const DEFAULT_SHARE_TITLE = '妆造作品合集'

export function getShareContent(config: any, images?: PortfolioItem[]): ShareContent {
  const title = String(
    config?.share?.title
      || config?.theme?.brandName
      || config?.homeBanner?.logoText
      || DEFAULT_SHARE_TITLE
  ).trim() || DEFAULT_SHARE_TITLE
  const covers = (images || generateImagesFromConfig(config)).filter(item => item.isSeriesCover)
  const fallback = covers.find(item => item.featuredOnHome) || covers[0]

  return {
    title,
    imagePath: String(config?.share?.imagePath || '').trim(),
    fallbackImageUrl: fallback?.originalUrl || ''
  }
}
```

Add `share: ShareContent` to `getPortfolioPageData`, `getSeriesPageData`, `getAboutPageData`, `getPackagesPageData`, `getPackageDetailPageData`, and `getBookingPageData`. Reuse an already-generated image list where available; each catch branch returns `{ title: DEFAULT_SHARE_TITLE, imagePath: '', fallbackImageUrl: '' }`.

- [ ] **Step 2: Implement `utils/share.ts`**

The module exports:

```ts
import { getCosUrl, ShareContent } from './cos'

export type SharePageType = 'portfolio' | 'series' | 'about' | 'packages' | 'package-detail' | 'booking'
export const FALLBACK_SHARE_IMAGE = '/assets/share-default.png'

const PAGE_PREFIX: Partial<Record<SharePageType, string>> = {
  about: '妆造师介绍',
  packages: '拍摄套餐',
  booking: '预约咨询'
}

export function buildShareTitle(pageType: SharePageType, baseTitle: string, contentTitle = ''): string {
  const normalizedBase = String(baseTitle || '').trim() || '妆造作品合集'
  if (pageType === 'portfolio') return normalizedBase
  const prefix = (pageType === 'series' || pageType === 'package-detail')
    ? String(contentTitle || '').trim()
    : PAGE_PREFIX[pageType]
  return prefix ? `${prefix}｜${normalizedBase}` : normalizedBase
}

export function isSupportedShareImage(value: string): boolean {
  const cleanPath = String(value || '').split('?')[0].toLowerCase()
  return /\.(jpe?g|png)$/.test(cleanPath)
}

export interface CreateShareMessageOptions {
  pageType: SharePageType
  share: ShareContent
  path: string
  contentTitle?: string
  contentImageUrl?: string
  imagePriority?: 'content-first' | 'global-first'
}

interface ShareMessageResult {
  title: string
  path: string
  imageUrl: string
}

const imageCache: Record<string, string> = {}

function getConfiguredImageUrl(imagePath: string): string {
  const value = String(imagePath || '').trim()
  if (!value) return ''
  if (/^(https?:\/\/|\/)/i.test(value)) return value
  return getCosUrl(value)
}

function uniqueSupportedImages(values: string[]): string[] {
  return Array.from(new Set(values.map(value => String(value || '').trim())))
    .filter(value => value && isSupportedShareImage(value))
}

function downloadShareImage(imageUrl: string): Promise<string> {
  if (!/^https?:\/\//i.test(imageUrl)) return Promise.resolve(imageUrl)
  if (imageCache[imageUrl]) return Promise.resolve(imageCache[imageUrl])

  return new Promise(resolve => {
    wx.downloadFile({
      url: imageUrl,
      success: result => {
        if (result.statusCode === 200 && result.tempFilePath) {
          imageCache[imageUrl] = result.tempFilePath
          resolve(result.tempFilePath)
          return
        }
        resolve('')
      },
      fail: () => resolve('')
    })
  })
}

async function resolveFirstImage(candidates: string[]): Promise<string> {
  for (const candidate of candidates) {
    const resolved = await downloadShareImage(candidate)
    if (resolved) return resolved
  }
  return FALLBACK_SHARE_IMAGE
}

function resolveWithin(candidates: string[], timeoutMs: number): Promise<string> {
  const timeout = new Promise<string>(resolve => {
    setTimeout(() => resolve(FALLBACK_SHARE_IMAGE), timeoutMs)
  })
  return Promise.race([resolveFirstImage(candidates), timeout])
}

export function createShareMessage(options: CreateShareMessageOptions) {
  const title = buildShareTitle(options.pageType, options.share.title, options.contentTitle)
  const globalImage = getConfiguredImageUrl(options.share.imagePath)
  const contentImage = String(options.contentImageUrl || '').trim()
  const configuredFallback = String(options.share.fallbackImageUrl || '').trim()
  const ordered = options.imagePriority === 'content-first'
    ? [contentImage, globalImage, configuredFallback]
    : [globalImage, contentImage, configuredFallback]
  const candidates = uniqueSupportedImages(ordered)

  const promise = resolveWithin(candidates, 2500).then(imageUrl => ({
    title,
    path: options.path,
    imageUrl
  }))

  return {
    title,
    path: options.path,
    imageUrl: FALLBACK_SHARE_IMAGE,
    promise
  }
}
```

- [ ] **Step 3: Compile and run behavior checks**

Run:

```powershell
Set-Location miniprogram
npm run compile
Set-Location ..
node scripts/share-runtime-check.js
```

Expected: title and format assertions PASS; page hard-code assertion still FAIL until Task 3.

---

### Task 3: Replace page-specific hard-coded share handlers

**Files:**
- Modify: `miniprogram/pages/portfolio/portfolio.ts`
- Modify: `miniprogram/pages/series/series.ts`
- Modify: `miniprogram/pages/about/about.ts`
- Modify: `miniprogram/pages/packages/packages.ts`
- Modify: `miniprogram/pages/package-detail/package-detail.ts`
- Modify: `miniprogram/pages/booking/booking.ts`

- [ ] **Step 1: Store normalized share data on each page**

Import `ShareContent` from `../../utils/cos` and `createShareMessage` from `../../utils/share`. Add this initial data value:

```ts
share: {
  title: '妆造作品合集',
  imagePath: '',
  fallbackImageUrl: ''
} as ShareContent
```

Destructure `share` from the existing page data loader and include it in `setData`.

- [ ] **Step 2: Replace all six share handlers**

Use the following page mappings:

```ts
// 首页
return createShareMessage({
  pageType: 'portfolio',
  share: this.data.share,
  path: '/pages/portfolio/portfolio',
  contentImageUrl: this.data.share.fallbackImageUrl,
  imagePriority: 'global-first'
})

// 作品详情
return createShareMessage({
  pageType: 'series',
  share: this.data.share,
  contentTitle: this.data.seriesTitle,
  path: `/pages/series/series?seriesId=${encodeURIComponent(seriesId)}&title=${encodeURIComponent(this.data.seriesTitle)}&category=${encodeURIComponent(this.data.seriesCategory)}`,
  contentImageUrl: this.data.images.find(item => item.originalUrl)?.originalUrl,
  imagePriority: 'content-first'
})

// 简介
return createShareMessage({
  pageType: 'about',
  share: this.data.share,
  path: '/pages/about/about',
  contentImageUrl: this.data.share.fallbackImageUrl,
  imagePriority: 'global-first'
})

// 套餐列表
return createShareMessage({
  pageType: 'packages',
  share: this.data.share,
  path: '/pages/packages/packages',
  contentImageUrl: this.data.share.fallbackImageUrl,
  imagePriority: 'global-first'
})

// 套餐详情
return createShareMessage({
  pageType: 'package-detail',
  share: this.data.share,
  contentTitle: this.data.packageItem?.name || '拍摄套餐',
  path: `/pages/package-detail/package-detail?id=${encodeURIComponent(this.data.packageItem?.id || '')}`,
  contentImageUrl: this.data.share.fallbackImageUrl,
  imagePriority: 'global-first'
})

// 预约咨询
return createShareMessage({
  pageType: 'booking',
  share: this.data.share,
  path: '/pages/booking/booking',
  contentImageUrl: this.data.share.fallbackImageUrl,
  imagePriority: 'global-first'
})
```

- [ ] **Step 3: Compile and run checks**

Run:

```powershell
Set-Location miniprogram
npm run compile
Set-Location ..
node scripts/share-runtime-check.js
```

Expected: PASS and no share handler contains the old hard-coded brand title.

---

### Task 4: Add CMS share title and cover editing

**Files:**
- Modify: `admin/index.html`
- Modify: `admin/app.js`
- Modify: `admin/server.js`

- [ ] **Step 1: Add the CMS fields to the existing home modal**

Below the home banner fields, add a “微信分享卡片” section containing:

```html
<div class="form-group">
  <label>分享标题</label>
  <input type="text" id="homeShareTitle" maxlength="28" placeholder="例如：妆造作品合集">
</div>
<div class="form-group">
  <label>分享封面</label>
  <div style="display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 16px; align-items: center;">
    <div style="width: 200px; aspect-ratio: 5 / 4; overflow: hidden; background: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 8px;">
      <img id="homeShareImagePreview" alt="分享封面预览" style="width: 100%; height: 100%; object-fit: cover; display: none;">
      <div id="homeShareImageEmpty" style="height: 100%; display: flex; align-items: center; justify-content: center; color: #78716c;">暂未上传</div>
    </div>
    <label>
      <input id="homeShareImagePath" data-field="imagePath" type="text" readonly>
      <button class="btn btn-secondary" type="button" onclick="selectContentAsset(this, 'share')">上传或替换封面</button>
    </label>
  </div>
</div>
```

- [ ] **Step 2: Normalize, preview and save CMS values**

Add `DEFAULT_SHARE_CONFIG`, `ensureShareConfig()`, and `updateHomeSharePreview(imagePath)`. `openHomeBannerModal()` fills title/path and refreshes the preview. `saveHomeBanner()` rejects an empty title, writes both fields to `portfolioData.share`, and retains the current image path when no replacement is uploaded.

```js
const DEFAULT_SHARE_CONFIG = {
  title: '妆造作品合集',
  imagePath: ''
}

function ensureShareConfig() {
  const fallbackTitle = portfolioData.theme?.brandName
    || portfolioData.homeBanner?.logoText
    || DEFAULT_SHARE_CONFIG.title
  portfolioData.share = {
    ...DEFAULT_SHARE_CONFIG,
    title: fallbackTitle,
    ...(portfolioData.share || {})
  }
  if (!String(portfolioData.share.title || '').trim()) {
    portfolioData.share.title = fallbackTitle
  }
  return portfolioData.share
}

function updateHomeSharePreview(imagePath) {
  const preview = document.getElementById('homeShareImagePreview')
  const empty = document.getElementById('homeShareImageEmpty')
  const value = String(imagePath || '').trim()
  if (!preview || !empty) return
  if (!value) {
    preview.removeAttribute('src')
    preview.style.display = 'none'
    empty.style.display = 'flex'
    return
  }
  const source = /^https?:\/\//i.test(value) ? value : getCosAssetUrl(value)
  preview.src = `${source}${source.includes('?') ? '&' : '?'}t=${Date.now()}`
  preview.style.display = 'block'
  empty.style.display = 'none'
  preview.onerror = () => {
    preview.style.display = 'none'
    empty.style.display = 'flex'
    empty.textContent = '封面暂时无法预览'
  }
}

async function saveHomeBanner() {
  const banner = ensureHomeBannerConfig()
  const share = ensureShareConfig()
  banner.logoText = document.getElementById('homeBannerLogoText').value.trim()
  banner.tagText = document.getElementById('homeBannerTagText').value.trim()
  banner.description = document.getElementById('homeBannerDescription').value.trim()
  const shareTitle = document.getElementById('homeShareTitle').value.trim()
  const imagePath = document.getElementById('homeShareImagePath').value.trim()

  if (!banner.logoText || !banner.tagText || !banner.description) {
    showToast('请填写完整的首页轮播文案', 'error')
    return
  }
  if (!shareTitle) {
    showToast('请填写分享标题', 'error')
    return
  }

  portfolioData.share = { ...share, title: shareTitle, imagePath }
  const success = await saveConfig()
  if (success) {
    closeModal('homeBannerModal')
    showToast('首页和分享卡片已更新', 'success')
  }
}
```

When `handleContentAssetSelected()` uploads a `share` image, call `updateHomeSharePreview(result.assetPath)`. When `selectContentAsset()` receives the `share` folder, set the hidden input accept value to `image/jpeg,image/png`; restore `image/*` for other folders.

- [ ] **Step 3: Restrict server-side share uploads**

Extend the folder allow-list and validate MIME before uploading:

```js
const allowedFolders = new Set(['avatar', 'testimonial', 'share'])
const isShareImage = folder === 'share'
const shareMimeAllowed = new Set(['image/jpeg', 'image/png'])

if (isShareImage && !shareMimeAllowed.has(file.mimetype)) {
  await fs.unlink(file.path).catch(() => {})
  return res.status(400).json({ success: false, error: '分享封面只支持 JPG 或 PNG' })
}

const ext = isShareImage
  ? (file.mimetype === 'image/png' ? '.png' : '.jpg')
  : (path.extname(file.originalname || '').toLowerCase() || '.jpg')
```

- [ ] **Step 4: Add server-source checks**

Extend `scripts/share-runtime-check.js` to assert the HTML contains `homeShareTitle`, `homeShareImagePath`, and a 5:4 preview; assert `admin/server.js` allows `share` and contains the JPG/PNG error text.

Run:

```powershell
node --check admin/app.js
node --check admin/server.js
node scripts/share-runtime-check.js
```

Expected: all checks PASS.

---

### Task 5: Update default configurations and verify end to end

**Files:**
- Modify: `admin/app.js`
- Modify: `miniprogram/data/portfolio-config.json`
- Modify: `miniprogram/data/portfolio-config.js`
- Modify: `miniprogram/data/portfolio-config.template.json`
- Modify: `README.md`
- Modify: `miniprogram/README.md`

- [ ] **Step 1: Add non-JSON-facing defaults**

Add to `DEFAULT_V11_CONFIG` and `ensureV11Config()`:

```js
share: {
  title: '妆造作品合集',
  imagePath: ''
}
```

Add the same object to local JSON, runtime JS fallback, and source-package template. Do not add customer-specific COS URLs or images.

- [ ] **Step 2: Update operator documentation**

Document that photographers edit the title and upload the 5:4 JPG/PNG cover from `首页 → 微信分享卡片`; they do not manually edit JSON or upload `banner/main-banner.jpg` for sharing.

- [ ] **Step 3: Run the full verification set**

Run:

```powershell
node scripts/generate-share-fallback.js
Set-Location miniprogram
npm run compile
Set-Location ..
node --check admin/app.js
node --check admin/server.js
node scripts/share-runtime-check.js
git diff --check
```

Expected: every command exits 0. The runtime check reports title mappings, image format checks, six-page integration, CMS fields, server upload restrictions, and 600x480 fallback dimensions as PASS.

- [ ] **Step 4: Browser smoke test the CMS**

Start the CMS on an unused port, open the home modal, and verify at desktop and narrow viewports:

- The share title is one line and editable.
- The preview keeps a stable 5:4 box.
- Upload/replace controls stay inside the modal.
- Existing home banner fields remain usable.
- Saving updates `share.title` and `share.imagePath` without exposing JSON.

- [ ] **Step 5: Inspect final scope**

Run `git diff --name-only` and confirm every changed file belongs to the approved share-card feature or was already dirty before implementation. Do not revert or stage unrelated changes.
