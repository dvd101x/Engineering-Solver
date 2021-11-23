importScripts("https://cdnjs.cloudflare.com/ajax/libs/mathjs/9.5.1/math.js",'coolprop.js','fluidProperties.js')

// 'http://www.coolprop.sourceforge.net/jscript/coolprop.js'

math.import({props, HAprops,phase})
const YFX = self.math.parser()

const firstResponse = {
  mathResult: "Type on the input to get results or \ninsert samples with the top menu. \nThis wokrs by using mathjs.org, coolprop.org and ace.c9.io",
  err : null
}

postMessage(JSON.stringify(firstResponse))

onmessage = function (oEvent) {
    YFX.clear()
    const YFXinput = oEvent.data.split('\n')
    try {
        YFXoutput = YFX.evaluate(YFXinput).join('\n')
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