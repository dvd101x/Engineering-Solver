import './style.css'

import initialState from './ext/initialState.js'

import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, basicSetup } from 'codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { mathjs } from './mathjs.js'

import Plotly from 'plotly.js-dist-min'

import katex from 'katex'
import 'katex/dist/katex.min.css'

import texmath from 'markdown-it-texmath'
import markdownit from 'markdown-it'
import 'markdown-it-texmath/css/texmath.css'

import 'github-markdown-css/github-markdown.css'

import { insertExampleFunc } from './examples.js'

import Alpine from 'alpinejs'
import { createStorageV2 } from './ext/storageV2.js'

import { clearFragment, loadFromFragment, createFragmentLink, onFragmentChange } from './fragmentLoader.js'

window.Alpine = Alpine
Alpine.start()

const md = markdownit({ html: true }).use(texmath, {
  engine: katex,
  delimiters: ['dollars', 'beg_end'],
  katexOptions: { macros: { '\\RR': '\\mathbb{R}' } }
})

const wait = 300
const waitToSave = 1000

const tabsField = document.getElementById('tabs')
const tabAddButton = document.getElementById('tabAddButton')
const insertButton = document.getElementById('exampleInsert')
const exampleSelect = document.getElementById('exampleSelector')
const outputs = document.getElementById('OUTPUT')
const shareLinkButton = document.getElementById('shareLink')
const runNowButton = document.getElementById('runNowButton')

const documentsSelect = document.getElementById('documentsSelect')
const docOpenButton = document.getElementById('docOpen')
const docNewButton = document.getElementById('docNew')
const docRenameButton = document.getElementById('docRename')
const docDeleteButton = document.getElementById('docDelete')

const numberOfSessions = 20
const listOfSessions = Array.from({ length: numberOfSessions }, (_, i) => i + 1)

const LEGACY_LAST_TAB_KEY = 'lastTab'
const LEGACY_SESSION_PREFIX = 'localSession'
const AUTO_RUN_STORAGE_KEY = 'solver:autoRun'
const THEME_MODE_STORAGE_KEY = 'solver:themeMode'

let workerState = initialState
let parserState = {}
let isAutoRunEnabled = localStorage.getItem(AUTO_RUN_STORAGE_KEY) !== '0'
let hasPendingChanges = false
let themeMode = localStorage.getItem(THEME_MODE_STORAGE_KEY) || 'auto'
const themeCompartment = new Compartment()
const colorSchemeMedia = window.matchMedia('(prefers-color-scheme: dark)')
let plotResizeTimer

const storageController = createStorageV2({
  maxSlots: numberOfSessions,
  listOfSessions,
  legacyLastTabKey: LEGACY_LAST_TAB_KEY,
  legacySessionPrefix: LEGACY_SESSION_PREFIX
})
const storageState = storageController.state
storageController.ensureAtLeastOneOpenTab()

let lastTab = storageState.index.activeSlot
let sessions = []
let sessionNames = []

for (let ID of listOfSessions) {
  sessions[ID] = null
  sessionNames[ID] = null
}

renderTabs()
refreshDocumentsMenu()

let timer
let timerSave

const codeFromUrl = loadFromFragment()
if (codeFromUrl) {
  const targetSlot = findEmptySession() || lastTab
  setSessionText(targetSlot, codeFromUrl)
  setActiveSlot(targetSlot)
  lastTab = targetSlot
  clearFragment()
}

sessions[lastTab] = createState(lastTab)

let editor = new EditorView({
  state: sessions[lastTab],
  parent: document.querySelector('#INPUT')
})

bindColorSchemeListener()
bindPlotResizeHandlers()

tabsField.addEventListener('change', () => {
  const selected = tabsField.querySelector('input[name="sessionTab"]:checked')
  if (!selected) {
    return
  }

  const ID = Number.parseInt(selected.value, 10)
  if (sessions[ID] === null) {
    sessions[ID] = createState(ID)
  }

  sessions[lastTab] = editor.state
  saveSession(lastTab)

  editor.setState(sessions[ID])
  editor.focus()

  setActiveSlot(ID)
  lastTab = ID
  renderTabs()
  refreshDocumentsMenu()
})

tabsField.addEventListener('click', (event) => {
  const closeButton = event.target.closest('.tab-close')
  if (!closeButton) {
    return
  }

  event.preventDefault()
  const slot = Number.parseInt(closeButton.dataset.slot, 10)
  closeTab(slot)
})

document.body.addEventListener('solver-ui-autorun-changed', (event) => {
  isAutoRunEnabled = Boolean(event.detail?.value)
  localStorage.setItem(AUTO_RUN_STORAGE_KEY, isAutoRunEnabled ? '1' : '0')
  updateRunButtonState()

  if (isAutoRunEnabled && hasPendingChanges) {
    runCurrentDocument()
  }
})

document.body.addEventListener('solver-ui-theme-changed', (event) => {
  const requestedMode = event.detail?.mode
  if (requestedMode === 'light' || requestedMode === 'dark' || requestedMode === 'auto') {
    themeMode = requestedMode
    localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode)
    applyThemeToAllSessions()
  }
})

if (runNowButton) {
  runNowButton.addEventListener('click', () => {
    runCurrentDocument()
    editor.focus()
  })
}

if (tabAddButton) {
  tabAddButton.addEventListener('click', () => {
    openNewTab()
  })
}

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') {
    return
  }

  if (!(event.metaKey || event.ctrlKey)) {
    return
  }

  event.preventDefault()
  runCurrentDocument()
})

updateRunButtonState()

docOpenButton.addEventListener('click', () => {
  const docId = documentsSelect.value
  if (!docId) {
    return
  }

  openDocumentInSlot(docId, Number.parseInt(lastTab, 10))
})

docNewButton.addEventListener('click', () => {
  openNewTab()
})

docRenameButton.addEventListener('click', () => {
  const docId = documentsSelect.value
  const doc = storageState.docsById[docId]
  if (!doc) {
    return
  }

  const candidate = window.prompt('Document name', doc.name || '')
  if (candidate === null) {
    return
  }

  renameDocument(docId, candidate)
})

docDeleteButton.addEventListener('click', () => {
  const docId = documentsSelect.value
  const doc = storageState.docsById[docId]
  if (!doc) {
    return
  }

  if (!window.confirm(`Delete document "${doc.name}"?`)) {
    return
  }

  deleteDocument(docId)
})

shareLinkButton.addEventListener('click', () => {
  const code = editor.state.doc.toString()
  const shareableLink = createFragmentLink(code)
  navigator.clipboard.writeText(shareableLink).then(() => {
    alert('Shareable link copied to clipboard!')
  }, (err) => {
    alert('Failed to copy link: ' + err)
  })
})

insertButton.addEventListener('click', () => {
  const exampleToInsert = insertExampleFunc(exampleSelect.value)
  editor.dispatch({
    changes: {
      from: editor.state.doc.length,
      to: editor.state.doc.length,
      insert: '\n' + exampleToInsert
    }
  })
  editor.focus()
})

mathWorker.onmessage = function (oEvent) {
  const results = JSON.parse(oEvent.data)
  const tabToSave = lastTab
  outputs.innerHTML = ''

  results.outputs.forEach(out => {
    switch (out.type) {
      case 'math':
        out.text.forEach(e => {
          const pre = document.createElement('pre')
          pre.setAttribute('data-from-line', e.from)
          pre.setAttribute('data-to-line', e.to)
          if (e.visible) {
            const type = e.type
            const value = e.result
            let div
            switch (type) {
              case 'string':
                div = document.createElement('code')
                div.innerHTML = value
                pre.appendChild(div)
                break
              case 'any':
                div = document.createElement('div')
                div.textContent = value
                pre.appendChild(div)
                break
              case 'error':
                div = document.createElement('div')
                div.style.color = 'red'
                div.innerHTML = value
                pre.appendChild(div)
                break
              case 'plot':
                div = document.createElement('div')
                div.className = 'plotly-container'
                try {
                  const layout = {
                    ...(e.result.layout || {}),
                    autosize: true
                  }
                  const config = {
                    responsive: true,
                    ...(e.result.config || {})
                  }

                  Plotly.newPlot(div, e.result.data, layout, config)
                    .then(() => resizePlot(div))
                } catch (error) {
                  div.innerHTML = 'myError:' + error.toString()
                }
                pre.appendChild(div)
                break
            }
          } else {
            pre.style.display = 'none'
          }
          outputs.appendChild(pre)
        })
        break
      case 'markdown': {
        const div = document.createElement('div')
        div.setAttribute('data-from-line', out.from)
        div.setAttribute('data-to-line', out.to)
        div.innerHTML = md.render(out.text)
        outputs.appendChild(div)
        break
      }
    }
  })

  updateSelection()
  queuePlotResize()
  clearTimeout(timerSave)
  sessions[lastTab] = editor.state
  timerSave = setTimeout(saveSession, waitToSave, tabToSave)

  if (results.mathState) {
    workerState = results.mathState
  }
  if (results.parserState) {
    parserState = results.parserState
  }
}

function createState(ID) {
  return EditorState.create({
    doc: getSessionText(ID),
    extensions: [
      themeCompartment.of(getEditorThemeExtension()),
      basicSetup,
      mathjs(() => workerState, () => parserState),
      EditorView.lineWrapping,
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          const text = update.state.doc.toString()
          const slotAtChange = Number.parseInt(lastTab, 10)
          clearTimeout(timerSave)
          timerSave = setTimeout(() => {
            sessions[slotAtChange] = update.state
            saveSession(slotAtChange)
          }, waitToSave)

          if (isAutoRunEnabled) {
            clearTimeout(timer)
            timer = setTimeout(sendWorkToMathWorker, wait, text)
            hasPendingChanges = false
          } else {
            hasPendingChanges = true
          }

          updateRunButtonState()
        } else if (update.selectionSet) {
          updateSelection()
        }
      })
    ]
  })
}

function updateSelection() {
  const selectedFrom = editor.state.doc.lineAt(
    editor.state.selection.ranges[editor.state.selection.mainIndex].from
  ).number - 1

  const selectedTo = editor.state.doc.lineAt(
    editor.state.selection.ranges[editor.state.selection.mainIndex].to
  ).number - 1

  const outputNodes = document.querySelector('#OUTPUT').childNodes

  outputNodes.forEach(code => {
    const thisNode = code
    if (thisNode.getAttribute) {
      const fromLine = Number.parseInt(thisNode.getAttribute('data-from-line'), 10)
      const toLine = Number.parseInt(thisNode.getAttribute('data-to-line'), 10)
      if ((fromLine <= selectedTo) && (toLine >= selectedFrom)) {
        code.classList.add('highlight')
        code.scrollIntoView({ block: 'nearest', inline: 'start' })
      } else {
        code.classList.remove('highlight')
      }
    }
  })
}

function renderTabs() {
  tabsField.innerHTML = ''
  const openSlots = getOpenSlots()

  if (openSlots.length === 0) {
    return
  }

  if (!openSlots.includes(Number.parseInt(lastTab, 10))) {
    lastTab = openSlots[0]
    setActiveSlot(lastTab)
  }

  openSlots.forEach((ID) => {
    const wrapper = document.createElement('div')
    wrapper.className = 'tab-pill'

    const radioInput = document.createElement('input')
    radioInput.type = 'radio'
    radioInput.value = ID
    radioInput.name = 'sessionTab'
    radioInput.id = 'tab' + ID
    radioInput.checked = Number.parseInt(lastTab, 10) === ID
    wrapper.appendChild(radioInput)

    const label = document.createElement('label')
    label.htmlFor = 'tab' + ID
    label.id = 'tabL' + ID
    wrapper.appendChild(label)

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'tab-close'
    closeBtn.dataset.slot = String(ID)
    closeBtn.title = 'Close tab'
    closeBtn.textContent = 'x'
    wrapper.appendChild(closeBtn)

    tabsField.appendChild(wrapper)
    sessionNames[ID] = setSessionName(ID)
  })
}

function getOpenSlots() {
  return storageController.getOpenSlots()
}

function closeTab(slot) {
  if (!beginStorageWrite()) {
    return
  }

  const slotDocId = storageState.index.slotDocIds[slot - 1]
  if (!slotDocId) {
    return
  }

  storageState.index.slotDocIds[slot - 1] = null
  sessions[slot] = null
  sessionNames[slot] = null
  syncOpenTabsFromSlots()

  let openSlots = getOpenSlots()
  if (openSlots.length === 0) {
    const fallback = Math.max(1, Math.min(numberOfSessions, storageState.index.activeSlot || 1))
    const newDocId = createDocument(generateDefaultDocumentName(), '')
    if (newDocId) {
      storageState.index.slotDocIds[fallback - 1] = newDocId
      syncOpenTabsFromSlots()
      openSlots = getOpenSlots()
    }
  }

  if (openSlots.length > 0 && Number.parseInt(lastTab, 10) === slot) {
    const nextSlot = openSlots[0]
    lastTab = nextSlot
    storageState.index.activeSlot = nextSlot
    storageState.index.activeTabId = storageState.index.slotDocIds[nextSlot - 1]
    if (!sessions[nextSlot]) {
      sessions[nextSlot] = createState(nextSlot)
    }
    editor.setState(sessions[nextSlot])
    editor.focus()
  }

  persistStorageIndex()
  renderTabs()
  refreshDocumentsMenu()
}

function getSessionText(ID) {
  return storageController.getSessionText(ID)
}

function setSessionName(ID) {
  const docId = storageState.index.slotDocIds[ID - 1]
  const doc = docId ? storageState.docsById[docId] : null
  const label = document.getElementById('tabL' + ID)
  if (!label) {
    return doc?.name || null
  }

  if (doc) {
    const noteBookName = doc.name || `Notebook ${ID}`
    label.innerHTML = noteBookName.length > 16 ? noteBookName.slice(0, 15).trim() + '…' : noteBookName
    label.title = noteBookName
    return noteBookName
  }

  label.innerHTML = '.'
  label.title = 'Empty'
  return null
}

function saveSession(sessionID) {
  const thisSession = sessions[sessionID]
  if (thisSession !== null) {
    const textToSave = thisSession.doc.toString().replace(/\r\n/g, '\n')
    setSessionText(sessionID, textToSave)
    sessionNames[sessionID] = setSessionName(sessionID)
  }
}

function setSessionText(ID, text) {
  if (!beginStorageWrite()) {
    return false
  }

  const normalizedText = String(text ?? '').replace(/\r\n/g, '\n')
  let docId = storageState.index.slotDocIds[ID - 1]

  if (normalizedText.trim() === '') {
    if (docId) {
      localStorage.removeItem(getDocStorageKey(docId))
      delete storageState.docsById[docId]
      storageState.index.slotDocIds[ID - 1] = null
      syncOpenTabsFromSlots()
    }
  } else {
    if (!docId) {
      docId = `doc-${ID}-${Date.now()}`
      storageState.index.slotDocIds[ID - 1] = docId
    }

    const previous = storageState.docsById[docId]
    const nextDoc = {
      id: docId,
      name: previous?.name || generateDefaultDocumentName(),
      content: normalizedText,
      createdAt: previous?.createdAt || Date.now(),
      updatedAt: Date.now()
    }

    storageState.docsById[docId] = nextDoc
    localStorage.setItem(getDocStorageKey(docId), JSON.stringify(nextDoc))
    syncOpenTabsFromSlots()
  }

  storageState.index.activeTabId = storageState.index.slotDocIds[storageState.index.activeSlot - 1] || null
  persistStorageIndex()
  renderTabs()
  refreshDocumentsMenu()
  return true
}

function setActiveSlot(ID) {
  if (!beginStorageWrite()) {
    return
  }

  const numericID = Number.parseInt(ID, 10)
  const clamped = Number.isFinite(numericID)
    ? Math.max(1, Math.min(numberOfSessions, numericID))
    : 1

  storageState.index.activeSlot = clamped
  storageState.index.activeTabId = storageState.index.slotDocIds[clamped - 1] || null
  persistStorageIndex()

  localStorage.setItem(LEGACY_LAST_TAB_KEY, String(clamped))
  refreshDocumentsMenu()
}

function sendWorkToMathWorker(mathExpressions) {
  hasPendingChanges = false
  updateRunButtonState()

  if (mathExpressions !== '') {
    const expressions = mathExpressions.replace(/\r?\n/g, '\n')
    const request = { expr: expressions }
    mathWorker.postMessage(JSON.stringify(request))
  }
}

function runCurrentDocument() {
  if (!editor || !editor.state) {
    return
  }

  clearTimeout(timer)
  const text = editor.state.doc.toString()
  sendWorkToMathWorker(text)
}

function updateRunButtonState() {
  if (!runNowButton) {
    return
  }

  runNowButton.textContent = hasPendingChanges ? 'Run now *' : 'Run now'
  runNowButton.title = hasPendingChanges
    ? 'Run pending changes (Cmd/Ctrl+Enter)'
    : 'Run now (Cmd/Ctrl+Enter)'
}

function getEditorThemeExtension() {
  const shouldUseDark = themeMode === 'dark' || (themeMode === 'auto' && colorSchemeMedia.matches)
  return shouldUseDark ? oneDark : []
}

function applyThemeToAllSessions() {
  const activeSlot = Number.parseInt(lastTab, 10)
  const themeExtension = getEditorThemeExtension()

  listOfSessions.forEach((ID) => {
    if (!sessions[ID] || ID === activeSlot) {
      return
    }

    const transaction = sessions[ID].update({
      effects: themeCompartment.reconfigure(themeExtension)
    })
    sessions[ID] = transaction.state
  })

  if (editor) {
    editor.dispatch({ effects: themeCompartment.reconfigure(themeExtension) })
    sessions[activeSlot] = editor.state
  }
}

function bindColorSchemeListener() {
  const onThemeChange = () => {
    if (themeMode === 'auto') {
      applyThemeToAllSessions()
    }
  }

  if (typeof colorSchemeMedia.addEventListener === 'function') {
    colorSchemeMedia.addEventListener('change', onThemeChange)
  } else if (typeof colorSchemeMedia.addListener === 'function') {
    colorSchemeMedia.addListener(onThemeChange)
  }
}

function queuePlotResize() {
  clearTimeout(plotResizeTimer)
  plotResizeTimer = setTimeout(resizeAllPlots, 80)
}

function resizePlot(plotNode) {
  if (!plotNode || !plotNode.classList.contains('js-plotly-plot')) {
    return
  }

  try {
    Plotly.Plots.resize(plotNode)
  } catch (error) {
    // Ignore transient resize errors when the plot container is hidden.
  }
}

function resizeAllPlots() {
  const plots = outputs.querySelectorAll('.js-plotly-plot')
  plots.forEach(plotNode => resizePlot(plotNode))
}

function bindPlotResizeHandlers() {
  window.addEventListener('resize', queuePlotResize)

  if (typeof ResizeObserver === 'function') {
    const outputObserver = new ResizeObserver(() => queuePlotResize())
    outputObserver.observe(outputs)
  }

  if (typeof MutationObserver === 'function') {
    const bodyObserver = new MutationObserver(() => queuePlotResize())
    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    })
  }
}

onFragmentChange((code) => {
  const targetSlot = findEmptySession() || lastTab
  setSessionText(targetSlot, code)
  setActiveSlot(targetSlot)
  lastTab = targetSlot
  sessions[targetSlot] = createState(targetSlot)
  editor.setState(sessions[targetSlot])
  renderTabs()
  clearFragment()
})

function findEmptySession() {
  for (let ID of listOfSessions) {
    const text = getSessionText(ID)
    if (text.trim() === '') {
      return ID
    }
  }
  return null
}

function refreshDocumentsMenu() {
  if (!documentsSelect) {
    return
  }

  const sortedDocs = Object.values(storageState.docsById)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const selected = documentsSelect.value
  documentsSelect.innerHTML = ''

  sortedDocs.forEach((doc) => {
    const option = document.createElement('option')
    option.value = doc.id
    option.textContent = doc.name || doc.id
    documentsSelect.appendChild(option)
  })

  const activeDocId = storageState.index.slotDocIds[Number.parseInt(lastTab, 10) - 1]
  if (activeDocId && storageState.docsById[activeDocId]) {
    documentsSelect.value = activeDocId
  } else if (selected && storageState.docsById[selected]) {
    documentsSelect.value = selected
  }
}

function openDocumentInSlot(docId, slot) {
  if (!storageState.docsById[docId]) {
    return
  }

  if (!beginStorageWrite()) {
    return
  }

  const existingSlot = listOfSessions.find(ID => storageState.index.slotDocIds[ID - 1] === docId)
  const targetSlot = existingSlot || Math.max(1, Math.min(numberOfSessions, slot))

  storageState.index.slotDocIds[targetSlot - 1] = docId
  syncOpenTabsFromSlots()

  persistStorageIndex()
  sessionNames[targetSlot] = setSessionName(targetSlot)
  sessions[targetSlot] = createState(targetSlot)
  lastTab = targetSlot
  editor.setState(sessions[targetSlot])
  editor.focus()
  renderTabs()
  refreshDocumentsMenu()
}

function openNewTab() {
  const slot = findEmptySession() || Number.parseInt(lastTab, 10)
  const docId = createDocument(generateDefaultDocumentName(), '')
  if (!docId) {
    return
  }

  openDocumentInSlot(docId, slot)
}

function createDocument(name, content) {
  if (!beginStorageWrite()) {
    return null
  }

  const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const uniqueName = generateUniqueDocumentName(name)
  const now = Date.now()
  const doc = {
    id: docId,
    name: uniqueName,
    content: content || '',
    createdAt: now,
    updatedAt: now
  }

  storageState.docsById[docId] = doc
  localStorage.setItem(getDocStorageKey(docId), JSON.stringify(doc))
  storageState.index.openTabs.push(docId)
  persistStorageIndex()
  refreshDocumentsMenu()
  return docId
}

function renameDocument(docId, requestedName) {
  const doc = storageState.docsById[docId]
  if (!doc) {
    return
  }

  if (!beginStorageWrite()) {
    return
  }

  const baseName = String(requestedName || '').trim() || generateDefaultDocumentName()
  const uniqueName = generateUniqueDocumentName(baseName, docId)
  doc.name = uniqueName
  doc.updatedAt = Date.now()
  localStorage.setItem(getDocStorageKey(docId), JSON.stringify(doc))
  persistStorageIndex()

  listOfSessions.forEach((slot) => {
    if (storageState.index.slotDocIds[slot - 1] === docId) {
      sessionNames[slot] = setSessionName(slot)
    }
  })

  renderTabs()
  refreshDocumentsMenu()
}

function deleteDocument(docId) {
  if (!storageState.docsById[docId]) {
    return
  }

  if (!beginStorageWrite()) {
    return
  }

  localStorage.removeItem(getDocStorageKey(docId))
  delete storageState.docsById[docId]

  storageState.index.slotDocIds = storageState.index.slotDocIds.map(id => id === docId ? null : id)
  syncOpenTabsFromSlots()

  listOfSessions.forEach((slot) => {
    sessionNames[slot] = setSessionName(slot)
    if (storageState.index.slotDocIds[slot - 1] === null) {
      sessions[slot] = null
    }
  })

  const nextOpen = getOpenSlots()[0]
  if (nextOpen) {
    storageState.index.activeSlot = nextOpen
    storageState.index.activeTabId = storageState.index.slotDocIds[nextOpen - 1]
    lastTab = nextOpen
    if (!sessions[nextOpen]) {
      sessions[nextOpen] = createState(nextOpen)
    }
    editor.setState(sessions[nextOpen])
    editor.focus()
  } else {
    ensureAtLeastOneOpenTab()
    lastTab = storageState.index.activeSlot
    sessions[lastTab] = createState(lastTab)
    editor.setState(sessions[lastTab])
  }

  persistStorageIndex()
  renderTabs()
  refreshDocumentsMenu()
}

function generateDefaultDocumentName() {
  return storageController.generateDefaultDocumentName()
}

function generateUniqueDocumentName(baseName, ignoreDocId = null) {
  return storageController.generateUniqueDocumentName(baseName, ignoreDocId)
}

function beginStorageWrite() {
  return storageController.beginStorageWrite()
}

function persistStorageIndex() {
  storageController.persistStorageIndex()
}

function getDocStorageKey(docId) {
  return storageController.getDocStorageKey(docId)
}

function syncOpenTabsFromSlots() {
  storageController.syncOpenTabsFromSlots()
}
