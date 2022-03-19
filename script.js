const tabIDs = document.forms.topBar.elements.sessionTab
const tabsField = document.getElementById("tabs")
const insertButton = document.getElementById('exampleInsert')
const exampleSelect = document.getElementById('exampleSelector')
const outputs = document.getElementById("OUTPUT")
const listOfSessions = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const wait = 500;

/* Array */
//["080708","3772ff","df2935","cad2c5","e6e8e6"]
var sessions = {}

ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.13')

var EditSession = require("ace/edit_session").EditSession;
var UndoManager = require("ace/undomanager").UndoManager;

for (ID of listOfSessions) {
  sessions[ID] = new EditSession(localStorage.getItem('localSession' + ID) || "", "ace/mode/python");
  sessions[ID].setUndoManager(new UndoManager);
}

function saveSession(sessionID) {
  localStorage.setItem('localSession' + sessionID, editor.getValue())
}

function sendWorkToMathWorker() {
  if (editor.getValue() != "") {
    const expressions = editor.getValue().trim().split(/\n\s*\n/g);
    const request = { expr: expressions }
    mathWorker.postMessage(JSON.stringify(request))
  }
}

tabsField.addEventListener('change', event => {
  editor.setSession(sessions[tabIDs.value]);
  editor.focus()
})

insertButton.addEventListener('click', () => { insertExampleFunc(exampleSelect.value) })

// ace
var timer;
var editor = ace.edit("INPUT");
editor.setOptions({
  theme: "ace/theme/solarized_light",
  wrap: "free"
});
editor.on("change", code => {
  clearTimeout(timer);
  timer = setTimeout(sendWorkToMathWorker, wait, code);
});
editor.setSession(sessions[tabIDs.value]);

var numberOfLines = editor.session.getLength();

var mathWorker = new Worker("mathWorker.js");

mathWorker.onmessage = function (oEvent) {
  response = JSON.parse(oEvent.data)
  const results = response.outputs
  let lines = ""
  results.forEach(line => {
      lines += `<pre>${line}</pre>`
  });
  outputs.innerHTML = lines;

  if (numberOfLines != editor.session.getLength()) {
    saveSession(tabIDs.value)
  };
  numberOfLines = editor.session.getLength();
};
