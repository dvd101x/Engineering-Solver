import { parse } from "mathjs"

/**
 * Create mathjs syntax highlighting for CodeMirror
 *
 * TODO: this is using CodeMirror v5 functionality, upgrade this to v6
 *
 * @param {function} getWorkerState - A function that gets a mathjs instance properties for the parser.
 * @param {function} getParserState - A function that returns a mathjs scope.
 * @returns {object} An object with properties and methods for mathjs syntax highlighting and autocompletion in CodeMirror.
 */
export function mathjs(getWorkerState, getParserState) {
    const workerState = getWorkerState()
    const parserState = getParserState()

    function wordRegexp(words) {
        return new RegExp('^((' + words.join(')|(') + '))\\b')
    }

    const singleOperators = new RegExp("^[-+*/&|^~<>!%']")
    const singleDelimiters = new RegExp('^[([{},:=;.?]')
    const doubleOperators = new RegExp('^((==)|(!=)|(<=)|(>=)|(<<)|(>>)|(\\.[-+*/^]))')
    const doubleDelimiters = new RegExp('^((!=)|(^\\|))')
    const tripleDelimiters = new RegExp('^((>>>)|(<<<))')
    const expressionEnd = new RegExp('^[\\])]')
    const identifiers = new RegExp('^[_A-Za-z\xa1-\uffff][_A-Za-z0-9\xa1-\uffff]*')

    const mathFunctions = workerState.functions
    const mathPhysicalConstants = workerState.physicalConstants
    const numberLiterals = workerState.numberLiterals

    // generates a list of all valid units in mathjs
    let listOfUnits = []
    for (const unit in workerState.units) {
        listOfUnits.push(...workerState.units[unit].map(prefixIndex => workerState.prefixes[prefixIndex] + unit))
    }

    // remove duplicates
    listOfUnits = Array.from(new Set(listOfUnits))

    const builtins = wordRegexp(mathFunctions)

    const keywords = wordRegexp(['to', 'in', 'and', 'not', 'or', 'xor', 'mod'])

    const units = wordRegexp(Array.from(new Set(listOfUnits)))
    const physicalConstants = wordRegexp(mathPhysicalConstants)

    // tokenizers
    function tokenTranspose(stream, state) {
        if (!stream.sol() && stream.peek() === "'") {
            stream.next()
            state.tokenize = tokenBase
            return 'operator'
        }
        state.tokenize = tokenBase
        return tokenBase(stream, state)
    }

    function tokenComment(stream, state) {
        if (stream.match(/^.*#}/)) {
            state.tokenize = tokenBase
            return 'comment'
        }
        stream.skipToEnd()
        return 'comment'
    }

    function tokenBase(stream, state) {
        // whitespaces
        if (stream.eatSpace()) return null

        // Handle one line Comments
        if (stream.match('#{')) {
            state.tokenize = tokenComment
            stream.skipToEnd()
            return 'comment'
        }

        if (stream.match(/^#/)) {
            stream.skipToEnd()
            return 'comment'
        }

        // Handle Number Literals
        if (stream.match(/^[0-9.+-]/, false)) {
            if (stream.match(/^[+-]?0x[0-9a-fA-F]+[ij]?/)) {
                stream.tokenize = tokenBase
                return 'number'
            }
            if (stream.match(/^[+-]?\d*\.\d+([EeDd][+-]?\d+)?[ij]?/)) {
                return 'number'
            }
            if (stream.match(/^[+-]?\d+([EeDd][+-]?\d+)?[ij]?/)) {
                return 'number'
            }
        }
        if (stream.match(wordRegexp(numberLiterals))) {
            return 'number'
        }

        // Handle Strings
        let m = stream.match(/^"(?:[^"]|"")*("|$)/) || stream.match(/^'(?:[^']|'')*('|$)/)
        if (m) {
            return m[1] ? 'string' : 'string error'
        }

        // Handle words
        if (stream.match(keywords)) {
            return 'keyword'
        }
        if (stream.match(builtins)) {
            return 'builtin'
        }
        if (stream.match(physicalConstants)) {
            return 'tag'
        }
        if (stream.match(units)) {
            return 'attribute'
        }
        if (stream.match(identifiers)) {
            return 'variable'
        }
        if (stream.match(singleOperators) || stream.match(doubleOperators)) {
            return 'operator'
        }
        if (
            stream.match(singleDelimiters) ||
            stream.match(doubleDelimiters) ||
            stream.match(tripleDelimiters)
        ) {
            return null
        }
        if (stream.match(expressionEnd)) {
            state.tokenize = tokenTranspose
            return null
        }
        // Handle non-detected items
        stream.next()
        return 'error'
    }

    return {
        name: 'mathjs',

        startState: function () {
            return {
                tokenize: tokenBase
            }
        },

        token: function (stream, state) {
            const style = state.tokenize(stream, state)
            if (style === 'number' || style === 'variable') {
                state.tokenize = tokenTranspose
            }
            return style
        },

        languageData: {
            commentTokens: { line: '#' },
            autocomplete: (context) => myCompletions(context, parserState)
        }
    }

    function myCompletions(context) {
        let word = context.matchBefore(/\w*/)
        if (word.from == word.to && !context.explicit) return null
        let options = []

        mathFunctions.forEach((func) => options.push({ label: func, type: 'function' }))

        mathPhysicalConstants.forEach((constant) => options.push({ label: constant, type: 'constant' }))

        numberLiterals.forEach((number) => options.push({ label: number, type: 'variable' }))

        Object.keys(getParserState()).forEach(symbol => options.push({ label: symbol, type: 'property' }))

        const matchingUnits = []

        for (const prefix of workerState.prefixes) {
            if (prefix.startsWith(word.text)) {
                matchingUnits.push(prefix)
            } else if (word.text.startsWith(prefix)) {
                const unitKeyword = word.text.substring(prefix.length)
                for (const n in workerState.units) {
                    const fullUnit = prefix + n
                    if (hasOwnPropertySafe(workerState.units, n)) {

                        if (
                            !matchingUnits.includes(fullUnit) &&
                            n.startsWith(unitKeyword) &&
                            listOfUnits.includes(fullUnit)
                        ) {
                            matchingUnits.push(fullUnit)
                        }
                    }
                }
            }
        }

        matchingUnits.forEach((unit) => options.push({ label: unit, type: 'enum' }))

        return {
            from: word.from,
            options
        }
    }
}

// helper function to safely check whether an object has a property
// copy from the function in object.js which is ES6
function hasOwnPropertySafe(object, property) {
    return object && Object.hasOwnProperty.call(object, property)
}