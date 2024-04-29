
importScripts(
    "https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.1/math.js",
    "coolprop.js",
    "fluidProperties.js",
    "molecularMass.js"
)
const parser = math.parser()
const digits = 14

/**
 * Applies a given function to each element of an array or matrix.
 *
 * @param {Function} f - The function to apply to each element.
 * @returns {Function} - A new function that applies the given function to each element of an array or matrix.
 */
function mapped(f) {
    return math.typed({
        'Array | Matrix': X => math.map(X, x => f(x))
    })
}

// at some point mathjs lost vectorization of these functions, this is an attempt to add the function back
const functionsToVectorize =
    [
        "exp", "gamma", "square", "sqrt", "cube", "cbrt",
        "sin", "cos", "tan", "csc", "sec", "cot",
        "sinh", "cosh", "tanh", "csch", "sech", "coth",
        "asin", "acos", "atan", "acsc", "asec", "acot",
        "asinh", "acosh", "atanh", "acsch", "asech", "acoth"
    ]

math.import(
    {
        props, HAprops, phase, MM,
        plot: math.typed({
            'Array, Object, Object': plot,
            'Array, Object': (data, layout) => plot(data, layout, {}),
            'Array': data => plot(data, {}, {}),
        }),
        ...Object.fromEntries(functionsToVectorize.map(f => [f, mapped(math[f])])),
        log: math.typed({
            'Array | Matrix': x => math.map(x, x1 => math.log(x1, math.e)),
            'Array | Matrix, number': (x, base) => math.map(x, x1 => math.log(x1, base))
        })
    }
    , { override: false })

math.createUnit('TR', '12e3 BTU/h')

const intro = `# Intro

* Type on the input to get results

# Markdown

* Start markdown with \`# \`
* Write inline equations with \`$\`
* Write block equations with \`$$\`
`

const firstResponse = {
    outputs: [{ type: "markdown", text: intro }]
}

postMessage(JSON.stringify(firstResponse));

onmessage = (oEvent) => {
    const inputs = JSON.parse(oEvent.data);
    const response = {
        outputs: makeDoc(inputs.expr),
        mathState: getMathState(),
        parserState: parser.getAll()
    }
    postMessage(JSON.stringify(response));
}

function makeDoc(code) {
    const splitCode = code.split('\n');
    const lineTypes = splitCode.map(line => line.startsWith('# ') ? 'md' : 'math');
    let cells = [];
    let lastType = '';
    parser.clear()
    splitCode
        .forEach((line, lineNum) => {
            if (lastType === lineTypes[lineNum]) {
                cells[cells.length - 1].source.push(line)
            }
            else {
                cells.push({ cell_type: lineTypes[lineNum], source: [line] })
            }
            lastType = lineTypes[lineNum]
        })
    let cleanCells = []
    cells.forEach(x => {
        if (x.cell_type === 'md') {
            cleanCells.push({ cell_type: 'md', source: x.source.map(e => e.slice(2)) })
        }
        else {
            const thereIsSomething = x.source.join('\n').trim();
            if (thereIsSomething) {
                cleanCells.push({ cell_type: 'math', source: x.source })
            }
        }
    })

    let output = [];

    function processOutput(content, type) {
        switch (type) {
            case "math":
                const expressions = getExpressions(content.join('\n'));
                const results = processExpressions(expressions)
                return { type: "math", text: results }
                break;
            case "md":
                return { type: "markdown", text: content.join('\n') }
                break;
        }
    }

    cleanCells.forEach(
        cell => output.push(processOutput(cell.source, cell.cell_type))
    )
    return output
}

function getMathState() {
    // will return
    // number literals, physicalConstants, functions, units, prefixes
    const ignore = ['expr', 'type']
    const numberLiterals = [
        'e', 'E', 'i', 'Infinity', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'NaN',
        'null', 'phi', 'pi', 'PI', 'SQRT1_2', 'SQRT2', 'tau', 'undefined', 'version'
    ]

    const functions = []
    const physicalConstants = []

    // based on https://github.com/josdejong/mathjs/blob/develop/bin/cli.js
    for (const expression in math.expression.mathWithTransform) {
        if (!ignore.includes(expression)) {
            if (typeof math[expression] === "function") {
                functions.push(expression)
            } else if (!numberLiterals.includes(expression)) {
                physicalConstants.push(expression)
            }
        }
    }

    prefixes = []
    for (category in math.Unit.PREFIXES) {
        prefixes.push(...Object.keys(math.Unit.PREFIXES[category]))
    }
    prefixes = Array.from(new Set(prefixes))

    units = {}
    for (unit in math.Unit.UNITS) {
        units[unit] = Object.keys(math.Unit.UNITS[unit].prefixes).map(prefix => prefixes.indexOf(prefix))
    }

    return {
        units,
        prefixes,
        numberLiterals,
        functions,
        physicalConstants
    }
}

/**
 * Extracts parsable expressions from a multiline string.
 *
 * @param {string} str - The multiline string containing expressions.
 * @returns {Array<{from: number, to: number, source: string}>} An array of objects,
 *   where each object represents a parsable expression and contains:
 *   - from: The starting line number of the expression within the original string.
 *   - to: The ending line number of the expression within the original string.
 *   - source: The actual string content of the expression.
 */
function getExpressions(str) {
    const lines = str.split('\n');
    let nextLineToParse = 0;
    const result = [];

    for (let lineID = 0; lineID < lines.length; lineID++) {
        const linesToTest = lines.slice(nextLineToParse, lineID + 1).join('\n');
        if (canBeParsed(linesToTest)) {
            if (!isEmptyString(linesToTest)) {
                result.push({ from: nextLineToParse, to: lineID, source: linesToTest });
            }
            // Start the next parsing attempt from the line after the successfully parsed expression.
            nextLineToParse = lineID + 1;
        }
    }
    // Handle any remaining lines that couldn't be parsed as expressions.
    const linesToTest = lines.slice(nextLineToParse).join('\n');
    if (!isEmptyString(linesToTest)) {
        result.push({ from: nextLineToParse, to: lines.length - 1, source: linesToTest });
    }
    return result;
}

/**
 * Determines whether a given expression can be successfully parsed.
 *
 * @param {string} expression - The expression to parse.
 * @returns {boolean} True if the expression can be parsed, false otherwise.
 */
function canBeParsed(expression) {
    try {
        math.parse(expression)
        return true
    } catch (error) {
        return false
    }
}

/**
 * Checks if a given string is empty or only contains whitespace characters.
 *
 * @param {string} str - The string to check.
 * @returns {boolean} True if the string is empty or only contains whitespace, false otherwise.
 */
function isEmptyString(str) {
    return str.trim() === ""
}

/**
 * Formats result depending on the type of result
 *
 * @param {number, string, Help, any} result - The result to format
 * @returns {Object} The formatted result  
 */
const formatResult = math.typed({
    'number': result => ({ type: "number", value: math.format(result, { precision: digits }) }),
    'string': result => ({ type: 'string', value: result }),
    'Help': result => ({ type: "help", value: math.format(result) }),
    'Object': result => {
        if (result.isPlot) {
            return { type: "plot", ...result }
        } else {
            return ({ type: "object", value:math.format(result) })
        }
    },
    'any': math.typed.referTo(
        'number',
        fnumber => result => ({ type: "any", value: fnumber(result).value })
    )
})

/**
 * Processes an array of expressions by evaluating them, formatting the results,
 * and determining their visibility.
 *
 * @param {Array<{from: number, to: number, source: string}>} expressions - An array of objects representing expressions,
 *   where each object has `from`, `to`, and `source` properties.
 * @returns {Array<{from: number, to: number, source: string, outputs: any, visible: boolean}>} An array of processed expressions,
 *   where each object has additional `outputs` and `visible` properties.
 */
function processExpressions(expressions) {
    return expressions.map(expression => {
        const result = calc(expression.source)
        const outputs = formatResult(result)
        // Determine visibility based on the result type:
        // - Undefined results are hidden.
        // - Results with an `isResultSet` property are hidden when empty.
        // - All other results are visible.
        const visible = result === undefined ? false : (result.isResultSet && result.entries.length === 0) ? false : true
        return ({
            ...expression,
            outputs,
            visible
        })
    })
}

/**
 * Evaluates a given expression using a parser.
 *
 * @param {string} expression - The expression to evaluate.
 * @returns {any} The result of the evaluation, or the error message if an error occurred.
*/
function calc(expression) {
    let result
    let error
    try {
        result = parser.evaluate(expression)
    } catch (error) {
        error = error.toString()
    }
    return { result, error }
}

/**
 * Creates a plot object.
 *
 * @param {Array<Object>} data - The data to plot.
 * @param {Object} layout - The layout of the plot.
 * @param {Object} config - The configuration of the plot.
 * @returns {Object} The plot object.
 */
function plot(data, layout, config) {
    return { isPlot: true, data, layout, config }
}