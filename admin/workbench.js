(function () {
  const STORAGE_KEY = 'photo-admin-management-preview-ratio'
  const DEFAULT_RATIO = 0.3
  const registry = new Map()
  let activeModalId = ''

  function createSplitter() {
    const splitter = document.createElement('div')
    splitter.className = 'management-splitter'
    splitter.setAttribute('role', 'separator')
    splitter.setAttribute('aria-label', '调整编辑栏和预览栏宽度')
    splitter.setAttribute('aria-orientation', 'vertical')
    splitter.setAttribute('tabindex', '0')
    splitter.title = '拖动调整两栏宽度，双击恢复默认'
    splitter.innerHTML = '<span class="management-splitter-grip" aria-hidden="true"></span>'
    return splitter
  }

  function getBounds(workspaceWidth) {
    const minPreview = workspaceWidth <= 900 ? 260 : 300
    const minEditor = Math.min(680, Math.max(420, workspaceWidth * 0.55))
    const maxPreview = Math.max(minPreview, Math.min(workspaceWidth * 0.5, workspaceWidth - minEditor))
    return { minPreview, maxPreview }
  }

  function setPreviewWidth(workspace, targetWidth, persist) {
    const width = workspace.getBoundingClientRect().width
    if (!width) return
    const { minPreview, maxPreview } = getBounds(width)
    const previewWidth = Math.round(Math.min(maxPreview, Math.max(minPreview, targetWidth)))
    workspace.style.setProperty('--management-preview-width', `${previewWidth}px`)
    const splitter = workspace.querySelector(':scope > .management-splitter')
    if (splitter) {
      const percent = Math.round((previewWidth / width) * 100)
      splitter.setAttribute('aria-valuenow', String(percent))
      splitter.setAttribute('aria-valuetext', `预览栏 ${percent}%，编辑栏 ${100 - percent}%`)
    }
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, String(previewWidth / width))
      } catch {
      }
    }
  }

  function restoreSplit(workspace) {
    if (!workspace || window.matchMedia('(max-width: 820px)').matches) return
    const width = workspace.getBoundingClientRect().width
    if (!width) return
    let ratio = DEFAULT_RATIO
    try {
      const stored = Number(localStorage.getItem(STORAGE_KEY))
      if (Number.isFinite(stored) && stored >= 0.2 && stored <= 0.5) ratio = stored
    } catch {
    }
    setPreviewWidth(workspace, width * ratio, false)
  }

  function bindSplitter(workspace) {
    const splitter = workspace.querySelector(':scope > .management-splitter')
    const preview = workspace.querySelector(':scope > .management-preview-pane')
    if (!splitter || !preview || splitter.dataset.bound === 'true') return
    splitter.dataset.bound = 'true'
    let dragging = false

    const move = event => {
      if (!dragging) return
      const bounds = workspace.getBoundingClientRect()
      setPreviewWidth(workspace, bounds.right - event.clientX, false)
    }
    const finish = event => {
      if (!dragging) return
      dragging = false
      splitter.classList.remove('is-dragging')
      document.body.classList.remove('management-resizing')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      setPreviewWidth(workspace, preview.getBoundingClientRect().width, true)
      if (event?.pointerId !== undefined && splitter.hasPointerCapture?.(event.pointerId)) {
        splitter.releasePointerCapture(event.pointerId)
      }
    }

    splitter.addEventListener('pointerdown', event => {
      if (event.button !== 0 || window.matchMedia('(max-width: 820px)').matches) return
      event.preventDefault()
      dragging = true
      splitter.classList.add('is-dragging')
      document.body.classList.add('management-resizing')
      splitter.setPointerCapture?.(event.pointerId)
      move(event)
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', finish)
      window.addEventListener('pointercancel', finish)
    })

    splitter.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return
      event.preventDefault()
      if (event.key === 'Home') {
        try { localStorage.removeItem(STORAGE_KEY) } catch {}
        workspace.style.removeProperty('--management-preview-width')
        restoreSplit(workspace)
        return
      }
      const step = event.shiftKey ? 40 : 16
      setPreviewWidth(
        workspace,
        preview.getBoundingClientRect().width + (event.key === 'ArrowLeft' ? step : -step),
        true
      )
    })

    splitter.addEventListener('dblclick', () => {
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
      workspace.style.removeProperty('--management-preview-width')
      restoreSplit(workspace)
    })
  }

  function createWorkspace(editorNode) {
    const workspace = document.createElement('div')
    workspace.className = 'management-workspace'
    const editor = document.createElement('section')
    editor.className = 'management-editor-pane'
    editor.appendChild(editorNode)
    const splitter = createSplitter()
    const preview = document.createElement('aside')
    preview.className = 'management-preview-pane'
    preview.setAttribute('aria-label', '实时预览栏')
    const host = document.createElement('div')
    host.className = 'management-preview-host'
    preview.appendChild(host)
    workspace.append(editor, splitter, preview)
    bindSplitter(workspace)
    return { workspace, host }
  }

  function setState(id, state) {
    const entry = registry.get(id)
    if (!entry) return
    entry.state = state
    const status = entry.status
    if (!status) return
    status.classList.toggle('is-dirty', state === 'dirty')
    status.classList.toggle('is-saving', state === 'saving')
    if (entry.saveButton) entry.saveButton.disabled = state === 'saving' || entry.actionEnabled === false
    status.textContent = state === 'dirty'
      ? '有修改尚未保存'
      : state === 'saving'
        ? '正在保存并更新'
        : '右侧实时预览'
  }

  function refresh(id) {
    const entry = registry.get(id)
    if (!entry) return
    entry.options.onPreview?.(entry.host, id)
  }

  function markDirty(id) {
    const entry = registry.get(id)
    if (!entry || entry.state === 'saving') return
    setState(id, 'dirty')
    window.clearTimeout(entry.refreshTimer)
    entry.refreshTimer = window.setTimeout(() => refresh(id), 80)
  }

  function registerModal(id, options) {
    if (registry.has(id)) return registry.get(id)
    const modal = document.getElementById(id)
    const content = modal?.querySelector(':scope > .modal-content')
    const header = content?.querySelector(':scope > .modal-header')
    if (!modal || !content || !header) return null

    modal.classList.add('management-workbench-modal')
    header.classList.add('management-workbench-header')
    const heading = header.querySelector('h3')
    const closeButton = header.querySelector('.close-btn')
    if (closeButton) closeButton.hidden = true

    const title = document.createElement('div')
    title.className = 'management-workbench-title'
    const back = document.createElement('button')
    back.type = 'button'
    back.className = 'management-workbench-back'
    back.setAttribute('aria-label', '返回管理后台')
    back.textContent = '←'
    back.addEventListener('click', () => options.onRequestClose?.(id))
    const headingGroup = document.createElement('div')
    headingGroup.className = 'management-workbench-heading'
    if (heading) headingGroup.appendChild(heading)
    const subtitle = document.createElement('p')
    subtitle.textContent = options.subtitle || '左侧修改，右侧立即查看效果'
    headingGroup.appendChild(subtitle)
    title.append(back, headingGroup)

    const originalPrimary = content.querySelector('.form-actions .btn-primary, .form-actions .btn-success')
    const originalActions = originalPrimary?.closest('.form-actions') || null
    if (originalActions) originalActions.classList.add('management-original-actions')
    if (originalPrimary) originalPrimary.classList.add('management-original-primary')
    originalActions?.querySelectorAll('button').forEach(button => {
      if (/closeModal\(/.test(button.getAttribute('onclick') || '')) button.classList.add('management-original-cancel')
    })
    const tools = document.createElement('div')
    tools.className = 'management-workbench-tools'
    const status = document.createElement('span')
    status.className = 'management-save-status'
    status.textContent = '右侧实时预览'
    const mobilePreview = document.createElement('button')
    mobilePreview.type = 'button'
    mobilePreview.className = 'btn btn-secondary management-mobile-preview-button'
    mobilePreview.textContent = '预览'
    mobilePreview.addEventListener('click', () => {
      const showing = modal.classList.toggle('is-previewing')
      mobilePreview.textContent = showing ? '编辑' : '预览'
      if (showing) refresh(id)
    })
    tools.append(status, mobilePreview)
    let saveButton = null
    if (originalPrimary) {
      const save = document.createElement('button')
      save.type = 'button'
      save.className = `btn ${originalPrimary.classList.contains('btn-success') ? 'btn-success' : 'btn-primary'} management-workbench-save`
      const saveLabel = options.saveText || originalPrimary.textContent.trim() || '保存并更新小程序'
      save.innerHTML = `<span class="management-save-label-desktop">${saveLabel}</span><span class="management-save-label-mobile">${options.mobileSaveText || '保存'}</span>`
      save.addEventListener('click', () => {
        originalPrimary.click()
      })
      tools.appendChild(save)
      saveButton = save
    }

    header.replaceChildren(title, tools)
    const editorScroll = document.createElement('div')
    editorScroll.className = 'management-editor-scroll'
    Array.from(content.children).filter(node => node !== header).forEach(node => editorScroll.appendChild(node))
    const { workspace, host } = createWorkspace(editorScroll)
    content.append(header, workspace)

    const entry = { id, modal, content, host, workspace, status, saveButton, options, state: 'clean', actionEnabled: originalPrimary ? !originalPrimary.disabled : true, refreshTimer: 0 }
    registry.set(id, entry)
    editorScroll.addEventListener('input', () => markDirty(id))
    editorScroll.addEventListener('change', () => markDirty(id))
    editorScroll.addEventListener('click', event => {
      const button = event.target.closest('button[onclick]')
      const action = button?.getAttribute('onclick') || ''
      if (!/^(add|remove)(Package|Testimonial|ServiceFlow|Faq|Photographer|Store)EditorItem|^removeFile\(/.test(action)) return
      window.setTimeout(() => markDirty(id), 0)
    })
    const observer = new MutationObserver(() => {
      if (modal.classList.contains('active')) refresh(id)
    })
    observer.observe(editorScroll, { childList: true, subtree: true })
    entry.observer = observer
    return entry
  }

  function open(id) {
    const entry = registry.get(id)
    if (!entry) return false
    activeModalId = id
    entry.modal.classList.add('active')
    entry.modal.classList.remove('is-previewing')
    document.body.classList.add('management-workbench-open')
    setState(id, 'clean')
    entry.options.onOpen?.(entry.host, id)
    refresh(id)
    requestAnimationFrame(() => restoreSplit(entry.workspace))
    return true
  }

  function close(id) {
    const entry = registry.get(id)
    if (!entry) return false
    entry.modal.classList.remove('active', 'is-previewing')
    window.clearTimeout(entry.refreshTimer)
    setState(id, 'clean')
    if (activeModalId === id) activeModalId = ''
    document.body.classList.toggle('management-workbench-open', Boolean(activeModalId))
    entry.options.onClose?.(id)
    return true
  }

  function createMainSurface(content, options) {
    if (!content || document.getElementById(options.id)) return null
    const workspace = document.createElement('div')
    workspace.id = options.id
    workspace.className = 'management-main-workspace'
    const editor = document.createElement('section')
    editor.className = 'management-main-editor'
    content.parentNode.insertBefore(workspace, content)
    editor.appendChild(content)
    const splitter = createSplitter()
    const preview = document.createElement('aside')
    preview.className = 'management-preview-pane'
    const host = document.createElement('div')
    host.className = 'management-preview-host'
    preview.appendChild(host)
    workspace.append(editor, splitter, preview)
    bindSplitter(workspace)
    registry.set(options.id, {
      id: options.id,
      host,
      workspace,
      options,
      state: 'clean',
      refreshTimer: 0
    })
    requestAnimationFrame(() => restoreSplit(workspace))
    options.onPreview?.(host, options.id)
    return workspace
  }

  window.addEventListener('resize', () => {
    registry.forEach(entry => {
      if (entry.workspace && (!entry.modal || entry.modal.classList.contains('active'))) {
        restoreSplit(entry.workspace)
      }
    })
  })

  window.AdminWorkbench = {
    registerModal,
    createMainSurface,
    open,
    close,
    refresh,
    markDirty,
    setState,
    setSaveEnabled(id, enabled) {
      const entry = registry.get(id)
      if (!entry) return
      entry.actionEnabled = Boolean(enabled)
      if (entry.saveButton) entry.saveButton.disabled = !entry.actionEnabled || entry.state === 'saving'
    },
    hasUnsaved(id) {
      return registry.get(id)?.state === 'dirty'
    },
    has(id) {
      return registry.has(id)
    },
    getActiveId() {
      return activeModalId
    },
    getHost(id) {
      return registry.get(id)?.host || null
    }
  }
})()
