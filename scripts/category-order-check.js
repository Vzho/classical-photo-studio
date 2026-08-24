const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const ROOT = path.resolve(__dirname, '..')
const appSource = fs.readFileSync(path.join(ROOT, 'admin/app.js'), 'utf8')
const adminHtml = fs.readFileSync(path.join(ROOT, 'admin/index.html'), 'utf8')
const portfolioSource = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/portfolio/portfolio.ts'), 'utf8')
const cosSource = fs.readFileSync(path.join(ROOT, 'miniprogram/utils/cos.ts'), 'utf8')

const context = {
  console,
  setTimeout,
  clearTimeout,
  window: {
    addEventListener() {}
  }
}

vm.createContext(context)
vm.runInContext(appSource, context)

assert.strictEqual(typeof context.normalizeThemePosition, 'function')
assert.strictEqual(typeof context.moveArrayItemToPosition, 'function')
assert.strictEqual(typeof context.getEnabledThemeEntries, 'function')
assert.strictEqual(typeof context.getThemeDisplayPosition, 'function')
assert.strictEqual(typeof context.moveEnabledThemeToPosition, 'function')
assert.strictEqual(typeof context.insertEnabledThemeAtPosition, 'function')
assert.strictEqual(context.normalizeThemePosition('', 2, 4), 2)
assert.strictEqual(context.normalizeThemePosition('0', 2, 4), 1)
assert.strictEqual(context.normalizeThemePosition('99', 2, 4), 4)

const themes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
context.moveArrayItemToPosition(themes, 1, 1)
assert.deepStrictEqual(themes.map(item => item.id), ['b', 'a', 'c'])
context.moveArrayItemToPosition(themes, 0, 3)
assert.deepStrictEqual(themes.map(item => item.id), ['a', 'c', 'b'])

const themesWithDisabled = [
  { id: 'a', enabled: true },
  { id: 'archived', enabled: false },
  { id: 'b', enabled: true },
  { id: 'c', enabled: true }
]
assert.strictEqual(context.getThemeDisplayPosition(themesWithDisabled, 'a'), 1)
assert.strictEqual(context.getThemeDisplayPosition(themesWithDisabled, 'b'), 2)
assert.strictEqual(context.getThemeDisplayPosition(themesWithDisabled, 'archived'), null)
context.moveEnabledThemeToPosition(themesWithDisabled, 'b', 3)
assert.deepStrictEqual(themesWithDisabled.map(item => item.id), ['a', 'archived', 'c', 'b'])
assert.strictEqual(themesWithDisabled[1].id, 'archived')
assert.strictEqual(context.moveEnabledThemeToPosition(themesWithDisabled, 'archived', 1), -1)

const insertedTheme = { id: 'new', enabled: true }
context.insertEnabledThemeAtPosition(themesWithDisabled, insertedTheme, 2)
assert.deepStrictEqual(
  Array.from(context.getEnabledThemeEntries(themesWithDisabled), entry => entry.theme.id),
  ['a', 'new', 'c', 'b']
)

assert.ok(adminHtml.includes('id="themePosition"'))
assert.ok(adminHtml.includes('id="editThemePosition"'))
assert.ok(adminHtml.includes('已下架分类不会占位'))
assert.ok(appSource.includes('已下架，不参与展示顺序'))
assert.ok(appSource.includes('insertEnabledThemeAtPosition(portfolioData.themes, newTheme, requestedPosition)'))
assert.ok(cosSource.includes('config.themes.forEach((theme: any) =>'))
assert.ok(portfolioSource.includes("const categories = ['全部', ...Array.from(new Set(portfolioItems.map(item => item.category)))]"))

console.log('category-order-check: PASS')
