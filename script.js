const tabIDs = document.forms.topBar.elements.sessionTab
const tabsField = document.getElementById("tabs")
const insertButton = document.getElementById('exampleInsert')
const exampleSelect = document.getElementById('exampleSelector')
const outputs = document.getElementById("OUTPUT")
const listOfSessions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
const wait = 300;

let sessions = {}
let sessionNames = {}

ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.5.0')

let EditSession = require("ace/edit_session").EditSession;
let UndoManager = require("ace/undomanager").UndoManager;

for (ID of listOfSessions) {
  const thisSession = 'localSession' + ID;
  const sessionText = localStorage.getItem(thisSession)

  if (sessionText)
    if (!sessionText.trim())
      localStorage.removeItem(thisSession)
  sessions[ID] = new EditSession(localStorage.getItem(thisSession) || "", "ace/mode/python");
  sessions[ID].setUndoManager(new UndoManager);
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

tabsField.addEventListener('change', event => {
  editor.setSession(sessions[tabIDs.value]);
  editor.focus()
})

insertButton.addEventListener('click', () => { insertExampleFunc(exampleSelect.value) })

// ace
let timer;
let editor = ace.edit("INPUT");
editor.setOptions({
  theme: "ace/theme/monokai",
  wrap: "free"
});
editor.on("change", code => {
  clearTimeout(timer);
  timer = setTimeout(sendWorkToMathWorker, wait, code);
});
editor.setSession(sessions[tabIDs.value]);

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