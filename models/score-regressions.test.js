const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function element() {
  const listeners = {};
  return {
    dataset: {},
    children: [],
    innerHTML: '',
    textContent: '',
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild(child) { this.children.push(child); },
    addEventListener(name, handler) { listeners[name] = handler; },
    click() { listeners.click(); },
  };
}

async function loadScores(ratings) {
  const elements = Object.fromEntries([
    'sidebar', 'score-panel', 'btn-single', 'btn-compare',
    'frame-a', 'frame-b', 'iframe-a', 'iframe-b', 'header-a', 'header-b',
  ].map(id => [id, element()]));
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  await vm.runInNewContext(script, {
    document: {
      getElementById: id => elements[id],
      createElement: () => element(),
      querySelectorAll: () => elements.sidebar.children,
    },
    fetch: async url => ({ json: async () => ({ scores: ratings[url.split('/')[1]] }) }),
  }, { filename: 'index.html' });
  return {
    elements,
    choose(id) { elements.sidebar.children.find(item => item.dataset.id === id).click(); },
    totals() {
      return [...elements['score-panel'].innerHTML.matchAll(/class="score-total"><span>综合<\/span><span class="value">([^<]+)</g)].map(match => match[1]);
    },
    values() {
      return [...elements['score-panel'].innerHTML.matchAll(/class="score-row"><span class="label">[^<]*<\/span><span class="value( na)?\s*">([^<]+)<\/span>/g)].map(match => ({ text: match[2], unscored: Boolean(match[1]) }));
    },
  };
}

const dimensions = ['playability', 'visual', 'code_quality'];
for (const missing of dimensions) {
  for (const value of [null, undefined]) {
    test(`${missing} ${value === null ? 'null' : 'missing'} leaves the composite unscored`, async () => {
      const scores = { playability: 8, visual: 6, code_quality: 9 };
      scores[missing] = value;
      const page = await loadScores({ 'kimi-k3': scores });
      assert.deepEqual(page.totals(), ['—']);
      assert.deepEqual(page.values()[dimensions.indexOf(missing)], { text: '待评', unscored: true });
    });
  }
}

test('one rated dimension does not publish a partial composite', async () => {
  const page = await loadScores({ 'kimi-k3': { playability: 8, visual: null, code_quality: null } });
  assert.deepEqual(page.totals(), ['—']);
  assert.deepEqual(page.values().slice(0, 3), [
    { text: '8 / 10', unscored: false },
    { text: '待评', unscored: true },
    { text: '待评', unscored: true },
  ]);
});

test('three zero ratings publish a zero composite and scored rows', async () => {
  const page = await loadScores({ 'kimi-k3': { playability: 0, visual: 0, code_quality: 0 } });
  assert.deepEqual(page.totals(), ['0.0']);
  assert.deepEqual(page.values().slice(0, 3), dimensions.map(() => ({ text: '0 / 10', unscored: false })));
});

test('complete ratings retain the weighted one-decimal composite', async () => {
  const page = await loadScores({ 'kimi-k3': { playability: 9, visual: 8, code_quality: 8 } });
  assert.deepEqual(page.totals(), ['8.4']);
});

test('absent and all-null scores remain unscored', async () => {
  for (const scores of [undefined, { playability: null, visual: null, code_quality: null }]) {
    const page = await loadScores({ 'kimi-k3': scores });
    assert.deepEqual(page.totals(), ['—']);
    assert.deepEqual(page.values().slice(0, 3), dimensions.map(() => ({ text: '待评', unscored: true })));
  }
});

for (const value of ['8', '<img src=x onerror="alert(1)">', NaN, Infinity]) {
  test(`score ${String(value)} cannot become a rating or HTML`, async () => {
    const page = await loadScores({ 'kimi-k3': { playability: value, visual: 8, code_quality: 8 } });
    assert.deepEqual(page.totals(), ['—']);
    assert.deepEqual(page.values()[0], { text: '待评', unscored: true });
    assert.doesNotMatch(page.elements['score-panel'].innerHTML, /<img|onerror|NaN|Infinity/);
  });
}

test('comparison cards independently require complete ratings', async () => {
  const page = await loadScores({
    'kimi-k3': { playability: 8, visual: null, code_quality: null },
    hy: { playability: 9, visual: 8, code_quality: 8 },
  });
  page.elements['btn-compare'].click();
  page.choose('hy');
  assert.deepEqual(page.totals(), ['—', '8.4']);
});
