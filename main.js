import './style.css'

import initialState from "./ext/initialState.js"

import { EditorState } from "@codemirror/state"

import { StreamLanguage } from '@codemirror/language'

import { EditorView, basicSetup } from "codemirror"

import { mathjs } from './mathjs.js'

import Plotly from 'plotly.js-dist-min'

import katex from 'katex'
import 'katex/dist/katex.min.css'

import texmath from 'markdown-it-texmath'
import markdownit from 'markdown-it'
import 'markdown-it-texmath/css/texmath.css'

import 'github-markdown-css/github-markdown.css'

import { insertExampleFunc } from "./examples.js";

import Alpine from 'alpinejs'

// En tu archivo principal (e.g., app.js o index.js)
import { clearFragment, loadFromFragment, createFragmentLink, onFragmentChange } from './fragmentLoader.js';
 
window.Alpine = Alpine

Alpine.start()

const md = markdownit({ html: true })
  .use(texmath, {
    engine: katex,
    delimiters: ['dollars', 'beg_end'],
    katexOptions: { macros: { "\\RR": "\\mathbb{R}" } }
  })

const wait = 300;
const tabsField = document.getElementById("tabs")
const insertButton = document.getElementById('exampleInsert')
const exampleSelect = document.getElementById('exampleSelector')
const outputs = document.getElementById("OUTPUT")
const shareLinkButton = document.getElementById("shareLink")
const numberOfSessions = 20
const listOfSessions = Array.from({ length: numberOfSessions }, (_, i) => i + 1)
let workerState = initialState
let parserState = {}

let lastTab = localStorage.getItem("lastTab") === null ? 1 : localStorage.getItem("lastTab")

let sessions = []
let sessionNames = []
let firstEmptySession = findEmptySession()
// Phase 1: cleanup, dedupe and compact sessions in localStorage
const seen = new Set();
const nonEmptyUnique = [];

// Gather, remove empties and duplicates
for (let ID of listOfSessions) {
  const key = getSessionName(ID);
  const text = localStorage.getItem(key);

  if (text === null) continue;

  if (text.trim() === "") {
    localStorage.removeItem(key);
    continue;
  }

  if (seen.has(text)) {
    localStorage.removeItem(key);
    continue;
  }

  seen.add(text);
  nonEmptyUnique.push({text, ID, isCurrent: ID == lastTab});
}

// Reassign compacted non-empty sessions to lowest IDs, clear the rest
for (let idx = 0; idx < listOfSessions.length; idx++) {
  const ID = listOfSessions[idx];
  const key = getSessionName(ID);
  if (idx < nonEmptyUnique.length) {
    if (nonEmptyUnique[idx].isCurrent){
      lastTab = idx + 1;
    }
    localStorage.setItem(key, nonEmptyUnique[idx].text);
  } else {
    localStorage.removeItem(key);
  }
}

// First empty session is right after the last non-empty one (if any space left)
firstEmptySession = nonEmptyUnique.length < listOfSessions.length
  ? listOfSessions[nonEmptyUnique.length]
  : null;

// Phase 2: create HTML elements and initialize session arrays
for (let ID of listOfSessions) {
  // Create tabs
  const radioInput = document.createElement('input');
  radioInput.type = 'radio';
  radioInput.value = ID;
  radioInput.name = 'sessionTab';
  radioInput.id = 'tab' + ID;
  radioInput.checked = lastTab == ID ? true : false;
  tabsField.appendChild(radioInput);

  const label = document.createElement('label');
  label.htmlFor = 'tab' + ID;
  label.id = 'tabL' + ID;
  label.textContent = ID;
  tabsField.appendChild(label);

  // Initialize session slots; names after label exists
  sessions[ID] = null;
  sessionNames[ID] = setSessionName(ID);
}

const tabIDs = document.forms.topBar.elements.sessionTab
tabIDs.value = lastTab

let timer;

const codeFromUrl = loadFromFragment();
if(codeFromUrl){
  lastTab = firstEmptySession !== null ? firstEmptySession : lastTab
  localStorage.setItem("lastTab", lastTab)
  localStorage.setItem(getSessionName(lastTab), codeFromUrl)
  tabIDs.value = lastTab
  clearFragment()
}
sessions[lastTab] = createState(lastTab)

let editor = new EditorView({
  state: sessions[lastTab],
  parent: document.querySelector('#INPUT')
})

tabsField.addEventListener('change', () => {
  const ID = tabIDs.value;
  if (sessions[ID] === null) {
    sessions[ID] = createState(ID);
  }
  sessions[lastTab] = editor.state
  saveSession(lastTab)
  editor.setState(sessions[ID]);
  editor.focus()
  localStorage.setItem("lastTab", ID)
  lastTab = ID
})

shareLinkButton.addEventListener('click', () => {
  const code = editor.state.doc.toString();
  const shareableLink = createFragmentLink(code);
  navigator.clipboard.writeText(shareableLink).then(() => {
    alert('Shareable link copied to clipboard!');
  }, (err) => {
    alert('Failed to copy link: ', err);
  });
})

insertButton.addEventListener('click', () => {
  const exampleToInsert = insertExampleFunc(exampleSelect.value)
  editor.dispatch({
    changes: {
      from: editor.state.doc.length,
      to: editor.state.doc.length,
      insert: "\n" + exampleToInsert
    }
  })
  editor.focus()
})

let timerSave;
const waitToSave = 1000;

mathWorker.onmessage = function (oEvent) {
  const results = JSON.parse(oEvent.data)
  const tabToSave = tabIDs.value;
  outputs.innerHTML = "";
  results.outputs.forEach(out => {
    switch (out.type) {
      case "math":
        out.text.forEach(e => {
          const pre = document.createElement("pre");
          pre.setAttribute('data-from-line', e.from);
          pre.setAttribute('data-to-line', e.to);
          if (e.visible) {
            const type = e.type;
            const value = e.result;
            let div
            switch (type) {
              case "string":
                div = document.createElement("code");
                div.innerHTML = value;
                pre.appendChild(div);
                break;
              case "any":
                div = document.createElement("div");
                div.textContent = value;
                pre.appendChild(div);
                break;
              case "error":
                div = document.createElement("div");
                div.style.color = "red";
                div.innerHTML = value;
                pre.appendChild(div);
                break;
              case "plot":
                div = document.createElement("div");
                try {
                  Plotly.newPlot(div, e.result.data, e.result.layout, e.result.config)
                } catch (error) {
                  div.innerHTML = 'myError:' + error.toString();
                }
                pre.appendChild(div);
                break;
            }
          } else {
            pre.style.display = 'none'
          }
          outputs.appendChild(pre);
        });
        break;
      case "markdown":
        const div = document.createElement("div");
        div.setAttribute('data-from-line', out.from)
        div.setAttribute('data-to-line', out.to)
        div.innerHTML = md.render(out.text);
        outputs.appendChild(div);
        break;
    }
  });
  updateSelection()
  clearTimeout(timerSave);
  sessions[lastTab] = editor.state
  timerSave = setTimeout(saveSession, waitToSave, tabToSave)
  if (results.mathState) {
    workerState = results.mathState
  }
  if (results.parserState) {
    parserState = results.parserState
  }
};

function createState(ID) {
  // Create a new editor state
  return EditorState.create({
    doc: getSessionText(ID),
    extensions: [
      basicSetup,
      StreamLanguage.define(mathjs(() => workerState, () => parserState)),
      EditorView.lineWrapping,
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          const text = update.state.doc.toString()
          clearTimeout(timer);
          timer = setTimeout(sendWorkToMathWorker, wait, text); 
        } else if (update.selectionSet) {
          updateSelection()
        }
      })
    ]
  })
}

function updateSelection() {
  const selectedFrom = editor.state.doc.lineAt(
    editor.state.selection.ranges[editor.state.selection.mainIndex].from
  ).number - 1;

  const selectedTo = editor.state.doc.lineAt(
    editor.state.selection.ranges[editor.state.selection.mainIndex].to
  ).number - 1;

  const outputs = document.querySelector('#OUTPUT').childNodes;

  outputs.forEach(code => {
    const thisNode = code;
    if (thisNode.getAttribute){
      const fromLine = parseInt(thisNode.getAttribute('data-from-line'), 10);
      const toLine = parseInt(thisNode.getAttribute('data-to-line'), 10);
      if ((fromLine <= selectedTo) && (toLine >= selectedFrom)) {
        code.classList.add('highlight');
        code.scrollIntoView({ block: 'nearest', inline: 'start' });
      } else {
        code.classList.remove('highlight');
      }
    }
  });
}

function getSessionName(ID) {
  return 'localSession' + ID
}

function getSessionText(ID) {
  return localStorage.getItem(getSessionName(ID)) || ""
}

function setSessionName(ID) {
  const firstLineComment = /^\s*#\s*.*?(\w.*?)\s*(?:\n|$)/
  const thisSession = getSessionName(ID);
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
  const thisSessionName = getSessionName(sessionID)
  const thisSession = sessions[sessionID]
  if (thisSession !== null) {
    const textToSave = thisSession.doc.toString().replace(/\r\n/g, '\n');
    localStorage.setItem(thisSessionName, textToSave)
    sessionNames[sessionID] = setSessionName(sessionID)
  }
}

function sendWorkToMathWorker(mathExpressions) {
  if (mathExpressions != "") {
    const expressions = mathExpressions
      .replace(/\r?\n/g, '\n')
    //.trim()
    const request = { expr: expressions }
    mathWorker.postMessage(JSON.stringify(request))
  }
}


onFragmentChange((code) => {
  firstEmptySession = findEmptySession()
  lastTab = firstEmptySession !== null ? firstEmptySession : lastTab
  localStorage.setItem("lastTab", lastTab)
  localStorage.setItem(getSessionName(lastTab), code)
  tabIDs.value = lastTab
  editor.setState(createState(lastTab))
  clearFragment()
});

function findEmptySession() {
  for (let ID of listOfSessions) {
    const key = getSessionName(ID);
    const text = localStorage.getItem(key);
    if (text === null || text.trim() === "") {
      return ID;
    }
  }
  return null;
}