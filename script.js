const tabIDs = document.forms.topBar.elements.sessionTab
const tabsField = document.getElementById("tabs")
const insertButton = document.getElementById('sampleInsert')
const sampleSelect = document.getElementById('sampleSelector')
const listOfSessions = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9 }
const wait = 200;

/* Array */
//["080708","3772ff","df2935","cad2c5","e6e8e6"]
var sessions = {}

ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.13')

var EditSession = require("ace/edit_session").EditSession;
var UndoManager = require("ace/undomanager").UndoManager;

for (ID in listOfSessions) {
  sessions[ID] = new EditSession(localStorage.getItem('localSession' + ID) || "", "ace/mode/python");
  sessions[ID].setUndoManager(new UndoManager);
}

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
var timer;
var editor = ace.edit("INPUT");
editor.setTheme("ace/theme/monokai");
editor.on("change", code => {
  clearTimeout(timer);
  timer = setTimeout(sendWorkToMathWorker, wait, code);
});
editor.setSession(sessions[tabIDs.value]);

var results = ace.edit("OUTPUT");
results.setTheme("ace/theme/chrome");
results.setReadOnly(true);
results.renderer.setShowGutter(false);
results.session.setMode("ace/mode/text");

var numberOfLines = editor.session.getLength();

var mathWorker = new Worker("mathWorker.js");

mathWorker.onmessage = function (oEvent) {
  results.setValue(oEvent.data);
  results.clearSelection();
  if (numberOfLines != editor.session.getLength()) {
    saveSession(tabIDs.value)
  };
  numberOfLines = editor.session.getLength();
};
