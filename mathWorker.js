importScripts("https://cdnjs.cloudflare.com/ajax/libs/mathjs/9.5.1/math.js",'coolprop.js','fluidProperties.js')

// 'http://www.coolprop.sourceforge.net/jscript/coolprop.js'

math.import({props, HAprops,phase})

const firstResponse = {
  mathResult: "Type on the input to get results or \ninsert samples with the top menu. \nThis wokrs by using mathjs.org, coolprop.org and ace.c9.io",
  err : null
}

postMessage(JSON.stringify(firstResponse))

onmessage = function (oEvent) {
    const YFXinput = oEvent.data.split('\n')
    try {
        let output_lines = [];
        let scope = {};
        for (const line of YFXinput) {
            output_lines.push(math.evaluate(line, scope));
        }
        YFXoutput = output_lines.join('\n')
    } catch (e) {
        YFXoutput=null,
        err = e
    }
    // build a response
    const response = {
        mathResult: YFXoutput,
        err: err.toString()
    }
    postMessage(JSON.stringify(response))
};