import { defineStore, PiniaVuePlugin, mapWritableState, createPinia } from 'pinia'
import Vue from 'vue'
import Vuetify from 'vuetify'
import Editor from 'v-markdown-editor'
import '@mdi/font/css/materialdesignicons.css'
import 'v-markdown-editor/dist/v-markdown-editor.css';
import 'vuetify/dist/vuetify.min.css';

//shared/global variables
const store = defineStore("store", {
    state: () => ({
        currentFile: "",
        originalContents: {},
        previewMode: "file",
        text: "",
        modified: {},
        contents: {},
        autoPreview: "yes",
        toc: {},
        tocItems: [],
        currentSection: [],
        files: [],
        settings: "",
        confFiles: {},
        previewMode: "single"
    }),
});

var initial_data = {
    drawer: true,
    settingsOverlay: false,
    sec2file: {},
    contentView: "both",
    contentViewItems: ["both", "editor", "viewer"],
    editor: true,
    secLineDic: {},
    lineSecDic: {},
    labelPositions: [],
    viewer: true,
    renderConfig: {
        // Mermaid config
        mermaid: {
            theme: "dark",
        },
    },
    confFile: null,
    currentConf: null
};

async function render() {
    if (
        this.originalContents[this.currentFile] !=
        this.contents[this.currentFile]
        ) {
        this.modified[this.currentFile] = true;
} else {
    this.modified[this.currentFile] = false;
}
var inputString = "";
if (this.previewMode == "all") {
    inputString = Object.values(this.contents).join("\n\n");
} else {
    inputString = this.contents[this.currentFile];
}
const options = {
    method: "POST",
    body: JSON.stringify({ input: inputString }),
    headers: { "Content-Type": "application/json" },
};
fetch("http://localhost:5000/render", options).then((response) => {
    let dataPromise = response.text();
    dataPromise.then((data) => {
        if (this.text != data){
            this.text = data;
            this.$nextTick(() => {
                style(0);
                this.styleCogsets()
            });
        }
    });
});
}

function styleCogsets() {
    var alignments = document.getElementsByClassName("alignment");
    for (var i=0,alignment; alignment=alignments[i]; i++) {
        alignment.innerHTML = plotWord(alignment.innerHTML, 'span');
    }
}

async function loadConf(kind) {
    fetch("http://localhost:5000/conf/"+kind, {
        headers: { "Content-Type": "application/json" },
    })
    .then((response) => response.json())
    .then((content) => {
        this.settingsOverlay = true;
        this.currentConf = kind
        this.confFile = content
    })
}


async function writeConf() {

    const options = {
        method: "POST",
        body: JSON.stringify({ text: this.confFile }),
        headers: { "Content-Type": "application/json" },
    };

    console.log("Saving config file " + this.currentConf)

    fetch("http://localhost:5000/conf/"+this.currentConf, options)
    .then((result) => {
        this.toc = {};
        this.mounted().then ((result) => {
            this.settingsOverlay = false;
            console.log(this.files);
        }
        );
    })
}


async function mounted() {
    console.log("Mounting");
    this.codemirror = document.getElementsByClassName("CodeMirror")[0].CodeMirror;
    fetch("http://localhost:5000/getfiles", {
        headers: { "Content-Type": "application/json" },
    })
    .then((response) => response.json())
    .then((files) => {
        var init = false;
        var promises = [];
        for (const part of files) {
            this.modified[part["id"]] = false;
            promises.push(fetch("http://localhost:5000/getpart/" + part["id"], {headers: { "Content-Type": "application/json" }})
                          .then((response2) => response2.json())
                          .then((content) => {
                            this.originalContents[part["id"]] = content;
                            this.contents[part["id"]] = content;
                            this.updateTOC(part["id"]);
                            if (!init) {
                                this.currentFile = part["id"];
                                init = true;
                            }
                        }));
        }
        this.files = files;
        Promise.all(promises).then(() => {
            this.buildTOC();
            this.loadPart("irrelevant string?")
        });
    })
    console.log("Mounted");
}

function insertEntity() {
    console.log("TBD");
}

function style(start = 0) {
    console.log("Styling");
    number_examples();
    number_sections(start);
    number_captions();
    resolve_crossrefs();
}

async function buildTOC() {
    var counters = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    var lastLevelSections = {}
    this.tocItems = [];
    for (let [file, entries] of Object.entries(this.toc)) {
        for (const entry of entries) {
            for (var i = 5; i > entry.level; i--) {
                counters[i] = 0;
            }
            counters[entry.level]++;
            var numbering = [];
            for (var c of Object.values(counters)) {
                if (c != 0) {
                    numbering.push(c);
                }
            }
            numbering = numbering.join(".");
            var tocEntry = {
                id: entry.id,
                name: numbering + " " + entry.name,
                file: file,
                children: []
            }
            lastLevelSections[entry.level] = tocEntry
            if (entry.level == 1){
                this.tocItems.push(tocEntry);
            }
            else {
                lastLevelSections[entry.level-1].children.push(tocEntry)
            }
        }
    }
}

function updateTOC(part = this.currentFile) {
    var counters = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    this.toc[part] = [];
    var lineno = 0
    for (const line of this.contents[part].split("\n")){
        lineno++;
        var hits = line.matchAll(/(^)(#)+ (.)+/g);
        for (const hit of hits) {
            const vals = hit[0].split(" [label");
            const temp = vals[0].trim("\n").split("# ");
            const level = (temp[0] + "#").length;
            const title = temp[1];
            if (vals.length > 1) {
                var label = vals[1].match("]((.+))");
                label = label[2].split(")")[0].replace("(", "");
            } else {
                var label = slugify(title);
            }

            this.secLineDic[label] = lineno
            this.lineSecDic[lineno] = label
            this.labelPositions.push(hit.index)

            for (var i = 5; i > level; i--) {
                counters[i] = 0;
            }
            counters[level]++;
            this.toc[part].push({
                id: label,
                name: title,
                level: level,
                file: part,
            });
            this.sec2file[label] = part
        }
    }
}


// https://gist.github.com/codeguy/6684588
function slugify(text) {
    return text
        .toString() // Cast to string (optional)
        .normalize("NFKD") // The normalize() using NFKD method returns the Unicode Normalization Form of a given string.
        .toLowerCase() // Convert the string to lowercase letters
        .trim() // Remove whitespace from both sides of a string (optional)
        .replace(/\s+/g, "-") // Replace spaces with -
        .replace(/[^\w\-]+/g, "") // Remove all non-word chars
        .replace(/\-\-+/g, "-"); // Replace multiple - with single -
    }

    function jumpEditor(label) {
        var doc = this.codemirror.getDoc();
        setTimeout (() => {
         this.codemirror.focus();
         doc.setCursor({line: this.secLineDic[label], ch:0});
     }, 0);
    // this.codemirror.scrollIntoView({line: this.secLineDic[label], ch:1}, 0)
}

function jumpViewer(label){
    console.log("Moving viewer to " + label)
    location.hash = "#" + label
}

function loadPart(part) {
    this.jumpEditor(part[0])
    this.currentFile = this.sec2file[part[0]]
    this.jumpViewer(part[0])
}


function saveFile() {
    const options = {
        method: "POST",
        body: JSON.stringify({ text: this.contents[this.currentFile] }),
        headers: { "Content-Type": "application/json" },
    };
    console.log("Saving file " + this.currentFile)
    fetch("http://localhost:5000/write/" + this.currentFile, options)
    .then((result) => {
        this.originalContents[this.currentFile] = this.contents[this.currentFile]
        this.modified[this.currentFile] = false;
        var temp = this.currentFile
        this.currentFile = null
        this.currentFile = temp
        this.updateTOC(temp);
    })
}

function updateContent() {
    this.buildTOC();
    if (this.autoPreview == "yes") {
        console.log("Rendering");
        this.render();
    } else {
        console.log("Not rendering");
        console.log(this.autoPreview);
    }
}

var methods = {
    render: render,
    loadPart: loadPart,
    updateContent: updateContent,
    saveFile: saveFile,
    entity: insertEntity,
    updateTOC: updateTOC,
    jumpEditor: jumpEditor,
    jumpViewer: jumpViewer,
    buildTOC: buildTOC,
    mounted: mounted,
    styleCogsets: styleCogsets,
    loadConf: loadConf,
    writeConf: writeConf,
};

function myAutoComplete() {
      return {
        override: [
          context =>{
            let word = context.matchBefore(/\w*/)
            return {
              from: word.from,
              options: [
                { label: "match", type: "keyword" },
                { label: "hello", type: "variable", info: "(World)" },
                { label: "magic", type: "text", apply: "⠁⭒*.✩.*⭒⠁", detail: "macro" }
              ]
            }
          }
        ]
      }
    }

Vue.component("my-markdown-editor", {
    data() {
        return {
            custom: {
                entity: {
                    cmd: "entity",
                    ico: "mdi mdi-database-arrow-down-outline",
                    title: "Insert entity",
                },
            },
            options: {
                lineNumbers: true,
                lineWrapping: true,
            }
        };
    },
    computed: {
        ...mapWritableState(store, [
                            "currentSection",
                            "currentFile",
                            "toc",
                            "tocItems",
                            "contents",
                            "autoPreview",
                            "previewMode",
                            "originalContents",
                            "text",
                            "modified",
                            "files",
                            ]),
    },
    methods: methods,
    template: `<markdown-editor
    height="83vh"
    v-model:value="contents[currentFile]"
    v-on:input="updateContent"
    id="textinput"
    toolbar="bold italic heading numlist bullist entity"
    @command:entity="entity"
    :extend="custom"
    :options="options"
    >
    </markdown-editor>`,
});


Vue.use(PiniaVuePlugin);
Vue.use(Vuetify);
Vue.use(Editor);
new Vue({
    el: "#app",
    data() {
        return initial_data;
    },
    computed: {
        ...mapWritableState(store, [
                            "currentSection",
                            "currentFile",
                            "tocItems",
                            "toc",
                            "contents",
                            "autoPreview",
                            "previewMode",
                            "originalContents",
                            "text",
                            "modified",
                            "files",
                            "settings",
                            "confFiles",
                            "previewMode"
                            ]),
    },
    methods: methods,
    mounted: mounted,
    vuetify: new Vuetify({    icons: {
        iconFont: "md",
    },}),
    pinia: createPinia(),
});
