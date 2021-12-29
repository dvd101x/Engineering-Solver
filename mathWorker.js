importScripts("https://cdnjs.cloudflare.com/ajax/libs/mathjs/10.0.1/math.js", 'coolprop.js', 'fluidProperties.js')

// 'http://www.coolprop.sourceforge.net/jscript/coolprop.js'

math.import({ props, HAprops, phase })
const parser = self.math.parser()

const firstResponse =
    "Type on the input to get results or \ninsert samples with the top menu. \nThis wokrs by using mathjs.org, coolprop.org and ace.c9.io";

postMessage(firstResponse);

function doMath(inputs){
    let output = [];
    parser.clear();
    inputs.forEach((input, inputIndex) => {
        try {
            output_line = parser.evaluate(input);
        }
        catch (e) {
            output_line = e;
        }
        // Checks for unwanted outputs like [], [[]], function() ..., null, etc.
        if (output_line && output_line.toString() != "[]" && output_line.toString() != "[[]]"&& typeof (output_line) != "function" && output_line.toString() != "[object Object]") {
            // Formats the output showing from which line it comes from and accounts for multiple line outputs
            output.push((inputIndex + 1) + ":" + math.format(output_line, 14).split("\n").map(l => "\t" + l).join("\n"))
        }
    })
    return output
}

onmessage = function (oEvent) {
    const inputs = oEvent.data.split('\n');
    postMessage(doMath(inputs).join('\n'));
};