export function splitIntoBlocks(code) {
  const lines = code.split('\n')
  const blocks = []
  const blockLineRanges = []
  let currentBlock = []
  let currentBlockStartLine = 0

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n'))
        blockLineRanges.push({ start: currentBlockStartLine, end: i - 1 })
        currentBlock = []
      }
      continue
    }

    if (currentBlock.length === 0) {
      currentBlockStartLine = i
    }
    currentBlock.push(lines[i])
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n'))
    blockLineRanges.push({ start: currentBlockStartLine, end: lines.length - 1 })
  }

  return { blocks, blockLineRanges }
}

export function findBlockIndexForLine(blockLineRanges, line) {
  return blockLineRanges.findIndex(range => line >= range.start && line <= range.end)
}

export function sumExecutionTimesByBlock(blockLineRanges, expressions) {
  const blockTimes = new Array(blockLineRanges.length).fill(0)

  expressions.forEach((expression) => {
    const line = expression.to ?? expression.from ?? 0
    const blockIndex = findBlockIndexForLine(blockLineRanges, line)
    if (blockIndex !== -1 && Number.isFinite(expression.executionTime)) {
      blockTimes[blockIndex] += expression.executionTime
    }
  })

  return blockTimes
}
