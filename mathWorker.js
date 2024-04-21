importScripts(
    "https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.0/math.js",
    "coolprop.js",
    "fluidProperties.js",
    "molecularMass.js",
    "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.2/markdown-it.min.js",
    "https://cdn.jsdelivr.net/npm/markdown-it-texmath/texmath.min.js",
)
const parser = math.parser()

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

const md = markdownit({ html: true })
    .use(texmath, {
        engine: katex,
        delimiters: ['dollars', 'beg_end'],
        katexOptions: { macros: { "\\RR": "\\mathbb{R}" } }
    })

const intro = `# Intro

* Type on the input to get results

# Markdown

* Start markdown with \`# \`
* Write inline equations with \`$\`
* Write block equations with \`$$\`
`

const firstResponse = {
    outputs: [md.render(intro)]
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

    const processOutput = {
        math: mathCell => {
            const blocks = mathCell.join('\n')
                .split(/\n\s*\n/g)
                .filter(x => x.trim().length > 0)
            const results = evalBlocks(blocks)
            return results
                .filter(x => typeof x !== 'undefined')
                .map(
                    result => result.length ? '<pre>' + result + '</pre>' : '').join('\n')
        },
        md: markdown => md.render(markdown.join('\n'))
    }

    cleanCells.forEach(
        cell => output.push(processOutput[cell.cell_type](cell.source))
    )
    return output.join('\n')
}

function getMathState(){
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
