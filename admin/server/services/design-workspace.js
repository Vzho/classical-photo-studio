// Design Workspace：装修草稿与发布稿的本地工作区（方案 §4、§9）。
// 草稿保存绝不触达 COS；只有 Release Service 发布成功后才更新 published。
const fs = require('fs').promises
const fssync = require('fs')
const path = require('path')

const DESIGN_SCHEMA_VERSION = '3.1.0'
const DESIGN_ENGINE = 'blocks-v3'

function createDesignWorkspace({ workspaceDir, templatesDir, backupsDir }) {
  const draftPath = path.join(workspaceDir, 'design.draft.json')
  const publishedPath = path.join(workspaceDir, 'design.published.json')

  async function ensure() {
    await fs.mkdir(workspaceDir, { recursive: true })
    await fs.mkdir(backupsDir, { recursive: true })
  }

  async function readJsonSafe(filePath) {
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(raw)
    } catch (error) {
      if (error.code === 'ENOENT') return null
      throw error
    }
  }

  // 先写临时文件再改名，避免进程中断留下半截 JSON。
  async function writeJsonAtomic(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8')
    await fs.rename(tempPath, filePath)
  }

  async function readDraft() {
    return readJsonSafe(draftPath)
  }

  async function writeDraft(design) {
    await ensure()
    await writeJsonAtomic(draftPath, { ...design, updatedAt: new Date().toISOString() })
    return readDraft()
  }

  async function readPublished() {
    return readJsonSafe(publishedPath)
  }

  async function writePublished(design) {
    await ensure()
    await writeJsonAtomic(publishedPath, { ...design, updatedAt: new Date().toISOString() })
    return readPublished()
  }

  async function backupPublished(tag = new Date().toISOString().replace(/[:.]/g, '-')) {
    const published = await readPublished()
    if (!published) return null
    const backupPath = path.join(backupsDir, `design.published.${tag}.json`)
    await writeJsonAtomic(backupPath, published)
    return backupPath
  }

  async function backupDraft(tag = new Date().toISOString().replace(/[:.]/g, '-')) {
    const draft = await readDraft()
    if (!draft) return null
    const backupPath = path.join(backupsDir, `design.draft.${tag}.json`)
    await writeJsonAtomic(backupPath, draft)
    return backupPath
  }

  function templateManifestPath(templateId) {
    // 模板 id 只允许安全字符，避免路径穿越。
    if (!/^[a-z0-9][a-z0-9-]*$/.test(templateId || '')) {
      throw Object.assign(new Error('非法的模板 ID'), { statusCode: 400 })
    }
    return path.join(templatesDir, templateId, 'manifest.json')
  }

  async function listTemplates() {
    if (!fssync.existsSync(templatesDir)) return []
    const entries = await fs.readdir(templatesDir, { withFileTypes: true })
    const manifests = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const manifest = await readJsonSafe(path.join(templatesDir, entry.name, 'manifest.json'))
      if (!manifest || !manifest.id) continue
      manifests.push(summarizeManifest(manifest))
    }
    return manifests.sort((a, b) => a.id.localeCompare(b.id))
  }

  function summarizeManifest(manifest) {
    return {
      id: manifest.id,
      name: manifest.name || manifest.id,
      version: manifest.version || '0.0.0',
      internal: Boolean(manifest.internal),
      description: manifest.description || '',
      industryTags: manifest.industryTags || [],
      preview: manifest.preview || {},
      pages: Object.keys(manifest.pages || {}),
      requirements: manifest.requirements || {}
    }
  }

  async function readTemplate(templateId) {
    return readJsonSafe(templateManifestPath(templateId))
  }

  // 应用模板只覆盖“设计配置”，不触碰客户内容（方案 §5.4）。
  async function createDraftFromTemplate(templateId) {
    const manifest = await readTemplate(templateId)
    if (!manifest) {
      throw Object.assign(new Error(`模板不存在: ${templateId}`), { statusCode: 404 })
    }
    return {
      schemaVersion: DESIGN_SCHEMA_VERSION,
      engine: DESIGN_ENGINE,
      templateId: manifest.id,
      tokens: deepClone(manifest.tokens || {}),
      brand: {},
      navigation: deepClone(manifest.navigation || { entries: [] }),
      pages: deepClone(manifest.pages || {}),
      mediaMeta: {},
      updatedAt: new Date().toISOString()
    }
  }

  async function loadBlockSchemas(registry) {
    const schemas = {}
    for (const [blockType, meta] of Object.entries(registry.blocks || {})) {
      const schemaPath = path.join(path.dirname(templatesDir), meta.settingsSchema)
      const schema = await readJsonSafe(schemaPath)
      if (!schema) {
        throw new Error(`区块 ${blockType} 缺少设置 Schema: ${meta.settingsSchema}`)
      }
      schemas[blockType] = schema
    }
    return schemas
  }

  return {
    ensure,
    readDraft,
    writeDraft,
    readPublished,
    writePublished,
    backupPublished,
    backupDraft,
    listTemplates,
    readTemplate,
    createDraftFromTemplate,
    loadBlockSchemas,
    paths: { draftPath, publishedPath, workspaceDir, templatesDir, backupsDir }
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

module.exports = { createDesignWorkspace, DESIGN_SCHEMA_VERSION, DESIGN_ENGINE, deepClone }
