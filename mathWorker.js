importScripts(
  "https://cdnjs.cloudflare.com/ajax/libs/mathjs/10.6.4/math.min.js",
  'coolprop.js',
  'fluidProperties.js',
  'molecularMass.js',
  "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.3/katex.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.1/markdown-it.min.js",
  "https://cdn.jsdelivr.net/npm/markdown-it-texmath/texmath.min.js"
)

math.import({ props, HAprops, phase, MM })
math.createUnit('TR', '12e3 BTU/h')
const parser = math.parser()

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
