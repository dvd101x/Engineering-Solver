import './style.css'

import initialState from './ext/initialState.js'
import { findBlockIndexForLine, mergeBlocksForExpressions, splitIntoBlocks, sumExecutionTimesByBlock } from './ext/blockExecution.js'
import { createExecutionState, getDocumentActivationState } from './ext/executionState.js'

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
const mathWorker = new Worker(new URL('./mathWorker.js', import.meta.url), { type: 'module' })
mathWorker.onerror = (event) => {
  outputs.textContent = `Math worker failed: ${event.message}`
}
const shareLinkButton = document.getElementById('shareLink')
const runNowButton = document.getElementById('runNowButton')

const documentsSelect = document.getElementById('documentsSelect')
const docOpenButton = document.getElementById('docOpen')
const docNewButton = document.getElementById('docNew')
const docRenameButton = document.getElementById('docRename')
const docDeleteButton = document.getElementById('docDelete')
const docDownloadButton = document.getElementById('docDownload')

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
let outputNeedsRun = false
let themeMode = localStorage.getItem(THEME_MODE_STORAGE_KEY) || 'auto'
const themeCompartment = new Compartment()
const colorSchemeMedia = window.matchMedia('(prefers-color-scheme: dark)')
let plotResizeTimer
const tabUnsavedChanges = new Map() // Track unsaved changes per tab
let blockExecutionData = null // Track blocks and execution timing
const executionState = createExecutionState()
let initialWelcomeRequestId = null

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

  // Save unsaved state of current tab before switching
  sessions[lastTab] = editor.state
  tabUnsavedChanges.set(lastTab, hasPendingChanges)
  saveSession(lastTab)

  editor.setState(sessions[ID])
  editor.focus()

  setActiveSlot(ID)
  lastTab = ID

  // Restore unsaved state for the new tab
  hasPendingChanges = tabUnsavedChanges.get(ID) || false
  refreshOutputForActiveDocument()
  updateRunButtonState()

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

  // Check if tab has unsaved changes
  const hasUnsaved = tabUnsavedChanges.get(slot) || false
  if (hasUnsaved) {
    const docName = sessionNames[slot] || `Tab ${slot}`
    const shouldClose = confirm(`"${docName}" has unsaved changes. Close anyway?`)
    if (!shouldClose) {
      return
    }
  }

  closeTab(slot)
})

document.body.addEventListener('solver-ui-autorun-changed', (event) => {
  isAutoRunEnabled = Boolean(event.detail?.value)
  localStorage.setItem(AUTO_RUN_STORAGE_KEY, isAutoRunEnabled ? '1' : '0')
  updateRunButtonState()

  if (isAutoRunEnabled && (hasPendingChanges || outputNeedsRun)) {
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

  // Check if document is already open in another tab
  const existingSlot = listOfSessions.find(ID => storageState.index.slotDocIds[ID - 1] === docId)
  if (existingSlot) {
    if (existingSlot === Number.parseInt(lastTab, 10)) {
      return
    }
    // Switch to existing tab
    sessions[lastTab] = editor.state
    tabUnsavedChanges.set(lastTab, hasPendingChanges)
    if (editor.state.doc.toString().trim()) {
      saveSession(lastTab)
    }
    if (!sessions[existingSlot]) {
      sessions[existingSlot] = createState(existingSlot)
    }
    setActiveSlot(existingSlot)
    lastTab = existingSlot
    editor.setState(sessions[existingSlot])
    editor.focus()
    refreshOutputForActiveDocument()
    renderTabs()
    refreshDocumentsMenu()
    return
  }

  // Find empty tab or create new one
  const emptySlot = findEmptySession()
  if (emptySlot) {
    openDocumentInSlot(docId, emptySlot)
  } else {
    // All tabs have content, create a new tab
    openNewTab(docId)
  }
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

docDownloadButton.addEventListener('click', () => {
  const activeDocId = storageState.index.slotDocIds[Number.parseInt(lastTab, 10) - 1]
  const activeDoc = activeDocId ? storageState.docsById[activeDocId] : null
  const baseName = (activeDoc?.name || sessionNames[lastTab] || `Notebook ${lastTab}`)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/^\.+|\.+$/g, '') || 'notebook'
  const downloadUrl = URL.createObjectURL(new Blob([editor.state.doc.toString()], {
    type: 'text/plain;charset=utf-8'
  }))
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = `${baseName}.txt`
  link.click()
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 0)
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
  if (results.requestId === undefined && !results.error) {
    if (initialWelcomeRequestId !== null && executionState.isCurrent(initialWelcomeRequestId)) {
      const welcome = document.createElement('div')
      welcome.innerHTML = md.render(results.outputs[0].text)
      outputs.replaceChildren(welcome)
    }
    return
  }
  if (results.requestId !== undefined && !executionState.isCurrent(results.requestId)) {
    return
  }
  if (results.error) {
    outputs.textContent = results.error
    return
  }
  const tabToSave = lastTab
  outputs.innerHTML = ''

  if (blockExecutionData) {
    const expressions = results.outputs.flatMap(out => out.type === 'math' ? out.text : [])
    const merged = mergeBlocksForExpressions(
      blockExecutionData.source,
      blockExecutionData.blockLineRanges,
      expressions
    )
    blockExecutionData.blocks = merged.blocks
    blockExecutionData.blockLineRanges = merged.blockLineRanges
    blockExecutionData.blockTimes = sumExecutionTimesByBlock(
      blockExecutionData.blockLineRanges,
      expressions
    )
  }

  // Match each rendered item to its source block.
  let lastDisplayedBlockIndex = -1
  let currentPre = null
  const displayBlockForLine = (line) => {
    const blockIndex = findBlockIndexForLine(blockExecutionData?.blockLineRanges || [], line)
    if (blockIndex !== -1 && blockIndex !== lastDisplayedBlockIndex) {
      lastDisplayedBlockIndex = blockIndex
      currentPre = null
      displayBlockHeader(blockIndex)
    }
    return blockIndex
  }

  results.outputs.forEach((out) => {
    // Display the output
    switch (out.type) {
      case 'math':
        out.text.forEach(e => {
          const blockIndex = displayBlockForLine(e.to ?? e.from ?? 0)
          if (!currentPre) {
            currentPre = document.createElement('pre')
            currentPre.className = 'output-block'
            const range = blockExecutionData?.blockLineRanges[blockIndex]
            if (range) {
              currentPre.dataset.fromLine = range.start
              currentPre.dataset.toLine = range.end
            }
            outputs.appendChild(currentPre)
          }
          const code = document.createElement('code')
          code.className = 'output-expression'
          code.dataset.fromLine = e.from
          code.dataset.toLine = e.to
          code.dataset.fromOffset = e.fromOffset
          code.dataset.toOffset = e.toOffset
          if (e.visible) {
            const type = e.type
            const value = e.result
            let div
            switch (type) {
              case 'string':
                code.innerHTML = value
                break
              case 'any':
                code.textContent = value
                break
              case 'error':
                code.style.color = 'red'
                code.innerHTML = value
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
                code.appendChild(div)
                break
            }
          } else {
            code.hidden = true
          }
          currentPre.appendChild(code)
        })
        break
      case 'markdown': {
        displayBlockForLine(out.to ?? out.from ?? 0)
        currentPre = null
        const div = document.createElement('div')
        div.className = 'output-markdown'
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
  const docIdToSave = storageState.index.slotDocIds[tabToSave - 1]
  timerSave = setTimeout(() => {
    if (storageState.index.slotDocIds[tabToSave - 1] === docIdToSave) {
      saveSession(tabToSave)
    }
  }, waitToSave)

  if (results.mathState) {
    workerState = results.mathState
  }
  if (results.parserState) {
    parserState = results.parserState
  }
}

function displayBlockHeader(blockIndex) {
  if (!blockExecutionData || !blockExecutionData.blocks || blockIndex >= blockExecutionData.blocks.length) {
    return
  }

  const block = blockExecutionData.blocks[blockIndex]
  const header = document.createElement('div')
  header.className = 'block-header'
  header.dataset.fromLine = blockExecutionData.blockLineRanges[blockIndex].start
  header.dataset.toLine = blockExecutionData.blockLineRanges[blockIndex].end
  header.style.cssText = `
    margin: 12px 0 6px 0;
    padding: 6px 8px;
    background: rgba(0, 152, 255, 0.1);
    border-left: 3px solid #0098ff;
    font-family: monospace;
    font-size: 12px;
    color: var(--tab-text);
    line-height: 1.4;
  `

  const preview = block.length > 70 ? block.substring(0, 67) + '…' : block
  const blockNum = blockIndex + 1
  const executionTime = blockExecutionData.blockTimes
    ? blockExecutionData.blockTimes[blockIndex].toFixed(2)
    : '?'

  header.innerHTML = `<strong>Block ${blockNum}</strong> • ${executionTime}ms • <code>${preview.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '; ')}</code>`
  outputs.appendChild(header)
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
          const docIdAtChange = storageState.index.slotDocIds[slotAtChange - 1]
          executionState.invalidate()
          sessions[slotAtChange] = update.state
          clearTimeout(timerSave)
          timerSave = setTimeout(() => {
            if (storageState.index.slotDocIds[slotAtChange - 1] !== docIdAtChange) {
              return
            }
            sessions[slotAtChange] = update.state
            saveSession(slotAtChange)
          }, waitToSave)

          if (isAutoRunEnabled) {
            clearTimeout(timer)
            timer = setTimeout(sendWorkToMathWorker, wait, text)
            hasPendingChanges = false
            tabUnsavedChanges.set(slotAtChange, false)
          } else {
            hasPendingChanges = true
            tabUnsavedChanges.set(slotAtChange, true)
          }

          updateRunButtonState()
          renderTabs()
        } else if (update.selectionSet) {
          updateSelection()
        }
      })
    ]
  })
}

function updateSelection() {
  const selection = editor.state.selection.ranges[editor.state.selection.mainIndex]
  const selectedFrom = editor.state.doc.lineAt(
    selection.from
  ).number - 1

  const selectedTo = editor.state.doc.lineAt(
    selection.to
  ).number - 1

  let scrollTarget = null
  outputs.querySelectorAll('.block-header, .output-block, .output-expression, .output-markdown')
    .forEach(node => {
      const fromLine = Number.parseInt(node.dataset.fromLine, 10)
      const toLine = Number.parseInt(node.dataset.toLine, 10)
      let selected = fromLine <= selectedTo && toLine >= selectedFrom
      if (node.classList.contains('output-expression')) {
        const from = Number.parseInt(node.dataset.fromOffset, 10)
        const to = Number.parseInt(node.dataset.toOffset, 10)
        selected = selection.empty
          ? selection.from >= from && selection.from <= to
          : selection.from < to && selection.to > from
      }
      node.classList.toggle('output-selected', selected)
      if (selected && !node.hidden &&
          (node.classList.contains('output-expression') || node.classList.contains('output-markdown'))) {
        scrollTarget ||= node
      }
    })
  scrollTarget?.scrollIntoView({ block: 'nearest', inline: 'start' })
}

function renderTabs() {
  tabsField.innerHTML = ''
  const openSlots = getOpenSlots()
  const canCloseTabs = openSlots.length > 1

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

    if (canCloseTabs) {
      const closeBtn = document.createElement('button')
      closeBtn.type = 'button'
      closeBtn.className = 'tab-close'
      closeBtn.dataset.slot = String(ID)
      closeBtn.title = 'Close tab'
      closeBtn.textContent = 'x'
      wrapper.appendChild(closeBtn)
    }

    tabsField.appendChild(wrapper)
    sessionNames[ID] = setSessionName(ID)
  })
}

function getOpenSlots() {
  return storageController.getOpenSlots()
}

function closeTab(slot) {
  if (getOpenSlots().length <= 1) {
    return
  }

  if (!beginStorageWrite()) {
    return
  }

  const slotDocId = storageState.index.slotDocIds[slot - 1]
  if (!slotDocId) {
    return
  }

  const document = storageState.docsById[slotDocId]
  const content = Number.parseInt(lastTab, 10) === slot
    ? editor.state.doc.toString()
    : sessions[slot]?.doc.toString() ?? document?.content ?? ''
  if (content.trim() === '') {
    localStorage.removeItem(getDocStorageKey(slotDocId))
    delete storageState.docsById[slotDocId]
    storageController.removeDocument(slotDocId)
  } else if (document) {
    document.content = content.replace(/\r\n/g, '\n')
    document.updatedAt = Date.now()
    localStorage.setItem(getDocStorageKey(slotDocId), JSON.stringify(document))
  }

  storageState.index.slotDocIds[slot - 1] = null
  sessions[slot] = null
  sessionNames[slot] = null
  tabUnsavedChanges.delete(slot)
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
    refreshOutputForActiveDocument()
    if (isAutoRunEnabled && editor.state.doc.toString().trim() === '') {
      initialWelcomeRequestId = executionState.invalidate()
    }
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
    const unsavedIndicator = tabUnsavedChanges.get(ID) ? ' ●' : ''
    const displayName = noteBookName.length > 16 ? noteBookName.slice(0, 15).trim() + '…' : noteBookName
    label.innerHTML = displayName + unsavedIndicator
    label.title = noteBookName + (unsavedIndicator ? ' (unsaved)' : '')
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
      storageController.removeDocument(docId)
      storageState.index.slotDocIds[ID - 1] = null
      syncOpenTabsFromSlots()
    }
  } else {
    if (!docId) {
      docId = `doc-${ID}-${Date.now()}`
      storageState.index.slotDocIds[ID - 1] = docId
      storageController.addDocument(docId)
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
  outputNeedsRun = false
  tabUnsavedChanges.set(lastTab, false)
  updateRunButtonState()
  renderTabs()

  const requestId = executionState.invalidate()
  if (mathExpressions.trim() !== '') {
    const expressions = mathExpressions.replace(/\r?\n/g, '\n')
    const { blocks, blockLineRanges } = splitIntoBlocks(expressions)

    // Initialize block execution data with line ranges
    blockExecutionData = {
      source: expressions,
      blocks: blocks,
      blockLineRanges: blockLineRanges,
      blockTimes: new Array(blocks.length).fill(0),
      startTime: Date.now(),
      totalBlocks: blocks.length
    }

    const request = { expr: expressions, requestId }
    mathWorker.postMessage(JSON.stringify(request))
  } else {
    blockExecutionData = null
    outputs.textContent = 'Enter an expression to see results.'
  }
}

function refreshOutputForActiveDocument() {
  clearTimeout(timer)
  executionState.invalidate()
  blockExecutionData = null
  parserState = {}
  const state = getDocumentActivationState(isAutoRunEnabled, editor.state.doc.toString())
  outputs.textContent = state.message
  hasPendingChanges = tabUnsavedChanges.get(Number.parseInt(lastTab, 10)) || false
  outputNeedsRun = state.hasPendingChanges
  if (state.shouldRun) {
    runCurrentDocument()
  } else {
    updateRunButtonState()
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

  runNowButton.textContent = hasPendingChanges || outputNeedsRun ? 'Run now *' : 'Run now'
  runNowButton.title = hasPendingChanges || outputNeedsRun
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
  sessions[lastTab] = editor.state
  tabUnsavedChanges.set(lastTab, hasPendingChanges)
  if (editor.state.doc.toString().trim()) {
    saveSession(lastTab)
  }
  const targetSlot = findEmptySession() || lastTab
  setSessionText(targetSlot, code)
  setActiveSlot(targetSlot)
  lastTab = targetSlot
  sessions[targetSlot] = createState(targetSlot)
  tabUnsavedChanges.delete(targetSlot)
  editor.setState(sessions[targetSlot])
  refreshOutputForActiveDocument()
  renderTabs()
  clearFragment()
})

refreshOutputForActiveDocument()

function findEmptySession() {
  for (let ID of listOfSessions) {
    const text = sessions[ID]?.doc.toString() ?? getSessionText(ID)
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

  sessions[lastTab] = editor.state
  tabUnsavedChanges.set(lastTab, hasPendingChanges)
  if (targetSlot !== Number.parseInt(lastTab, 10) && editor.state.doc.toString().trim()) {
    saveSession(lastTab)
  }
  storageState.index.slotDocIds[targetSlot - 1] = docId
  syncOpenTabsFromSlots()

  persistStorageIndex()
  sessionNames[targetSlot] = setSessionName(targetSlot)
  sessions[targetSlot] = createState(targetSlot)
  tabUnsavedChanges.delete(targetSlot)
  lastTab = targetSlot
  setActiveSlot(targetSlot)
  editor.setState(sessions[targetSlot])
  editor.focus()
  refreshOutputForActiveDocument()
  renderTabs()
  refreshDocumentsMenu()
}

function openNewTab(docIdToOpen = null) {
  const slot = findEmptySession()

  // If no empty slot and we're trying to open an existing doc,
  // we need to handle this by using the current tab or closing one
  if (!slot && docIdToOpen) {
    // For safety, just use the current tab as fallback
    // (User can see the "+" button to explicitly create new tabs)
    openDocumentInSlot(docIdToOpen, Number.parseInt(lastTab, 10))
    return
  }

  if (!slot) {
    // No empty slot and no document to open - shouldn't happen with "+" button
    // but handle it gracefully by using current tab
    return
  }

  if (docIdToOpen) {
    // Opening an existing document in a new tab
    openDocumentInSlot(docIdToOpen, slot)
  } else {
    // Creating a brand new document
    const docId = createDocument(generateDefaultDocumentName(), '')
    if (!docId) {
      return
    }
    openDocumentInSlot(docId, slot)
  }
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
  storageController.addDocument(docId)
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

  const previousSlot = Number.parseInt(lastTab, 10)
  const previousDocId = storageState.index.slotDocIds[previousSlot - 1]
  sessions[lastTab] = editor.state
  tabUnsavedChanges.set(lastTab, hasPendingChanges)
  if (previousDocId !== docId && editor.state.doc.toString().trim()) {
    saveSession(lastTab)
  }
  localStorage.removeItem(getDocStorageKey(docId))
  delete storageState.docsById[docId]
  storageController.removeDocument(docId)

  storageState.index.slotDocIds = storageState.index.slotDocIds.map(id => id === docId ? null : id)
  syncOpenTabsFromSlots()

  listOfSessions.forEach((slot) => {
    sessionNames[slot] = setSessionName(slot)
    if (storageState.index.slotDocIds[slot - 1] === null) {
      sessions[slot] = null
      tabUnsavedChanges.delete(slot)
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

  if (Number.parseInt(lastTab, 10) !== previousSlot || previousDocId === docId) {
    refreshOutputForActiveDocument()
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
