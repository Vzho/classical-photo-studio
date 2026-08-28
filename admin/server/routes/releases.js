// /api/releases 路由：发布记录与一键回滚（方案 §9.2、§9.4）。
const express = require('express')

function createReleasesRouter({ releaseService }) {
  const router = express.Router()

  router.get('/', async (req, res, next) => {
    try {
      const releases = await releaseService.listReleases()
      res.json({ success: true, releases })
    } catch (error) {
      next(error)
    }
  })

  router.post('/:releaseId/rollback', async (req, res, next) => {
    try {
      const result = await releaseService.rollback(req.params.releaseId)
      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  })

  return router
}

module.exports = { createReleasesRouter }
