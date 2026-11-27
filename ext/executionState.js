export function createExecutionState() {
  let currentRequestId = 0

  return {
    invalidate() {
      return ++currentRequestId
    },
    isCurrent(requestId) {
      return requestId === currentRequestId
    }
  }
}

export function getDocumentActivationState(autoRun, text) {
  const hasContent = text.trim() !== ''
  if (autoRun) {
    return {
      shouldRun: hasContent,
      hasPendingChanges: false,
      message: hasContent ? 'Running document…' : 'Enter an expression to see results.'
    }
  }

  return {
    shouldRun: false,
    hasPendingChanges: hasContent,
    message: hasContent
      ? 'Press Run now or Cmd/Ctrl+Enter to run this document.'
      : 'Enter an expression, then press Run now or Cmd/Ctrl+Enter.'
  }
}
