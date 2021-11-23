const tabIDs = document.forms.topBar.elements.sessionTab
const tabsField = document.getElementById("tabs")
const insertButton = document.getElementById('sampleInsert')
const sampleSelect = document.getElementById('sampleSelector')
const listOfSessions = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9 }

/* Array */
//["080708","3772ff","df2935","cad2c5","e6e8e6"]
var sessions = {}

ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12')

var EditSession = require("ace/edit_session").EditSession;
var UndoManager = require("ace/undomanager").UndoManager;

for (ID in listOfSessions) {
  sessions[ID] = new EditSession(localStorage.getItem('localSession' + ID) || "", "ace/mode/python");
  sessions[ID].setUndoManager(new UndoManager);
}

var mathResults = null

function saveSession(sessionID) {
  localStorage.setItem('localSession' + sessionID, editor.getValue())
}

function sendWorkToMathWorker() {
  if (editor.getValue() != "") {
    mathWorker.postMessage(editor.getValue());
  }
}

tabsField.addEventListener('change', event => {
  editor.setSession(sessions[tabIDs.value]);
  editor.focus()
})

insertButton.addEventListener('click', () => { insertSampleFunc(sampleSelect.value) })

// ace
var editor = ace.edit("INPUT");
editor.setTheme("ace/theme/monokai");
editor.on("change", sendWorkToMathWorker);
editor.setSession(sessions[tabIDs.value]);

var results = ace.edit("OUTPUT");
results.setTheme("ace/theme/chrome");
results.setReadOnly(true);
results.session.setMode("ace/mode/Text");

var numberOfLines = editor.session.getLength();

var mathWorker = new Worker("mathWorker.js");

mathWorker.onmessage = function (oEvent) {
  const callback = JSON.parse(oEvent.data)
  mathResults = callback.mathResult
  if (mathResults != null) {
    results.setValue(mathResults)
  }
  else {
    results.setValue(callback.err)
  }
  if (mathResults != null || numberOfLines != editor.session.getLength()) {
    saveSession(tabIDs.value)
  }
  numberOfLines = editor.session.getLength();
};