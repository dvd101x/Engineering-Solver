importScripts("https://cdnjs.cloudflare.com/ajax/libs/mathjs/10.0.1/math.js", 'coolprop.js', 'fluidProperties.js')

math.import({ props, HAprops, phase })
const parser = self.math.parser()

const firstResponse = {
    outputs: ["Type on the input to see results"]
}

postMessage(JSON.stringify(firstResponse));

function doMath(inputs) {
    let output = [];
    parser.clear();
    inputs.forEach(input => {
        try {
            output_line = parser.evaluate(input);
        }
        catch (e) {
            output_line = e;
        }
        output.push(math.format(output_line,14))
    })
    return output
}

onmessage = function (oEvent) {
    const inputs = JSON.parse(oEvent.data);
    const response = {
        outputs: doMath(inputs.expr),
    }
    postMessage(JSON.stringify(response));
};