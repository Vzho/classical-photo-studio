// /api/design 路由：模板、草稿、校验、发布（方案 §9.2）。
// 草稿保存只写本地文件，绝不触达 COS。
const express = require('express')

function createDesignRouter({ workspace, validator, releaseService, getContentConfig, compiler, contentResolver, getCosBaseUrl }) {
  const router = express.Router()

  router.get('/templates', async (req, res, next) => {
    try {
      const templates = await workspace.listTemplates()
      res.json({ success: true, templates })
    } catch (error) {
      next(error)
    }
  })

  router.get('/templates/:templateId', async (req, res, next) => {
    try {
      const manifest = await workspace.readTemplate(req.params.templateId)
      if (!manifest) {
        res.status(404).json({ success: false, error: '模板不存在' })
        return
      }
      const validation = validator.validateTemplate(manifest)
      res.json({ success: true, manifest, validation })
    } catch (error) {
      next(error)
    }
  })

  router.get('/draft', async (req, res, next) => {
    try {
      const draft = await workspace.readDraft()
      const published = await workspace.readPublished()
      res.json({
        success: true,
        draft,
        hasPublished: Boolean(published),
        publishedUpdatedAt: published?.updatedAt || null
      })
    } catch (error) {
      next(error)
    }
  })

  // 保存草稿：errors 阻止保存，warnings 允许保存并回显。
  router.put('/draft', async (req, res, next) => {
    try {
      const design = req.body
      const validation = validator.validateDesign(design)
      if (!validation.valid) {
        res.status(422).json({ success: false, error: '草稿校验未通过', issues: validation })
        return
      }
      const saved = await workspace.writeDraft(design)
      res.json({ success: true, draft: saved, issues: validation })
    } catch (error) {
      next(error)
    }
  })

  // 草稿预览：编译「草稿」而非发布稿，附真实内容，供编辑器实时预览。
  // 只读：不写任何文件、不上传 COS、不影响 published。
  // 与线上渲染共用同一个 compiler，保证「预览所见 = 发布所得」。
  router.get('/preview', async (req, res, next) => {
    try {
      const draft = await workspace.readDraft()
      if (!draft) {
        res.status(404).json({ success: false, error: '没有可预览的草稿，请先应用模板' })
        return
      }

      const validation = validator.validateDesign(draft)
      const template = await workspace.readTemplate(draft.templateId)
      if (!template) {
        res.status(422).json({ success: false, error: `草稿引用的模板不存在: ${draft.templateId}` })
        return
      }

      const contentConfig = await getContentConfig()
      const { runtime, warnings, compiledPages } = compiler.compileRuntime({
        contentConfig,
        publishedDesign: draft,
        templateManifest: template
      })

      // 填充真实内容，让预览与用户线上看到的数据一致。
      const cosBaseUrl = typeof getCosBaseUrl === 'function' ? getCosBaseUrl() : ''
      contentResolver.attachBlockContent(runtime, contentConfig, { cosBaseUrl })

      const published = await workspace.readPublished()
      res.json({
        success: true,
        preview: {
          templateId: draft.templateId,
          templateName: template.name || template.displayName || draft.templateId,
          tokens: draft.tokens || {},
          brand: draft.brand || {},
          navigation: draft.navigation || {},
          pages: runtime.v3Pages || {},
          compiledPages,
          warnings
        },
        validation,
        // 草稿与线上发布稿的关系：用于前端提示「当前线上跑的是哪一版」。
        published: published
          ? { templateId: published.templateId, updatedAt: published.updatedAt }
          : null,
        hasUnpublishedChanges: published
          ? JSON.stringify({ ...published, updatedAt: null }) !== JSON.stringify({ ...draft, updatedAt: null })
          : true
      })
    } catch (error) {
      next(error)
    }
  })

  // 应用模板：先备份当前草稿，只覆盖设计配置，不触碰客户内容。
  router.post('/apply-template', async (req, res, next) => {
    try {
      const templateId = String(req.body?.templateId || '')
      const backupPath = await workspace.backupDraft('before-apply-template')
      const draft = await workspace.createDraftFromTemplate(templateId)
      const validation = validator.validateDesign(draft)
      if (!validation.valid) {
        res.status(422).json({ success: false, error: '模板生成的草稿未通过校验', issues: validation })
        return
      }
      const saved = await workspace.writeDraft(draft)
      res.json({
        success: true,
        draft: saved,
        impact: {
          overridden: ['tokens', 'navigation', 'pages'],
          preserved: ['作品', '套餐', '团队', '门店', '评价等内容配置'],
          backupPath
        }
      })
    } catch (error) {
      next(error)
    }
  })

  router.post('/validate', async (req, res, next) => {
    try {
      const design = req.body && Object.keys(req.body).length > 0
        ? req.body
        : await workspace.readDraft()
      if (!design) {
        res.status(404).json({ success: false, error: '没有可校验的草稿' })
        return
      }
      const validation = validator.validateDesign(design)
      res.json({ success: true, valid: validation.valid, issues: validation })
    } catch (error) {
      next(error)
    }
  })

  router.post('/publish', async (req, res, next) => {
    try {
      const design = await workspace.readDraft()
      if (!design) {
        res.status(400).json({ success: false, error: '没有可发布的草稿，请先保存草稿' })
        return
      }
      const contentConfig = await getContentConfig()
      try {
        const result = await releaseService.publish({ contentConfig, design })
        res.json({ success: true, release: result })
      } catch (error) {
        if (error?.name === 'DesignValidationError') {
          res.status(error.statusCode || 422).json({ success: false, error: error.message, issues: error.issues })
          return
        }
        throw error
      }
    } catch (error) {
      next(error)
    }
  })

  return router
}

module.exports = { createDesignRouter }
