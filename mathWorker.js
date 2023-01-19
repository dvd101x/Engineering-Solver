importScripts(
  "https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.5.0/math.min.js",
  'coolprop.js',
  'fluidProperties.js',
  'molecularMass.js',
  "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.3/katex.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.1/markdown-it.min.js",
  "https://cdn.jsdelivr.net/npm/markdown-it-texmath/texmath.min.js"
)

const mat = math.create(math.all)

// this function return a mapped function in case of array or the function in case of scalar
function mapped(f, x) {
  return math.sum(math.size(x)) > 0 ? math.map(x, f) : f(x)
}

function mapLog(x, ...args) {
  const base = args.length == 0 ? math.e : args[0]
  return math.sum(math.size(x)) > 0 ? math.map(x, x => math.log(x, base)) : math.log(x, base)
}

mat.import({
  props,
  HAprops,
  phase,
  MM,
  exp: x => mapped(math.exp, x),
  log: mapLog, // log 
  gamma: x=> mapped(math.gamma, x),
  square: x=> mapped(math.square, x),
  sin: x => mapped(math.sin, x),
  cos: x => mapped(math.cos, x),
  cube: x => mapped(math.cube, x),
  //cbrt: x => mapped(math.cbrt, x),
  cbrt: x => mapped(x2 => math.cbrt(x2), x),  // this is a temporary fix as cbrt doesn't work with map
  acos: x => mapped(math.acos, x),
  acosh: x => mapped(math.acosh, x),
  acot: x => mapped(math.acot, x),
  acoth: x => mapped(math.acoth, x),
  acsc: x => mapped(math.acsc, x),
  acsch: x => mapped(math.acsch, x),
  asec: x => mapped(math.asec, x),
  asech: x => mapped(math.asech, x),
  asin: x => mapped(math.asin, x),
  asinh: x => mapped(math.asinh, x),
  atan: x => mapped(math.atan, x),
  atanh: x => mapped(math.atanh, x),
  cosh: x => mapped(math.cosh, x),
  cot: x => mapped(math.cot, x),
  coth: x => mapped(math.coth, x),
  csc: x => mapped(math.csc, x),
  csch: x => mapped(math.csch, x),
  sec: x => mapped(math.sec, x),  
  //'atan2(1:10, 1:10)', already works it hasn't lost it's vectorization
  sech: x => mapped(math.sech, x),
  sin: x => mapped(math.sin, x),
  sinh: x => mapped(math.sinh, x),
  tan: x => mapped(math.tan, x),
  tanh: x => mapped(math.tanh, x)
},{override:true})

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
