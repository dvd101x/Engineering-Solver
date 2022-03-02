importScripts("https://cdnjs.cloudflare.com/ajax/libs/mathjs/10.1.1/math.js", 'coolprop.js', 'fluidProperties.js', 'molecularMass.js')

math.import({ props, HAprops, phase, MM })
math.createUnit('TR', '12e3 BTU/h')
const parser = math.parser()

const firstResponse = {
  outputs: ["Type on the input to see results"]
}

postMessage(JSON.stringify(firstResponse));

function doMath(inputs) {
  parser.clear();
  return inputs.map(input => {
    try {
      let result = parser.evaluate(input)
      if (typeof result != 'string')
        {result = math.format(result,14)}
      return result
    }
    catch (e) {
      return e.toString()
    }
  })
}

onmessage = function (oEvent) {
  const inputs = JSON.parse(oEvent.data);
  const response = {
    outputs: doMath(inputs.expr),
  }
  postMessage(JSON.stringify(response));
};
