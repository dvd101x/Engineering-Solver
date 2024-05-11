import './style.css'
import 'github-markdown-css/github-markdown-light.css'

import initialState from "./ext/initialState.js"

import { EditorState } from "@codemirror/state"

import { StreamLanguage } from '@codemirror/language'

import { EditorView, basicSetup } from "codemirror"

import { mathjs } from './mathjs.js'

import 'katex/dist/katex.min.css'
import 'markdown-it-texmath/css/texmath.css'

import { insertExampleFunc } from "./examples.js";

import markdownit from 'markdown-it'

import texmath from 'markdown-it-texmath'

import katex from 'katex'

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
const numberOfSessions = 20
const listOfSessions = Array.from({ length: numberOfSessions }, (_, i) => i + 1)
let workerState = initialState
let parserState = {}

let lastTab = localStorage.getItem("lastTab") === null ? 1 : localStorage.getItem("lastTab")

let sessions = []
let sessionNames = []

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

  // Create sessions
  const thisSession = getSessionName(ID);
  const sessionText = localStorage.getItem(thisSession)
  sessions[ID] = null

  // Remove empty sessions
  if (sessionText && !sessionText.trim()) {
    localStorage.removeItem(thisSession)
  }

  sessionNames[ID] = setSessionName(ID);
}

const tabIDs = document.forms.topBar.elements.sessionTab
tabIDs.value = lastTab

let timer;

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
                  div.innerHTML = 'myError:'+ error.toString();
                }
                pre.appendChild(div);
                break;
            }
  
            outputs.appendChild(pre);
          }
        });
        break;
      case "markdown":
        const div = document.createElement("div");
        div.innerHTML = md.render(out.text);
        outputs.appendChild(div);
        break;
    }
  });
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
        }
      })
    ]
  })
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

function sendWorkToMathWorker(mathExpressoins) {
  if (mathExpressoins != "") {
    const expressions = mathExpressoins
      .replace(/\r?\n/g, '\n')
      .trim()
    const request = { expr: expressions }
    mathWorker.postMessage(JSON.stringify(request))
  }
}
