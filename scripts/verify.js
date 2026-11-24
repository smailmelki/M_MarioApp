const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const jsFiles = [
    'js/constants.js',
    'js/storage.js',
    'js/audio.js',
    'js/sprites.js',
    'js/entities.js',
    'js/levels.js',
    'js/engine.js',
    'js/ui.js',
    'js/main.js'
];

// 1. Check required files and script tags
const htmlPath = path.join(root, 'index.html');
const cssPath = path.join(root, 'css/style.css');
if (!fs.existsSync(htmlPath) || !fs.existsSync(cssPath)) {
    throw new Error('Missing index.html or css/style.css');
}

const html = fs.readFileSync(htmlPath, 'utf8');
for (const file of jsFiles) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) {
        throw new Error(`Missing script file: ${file}`);
    }
    if (!html.includes(file)) {
        throw new Error(`index.html does not reference ${file}`);
    }
    execFileSync(process.execPath, ['--check', full], { stdio: 'inherit' });
}

// 2. Simulate full Engine + UI + 40 levels + 420 frames
const elements = {};
function makeEl(id) {
    return {
        id,
        textContent: '',
        innerHTML: '',
        value: '50',
        checked: true,
        style: {},
        classList: {
            _set: new Set(),
            add(c) { this._set.add(c); },
            remove(c) { this._set.delete(c); },
            toggle(c, force) {
                if (force === undefined) {
                    if (this._set.has(c)) this._set.delete(c);
                    else this._set.add(c);
                } else if (force) this._set.add(c);
                else this._set.delete(c);
            },
            contains(c) { return this._set.has(c); }
        },
        addEventListener() {},
        appendChild() {},
        getAttribute() { return 'screen-main'; },
        getContext() {
            return new Proxy({}, {
                get(t, prop) {
                    if (prop === 'createLinearGradient') return () => ({ addColorStop() {} });
                    return () => {};
                }
            });
        }
    };
}

let rafCb = null;
let nowMs = 1000;
const sandbox = {
    window: null,
    document: {
        getElementById(id) {
            if (!elements[id]) elements[id] = makeEl(id);
            return elements[id];
        },
        querySelectorAll() { return []; },
        createElement(tag) { return makeEl(tag); },
        addEventListener() {}
    },
    navigator: { maxTouchPoints: 0 },
    localStorage: {
        _d: {},
        getItem(k) { return this._d[k] || null; },
        setItem(k, v) { this._d[k] = v; }
    },
    performance: { now: () => nowMs },
    requestAnimationFrame: (cb) => { rafCb = cb; return 1; },
    cancelAnimationFrame: () => {},
    Math, Array, Object, String, Number, JSON,
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {}
};
sandbox.window = sandbox;
sandbox.window.addEventListener = () => {};

for (const file of jsFiles) {
    const full = path.join(root, file);
    vm.runInNewContext(fs.readFileSync(full, 'utf8'), sandbox, { filename: file });
}

sandbox.MG.UI.init();
let levelCount = 0;
let bossCount = 0;
for (let w = 1; w <= 8; w++) {
    for (let l = 1; l <= 5; l++) {
        sandbox.MG.Engine.loadLevel(w, l, true);
        const lvl = sandbox.MG.Levels.generateLevel(w, l);
        if (!lvl || !lvl.grid || lvl.grid.length !== 15) {
            throw new Error(`Invalid level ${w}-${l}`);
        }
        levelCount++;
        if (lvl.boss) bossCount++;
    }
}

sandbox.MG.Engine.startNewGame();
sandbox.MG.Engine.setInput('right', true);
sandbox.MG.Engine.setInput('jump', true);
for (let i = 0; i < 300; i++) {
    nowMs += 16;
    if (i === 10) sandbox.MG.Engine.setInput('jump', false);
    if (i === 50) sandbox.MG.Engine.setInput('run', true);
    if (rafCb) rafCb(nowMs);
}

sandbox.MG.Engine.loadLevel(8, 5, true);
for (let i = 0; i < 120; i++) {
    nowMs += 16;
    if (rafCb) rafCb(nowMs);
}

console.log(`VERIFIED: ${jsFiles.length} JS files, ${levelCount} levels (${bossCount} boss arenas), 420-frame simulation OK.`);
