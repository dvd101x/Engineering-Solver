importScripts(
    "math.js",
    "coolprop.js",
    "fluidProperties.js",
    "molecularMass.js"
)
const parser = math.parser()
const digits = 14

function createNewHelp() {
    const oldHelp = math.help
    const newDocs = {
        props: {
            name: 'props',
            category: 'physics',
            description: 'Get properties of pure fluids, pseudo-pure fluids and mixtures according to coolprop.',
            syntax: [
                "props(desired property, name of fluid, an object with two physical properties)"
            ],
            examples: [
                "props('D','Water',{T:0 degC,'P|liquid':1atm })",
                "props('D', 'CO2', {T:298.15 K, P:100e5 Pa})"
            ],
            seealso: ['HAprops', 'phase', 'MM']
        },
        HAprops: {
            name: 'HAprops',
            category: 'physics',
            description: 'Get properties of pure humid air according to coolprop.',
            syntax: [
                "HAprops(desired property, an object with three physical properties)"
            ],
            examples: [
                "HAprops('H',{T:298.15 K, P:101325 Pa, R:0.5})",
                "HAprops('T',{P:1 atm, H:50 kJ/kg, R:1.0})",
                "HAprops('T',{H: 50 kJ/kg, R:50%, P:1 atm})"
            ],
            seealso: ['props', 'phase', 'MM']
        },
        phase: {
            name: 'phase',
            category: 'physics',
            description: 'Get the phase of pure fluids, pseudo-pure fluids and mixtures according to coolprop.',
            syntax: [
                "phase( name of fluid, an object with two physical properties)"
            ],
            examples: [
                "phase('Water',{T:0 degC,'P|liquid':1atm })",
                "phase('CO2', {T:298.15 K, P:100e5 Pa})"
            ],
            seealso: ['props', 'HAprops', 'MM']
        },
        MM: {
            name: 'MM',
            category: 'chemistry',
            description: 'Get the molecular mass of a chemical formula and a list of properties.',
            syntax: [
                "MM(chemical formula)"
            ],
            examples: [
                "water = MM('H2O')",
                "water.fraction.O",
                "MM('C6H12O6')"
            ],
            seealso: ['props', 'HAprops', 'phase']
        },
        plot: {
            name: 'plot',
            category: 'plotting',
            description: 'Create a plot according to ploty syntax.',
            syntax: [
                "plot(data, layout, config)",
                "plot(data, layout)",
                "plot(data)"
            ],
            examples: [
                "plot([{x: [1, 2, 3], y: [2, 1, 3]}])",
                "plot([{x: [1, 2, 3], y: [2, 1, 3]}], {title: 'My plot'})",
                "plot([{x: [1, 2, 3], y: [2, 1, 3]}], {title: 'My plot'}, {responsive: true})"
            ],
            seealso: ['sin', 'cos', 'tan']
        }
    }

    return function help(x) {
        const nameString = typeof x === 'function' ? x.name : x
        if (nameString in newDocs) {
            return new math.Help(newDocs[nameString])
        } else {
            return oldHelp(x)
        }
    }
}

math.import({
    help: createNewHelp()
}, { override: true })

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
        plot: math.typed('plot',{
            'Array, Object, Object': plot,
            'Array, Object': (data, layout) => plot(data, layout, {}),
            'Array': data => plot(data, {}, {}),
        }),
        ...Object.fromEntries(functionsToVectorize.map(f => [f, mapped(math[f])])),
        log: math.typed('log',{
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
    const cells = [];
    let lastType = '';
    parser.clear()
    splitCode
        .forEach((line, lineNum) => {
            const lineType = line.startsWith('# ') ? 'md' : 'math';
            const formatedLine = lineType === 'md' ? line.slice(2) : line
            if (lastType === lineType) {
                cells[cells.length - 1].source.push(formatedLine)
                cells[cells.length - 1].to = lineNum
            } else {
                cells.push({ cell_type: lineType, source: [formatedLine], from: lineNum, to: lineNum })
            }
            lastType = lineType
        })

    let output = [];

    cells.forEach(
        cell => output.push(processOutput(cell.source, cell.cell_type, cell.from, cell.to))
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

    let prefixes = []
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

function formatResult(result) {
    return math.format(result)
}

/**
 * Processes an expression by evaluating it, formatting the results,
 * and determining their visibility.
 *
 * @param {Object{from: number, to: number, source: string}} expression - An object representing expressions,
 *   where each object has `from`, `to`, and `source` properties.
 * @returns {Object{type:string, outputs: any, visible: boolean}} A processed expressions,
 *   where each object has additional `outputs` and `visible` properties.
 */
function processExpression(expression) {
    // returns an object with isError and result properties
    const result = calc(expression.source)
    const visible = (result && result.value && result.value.isResultSet && (result.value.entries.length == 0)) ? false :
        (result.value === undefined) ? false : true

    if (result.isError) {
        return { type: "error", result: result.value, visible }
    } else if (result.value && result.value.isPlot) {
        const { data, layout, config } = result.value
        return {
            type: "plot",
            result: formatObject({ data, layout, config }),
            visible
        }
    } else if (result.value && typeof result.value == "string") {
        return {
            type: "string",
            result: result.value,
            visible
        }
    }
    else {
        return {
            type: "any",
            result: formatResult(result.value),
            visible
        }
    }
}

function formatObject(obj) {
    const matrix = math.config().matrix
    const formatedObject = math.format(obj)
    math.config({ matrix: 'Array' })
    const objResult = math.evaluate(formatedObject)
    math.config({ matrix: matrix })
    return objResult
}

function processOutput(content, type, from, to) {
    switch (type) {
        case "math":
            const expressions = getExpressions(content.join('\n'));
            const results = expressions.map(expression => {
                const result = processExpression(expression)
                return {
                    source: expression.source,
                    from: expression.from + from,
                    to: expression.to + from,
                    ...result
                }
            })
            return { type: "math", text: results }
            break;
        case "md":
            return { type: "markdown", text: content.join('\n'), from, to }
            break;
    }
}

/**
 * Evaluates a given expression using a parser.
 *
 * @param {string} expression - The expression to evaluate.
 * @returns {any} The result of the evaluation, or the error message if an error occurred.
*/
function calc(expression) {
    try {
        const result = parser.evaluate(expression)
        return { isError: false, value: result }
    } catch (error) {
        return { isError: true, value: error.toString() }
    }
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

