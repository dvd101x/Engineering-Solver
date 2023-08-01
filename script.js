const tabIDs = document.forms.topBar.elements.sessionTab
const tabsField = document.getElementById("tabs")
const insertButton = document.getElementById('exampleInsert')
const exampleSelect = document.getElementById('exampleSelector')
const outputs = document.getElementById("OUTPUT")
const listOfSessions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
const wait = 300;

const parser = math.parser()

const myTextArea = document.getElementById("INPUT")
let editor = CodeMirror.fromTextArea(myTextArea, {
  lineNumbers: true,
  lineWrapping: true,
  mode: "mathjs",
  keyMap: "sublime",
  autoCloseBrackets: true,
  extraKeys: {
    "Alt-F": "findPersistent",
    "Ctrl-Space": "autocomplete"
  },
  matchBrackets: true,
  highlightSelectionMatches: { showToken: /\w/, annotateScrollbar: false },
  foldGutter: true,
  gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
  showCursorWhenSelecting: true,
  theme: "blackboard",
  styleActiveLine: true,
  hintOptions: { hint: mathHints }
})



let sessions = {}
let sessionNames = {}


for (ID of listOfSessions) {
  const thisSession = 'localSession' + ID;
  const sessionText = localStorage.getItem(thisSession)

  if (sessionText)
    if (!sessionText.trim())
      localStorage.removeItem(thisSession)
  sessions[ID] = CodeMirror.Doc(localStorage.getItem(thisSession) || "", "mathjs");
  sessionNames[ID] = setSessionName(ID);
}

function setSessionName(ID) {
  const firstLineComment = /^\s*#\s*.*?(\w.*?)\s*\n/
  const thisSession = 'localSession' + ID;
  let noteBookName
  if (localStorage.getItem(thisSession)) {
    const sessionText = localStorage.getItem(thisSession)
    const foundName = firstLineComment.test(sessionText) ? sessionText.match(firstLineComment)[1] : null;
    noteBookName = foundName ? foundName : "Notebook " + ID
    document.getElementById('tabL' + ID).innerHTML = sessionText.trim() ? (foundName ? (noteBookName.length > 16 ? noteBookName.slice(0, 15).trim() + '…' : noteBookName) : String(ID)) : '.'
    document.getElementById('tabL' + ID).title = sessionText.trim() ? noteBookName : 'Empty'
  }
  else {
    document.getElementById('tabL' + ID).innerHTML = '.'
    document.getElementById('tabL' + ID).title = 'Empty'
  }
  return noteBookName
}

function saveSession(sessionID) {
  localStorage.setItem('localSession' + sessionID, editor.getValue())
  sessionNames[sessionID] = setSessionName(sessionID)
}

function sendWorkToMathWorker() {
  if (editor.getValue() != "") {
    const expressions = editor
      .getValue()
      .replace(/\r?\n/g, '\n')
      .trim()
    const request = { expr: expressions }
    mathWorker.postMessage(JSON.stringify(request))
  }
}

tabsField.addEventListener('change', () => {
  editor.swapDoc(sessions[tabIDs.value]);
  editor.focus()
})

insertButton.addEventListener('click', () => { insertExampleFunc(exampleSelect.value) })

// ace
let timer;
editor.on("change", code => {
  clearTimeout(timer);
  timer = setTimeout(sendWorkToMathWorker, wait, code);
});
editor.swapDoc(sessions[tabIDs.value]);

let mathWorker = new Worker("mathWorker.js");

let timerSave;
const waitToSave = 1500;

mathWorker.onmessage = function (oEvent) {
  const results = JSON.parse(oEvent.data).outputs
  const tabToSave = tabIDs.value;
  outputs.innerHTML = results;
  clearTimeout(timerSave);
  timerSave = setTimeout(saveSession, waitToSave, tabToSave)
};

function mathHints(cm, options) {
  return new Promise(function (accept) {
    setTimeout(function () {
      const cursor = cm.getCursor(), line = cm.getLine(cursor.line)
      let start = cursor.ch, end = cursor.ch
      while (start && /\w/.test(line.charAt(start - 1))) --start
      while (end < line.length && /\w/.test(line.charAt(end))) ++end
      const word = line.slice(start, end).toLowerCase()
      const results = completer(word)
      if (results.length > 0) {
        return accept({
          list: results,
          from: CodeMirror.Pos(cursor.line, start),
          to: CodeMirror.Pos(cursor.line, end)
        })
      } else {
        return accept(null)
      }
    }, 100)
  })
}

/**
 * auto complete a text
 * @param {String} text
 * @return {[Array, String]} completions
 */
function completer(text) {
  // based on https://github.com/josdejong/mathjs/tree/develop/bin/cli.js
  let matches = []
  let keyword
  const m = /[a-zA-Z_0-9]+$/.exec(text)
  if (m) {
    keyword = m[0]

    // scope variables
    for (const def in parser.getAll()) {
      if (def.indexOf(keyword) === 0) {
        matches.push(def)
      }
    }

    // commandline keywords
    ['exit', 'quit', 'clear'].forEach(function (cmd) {
      if (cmd.indexOf(keyword) === 0) {
        matches.push(cmd)
      }
    })

    // math functions and constants
    const ignore = ['expr', 'type']
    for (const func in math.expression.mathWithTransform) {
      if (hasOwnPropertySafe(math.expression.mathWithTransform, func)) {
        if (func.indexOf(keyword) === 0 && ignore.indexOf(func) === -1) {
          matches.push(func)
        }
      }
    }

    const importedFunctions = ["props", "HAprops", "phase", "MM"]
    for (const func of importedFunctions) {
      if (func.startsWith(keyword)) {
        matches.push(func)
      }
    }

    // units
    const Unit = math.Unit
    for (const name in Unit.UNITS) {
      if (hasOwnPropertySafe(Unit.UNITS, name)) {
        if (name.indexOf(keyword) === 0) {
          matches.push(name)
        }
      }
    }
    for (const name in Unit.PREFIXES) {
      if (hasOwnPropertySafe(Unit.PREFIXES, name)) {
        const prefixes = Unit.PREFIXES[name]
        for (const prefix in prefixes) {
          if (hasOwnPropertySafe(prefixes, prefix)) {
            if (prefix.indexOf(keyword) === 0) {
              matches.push(prefix)
            } else if (keyword.indexOf(prefix) === 0) {
              const unitKeyword = keyword.substring(prefix.length)
              for (const n in Unit.UNITS) {
                const fullUnit = prefix + n
                if (hasOwnPropertySafe(Unit.UNITS, n)) {
                  if (
                    !matches.includes(fullUnit) &&
                    n.indexOf(unitKeyword) === 0 &&
                    Unit.isValuelessUnit(fullUnit)) {
                    matches.push(fullUnit)
                  }
                }
              }
            }
          }
        }
      }
    }

    // remove duplicates
    matches = Array.from(new Set(matches))
  }

  return matches
}

// helper function to safely check whether an object has a property
// copy from the function in object.js which is ES6
function hasOwnPropertySafe(object, property) {
  return object && Object.hasOwnProperty.call(object, property)
}
