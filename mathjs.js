import {
    LRLanguage,
    LanguageSupport,
    foldInside,
    foldNodeProp,
    syntaxTree
} from '@codemirror/language'
import { styleTags, tags as t } from '@lezer/highlight'

import { parser } from './lib/mathjs-parser.js'

const KEYWORDS = ['to', 'in', 'and', 'not', 'or', 'xor', 'mod']
const IDENTIFIER_START = /[_A-Za-z\xa1-\uffff]/
const IDENTIFIER_BODY = /^[_A-Za-z\xa1-\uffff][_A-Za-z0-9\xa1-\uffff]*$/

const mathjsParser = parser.configure({
    props: [
        foldNodeProp.add({
            Group: foldInside
        }),
        styleTags({
            Number: t.number,
            String: t.string,
            Keyword: t.keyword,
            Identifier: t.variableName,
            Operator: t.operator,
            LineComment: t.lineComment,
            BlockComment: t.blockComment
        })
    ]
})

export const mathjsLanguage = LRLanguage.define({
    name: 'mathjs',
    parser: mathjsParser,
    languageData: {
        closeBrackets: {
            brackets: ['(', '[', '{', '"', "'"]
        },
        commentTokens: {
            line: '#',
            block: { open: '#{', close: '#}' }
        },
        indentOnInput: /^\s*[\]\)\}]$/,
        // Math.js identifiers support '$', and expressions commonly use these as symbol suffixes.
        wordChars: '$'
    }
})

/**
 * Create a CodeMirror 6 language support extension for mathjs
 *
 * @param {function} getWorkerState - A function that gets a mathjs instance properties for the parser.
 * @param {function} getParserState - A function that returns a mathjs scope.
 * @returns {LanguageSupport} A CodeMirror 6 language support extension.
 */
export function mathjs(getWorkerState, getParserState) {
    let cachedWorkerState = null
    let cachedWorkerData = null

    const autocompleteSource = (context) => {
        if (isBlockedContext(context)) {
            return null
        }

        const completionContext = getCompletionContext(context)
        if (!completionContext) {
            return null
        }

        const { from, prefix, propertyPath } = completionContext
        if (prefix.length > 0 && !IDENTIFIER_START.test(prefix[0])) {
            return null
        }

        const workerData = getWorkerData()
        const parserState = getParserState()
        const parserSymbols = Object.keys(parserState)
        const optionsByLabel = new Map()

        const pushOption = (label, type, boost = 0) => {
            if (!IDENTIFIER_BODY.test(label) || !label.startsWith(prefix)) {
                return
            }

            const existing = optionsByLabel.get(label)
            if (!existing || boost > (existing.boost || 0)) {
                optionsByLabel.set(label, { label, type, boost })
            }
        }

        if (propertyPath) {
            const target = resolvePropertyTarget(parserState, propertyPath)
            const propertyKeys = getObjectCompletionKeys(target)
            propertyKeys.forEach((key) => pushOption(key, 'property', 140))
        } else {
            KEYWORDS.forEach((keyword) => pushOption(keyword, 'keyword', 20))
            parserSymbols.forEach((symbol) => pushOption(symbol, 'property', 100))
            workerData.mathFunctions.forEach((func) => pushOption(func, 'function', 70))
            workerData.mathPhysicalConstants.forEach((constant) => pushOption(constant, 'constant', 60))
            workerData.numberLiterals.forEach((number) => pushOption(number, 'variable', 30))
            workerData.listOfUnits.forEach((unit) => pushOption(unit, 'enum', 40))
        }

        const options = Array.from(optionsByLabel.values())
        if (options.length === 0) {
            return null
        }

        return {
            from,
            options,
            validFor: /^[_A-Za-z\xa1-\uffff][_A-Za-z0-9\xa1-\uffff]*$/
        }
    }

    return new LanguageSupport(mathjsLanguage, [
        mathjsLanguage.data.of({
            autocomplete: autocompleteSource
        })
    ])

    function isBlockedContext(context) {
        const nodeName = syntaxTree(context.state).resolveInner(context.pos, -1).name
        if (nodeName === 'LineComment' || nodeName === 'BlockComment' || nodeName === 'String') {
            return true
        }

        return false
    }

    function getCompletionContext(context) {
        const word = context.matchBefore(/[_A-Za-z\xa1-\uffff][_A-Za-z0-9\xa1-\uffff]*/)
        const line = context.state.doc.lineAt(context.pos)
        const linePrefix = line.text.slice(0, context.pos - line.from)

        if (word && (word.from !== word.to || context.explicit)) {
            const from = word.from
            const prefix = word.text
            const beforeWord = line.text.slice(0, from - line.from)
            const propertyPath = extractPropertyPath(beforeWord)

            return { from, prefix, propertyPath }
        }

        if (!context.explicit) {
            return null
        }

        const propertyPath = extractPropertyPath(linePrefix)
        if (!propertyPath) {
            return null
        }

        return {
            from: context.pos,
            prefix: '',
            propertyPath
        }
    }

    function extractPropertyPath(textBeforeCursor) {
        const normalized = textBeforeCursor.replace(/\s+$/, '')
        if (!normalized.endsWith('.') && !normalized.endsWith('?.')) {
            return null
        }

        const markerLength = normalized.endsWith('?.') ? 2 : 1
        const expression = normalized.slice(0, -markerLength)

        return parseResolvablePropertyExpression(expression)
    }

    function parseResolvablePropertyExpression(expression) {
        let pos = 0
        const parts = []

        const skipSpaces = () => {
            while (pos < expression.length && /\s/.test(expression[pos])) {
                pos++
            }
        }

        const parseIdentifierAt = () => {
            const remaining = expression.slice(pos)
            const match = remaining.match(/^[_A-Za-z\xa1-\uffff][_A-Za-z0-9\xa1-\uffff]*/)
            if (!match) {
                return null
            }

            pos += match[0].length
            return match[0]
        }

        const parseQuotedString = (quote) => {
            let value = ''
            pos++

            while (pos < expression.length) {
                const char = expression[pos]
                if (char === '\\') {
                    if (pos + 1 >= expression.length) {
                        return null
                    }

                    value += expression[pos + 1]
                    pos += 2
                    continue
                }

                if (char === quote) {
                    pos++
                    return value
                }

                value += char
                pos++
            }

            return null
        }

        skipSpaces()
        const first = parseIdentifierAt()
        if (!first) {
            return null
        }
        parts.push(first)

        while (pos < expression.length) {
            skipSpaces()
            if (pos >= expression.length) {
                break
            }

            if (expression.startsWith('?.', pos)) {
                pos += 2
                skipSpaces()
                const id = parseIdentifierAt()
                if (!id) {
                    return null
                }
                parts.push(id)
                continue
            }

            if (expression[pos] === '.') {
                pos++
                skipSpaces()
                const id = parseIdentifierAt()
                if (!id) {
                    return null
                }
                parts.push(id)
                continue
            }

            if (expression[pos] === '[') {
                pos++
                skipSpaces()

                const quote = expression[pos]
                if (quote !== '"' && quote !== "'") {
                    return null
                }

                const key = parseQuotedString(quote)
                if (key === null) {
                    return null
                }

                skipSpaces()
                if (expression[pos] !== ']') {
                    return null
                }
                pos++

                if (!IDENTIFIER_BODY.test(key)) {
                    return null
                }
                parts.push(key)
                continue
            }

            return null
        }

        return parts
    }

    function resolvePropertyTarget(scope, path) {
        let target = scope
        for (const segment of path) {
            if (!isObjectLike(target) || !hasOwnPropertySafe(target, segment)) {
                return null
            }
            target = target[segment]
        }

        return target
    }

    function getObjectCompletionKeys(value) {
        if (!isObjectLike(value)) {
            return []
        }

        return Object.keys(value).filter((key) => IDENTIFIER_BODY.test(key))
    }

    function isObjectLike(value) {
        return value !== null && (typeof value === 'object' || typeof value === 'function')
    }

    function getWorkerData() {
        const workerState = getWorkerState()
        if (workerState === cachedWorkerState && cachedWorkerData !== null) {
            return cachedWorkerData
        }

        const mathFunctions = workerState.functions || []
        const mathPhysicalConstants = workerState.physicalConstants || []
        const numberLiterals = workerState.numberLiterals || []

        const listOfUnits = new Set()
        const prefixes = workerState.prefixes || []
        const units = workerState.units || {}

        for (const unitName in units) {
            if (!hasOwnPropertySafe(units, unitName)) {
                continue
            }

            const unitPrefixes = units[unitName] || []
            unitPrefixes.forEach((prefixIndex) => {
                const prefix = prefixes[prefixIndex]
                if (typeof prefix === 'string') {
                    listOfUnits.add(prefix + unitName)
                }
            })
        }

        cachedWorkerState = workerState
        cachedWorkerData = {
            mathFunctions,
            mathPhysicalConstants,
            numberLiterals,
            listOfUnits: Array.from(listOfUnits)
        }

        return cachedWorkerData
    }
}

// helper function to safely check whether an object has a property
// copy from the function in object.js which is ES6
function hasOwnPropertySafe(object, property) {
    return object && Object.hasOwnProperty.call(object, property)
}