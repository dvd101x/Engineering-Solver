importScripts(
    "https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.6.0/math.min.js",
    'coolprop.js',
    'fluidProperties.js',
    'molecularMass.js',
    "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.3/katex.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.1/markdown-it.min.js",
    "https://cdn.jsdelivr.net/npm/markdown-it-texmath/texmath.min.js"
)

const mat = math.create()

function mapped(f) {
    return math.typed({
        'Array | Matrix': X => math.map(X, x => f(x))
    })
}

timeRange = math.typed(
    // Makes a range that can be used in solveODE
    // Can use units
    // It forces to include t_end
    {
        'number, number, number': (...args) => {
            let tRange = math.range(...args, true).toArray()
            if (tRange.length && tRange[tRange.length - 1] != args[1]) {
                tRange.push(args[1])
            }
            return tRange
        },
        'Unit, Unit, Unit': (...args) => {
            let units = args[0].clone()
            units.value = null
            let tRange = math.range(...args.map(x => x.toNumber(units)), true).toArray()
            if (tRange.length && tRange[tRange.length - 1] != args[1].toNumber(units)) {
                tRange.push(args[1].toNumber(units))
            }
            return tRange
                .map(
                    x => math.unit(x, units)
                )
        }
    }
)

odeEuler = function (f, T, y0) {
    // https://mathworld.wolfram.com/EulerForwardMethod.html
    const t = timeRange(...T)
    const N = t.length - 1 // number of times the method has to run

    let y = [y0]

    for (let n = 0; n < N; n++) {
        const h = math.subtract(t[n + 1], t[n])
        y.push(
            math.add(
                y[n],
                math.dotMultiply(
                    h,
                    f(t[n], y[n])
                )
            )
        )
    }
    return { t, y }
}

function odeRK2(f, T, y0) {
    // https://mathworld.wolfram.com/Runge-KuttaMethod.html
    const t = timeRange(...T)
    const N = t.length - 1
    let y = [y0]

    for (let n = 0; n < N; n++) {
        const h = math.subtract(t[n + 1], t[n])
        const k_1 = math.dotMultiply(h, f(t[n], y[n]));

        const k_2 = math.dotMultiply(h, f(math.add(t[n], math.dotDivide(h, 2)), math.add(
            y[n],
            math.dotDivide(
                k_1,
                2
            )
        )));

        y.push(
            math.add(
                y[n],
                k_2
            )
        )
    };
    return { t, y }
}

function odeRalston(f, T, y0) {
    // https://mathworld.wolfram.com/Runge-KuttaMethod.html
    const t = timeRange(...T)
    const N = t.length - 1
    let y = [y0]

    for (n = 0; n < N; n++) {
        const h = math.subtract(t[n + 1], t[n])

        const k_1 = f(t[n], y[n]);

        const k_2 = f(math.add(t[n], math.dotMultiply(2 / 3, h)), math.add(
            y[n],
            math.dotMultiply(
                2 / 3,
                math.dotMultiply(
                    h,
                    k_1
                )
            )
        ));

        y.push(
            math.add(
                y[n],
                math.dotMultiply(
                    h,
                    math.add(
                        math.dotMultiply(1 / 4, k_1),
                        math.dotMultiply(3 / 4, k_2)
                    )
                )
            )
        )
    }
    return { t, y }
}

function odeRK4(f, T, y0) {
    // https://mathworld.wolfram.com/Runge-KuttaMethod.html
    const t = timeRange(...T)
    const N = t.length - 1
    let y = [y0]

    for (n = 0; n < N; n++) {
        const h = math.subtract(t[n + 1], t[n])

        const k_1 = math.dotMultiply(h, f(t[n], y[n]));

        const k_2 = math.dotMultiply(h, f(math.add(t[n], math.dotDivide(h, 2)), math.add(
            y[n],
            math.dotDivide(
                k_1,
                2
            )
        )));

        const k_3 = math.dotMultiply(h, f(math.add(t[n], math.dotDivide(h, 2)), math.add(
            y[n],
            math.dotDivide(
                k_2,
                2
            )
        )));

        const k_4 = math.dotMultiply(h, f(math.add(t[n], h), math.add(y[n], k_3)));

        y.push(
            math.add(
                y[n],
                math.add(
                    math.dotMultiply(
                        1 / 6,
                        k_1
                    ),
                    math.dotMultiply(
                        1 / 3,
                        k_2
                    ),
                    math.dotMultiply(
                        1 / 3,
                        k_3
                    )
                    ,
                    math.dotMultiply(
                        1 / 6,
                        k_4
                    )
                )
            )
        )
    }
    return { t, y }
}

function odeAB5(f, T, y0) {
    // https://mathworld.wolfram.com/Runge-KuttaMethod.html
    const t = timeRange(...T)
    const b = [1901 / 720, -2774 / 720, 2616 / 720, -1274 / 720, 251 / 720]
    const s = b.length // order of the adams method (number of steps)
    const N = t.length - 1 // number of times the method needs to run

    let y = [y0]
    let F = [] // an array with the latest values of F

    // first 5 steps do RK4

    for (let n = 0; n < Math.min(N, s - 1); n++) {
        const h = math.subtract(t[n + 1], t[n])

        F.push(f(t[n], y[n]))

        const k_1 = math.dotMultiply(h, F[n]);

        const k_2 = math.dotMultiply(h, f(math.add(t[n], math.dotDivide(h, 2)), math.add(
            y[n],
            math.dotDivide(
                k_1,
                2
            )
        )));

        const k_3 = math.dotMultiply(h, f(math.add(t[n], math.dotDivide(h, 2)), math.add(
            y[n],
            math.dotDivide(
                k_2,
                2
            )
        )));

        const k_4 = math.dotMultiply(h, f(math.add(t[n], h), math.add(y[n], k_3)));

        y.push(
            math.add(
                y[n],
                math.add(
                    math.dotMultiply(
                        1 / 6,
                        k_1
                    ),
                    math.dotMultiply(
                        1 / 3,
                        k_2
                    ),
                    math.dotMultiply(
                        1 / 3,
                        k_3
                    )
                    ,
                    math.dotMultiply(
                        1 / 6,
                        k_4
                    )
                )
            )
        )
    }

    // then do AB5 using the previous evaluations of f
    for (let n = s - 1; n < N; n++) {

        const h = math.subtract(t[n + 1], t[n])
        F.push(f(t[n], y[n]))
        y.push(
            math.add(
                y[n],
                math.dotMultiply(
                    h,
                    math.add(
                        math.dotMultiply(b[0], F[n - 0]),
                        math.dotMultiply(b[1], F[n - 1]),
                        math.dotMultiply(b[2], F[n - 2]),
                        math.dotMultiply(b[3], F[n - 3]),
                        math.dotMultiply(b[4], F[n - 4])
                    )
                )
            )
        )
    }
    return { t, y }
}

const solvers = {
    euler: odeEuler,
    ralston: odeRalston,
    rk2: odeRK2,
    rk4: odeRK4,
    ab5: odeAB5
    //rk45: odeRK45
}

mat.import({
    solveODE: math.typed('solveODE', {
        // As odeEuler requires function, Array, Array and returns an object with two arrays by default, this uses math.typed to do the convertions automatically
        'function, Array, number|Unit': (f, T, y0) => {
            const sol = odeAB5(f, T, [y0])
            return { t: sol.t, y: sol.y.map(y => y[0]) }
        },
        'function, Array, number|Unit, string': (f, T, y0, method) => {
            const sol = solvers[method](f, T, [y0])
            return { t: sol.t, y: sol.y.map(y => y[0]) }
        },
        'function, Array, Array': (f, T, y0) => odeAB5(f, T, y0),
        'function, Array, Array, string': (f, T, y0, method) => solvers[method](f, T, y0),
        'function, Matrix, Matrix': (f, T, y0) => {
            const sol = odeAB5(f, T.toArray(), y0.toArray())
            return { t: math.matrix(sol.t), y: math.matrix(sol.y) }
        },
        'function, Matrix, Matrix, string': (f, T, y0, method) => {
            const sol = solvers[method](f, T.toArray(), y0.toArray())
            return { t: math.matrix(sol.t), y: math.matrix(sol.y) }
        }
    })
})

mat.import({
    props,
    HAprops,
    phase,
    exp: mapped(math.exp),
    log: math.typed({
        'Array | Matrix': x => math.map(x, x1 => math.log(x1, math.e)),
        'Array | Matrix, number': (x, base) => math.map(x, x1 => math.log(x1, base))
    }),
    gamma: mapped(math.gamma),
    square: mapped(math.square),
    sqrt: mapped(math.sqrt),
    cube: mapped(math.cube),
    cbrt: math.typed({
        // temporary fix until cbrt can be mapped
        'Array | Matrix': X => math.map(X, x => math.cbrt(x)),
        'Array | Matrix, boolean': (X, roots) => math.map(X, x => math.cbrt(x, roots))
    }),
    // trigonometrics [sin, cos, tan, csc, sec, cot]
    sin: mapped(math.sin),
    cos: mapped(math.cos),
    tan: mapped(math.tan),
    csc: mapped(math.csc),
    sec: mapped(math.sec),
    cot: mapped(math.cot),

    // trigonometrics hypberbolics [sinh, cosh, tanh, csch, sech, coth]
    sinh: mapped(math.sinh),
    cosh: mapped(math.cosh),
    tanh: mapped(math.tanh),
    csch: mapped(math.csch),
    sech: mapped(math.sech),
    coth: mapped(math.coth),

    // trigonometrics arc [asin, acos, atan, acsc, asec, acot]
    asin: mapped(math.asin),
    acos: mapped(math.acos),
    atan: mapped(math.atan),
    acsc: mapped(math.acsc),
    asec: mapped(math.asec),
    acot: mapped(math.acot),

    // trigonometrics arc hyperbolic [asinh, acosh, atanh, acsch, asech, acoth]
    asinh: mapped(math.asinh),
    acosh: mapped(math.acosh),
    atanh: mapped(math.atanh),
    acsch: mapped(math.acsch),
    asech: mapped(math.asech),
    acoth: mapped(math.acoth)

    //atan2 already works, thus no need to do anything
}, { override: false }
)

mat.createUnit('TR', '12e3 BTU/h')
const parser = mat.parser()

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
    if (typeof mathResult != 'undefined') {
        if (mathResult.entries) {
            return mathResult.entries
                .filter(x => typeof x != 'undefined')
                .map(x => math2str(x)).join("\n")
        }
        else {
            return math2str(mathResult)
        }
    }
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
            let notEmptyMath = x.source.filter(e => e)
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
                .filter(x => x.trim())
            const results = evalBlocks(blocks)
            return results
                .filter(x => x)
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

onmessage = function (oEvent) {
    const inputs = JSON.parse(oEvent.data);
    const response = {
        outputs: makeDoc(inputs.expr),
    }
    postMessage(JSON.stringify(response));
}