importScripts("https://cdnjs.cloudflare.com/ajax/libs/mathjs/10.0.1/math.js", 'coolprop.js', 'fluidProperties.js')

math.import({ props, HAprops, phase })
const parser = self.math.parser()

const firstResponse = {
    outputs: ["Type on the input to see results"]
}

postMessage(JSON.stringify(firstResponse));

function doMath(inputs) {
    parser.clear();
    return inputs.map(input => {
        try {
            return math.format(parser.evaluate(input), 14)
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
