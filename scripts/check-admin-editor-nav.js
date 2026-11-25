#!/usr/bin/env node
/**
 * 双向入口完整性检查
 *
 * 背景：内容后台（/）与装修编辑器 v3（/editor/）是两套独立界面，
 * 历史上互相没有入口，导致用户无法从后台进入编辑器、也无法从编辑器返回后台。
 *
 * 本脚本做静态校验，确保双向入口不会在后续改动中被误删。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ADMIN_HTML = path.join(ROOT, 'admin', 'index.html')
const APP_VUE = path.join(ROOT, 'admin', 'editor', 'src', 'App.vue')
const SERVER_JS = path.join(ROOT, 'admin', 'server.js')

const errors = []
const checks = []

function check(name, ok, detail) {
  checks.push({ name, ok, detail })
  if (!ok) errors.push(`${name}${detail ? ' — ' + detail : ''}`)
}

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

// ---------- 1. 旧后台存在指向 /editor/ 的入口 ----------
const adminHtml = read(ADMIN_HTML)
const editorLink = adminHtml.match(/<a[^>]*href=["']\/editor\/["'][^>]*>/i)
check(
  '旧后台存在指向 /editor/ 的链接',
  Boolean(editorLink),
  editorLink ? editorLink[0].slice(0, 90) : '未找到 <a href="/editor/">'
)
check(
  '旧后台 v3 入口在新标签页打开（避免丢失未保存状态）',
  Boolean(editorLink && /target=["']_blank["']/i.test(editorLink[0]))
)
check(
  '旧后台 v3 入口带 rel="noopener"',
  Boolean(editorLink && /rel=["'][^"']*noopener/i.test(editorLink[0]))
)

// ---------- 2. v3 编辑器存在返回后台的链接 ----------
const appVue = read(APP_VUE)
const backLink = appVue.match(/<a[^>]*href=["']\/["'][^>]*>/i)
check(
  '装修编辑器存在返回 / 的链接',
  Boolean(backLink),
  backLink ? backLink[0].slice(0, 90) : '未找到指向 / 的 <a>'
)

// ---------- 3. 服务端同时挂载两个静态入口 ----------
const serverJs = read(SERVER_JS)
check(
  '服务端挂载 /editor 静态资源',
  /app\.use\(\s*['"]\/editor['"]/.test(serverJs)
)
check(
  '服务端挂载 /editor/templates（模板预览图）',
  /app\.use\(\s*['"]\/editor\/templates['"]/.test(serverJs)
)

// ---------- 4. v3 发布状态可被旧后台感知（互斥提示依赖该接口） ----------
check(
  '存在 /api/design/draft 状态接口（提供 hasPublished）',
  /router\.get\(\s*['"]\/draft['"]/.test(fs.readFileSync(path.join(ROOT, 'admin', 'server', 'routes', 'design.js'), 'utf8'))
)
check(
  '旧后台探测 v3 发布状态',
  /fetchDesignV3State/.test(fs.readFileSync(path.join(ROOT, 'admin', 'app.js'), 'utf8'))
)

// ---------- 输出 ----------
for (const item of checks) {
  console.log(`${item.ok ? '✅' : '❌'} ${item.name}${item.ok && item.detail ? ' — ' + item.detail : ''}`)
}

if (errors.length) {
  console.error(`\n双向入口检查失败：${errors.length} 项未通过`)
  process.exit(1)
}
console.log('\n双向入口检查全部通过')
