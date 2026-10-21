import type { Params } from './fractal';
import { parameterFields, structures, type MathNode } from './structures';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  return el;
}

/** All content is inserted as text; only the closed MathML tag union creates elements. */
export function renderMath(expression: MathNode, params?: Params): Element {
  const ns = 'http://www.w3.org/1998/Math/MathML';
  if (typeof expression === 'string') {
    const text = document.createElementNS(ns, 'mtext');
    text.textContent = expression;
    return text;
  }
  if ('param' in expression) {
    const field = parameterFields.find(p => p.key === expression.param)!;
    const el = document.createElementNS(ns, params ? 'mn' : 'mi');
    el.textContent = params ? String(params[field.key]) : field.symbol;
    if (params) {
      el.classList.add('current-value');
      el.setAttribute('data-param', field.key);
      el.setAttribute('mathvariant', 'bold');
      el.setAttribute('title', `${field.symbol} = ${params[field.key]}（現在値）`);
    }
    return el;
  }
  if ('fixed' in expression) {
    if (!params) return renderMath(expression.symbol);
    const el = document.createElementNS(ns, 'mn');
    el.textContent = String(expression.fixed);
    return el;
  }
  const el = document.createElementNS(ns, expression.tag);
  for (const child of expression.children) {
    // Token elements contain text rather than nested mtext elements.
    if (typeof child === 'string') el.append(document.createTextNode(child));
    else el.append(renderMath(child, params));
  }
  return el;
}

export function createInspector(root: HTMLElement, initial: Params): (params: Params) => void {
  const bindings: {root: HTMLElement; expression: MathNode}[] = [];
  const values: {output: HTMLOutputElement; key: keyof Params}[] = [];
  const scrollRegions: HTMLElement[] = [];
  function updateTabStops() {
    for (const scroll of scrollRegions) {
      // Hidden panels measure zero. A later resize notification handles showing them.
      const tabIndex = scroll.clientWidth > 0 && scroll.scrollWidth > scroll.clientWidth ? 0 : -1;
      if (scroll.tabIndex !== tabIndex) scroll.tabIndex = tabIndex;
      // Do not blur an already focused region when it stops overflowing.
    }
  }
  const resizeObserver = new ResizeObserver(updateTabStops);
  root.append(element('p', '背景と太字の数値は調整中の現在値です。通常の数値は固定係数。d・t・nは条件が未指定のため記号のまま表示します。'));
  for (const structure of structures) {
    const article = element('article');
    article.id = structure.id;
    article.append(element('h3', structure.name), element('p', structure.classification), element('p', structure.description));
    const list = element('dl');
    list.className = 'parameter-values';
    for (const key of structure.parameters) {
      const field = parameterFields.find(p => p.key === key)!;
      const output = element('output');
      output.className = 'current-value';
      output.dataset.param = key;
      const dd = element('dd');
      dd.append(output, ` ${field.unit} · 現在値`);
      list.append(element('dt', `${field.symbol} · ${field.label}`), dd);
      values.push({output,key});
    }
    article.append(list);
    for (const formula of structure.formulas) {
      const block = element('div');
      block.className = 'formula';
      block.dataset.formula = formula.id;
      block.append(element('h4',formula.name));
      for (const numeric of [false,true]) {
        block.append(element('p',numeric ? '現在値の代入式' : '一般式'));
        const scroll = element('div');
        scroll.className = 'math-scroll';
        scroll.tabIndex = -1;
        scroll.setAttribute('role','region');
        scroll.setAttribute('aria-label',`${formula.name}・${numeric ? '代入式' : '一般式'}`);
        const math = document.createElementNS('http://www.w3.org/1998/Math/MathML','math');
        math.setAttribute('display','block');
        math.append(renderMath(formula.expression, numeric ? initial : undefined));
        scroll.append(math);
        scrollRegions.push(scroll);
        // Region size handles layout/visibility; math size handles content/fonts.
        resizeObserver.observe(scroll);
        resizeObserver.observe(math);
        if (numeric) bindings.push({root:scroll,expression:formula.expression});
        block.append(scroll);
      }
      block.append(element('p',formula.explanation));
      article.append(block);
    }
    const details = element('details');
    details.append(element('summary','ⓘ 変数・実装との対応'));
    const variables = element('dl');
    for (const [symbol,meaning] of structure.variables) variables.append(element('dt',symbol),element('dd',meaning));
    const code = element('code',`${structure.source.path} → ${structure.source.symbols}`);
    const link = element('a','ソースを開く');
    link.href = `https://github.com/tetsujisugimori-coder/Math-Art-Lab/blob/HEAD/${structure.source.path}`;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    details.append(variables,code,element('p'),link);
    article.append(element('p',structure.composition),details);
    root.append(article);
  }
  function sync(params: Params) {
    for (const {output,key} of values) output.textContent = String(params[key]);
    for (const binding of bindings) binding.root.querySelector('math')!.replaceChildren(renderMath(binding.expression,params));
    updateTabStops();
  }
  sync(initial);
  return sync;
}
