const assert = require('assert')
const fs = require('fs')
const path = require('path')
const ts = require(path.resolve(__dirname, '../miniprogram/node_modules/typescript'))

const ROOT = path.resolve(__dirname, '..')
const source = fs.readFileSync(path.join(ROOT, 'miniprogram/utils/booking-selection.ts'), 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText
const moduleUnderTest = { exports: {} }

new Function('module', 'exports', output)(moduleUnderTest, moduleUnderTest.exports)

const { resolveStoreSelection } = moduleUnderTest.exports
const storeA = { id: 'store-a', name: '门店 A' }
const storeB = { id: 'store-b', name: '门店 B' }

assert.deepStrictEqual(resolveStoreSelection([], ''), {
  store: null,
  pickerIndex: 0,
  storeId: '',
  storeName: ''
})

assert.deepStrictEqual(resolveStoreSelection([storeA], ''), {
  store: storeA,
  pickerIndex: 1,
  storeId: 'store-a',
  storeName: '门店 A'
})

assert.deepStrictEqual(resolveStoreSelection([storeA, storeB], ''), {
  store: null,
  pickerIndex: 0,
  storeId: '',
  storeName: ''
})

assert.deepStrictEqual(resolveStoreSelection([storeA, storeB], 'store-b'), {
  store: storeB,
  pickerIndex: 2,
  storeId: 'store-b',
  storeName: '门店 B'
})

assert.deepStrictEqual(resolveStoreSelection([storeA, storeB], 'missing-store'), {
  store: null,
  pickerIndex: 0,
  storeId: '',
  storeName: ''
})

console.log('booking-default-store-check: PASS')
