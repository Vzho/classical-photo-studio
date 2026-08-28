// Release Service：草稿校验、快照、发布与回滚（方案 §9.2、§9.4）。
// 发布原子顺序：内存编译校验 → 本地临时文件 → 本地快照 → 上传 release →
// 上传固定路径 → 成功后才更新 published design 与索引。任一步失败不动 published。
const fs = require('fs').promises
const path = require('path')
const { deepClone } = require('./design-workspace')

const FIXED_CONFIG_KEY = 'config/portfolio-config.json'
const RELEASE_KEY_PREFIX = 'config/releases/'
const INDEX_FILE = 'index.json'

function createReleaseService({ releasesDir, publisher, workspace, validator, compiler }) {
  const indexPath = path.join(releasesDir, INDEX_FILE)

  async function ensureDirs() {
    await fs.mkdir(releasesDir, { recursive: true })
  }

  async function readIndex() {
    try {
      return JSON.parse(await fs.readFile(indexPath, 'utf-8'))
    } catch (error) {
      if (error.code === 'ENOENT') return { releases: [] }
      throw error
    }
  }

  async function writeIndex(index) {
    await ensureDirs()
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8')
  }

  function makeReleaseId() {
    const now = new Date()
    const stamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14)
    const rand = Math.random().toString(36).slice(2, 6)
    return `rel-${stamp}-${rand}`
  }

  async function listReleases() {
    const index = await readIndex()
    return index.releases
  }

  function releaseSnapshotPath(releaseId) {
    if (!/^[a-zA-Z0-9-_]+$/.test(releaseId || '')) {
      throw Object.assign(new Error('非法的发布 ID'), { statusCode: 400 })
    }
    return path.join(releasesDir, `${releaseId}.json`)
  }

  /**
   * 发布装修。校验失败抛 DesignValidationError；上传失败抛错且不动 published。
   */
  async function publish({ contentConfig, design }) {
    if (!design) {
      throw Object.assign(new Error('没有可发布的装修草稿'), { statusCode: 400 })
    }
    const validation = validator.validateDesign(design)
    if (!validation.valid) {
      const error = Object.assign(new Error('装修校验未通过，已阻止发布'), {
        statusCode: 422,
        issues: validation
      })
      error.name = 'DesignValidationError'
      throw error
    }

    const template = await workspace.readTemplate(design.templateId)
    if (!template) {
      throw Object.assign(new Error(`草稿引用的模板不存在: ${design.templateId}`), { statusCode: 422 })
    }
    const templateValidation = validator.validateTemplate(template)
    if (!templateValidation.valid) {
      throw Object.assign(new Error(`模板校验未通过: ${templateValidation.errors.join('; ')}`), { statusCode: 422 })
    }

    // 1. 内存编译与校验
    const { runtime, warnings, compiledPages } = compiler.compileRuntime({
      contentConfig,
      publishedDesign: design,
      templateManifest: template
    })

    const releaseId = makeReleaseId()
    const snapshot = {
      releaseId,
      createdAt: new Date().toISOString(),
      templateId: design.templateId,
      design: deepClone(design),
      runtime,
      compileWarnings: warnings
    }

    // 2. 本地临时文件（原子写）
    await ensureDirs()
    const snapshotPath = releaseSnapshotPath(releaseId)
    const tempPath = `${snapshotPath}.tmp`
    await fs.writeFile(tempPath, JSON.stringify(snapshot, null, 2), 'utf-8')

    // 3. 保存本地 release 快照
    await fs.rename(tempPath, snapshotPath)
    const index = await readIndex()
    const entry = {
      releaseId,
      createdAt: snapshot.createdAt,
      templateId: design.templateId,
      status: 'pending',
      compiledPages,
      current: false
    }
    index.releases = [entry, ...index.releases.filter((item) => item.releaseId !== releaseId)]
    await writeIndex(index)

    try {
      // 4. 先上传 release 快照
      await publisher.putJson(`${RELEASE_KEY_PREFIX}${releaseId}.json`, runtime)
      // 5. 再上传固定运行配置路径
      await publisher.putJson(FIXED_CONFIG_KEY, runtime)
    } catch (error) {
      entry.status = 'failed'
      entry.error = error.message || String(error)
      await writeIndex(index)
      throw Object.assign(new Error(`发布上传失败，未更新线上与 published design: ${entry.error}`), {
        statusCode: 502,
        releaseId
      })
    }

    // 6. 全部成功后才更新 published design 与索引
    await workspace.writePublished(design)
    for (const item of index.releases) item.current = false
    entry.status = 'published'
    entry.current = true
    await writeIndex(index)

    return {
      releaseId,
      createdAt: snapshot.createdAt,
      compiledPages,
      warnings,
      templateId: design.templateId
    }
  }

  /**
   * 回滚：把指定 release 的运行时配置重新写入固定路径（方案 §9.4）。
   */
  async function rollback(releaseId) {
    const snapshotPath = releaseSnapshotPath(releaseId)
    let snapshot
    try {
      snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf-8'))
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw Object.assign(new Error(`找不到发布快照: ${releaseId}`), { statusCode: 404 })
      }
      throw error
    }
    if (!snapshot?.runtime) {
      throw Object.assign(new Error(`发布快照损坏: ${releaseId}`), { statusCode: 500 })
    }

    await publisher.putJson(FIXED_CONFIG_KEY, snapshot.runtime)

    // 回滚成功：更新 published design 为该版本，索引标记当前版本。
    await workspace.writePublished(snapshot.design)
    const index = await readIndex()
    for (const item of index.releases) item.current = item.releaseId === releaseId
    const entry = index.releases.find((item) => item.releaseId === releaseId)
    if (entry) entry.status = 'published'
    index.releases = [
      {
        releaseId: `rollback-${makeReleaseId()}`,
        createdAt: new Date().toISOString(),
        templateId: snapshot.templateId,
        status: 'published',
        current: false,
        rolledBackTo: releaseId
      },
      ...index.releases
    ]
    await writeIndex(index)

    return { rolledBackTo: releaseId, templateId: snapshot.templateId }
  }

  return { publish, rollback, listReleases }
}

module.exports = { createReleaseService, FIXED_CONFIG_KEY, RELEASE_KEY_PREFIX }
