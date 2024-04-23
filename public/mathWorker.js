
importScripts(
    "https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.1/math.js",
    "coolprop.js",
    "fluidProperties.js",
    "molecularMass.js"
)
const parser = math.parser()

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

function math2str(x) {
    return typeof x == "string" ? x : math.format(x, 14)
}

function evalBlock(block) {
    let mathResult
    try {
        mathResult = parser.evaluate(block)
    } catch (error) {
        return error.toString()
    }
    if (typeof mathResult != 'undefined' && mathResult) {
        if (typeof mathResult === 'object') {
            if (mathResult.entries && Array.isArray(mathResult.entries)) {
                return mathResult.entries
                    .filter(x => typeof x !== 'undefined')
                    .map(x => math2str(x)).join("\n")
            }
        }
    }
    return math2str(mathResult)
}

function evalBlocks(blocks) {
    return blocks.map(block => evalBlock(block))
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
                const blocks = content.join('\n')
                    .split(/\n\s*\n/g)
                    .filter(x => x.trim().length > 0)
                const results = evalBlocks(blocks)
                const formatedResult = results
                    .filter(x => typeof x !== 'undefined')
                    .map(
                        result => result.length ? '<pre>' + result + '</pre>' : '').join('\n')
                return { type: "math", text: formatedResult }
            case "md":
                return { type: "markdown", text: content.join('\n') }
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
