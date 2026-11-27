export function createStorageV2({
  maxSlots,
  listOfSessions,
  legacyLastTabKey = 'lastTab',
  legacySessionPrefix = 'localSession'
}) {
  const STORAGE_V2_INDEX_KEY = 'solver:v2:index'
  const STORAGE_V2_DOC_PREFIX = 'solver:v2:doc:'
  const STORAGE_V2_BACKUP_PREFIX = 'solver:v2:backup:'
  const STORAGE_CLIENT_ID = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const state = initializeStorageV2(maxSlots)

  function beginStorageWrite() {
    const remoteIndex = safeParseJSON(localStorage.getItem(STORAGE_V2_INDEX_KEY))
    if (!isValidStorageIndex(remoteIndex, maxSlots)) {
      return true
    }

    const localUpdatedAt = state.index.updatedAt || 0
    const remoteUpdatedAt = remoteIndex.updatedAt || 0
    const remoteWriter = remoteIndex.lastWriterId

    if (remoteUpdatedAt > localUpdatedAt && remoteWriter && remoteWriter !== STORAGE_CLIENT_ID) {
      window.alert('Changes from another window were detected. Please retry your action.')
      return false
    }

    return true
  }

  function persistStorageIndex() {
    const remoteIndex = safeParseJSON(localStorage.getItem(STORAGE_V2_INDEX_KEY))
    const remoteRevision = isValidStorageIndex(remoteIndex, maxSlots) ? (remoteIndex.revision || 0) : 0
    const localRevision = state.index.revision || 0
    state.index.revision = Math.max(localRevision, remoteRevision) + 1
    state.index.updatedAt = Date.now()
    state.index.lastWriterId = STORAGE_CLIENT_ID
    localStorage.setItem(STORAGE_V2_INDEX_KEY, JSON.stringify(state.index))
  }

  function getDocStorageKey(docId) {
    return `${STORAGE_V2_DOC_PREFIX}${docId}`
  }

  function getLegacySessionKey(ID) {
    return `${legacySessionPrefix}${ID}`
  }

  function syncOpenTabsFromSlots() {
    state.index.openTabs = state.index.slotDocIds.filter(id => id !== null)
    state.index.documentIds = [...new Set([
      ...(Array.isArray(state.index.documentIds) ? state.index.documentIds : []),
      ...state.index.slotDocIds.filter(Boolean)
    ])]
  }

  function addDocument(docId) {
    if (!state.index.documentIds.includes(docId)) {
      state.index.documentIds.push(docId)
    }
  }

  function removeDocument(docId) {
    state.index.documentIds = state.index.documentIds.filter(id => id !== docId)
  }

  function getOpenSlots() {
    return listOfSessions.filter((ID) => state.index.slotDocIds[ID - 1] !== null)
  }

  function getSessionText(ID) {
    const docId = state.index.slotDocIds[ID - 1]
    if (!docId) {
      return ''
    }

    return state.docsById[docId]?.content || ''
  }

  function generateDefaultDocumentName() {
    let index = 1
    const existing = new Set(Object.values(state.docsById).map(doc => doc.name))
    while (true) {
      const candidate = `Notebook ${index}`
      if (!existing.has(candidate)) {
        return candidate
      }
      index++
    }
  }

  function generateUniqueDocumentName(baseName, ignoreDocId = null) {
    const cleanBase = baseName.trim() || generateDefaultDocumentName()
    let candidate = cleanBase
    let suffix = 2

    while (Object.values(state.docsById).some(doc => doc.id !== ignoreDocId && doc.name === candidate)) {
      candidate = `${cleanBase} (${suffix})`
      suffix++
    }

    return candidate
  }

  function ensureAtLeastOneOpenTab() {
    const openSlots = getOpenSlots()
    if (openSlots.length > 0) {
      state.index.activeSlot = openSlots.includes(state.index.activeSlot)
        ? state.index.activeSlot
        : openSlots[0]
      state.index.activeTabId = state.index.slotDocIds[state.index.activeSlot - 1]
      syncOpenTabsFromSlots()
      persistStorageIndex()
      return
    }

    const slot = 1
    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const doc = {
      id: docId,
      name: 'Notebook 1',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    state.docsById[docId] = doc
    localStorage.setItem(getDocStorageKey(docId), JSON.stringify(doc))
    state.index.slotDocIds[slot - 1] = docId
    addDocument(docId)
    state.index.activeSlot = slot
    state.index.activeTabId = docId
    syncOpenTabsFromSlots()
    persistStorageIndex()
  }

  function initializeStorageV2(slotCount) {
    let index = safeParseJSON(localStorage.getItem(STORAGE_V2_INDEX_KEY))
    if (!isValidStorageIndex(index, slotCount)) {
      index = migrateLegacyStorage(slotCount)
    }

    const storedDocIds = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_V2_DOC_PREFIX)) {
        storedDocIds.push(key.slice(STORAGE_V2_DOC_PREFIX.length))
      }
    }

    const documentIds = [...new Set([
      ...(Array.isArray(index.documentIds) ? index.documentIds : []),
      ...index.slotDocIds,
      ...storedDocIds
    ].filter(docId => typeof docId === 'string' && docId))]
    const docsById = {}
    const openDocIds = new Set(index.slotDocIds.filter(Boolean))
    documentIds.forEach((docId) => {
      const doc = safeParseJSON(localStorage.getItem(getDocStorageKey(docId)))
      if (doc && typeof doc.content === 'string') {
        if (!openDocIds.has(docId) && doc.content.trim() === '') {
          localStorage.removeItem(getDocStorageKey(docId))
          return
        }
        docsById[docId] = doc
      }
    })

    index.documentIds = documentIds.filter(docId => docsById[docId])
    index.slotDocIds = Array.from({ length: slotCount }, (_, i) => {
      const docId = index.slotDocIds[i]
      return docId && docsById[docId] ? docId : null
    })
    index.openTabs = index.slotDocIds.filter(Boolean)

    const openSlots = listOfSessions.filter(ID => index.slotDocIds[ID - 1] !== null)
    const activeSlot = Number.parseInt(index.activeSlot, 10)
    index.activeSlot = openSlots.includes(activeSlot) ? activeSlot : (openSlots[0] || 1)
    index.activeTabId = index.slotDocIds[index.activeSlot - 1] || null
    index.updatedAt = index.updatedAt || Date.now()
    index.lastWriterId = index.lastWriterId || STORAGE_CLIENT_ID
    index.revision = Number.isFinite(index.revision) ? index.revision : 0

    return { index, docsById }
  }

  function migrateLegacyStorage(slotCount) {
    const backup = {
      migratedAt: Date.now(),
      lastTab: localStorage.getItem(legacyLastTabKey),
      sessions: []
    }

    for (let ID = 1; ID <= slotCount; ID++) {
      backup.sessions.push({ id: ID, text: localStorage.getItem(getLegacySessionKey(ID)) })
    }

    localStorage.setItem(`${STORAGE_V2_BACKUP_PREFIX}${backup.migratedAt}`, JSON.stringify(backup))

    const slotDocIds = Array.from({ length: slotCount }, () => null)
    const openTabs = []

    for (let ID = 1; ID <= slotCount; ID++) {
      const text = localStorage.getItem(getLegacySessionKey(ID))
      if (!text || text.trim() === '') {
        continue
      }

      const docId = `doc-legacy-${ID}`
      const doc = {
        id: docId,
        name: deriveNotebookName(text, ID),
        content: text,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      localStorage.setItem(getDocStorageKey(docId), JSON.stringify(doc))
      slotDocIds[ID - 1] = docId
      openTabs.push(docId)
    }

    const openSlots = listOfSessions.filter(ID => slotDocIds[ID - 1] !== null)
    const legacyLast = Number.parseInt(localStorage.getItem(legacyLastTabKey), 10)
    const activeSlot = openSlots.includes(legacyLast) ? legacyLast : (openSlots[0] || 1)

    const index = {
      version: 2,
      slotDocIds,
      openTabs,
      documentIds: openTabs.slice(),
      activeSlot,
      activeTabId: slotDocIds[activeSlot - 1] || null,
      updatedAt: Date.now(),
      lastWriterId: STORAGE_CLIENT_ID,
      revision: 1
    }

    localStorage.setItem(STORAGE_V2_INDEX_KEY, JSON.stringify(index))
    return index
  }

  function isValidStorageIndex(index, slotCount) {
    return Boolean(
      index &&
      index.version === 2 &&
      Array.isArray(index.slotDocIds) &&
      index.slotDocIds.length === slotCount &&
      Array.isArray(index.openTabs)
    )
  }

  function safeParseJSON(value) {
    if (!value) {
      return null
    }

    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  function deriveNotebookName(text, ID) {
    const firstLineComment = /^\s*#\s*.*?(\w.*?)\s*(?:\n|$)/
    const foundName = firstLineComment.test(text) ? text.match(firstLineComment)[1] : null
    return foundName || `Notebook ${ID}`
  }

  return {
    state,
    beginStorageWrite,
    persistStorageIndex,
    getDocStorageKey,
    syncOpenTabsFromSlots,
    getOpenSlots,
    getSessionText,
    generateDefaultDocumentName,
    generateUniqueDocumentName,
    addDocument,
    removeDocument,
    ensureAtLeastOneOpenTab
  }
}
