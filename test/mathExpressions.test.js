import test from 'node:test'
import assert from 'node:assert/strict'
import { math } from '../mathInstance.js'
import { getExpressions } from '../ext/mathExpressions.js'
import { insertExampleFunc } from '../examples.js'

test('math.parse exposes a single node or a block with per-expression visibility', () => {
  assert.equal(math.parse('2 + 3').isBlockNode, undefined)
  const parsed = math.parse('a = 1; b = 2\n a + b')
  assert.equal(parsed.isBlockNode, true)
  assert.deepEqual(parsed.blocks.map(block => block.visible), [false, true, true])
  assert.equal('location' in parsed.blocks[0].node, false)
})

test('maps semicolon-separated nodes to individual source offsets and evaluates in order', () => {
  const source = 'a = 1; b = 2; a + b'
  const expressions = getExpressions(source, math)
  assert.deepEqual(expressions.map(({ from, to, fromOffset, toOffset, visible }) =>
    ({ from, to, fromOffset, toOffset, visible })), [
    { from: 0, to: 0, fromOffset: 0, toOffset: 5, visible: false },
    { from: 0, to: 0, fromOffset: 7, toOffset: 12, visible: false },
    { from: 0, to: 0, fromOffset: 14, toOffset: 19, visible: true }
  ])
  const scope = new Map()
  assert.deepEqual(expressions.map(expression => expression.node.compile().evaluate(scope)), [1, 2, 3])
})

test('preserves multiline expressions and semicolons in strings and matrices', () => {
  const source = 's = "a;b"\narr = [1, 2; 3, 4]\nf(x) =\n  x + 1\n\nf(2)'
  const expressions = getExpressions(source, math)
  assert.deepEqual(expressions.map(({ from, to, source }) => ({ from, to, source })), [
    { from: 0, to: 0, source: 's = "a;b"' },
    { from: 1, to: 1, source: 'arr = [1, 2; 3, 4]' },
    { from: 2, to: 3, source: 'f(x) =\n  x + 1' },
    { from: 5, to: 5, source: 'f(2)' }
  ])
  for (const expression of expressions) {
    assert.equal(source.slice(expression.fromOffset, expression.toOffset), expression.source)
  }
})

test('recovers valid earlier expressions and retains incomplete input for error reporting', () => {
  const source = 'a = 1; b = 2\nc = ('
  const expressions = getExpressions(source, math)
  assert.deepEqual(expressions.map(expression => expression.source), ['a = 1', 'b = 2', 'c = ('])
  assert.deepEqual(expressions.map(({ from, to }) => ({ from, to })), [
    { from: 0, to: 0 }, { from: 0, to: 0 }, { from: 1, to: 1 }
  ])
  assert.throws(() => math.parse(expressions[2].source), SyntaxError)
})

test('does not create expressions for blank input or comments', () => {
  assert.deepEqual(getExpressions('\n # comment\n', math), [])
})

test('maps expressions in every example exposed by the interface', () => {
  const examples = [
    'basicUsage', 'units', 'matrices', 'quadraticFormula', 'strings', 'objects',
    'simplePlot', 'plot3D', 'statPlot', 'lorenz', 'coolprop', 'coolpropHigh',
    'VaporCompressionCycle', 'refCycleWithRecuperator', 'chemistry'
  ]
  for (const name of examples) {
    const cells = insertExampleFunc(name).split('\n').reduce((result, line) => {
      if (line.startsWith('# ')) {
        result.push([])
      } else {
        result[result.length - 1].push(line)
      }
      return result
    }, [[]])
    for (const cell of cells) {
      const source = cell.join('\n')
      for (const expression of getExpressions(source, math)) {
        assert.equal(source.slice(expression.fromOffset, expression.toOffset), expression.source)
      }
    }
  }
})
