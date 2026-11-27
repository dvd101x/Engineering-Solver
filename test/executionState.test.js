import test from 'node:test'
import assert from 'node:assert/strict'
import { createExecutionState, getDocumentActivationState } from '../ext/executionState.js'

test('activating a document selects the correct output for each execution mode', () => {
  const automatic = getDocumentActivationState(true, '2 + 2')
  assert.equal(automatic.shouldRun, true)
  assert.equal(automatic.hasPendingChanges, false)

  const manual = getDocumentActivationState(false, '2 + 2')
  assert.equal(manual.shouldRun, false)
  assert.equal(manual.hasPendingChanges, true)
  assert.match(manual.message, /Run now/)

  for (const autoRun of [true, false]) {
    const empty = getDocumentActivationState(autoRun, ' \n')
    assert.equal(empty.shouldRun, false)
    assert.equal(empty.hasPendingChanges, false)
    assert.match(empty.message, /Enter an expression/)
  }
})

test('responses for previous requests are invalidated on document changes and edits', () => {
  const state = createExecutionState()
  const firstRequest = state.invalidate()
  assert.equal(state.isCurrent(firstRequest), true)

  state.invalidate()
  assert.equal(state.isCurrent(firstRequest), false)

  const nextRequest = state.invalidate()
  assert.equal(state.isCurrent(firstRequest), false)
  assert.equal(state.isCurrent(nextRequest), true)
})
