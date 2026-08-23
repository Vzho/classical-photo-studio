function cloneConfig(config) {
  return JSON.parse(JSON.stringify(config && typeof config === 'object' ? config : { themes: [] }))
}

function normalizeString(value) {
  return String(value || '').trim()
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return []
  return value.map(normalizeString).filter(Boolean)
}

function createNotFoundError(message) {
  const error = new Error(message)
  error.statusCode = 404
  return error
}

function validatePhotoName(photoName) {
  const normalized = normalizeString(photoName)
  if (!normalized || normalized.includes('/') || normalized.includes('\\') || normalized.includes('..')) {
    const error = new Error('照片文件名无效')
    error.statusCode = 400
    throw error
  }
  return normalized
}

function findThemeAndSeries(config, themeId, seriesId) {
  const normalizedThemeId = normalizeString(themeId)
  const normalizedSeriesId = normalizeString(seriesId)
  const theme = (config.themes || []).find(item => normalizeString(item?.id) === normalizedThemeId)
  const series = (theme?.series || []).find(item => normalizeString(item?.id) === normalizedSeriesId)

  if (!theme) throw createNotFoundError('作品分类不存在，请刷新后台后重试')
  if (!series) throw createNotFoundError('作品集不存在，请刷新后台后重试')

  return { theme, series, normalizedThemeId, normalizedSeriesId }
}

function collectReferencedPhotoNames(config) {
  const referenced = new Set()
  for (const theme of config.themes || []) {
    for (const series of theme.series || []) {
      for (const photoName of normalizeStringList(series.photos)) {
        referenced.add(photoName)
      }
    }
  }
  return referenced
}

function removeHiddenPhotoReference(series, photoNames) {
  const removedNames = new Set(photoNames)
  const nextHiddenPhotos = normalizeStringList(series.hiddenPhotos)
    .filter(photoName => !removedNames.has(photoName))

  if (nextHiddenPhotos.length > 0) {
    series.hiddenPhotos = nextHiddenPhotos
  } else {
    delete series.hiddenPhotos
  }
}

function removePhotoFromConfig(config, { themeId, seriesId, photoName }) {
  const nextConfig = cloneConfig(config)
  const normalizedPhotoName = validatePhotoName(photoName)
  const { series } = findThemeAndSeries(nextConfig, themeId, seriesId)
  const photos = normalizeStringList(series.photos)

  if (!photos.includes(normalizedPhotoName)) {
    throw createNotFoundError('这张照片已不在作品集中，请刷新后台后重试')
  }

  series.photos = photos.filter(item => item !== normalizedPhotoName)
  removeHiddenPhotoReference(series, [normalizedPhotoName])

  const stillReferenced = collectReferencedPhotoNames(nextConfig).has(normalizedPhotoName)
  return {
    config: nextConfig,
    removedPhotoName: normalizedPhotoName,
    removedReferenceCount: photos.length - series.photos.length,
    cosDeleteCandidates: stillReferenced ? [] : [normalizedPhotoName]
  }
}

function removeSeriesLinks(config, themeId, seriesId) {
  const referenceIds = new Set([
    normalizeString(seriesId),
    `series-${normalizeString(themeId)}-${normalizeString(seriesId)}`
  ])

  for (const packageItem of config.packages || []) {
    packageItem.relatedSeriesIds = normalizeStringList(packageItem.relatedSeriesIds)
      .filter(item => !referenceIds.has(item))
  }

  for (const photographer of config.photographers || []) {
    photographer.relatedSeriesIds = normalizeStringList(photographer.relatedSeriesIds)
      .filter(item => !referenceIds.has(item))
  }

  for (const testimonial of config.testimonials || []) {
    if (referenceIds.has(normalizeString(testimonial.relatedSeriesId))) {
      testimonial.relatedSeriesId = ''
    }
  }
}

function removeSeriesFromConfig(config, { themeId, seriesId }) {
  const nextConfig = cloneConfig(config)
  const { theme, series, normalizedThemeId, normalizedSeriesId } = findThemeAndSeries(nextConfig, themeId, seriesId)
  const removedPhotoNames = Array.from(new Set(normalizeStringList(series.photos)))

  theme.series = (theme.series || []).filter(item => normalizeString(item?.id) !== normalizedSeriesId)
  removeSeriesLinks(nextConfig, normalizedThemeId, normalizedSeriesId)

  const remainingReferences = collectReferencedPhotoNames(nextConfig)
  return {
    config: nextConfig,
    removedSeriesId: normalizedSeriesId,
    removedSeriesTitle: normalizeString(series.title),
    removedPhotoNames,
    cosDeleteCandidates: removedPhotoNames.filter(photoName => !remainingReferences.has(photoName))
  }
}

function removeThemeFromConfig(config, { themeId }) {
  const nextConfig = cloneConfig(config)
  const normalizedThemeId = normalizeString(themeId)
  const theme = (nextConfig.themes || []).find(item => normalizeString(item?.id) === normalizedThemeId)
  if (!theme) throw createNotFoundError('作品分类不存在，请刷新后台后重试')

  const removedSeries = Array.isArray(theme.series) ? theme.series : []
  const removedPhotoNames = Array.from(new Set(
    removedSeries.flatMap(series => normalizeStringList(series.photos))
  ))

  nextConfig.themes = (nextConfig.themes || [])
    .filter(item => normalizeString(item?.id) !== normalizedThemeId)

  for (const series of removedSeries) {
    removeSeriesLinks(nextConfig, normalizedThemeId, normalizeString(series.id))
  }

  const remainingReferences = collectReferencedPhotoNames(nextConfig)
  return {
    config: nextConfig,
    removedThemeId: normalizedThemeId,
    removedThemeName: normalizeString(theme.name),
    removedSeriesCount: removedSeries.length,
    removedPhotoNames,
    cosDeleteCandidates: removedPhotoNames.filter(photoName => !remainingReferences.has(photoName))
  }
}

function reconcileMissingPhotoReferences(config, existingPhotoNames) {
  const nextConfig = cloneConfig(config)
  const existing = existingPhotoNames instanceof Set
    ? existingPhotoNames
    : new Set(normalizeStringList(existingPhotoNames))
  const removedReferences = []

  for (const theme of nextConfig.themes || []) {
    for (const series of theme.series || []) {
      const photos = normalizeStringList(series.photos)
      const missing = photos.filter(photoName => !existing.has(photoName))
      if (missing.length === 0) continue

      const missingSet = new Set(missing)
      series.photos = photos.filter(photoName => !missingSet.has(photoName))
      removeHiddenPhotoReference(series, missing)

      for (const photoName of missing) {
        removedReferences.push({
          themeId: normalizeString(theme.id),
          seriesId: normalizeString(series.id),
          photoName
        })
      }
    }
  }

  return {
    config: nextConfig,
    removedReferences,
    removedReferenceCount: removedReferences.length,
    removedPhotoNames: Array.from(new Set(removedReferences.map(item => item.photoName)))
  }
}

module.exports = {
  collectReferencedPhotoNames,
  removePhotoFromConfig,
  removeSeriesFromConfig,
  removeThemeFromConfig,
  reconcileMissingPhotoReferences
}
