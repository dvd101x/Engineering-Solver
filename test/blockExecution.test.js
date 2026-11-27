import test from 'node:test'
import assert from 'node:assert/strict'
import { findBlockIndexForLine, splitIntoBlocks } from '../ext/blockExecution.js'

test('splits source into non-empty blocks with zero-based line ranges', () => {
  const result = splitIntoBlocks('a = 1\nb = 2\n\n# note\n\nc = 3')

  assert.deepEqual(result, {
    blocks: ['a = 1\nb = 2', '# note', 'c = 3'],
    blockLineRanges: [
      { start: 0, end: 1 },
      { start: 3, end: 3 },
      { start: 5, end: 5 }
    ]
  })
})

test('maps expression lines to the correct block, including line zero', () => {
  const { blockLineRanges } = splitIntoBlocks('a = 1\n\nb = 2\nc = 3')

  assert.equal(findBlockIndexForLine(blockLineRanges, 0), 0)
  assert.equal(findBlockIndexForLine(blockLineRanges, 2), 1)
  assert.equal(findBlockIndexForLine(blockLineRanges, 3), 1)
  assert.equal(findBlockIndexForLine(blockLineRanges, 1), -1)
})

test('returns no blocks for blank source', () => {
  assert.deepEqual(splitIntoBlocks('\n  \n'), { blocks: [], blockLineRanges: [] })
})
