export function setPageNavigationTitle(title: unknown, fallback: string) {
  const normalizedTitle = typeof title === 'string' ? title.trim() : ''
  const resolvedTitle = normalizedTitle || fallback.trim()

  if (!resolvedTitle) return

  wx.setNavigationBarTitle({
    title: resolvedTitle
  })
}
