function nodesForParse(node) {
  return node.isBlockNode ? node.blocks : [{ node, visible: true }]
}

function isEmptyNode(node) {
  return node.isConstantNode && node.value === undefined
}

function isParseError(error) {
  return error instanceof SyntaxError || (error instanceof Error && Number.isInteger(error.char))
}

function recoverExpressions(source, math) {
  const lines = source.split('\n')
  const expressions = []
  let start = 0
  let startOffset = 0

  for (let end = 0; end < lines.length; end++) {
    const text = lines.slice(start, end + 1).join('\n')
    try {
      math.parse(text)
    } catch (error) {
      if (!isParseError(error)) throw error
      continue
    }
    if (text.trim()) {
      expressions.push(...getExpressions(text, math).map(expression => ({
        ...expression,
        from: expression.from + start,
        to: expression.to + start,
        fromOffset: expression.fromOffset + startOffset,
        toOffset: expression.toOffset + startOffset
      })))
    }
    startOffset += text.length + 1
    start = end + 1
  }
  const remaining = lines.slice(start).join('\n')
  if (remaining.trim()) {
    expressions.push({
      from: start, to: lines.length - 1, source: remaining,
      fromOffset: startOffset, toOffset: startOffset + remaining.length
    })
  }
  return expressions
}

export function getExpressions(source, math) {
  let parsed
  try {
    parsed = math.parse(source)
  } catch (error) {
    if (!isParseError(error)) throw error
    return recoverExpressions(source, math)
  }

  const nodes = nodesForParse(parsed).filter(({ node }) => !isEmptyNode(node))
  const expressions = []
  let start = 0
  let line = 0

  // MathJS nodes have no source locations; match parsed prefixes against the full AST.
  for (const { node, visible } of nodes) {
    let matched = false
    for (let end = start; end <= source.length; end++) {
      if (end < source.length && source[end] !== '\n' && source[end] !== ';') continue
      const candidate = source.slice(start, end)
      let candidateNode
      try {
        candidateNode = math.parse(candidate)
      } catch (error) {
        if (!isParseError(error)) throw error
        continue
      }
      const candidateNodes = nodesForParse(candidateNode).filter(({ node }) => !isEmptyNode(node))
      if (candidateNodes.length !== 1 || candidateNodes[0].node.toString() !== node.toString()) continue

      const leadingLines = candidate.match(/^(?:[ \t\r]*\n)*/)[0].split('\n').length - 1
      const text = candidate.trim()
      const leadingCharacters = candidate.length - candidate.trimStart().length
      const trailingLines = candidate.match(/(?:\n[ \t\r]*)*$/)[0].split('\n').length - 1
      const lines = candidate.split('\n').length - 1
      expressions.push({
        from: line + leadingLines,
        to: line + lines - trailingLines,
        source: text,
        fromOffset: start + leadingCharacters,
        toOffset: start + leadingCharacters + text.length,
        node,
        visible
      })
      if (end < source.length && source[end] === '\n') line++
      line += lines
      start = end + 1
      matched = true
      break
    }
    if (!matched) {
      throw new Error(`Could not map parsed expression to source: ${node.toString()}`)
    }
  }
  return expressions
}
