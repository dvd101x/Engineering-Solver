importScripts(
  "https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.5.0/math.min.js",
  'coolprop.js',
  'fluidProperties.js',
  'molecularMass.js',
  "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.3/katex.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.1/markdown-it.min.js",
  "https://cdn.jsdelivr.net/npm/markdown-it-texmath/texmath.min.js"
)


// checks if the size of a value corresponds to a scalar
sizeOfScalar = (size) => math.sum(math.size(size)) === 0

// consistently gets the size of an array, matrix or scalar as an array
sizeAsArray = math.typed(
  'sizeAsArray',
  {
    'Array': (x) => math.size(x),
    'any': (x) => math.size(x).toArray()
  })

// checks if a value is scalar
isScalar = math.typed(
  'isScalar',
  {
    'Array | Matrix': x => false,
    'any': x => true
  }
)

// aligns a shapte to a size in N dimensions
alignShape = (shape, nDims, pad) => shape.length < nDims ? math.resize(shape.reverse(), [nDims], pad).reverse() : shape

// calculates the shape needed to concat an array in a dimension
shapeToConcat = (Mat, dim) => alignShape(sizeAsArray(Mat), dim, 1)

// stretches a matrix up to a certain size on a dimensions
// TODO: use function repeat when it's available
stretch = (matrix, size, dim) => math.concat(...Array(size).fill(matrix), dim)

broadcast_shapes = math.typed(
  // Calculates the final broadcastable shape from different shape inputs
  // Throws an error if it brakes the broadcasting rules
  'broadcast_shapes',
  {
    '...Array': (shapes) => {
      const dims = shapes.map(shape => shape.length)
      const N = math.max(dims)
      const shapes_array = shapes.map((shape, i) => alignShape(shape, N, 0))
      const max_shapes = math.max(shapes_array, 0)

      shapes_array.forEach(
        (shape, shapeID) => {
          shape.forEach(
            (dim, dimID) => {
              if ((dim < max_shapes[dimID]) & (dim > 1))
                throw new Error(`shape missmatch: missmatch is found in arg ${shapeID} with shape (${shape}) not possible to broadcast dimension ${dimID} with size ${dim} to size ${max_shapes[dimID]}`)
            }
          )
        }
      )
      return max_shapes
    }
  }
)          

function broadcast(...matrices) {
  // Broadcasts many arrays
  if (matrices.every(matrix => isScalar(matrix))) {
    return matrices
  }

  const broadcastedMatrixSize = broadcast_shapes(...matrices.map(matrix => sizeAsArray(matrix)))
  const N = broadcastedMatrixSize.length
  const broadcasted_matrices =
    matrices.map(matrix => {
      let matrixSize

      if (isScalar(matrix)) {
        matrix = [matrix]
      }

      matrixSize = sizeAsArray(matrix)

      if (matrixSize.length < N) {
        matrix = math.reshape(
          matrix,
          shapeToConcat(matrix, N))

        matrixSize = sizeAsArray(matrix)
      }

      broadcastedMatrixSize.forEach(
        (size, dim) => {
          if (matrixSize[dim] < size) {
            matrix = stretch(matrix, size, dim)
          }
        }
      )
      return matrix
    })
  return broadcasted_matrices
}

const mat = math.create()

const broadcastedFunction = (f, ...Ms) => f(...broadcast(...Ms))

mat.import({
   // Arithmetic functions
   add: (...Ms) => broadcastedFunction(math.add, ...Ms),
   subtract: (...Ms) => broadcastedFunction(math.subtract, ...Ms),
   dotMultiply: (...Ms) => broadcastedFunction(math.dotMultiply, ...Ms),
   dotDivide: (...Ms) => broadcastedFunction(math.dotDivide, ...Ms),
   dotPow: (...Ms) => broadcastedFunction(math.dotPow, ...Ms),
   gcd: (...Ms) => broadcastedFunction(math.gcd, ...Ms),
   mod: (...Ms) => broadcastedFunction(math.mod, ...Ms),
 
   // Bitwise functions
   bitAnd: (...Ms) => broadcastedFunction(math.bitAnd, ...Ms),
   bitOr: (...Ms) => broadcastedFunction(math.bitOr, ...Ms),
   bitXor: (...Ms) => broadcastedFunction(math.bitXor, ...Ms),
   leftShift: (...Ms) => broadcastedFunction(math.leftShift, ...Ms),
   rightArithShift: (...Ms) => broadcastedFunction(math.rightArithShift, ...Ms),
   rightLogShift: (...Ms) => broadcastedFunction(math.rightLogShift, ...Ms),
 
   // Loigical functions
   and: (...Ms) => broadcastedFunction(math.and, ...Ms),
   or: (...Ms) => broadcastedFunction(math.or, ...Ms),
   xor: (...Ms) => broadcastedFunction(math.xor, ...Ms),
 
   // Relational functions
   compare: (...Ms) => broadcastedFunction(math.compare, ...Ms),
   compareText: (...Ms) => broadcastedFunction(math.compareText, ...Ms),
   compareUnits: (...Ms) => broadcastedFunction(math.compareUnits, ...Ms),
   deepEqual: (...Ms) => broadcastedFunction(math.deepEqual, ...Ms),
   equal: (...Ms) => broadcastedFunction(math.equal, ...Ms),
   equalText: (...Ms) => broadcastedFunction(math.equalText, ...Ms),
   larger: (...Ms) => broadcastedFunction(math.larger, ...Ms),
   largerEq: (...Ms) => broadcastedFunction(math.largerEq, ...Ms),
   smaller: (...Ms) => broadcastedFunction(math.smaller, ...Ms),
   smallerEq: (...Ms) => broadcastedFunction(math.smallerEq, ...Ms),
   unequal: (...Ms) => broadcastedFunction(math.unequal, ...Ms),
 
   // Unit functions
   to: (...Ms) => broadcastedFunction(math.to, ...Ms), 
},
  { override: true })

function mapped(f) {
  return math.typed({
    'Array | Matrix': X => math.map(X, x => f(x))
  })
}

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
    'Array | Matrix' : X => math.map(X, x => math.cbrt(x)),
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
},{override:false}
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
