importScripts("https://cdnjs.cloudflare.com/ajax/libs/mathjs/10.1.1/math.js", 'coolprop.js', 'fluidProperties.js', 'molecularMass.js')

math.import({ props, HAprops, phase, MM })
math.createUnit('TR', '12e3 BTU/h')
const parser = math.parser()

const firstResponse = {
  outputs: ["Type on the input to see results"]
}

postMessage(JSON.stringify(firstResponse));
/*
entries ? for each new line
*/

function doMath(inputs) {
  parser.clear();
  return inputs.map(input => {
    let result
    try {
      result = parser.evaluate(input)
    }
    catch (e) {
      result = e.toString()
    }
    if (result){
      if (result.entries) {
        let lines = ""
        result.entries.forEach(element => {
          if (['string', 'undefined'].includes(typeof element)) {
            lines += element + "\n"
          }
          else {
            lines += math.format(element, 14) + "\n"
          }
        })
        result = lines.trim()
      }
      else if (typeof result != 'string') {
        result =  math.format(result, 14)
      }
    }
    return result
  })
}

onmessage = function (oEvent) {
  const inputs = JSON.parse(oEvent.data);
  const response = {
    outputs: doMath(inputs.expr),
  }
  postMessage(JSON.stringify(response));
};
