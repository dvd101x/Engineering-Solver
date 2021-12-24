importScripts("https://cdnjs.cloudflare.com/ajax/libs/mathjs/9.5.1/math.js",'coolprop.js','fluidProperties.js')

// 'http://www.coolprop.sourceforge.net/jscript/coolprop.js'

math.import({props, HAprops,phase})

const firstResponse =
    "Type on the input to get results or \ninsert samples with the top menu. \nThis wokrs by using mathjs.org, coolprop.org and ace.c9.io";

postMessage(firstResponse);

onmessage = function (oEvent) {
    let output_lines = [];
    let scope = {};

    for (const line of oEvent.data.split('\n')) {
        let output;
        try {
            output = math.evaluate(line, scope);
        } catch (e) {
            output = e;
        }
        output_lines.push(output);
    }

    postMessage(output_lines.join('\n'));
};