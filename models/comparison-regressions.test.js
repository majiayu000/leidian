const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function element() {
  const classes = new Set();
  const attributes = new Map();
  const listeners = {};
  return {
    dataset: {},
    children: [],
    innerHTML: '',
    textContent: '',
    sourceChanges: 0,
    set className(value) {
      classes.clear();
      value.split(/\s+/).forEach(name => classes.add(name));
    },
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle(name, active) {
        if (active) classes.add(name);
        else classes.delete(name);
      },
    },
    set src(value) {
      attributes.set('src', value);
      this.sourceChanges++;
    },
    getAttribute: name => attributes.get(name) ?? null,
    removeAttribute: name => attributes.delete(name),
    appendChild(child) { this.children.push(child); },
    addEventListener(name, handler) { listeners[name] = handler; },
    click() { listeners.click(); },
  };
}

async function loadComparison() {
  const elements = Object.fromEntries([
    'sidebar', 'score-panel', 'btn-single', 'btn-compare',
    'frame-a', 'frame-b', 'iframe-a', 'iframe-b', 'header-a', 'header-b',
  ].map(id => [id, element()]));
  elements['frame-b'].classList.add('hidden');
  elements['btn-single'].classList.add('active');
  elements['header-b'].textContent = '对比模型';
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  await vm.runInNewContext(script, {
    document: {
      getElementById: id => elements[id],
      createElement: () => element(),
      querySelectorAll: () => elements.sidebar.children,
    },
    fetch: async url => ({
      json: async () => JSON.parse(fs.readFileSync(path.join(root, url), 'utf8')),
    }),
  }, { filename: 'index.html' });
  return {
    elements,
    choose(id) { elements.sidebar.children.find(item => item.dataset.id === id).click(); },
    mode(name) { elements[`btn-${name}`].click(); },
    activeModels() {
      return elements.sidebar.children.filter(item => item.classList.contains('active')).map(item => item.dataset.id);
    },
    scoreNames() {
      return [...elements['score-panel'].innerHTML.matchAll(/class="model-name">([^<]+)</g)].map(match => match[1]);
    },
  };
}

test('comparison selection renders both models and their scores', async () => {
  const page = await loadComparison();
  assert.deepEqual(page.activeModels(), ['kimi-k3']);
  assert.deepEqual(page.scoreNames(), ['Kimi K3']);
  page.mode('compare');
  page.choose('hy');
  assert.deepEqual(page.activeModels(), ['kimi-k3', 'hy']);
  assert.deepEqual(page.scoreNames(), ['Kimi K3', 'HY']);
  assert.match(page.elements['score-panel'].innerHTML, />8\.4</);
  assert.equal(page.elements['iframe-b'].getAttribute('src'), 'models/hy/index.html');
  assert.equal(page.elements['header-b'].textContent, 'HY');
});

test('leaving comparison removes B from the sidebar highlight', async () => {
  const page = await loadComparison();
  page.mode('compare');
  page.choose('hy');
  page.mode('single');
  assert.deepEqual(page.activeModels(), ['kimi-k3']);
});

test('leaving comparison removes the B score card immediately', async () => {
  const page = await loadComparison();
  page.mode('compare');
  page.choose('hy');
  page.mode('single');
  assert.deepEqual(page.scoreNames(), ['Kimi K3']);
});

test('single mode clears B without reloading A', async () => {
  const page = await loadComparison();
  page.mode('compare');
  page.choose('qwen');
  const sourceChanges = page.elements['iframe-a'].sourceChanges;
  page.mode('single');
  assert.equal(page.elements['frame-b'].classList.contains('hidden'), true);
  assert.equal(page.elements['btn-single'].classList.contains('active'), true);
  assert.equal(page.elements['btn-compare'].classList.contains('active'), false);
  assert.equal(page.elements['iframe-b'].getAttribute('src'), null);
  assert.equal(page.elements['header-b'].textContent, '对比模型');
  assert.equal(page.elements['iframe-a'].getAttribute('src'), 'models/kimi-k3/index.html');
  assert.equal(page.elements['iframe-a'].sourceChanges, sourceChanges);
});

test('reentering comparison starts empty and accepts a fresh B selection', async () => {
  const page = await loadComparison();
  page.mode('compare');
  page.choose('hy');
  page.mode('single');
  page.choose('qwen');
  page.mode('compare');
  assert.equal(page.elements['frame-b'].classList.contains('hidden'), false);
  assert.equal(page.elements['btn-single'].classList.contains('active'), false);
  assert.equal(page.elements['btn-compare'].classList.contains('active'), true);
  assert.equal(page.elements['iframe-b'].getAttribute('src'), null);
  assert.equal(page.elements['header-b'].textContent, '对比模型');
  assert.deepEqual(page.activeModels(), ['qwen']);
  assert.deepEqual(page.scoreNames(), ['Qwen']);
  page.choose('codex');
  page.mode('compare');
  assert.deepEqual(page.activeModels(), ['qwen', 'codex']);
  assert.deepEqual(page.scoreNames(), ['Qwen', 'Codex']);
  assert.equal(page.elements['iframe-b'].getAttribute('src'), 'models/codex/index.html');
  assert.equal(page.elements['header-b'].textContent, 'Codex');
});
