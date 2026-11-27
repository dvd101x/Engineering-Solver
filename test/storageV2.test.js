import test from 'node:test'
import assert from 'node:assert/strict'
import { createStorageV2 } from '../ext/storageV2.js'

function createLocalStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues))
  return {
    get length() {
      return values.size
    },
    getItem(key) {
      return values.get(String(key)) ?? null
    },
    setItem(key, value) {
      values.set(String(key), String(value))
    },
    removeItem(key) {
      values.delete(String(key))
    },
    key(index) {
      return [...values.keys()][index] ?? null
    }
  }
}

function createStorage() {
  return createStorageV2({
    maxSlots: 2,
    listOfSessions: [1, 2]
  })
}

test('closed documents remain in the catalog and survive a reload', (t) => {
  const previousStorage = globalThis.localStorage
  globalThis.localStorage = createLocalStorage({
    'solver:v2:index': JSON.stringify({
      version: 2,
      slotDocIds: ['document-1', null],
      openTabs: ['document-1'],
      activeSlot: 1
    }),
    'solver:v2:doc:document-1': JSON.stringify({
      id: 'document-1',
      name: 'Saved notebook',
      content: '2 + 2',
      createdAt: 1,
      updatedAt: 1
    })
  })
  t.after(() => {
    if (previousStorage === undefined) {
      delete globalThis.localStorage
    } else {
      globalThis.localStorage = previousStorage
    }
  })

  const storage = createStorage()
  storage.state.index.slotDocIds[0] = null
  storage.syncOpenTabsFromSlots()
  storage.persistStorageIndex()

  const reloadedStorage = createStorage()

  assert.equal(reloadedStorage.state.docsById['document-1'].content, '2 + 2')
  assert.deepEqual(reloadedStorage.state.index.documentIds, ['document-1'])
  assert.deepEqual(reloadedStorage.getOpenSlots(), [])
})

test('documents orphaned by an older index are recovered from local storage', (t) => {
  const previousStorage = globalThis.localStorage
  globalThis.localStorage = createLocalStorage({
    'solver:v2:index': JSON.stringify({
      version: 2,
      slotDocIds: [null, null],
      openTabs: [],
      activeSlot: 1
    }),
    'solver:v2:doc:orphaned-document': JSON.stringify({
      id: 'orphaned-document',
      name: 'Previously closed',
      content: '3 + 4',
      createdAt: 1,
      updatedAt: 1
    })
  })
  t.after(() => {
    if (previousStorage === undefined) {
      delete globalThis.localStorage
    } else {
      globalThis.localStorage = previousStorage
    }
  })

  const storage = createStorage()

  assert.equal(storage.state.docsById['orphaned-document'].content, '3 + 4')
  assert.deepEqual(storage.state.index.documentIds, ['orphaned-document'])
})

test('empty documents left behind by an older version are discarded', (t) => {
  const previousStorage = globalThis.localStorage
  globalThis.localStorage = createLocalStorage({
    'solver:v2:index': JSON.stringify({
      version: 2,
      slotDocIds: [null, null],
      openTabs: [],
      documentIds: ['empty-document'],
      activeSlot: 1
    }),
    'solver:v2:doc:empty-document': JSON.stringify({
      id: 'empty-document',
      name: 'Empty notebook',
      content: ' \n ',
      createdAt: 1,
      updatedAt: 1
    })
  })
  t.after(() => {
    if (previousStorage === undefined) {
      delete globalThis.localStorage
    } else {
      globalThis.localStorage = previousStorage
    }
  })

  const storage = createStorage()

  assert.deepEqual(storage.state.index.documentIds, [])
  assert.deepEqual(storage.state.docsById, {})
  assert.equal(globalThis.localStorage.getItem('solver:v2:doc:empty-document'), null)
})
