/* Answer checker for the Algebra 2B Radicals & Quadratics review.
 * Students type an answer; we parse it, compare its exact value to the key
 * (numerically, with complex numbers), then check it is fully simplified. */
(function (root) {
  'use strict';

  /* ================= Answer key (problem number -> spec) ================= */
  const KEY = {
    1: { type: 'expr', ans: '6√2' },
    2: { type: 'expr', ans: '5xy^2√(2x)' },
    3: { parts: [
      { label: '√−49 =', type: 'expr', ans: '7i' },
      { label: '√−20 =', type: 'expr', ans: '2i√5' } ] },
    4: { type: 'expr', ans: '2√3' },
    5: { type: 'expr', ans: '3x^2' },
    6: { type: 'solve', ans: ['11'] },
    7: { type: 'solve', ans: ['14'] },
    8: { type: 'solve', ans: ['9'], extraneous: ['2'] },
    9: { type: 'solve', ans: [], extraneous: ['6'] },
    10: { type: 'solve', ans: ['8', '-3'] },
    11: { type: 'solve', ans: ['-1/2', '-3'] },
    12: { type: 'solve', ans: ['6', '-2'] },
    13: { type: 'solve', ans: ['5i', '-5i'] },
    14: { parts: [
      { label: '(a) t =', type: 'solve', ans: ['3'], extraneous: ['-1'], units: true, suffix: 'seconds',
        extraneousMsg: 'Time can’t be negative. Keep only the answer that makes sense.' },
      { label: '(b) Max height =', type: 'expr', ans: '64', units: true, suffix: 'ft' } ] },
    15: { type: 'expr', ans: '24', label: 'h =', units: true, suffix: 'ft' },
  };

  /* ================= Parsing ================= */
  const VARS = new Set(['x', 'y', 'a', 'b']);
  class InputError extends Error {}
  const fail = m => { throw new InputError(m); };

  function normalize(s) {
    return String(s)
      .replace(/[−–—]/g, '-').replace(/[×·∙⋅]/g, '*').replace(/÷/g, '/')
      .replace(/²/g, '^2').replace(/³/g, '^3')
      .replace(/[[{]/g, '(').replace(/[\]}]/g, ')')
      .replace(/\+\/-|\+-/g, '±')
      .replace(/sqrt/gi, '√').replace(/cbrt/gi, '∛')
      .replace(/\s+/g, '');
  }

  function tokenize(s) {
    const t = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/[0-9.]/.test(c)) {
        let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++;
        const txt = s.slice(i, j);
        if (txt === '.' || (txt.match(/\./g) || []).length > 1) fail(`“${txt}” isn’t a number.`);
        t.push({ k: 'num', v: txt }); i = j; continue;
      }
      if (c === 'i') { t.push({ k: 'i' }); i++; continue; }
      if (VARS.has(c)) { t.push({ k: 'var', v: c }); i++; continue; }
      if ('+-*/^()±√∛'.includes(c)) { t.push({ k: c }); i++; continue; }
      fail(`I don’t understand “${c}”. Use the buttons for √, i and ±.`);
    }
    return t;
  }

  function parse(str) {
    const toks = tokenize(str); let p = 0;
    if (!toks.length) fail('Type an answer first.');
    const peek = () => toks[p], next = () => toks[p++];
    const startsFactor = t => t && ['num', 'var', 'i', '(', '√', '∛'].includes(t.k);
    const closeParen = () => { if (!peek() || peek().k !== ')') fail('Missing a closing parenthesis “)”.'); p++; };

    function expr() {
      let n = term();
      while (peek() && '+-±'.includes(peek().k)) {
        const op = next().k;
        n = { type: op === '+' ? 'add' : op === '-' ? 'sub' : 'pm', a: n, b: term() };
      }
      return n;
    }
    function term() {
      let n = unary();
      for (;;) {
        const t = peek();
        if (t && (t.k === '*' || t.k === '/')) { next(); n = { type: t.k === '*' ? 'mul' : 'div', a: n, b: unary() }; }
        else if (startsFactor(t)) n = { type: 'mul', a: n, b: power(), implicit: true };
        else return n;
      }
    }
    function unary() {
      const t = peek();
      if (t && t.k === '-') { next(); return { type: 'neg', a: unary() }; }
      if (t && t.k === '+') { next(); return unary(); }
      if (t && t.k === '±') { next(); return { type: 'pmu', a: unary() }; }
      return power();
    }
    function power() {
      const base = atom();
      if (peek() && peek().k === '^') {
        next();
        const t = peek();
        let e;
        if (t && t.k === '-') { next(); e = { type: 'neg', a: power() }; } else e = power();
        return { type: 'pow', a: base, b: e };
      }
      return base;
    }
    function atom() {
      const t = next();
      if (!t) fail('Your answer looks unfinished.');
      if (t.k === 'num') return { type: 'num', v: parseFloat(t.v), txt: t.v };
      if (t.k === 'var') return { type: 'var', name: t.v };
      if (t.k === 'i') return { type: 'i' };
      if (t.k === '(') { const e = expr(); closeParen(); return Object.assign({}, e, { paren: true }); }
      if (t.k === '√' || t.k === '∛') return { type: 'root', n: t.k === '√' ? 2 : 3, a: radArg() };
      if (t.k === ')') fail('There’s an extra “)”.');
      fail(`“${t.k}” is in an odd spot. Check your answer.`);
    }
    // What a radical covers: (...) or a run like 2x or 50x^3y^4 (no + or −).
    function radArg() {
      const t = peek();
      if (!t) fail('Put something under the radical.');
      if (t.k === '(') { next(); const e = expr(); closeParen(); return e; }
      if (t.k === '-') { next(); return { type: 'neg', a: radArg() }; }
      let n = power();
      while (peek() && (peek().k === 'num' || peek().k === 'var')) n = { type: 'mul', a: n, b: power(), implicit: true };
      return n;
    }

    const tree = expr();
    if (p < toks.length) fail(toks[p].k === ')' ? 'There’s an extra “)”.' : `“${toks[p].k}” is in an odd spot. Check your answer.`);
    return tree;
  }

  /* ================= Complex evaluation ================= */
  const C = (re, im = 0) => ({ re, im });
  const cadd = (a, b) => C(a.re + b.re, a.im + b.im);
  const csub = (a, b) => C(a.re - b.re, a.im - b.im);
  const cmul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
  const cneg = a => C(-a.re, -a.im);
  function csqrt(a) {
    const r = Math.hypot(a.re, a.im);
    let im = Math.sqrt(Math.max(0, (r - a.re) / 2)); if (a.im < 0) im = -im;
    return C(Math.sqrt(Math.max(0, (r + a.re) / 2)), im);
  }
  function ccbrt(a) {
    if (Math.abs(a.im) < 1e-14) return C(Math.cbrt(a.re));
    const r = Math.cbrt(Math.hypot(a.re, a.im)), th = Math.atan2(a.im, a.re) / 3;
    return C(r * Math.cos(th), r * Math.sin(th));
  }
  function cpow(a, b) {
    const n = Math.round(b.re);
    if (Math.abs(b.im) < 1e-12 && Math.abs(b.re - n) < 1e-12 && Math.abs(n) <= 200) {
      let base = n < 0 ? cdiv(C(1), a) : a, r = C(1);
      for (let k = 0; k < Math.abs(n); k++) r = cmul(r, base);
      return r;
    }
    const lr = Math.log(Math.hypot(a.re, a.im)), th = Math.atan2(a.im, a.re);
    const re = b.re * lr - b.im * th, im = b.im * lr + b.re * th;
    return C(Math.exp(re) * Math.cos(im), Math.exp(re) * Math.sin(im));
  }
  const pair = (A, B, f) => A.flatMap(x => B.map(y => f(x, y)));

  function ev(n, env) {
    switch (n.type) {
      case 'num': return [C(n.v)];
      case 'var': return [C(env[n.name])];
      case 'i': return [C(0, 1)];
      case 'neg': return ev(n.a, env).map(cneg);
      case 'pmu': return ev(n.a, env).flatMap(z => [z, cneg(z)]);
      case 'root': return ev(n.a, env).map(n.n === 2 ? csqrt : ccbrt);
      case 'add': return pair(ev(n.a, env), ev(n.b, env), cadd);
      case 'sub': return pair(ev(n.a, env), ev(n.b, env), csub);
      case 'pm': return pair(ev(n.a, env), ev(n.b, env), (x, y) => [cadd(x, y), csub(x, y)]).flat();
      case 'mul': return pair(ev(n.a, env), ev(n.b, env), cmul);
      case 'div': return pair(ev(n.a, env), ev(n.b, env), cdiv);
      case 'pow': return pair(ev(n.a, env), ev(n.b, env), cpow);
    }
  }
  const ENVS = [{ x: 1.37, y: 0.83, a: 1.91, b: 0.62 }, { x: 2.21, y: 1.58, a: 0.74, b: 1.29 }, { x: 0.57, y: 2.06, a: 1.13, b: 2.37 }];
  function values(tree) {
    const vals = ENVS.map(env => ev(tree, env));
    if (vals.flat().some(z => !isFinite(z.re) || !isFinite(z.im))) fail('That answer divides by zero.');
    return vals; // vals[envIndex][k]
  }
  const close = (a, b, tol = 1e-7) => Math.hypot(a.re - b.re, a.im - b.im) <= tol * Math.max(1, Math.hypot(b.re, b.im));
  const sameAt = (A, B, tol) => A.every((row, e) => close(row, B[e], tol)); // single-valued per env

  // Split a tree with ± into its separate single values (one tree-value per env each).
  function splitValues(tree) {
    const v = values(tree), k = v[0].length;
    return Array.from({ length: k }, (_, j) => v.map(row => row[j]));
  }

  /* ================= Simplification checks ================= */
  const walk = (n, f) => { if (!n) return; f(n); walk(n.a, f); walk(n.b, f); };
  const has = (n, pred) => { let r = false; walk(n, m => { if (pred(m)) r = true; }); return r; };
  const isPlain = n => !has(n, m => m.type === 'var' || m.type === 'i' || m.type === 'root');
  const isSum = n => ['add', 'sub', 'pm'].includes(n.type);
  const countSpecial = n => { let c = 0; walk(n, m => { if (m.type === 'root' || m.type === 'i') c++; }); return c; };
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const isInt = v => Number.isInteger(v);

  function content(n) {
    switch (n.type) {
      case 'num': return isInt(n.v) && n.v !== 0 ? Math.abs(n.v) : 1;
      case 'neg': case 'pmu': return content(n.a);
      case 'mul': return content(n.a) * content(n.b);
      case 'add': case 'sub': case 'pm': return gcd(content(n.a), content(n.b));
      default: return 1;
    }
  }
  function monomial(n) { // {coef, vars} or null
    switch (n.type) {
      case 'num': return { coef: n.v, vars: {} };
      case 'var': return { coef: 1, vars: { [n.name]: 1 } };
      case 'neg': { const m = monomial(n.a); return m && { coef: -m.coef, vars: m.vars }; }
      case 'mul': {
        const A = monomial(n.a), B = monomial(n.b); if (!A || !B) return null;
        const vars = Object.assign({}, A.vars);
        for (const k in B.vars) vars[k] = (vars[k] || 0) + B.vars[k];
        return { coef: A.coef * B.coef, vars };
      }
      case 'pow': {
        if (n.b.type !== 'num' || !isInt(n.b.v)) return null;
        const A = monomial(n.a); if (!A) return null;
        const vars = {}; for (const k in A.vars) vars[k] = A.vars[k] * n.b.v;
        return { coef: Math.pow(A.coef, n.b.v), vars };
      }
      default: return null;
    }
  }

  // Returns a reason code, or null if the answer looks fully simplified.
  function simplifyIssue(tree, opts = {}) {
    let issue = null;
    const flag = c => { if (!issue) issue = c; };
    walk(tree, n => {
      if (n.type === 'root') {
        if (has(n.a, m => m.type === 'div')) flag('rad-frac');
        const m = monomial(n.a);
        if (m) {
          if (n.n === 2 && m.coef < 0) flag('neg-rad');
          const c = Math.abs(m.coef);
          if (isInt(c)) {
            if (c <= 1 && !Object.keys(m.vars).length) flag('rad-factor');
            for (let k = 2; Math.pow(k, n.n) <= c; k++) if (c % Math.pow(k, n.n) === 0) { flag('rad-factor'); break; }
          }
          for (const v in m.vars) if (m.vars[v] >= n.n) flag('rad-factor');
        }
      }
      if (n.type === 'div') {
        if (has(n.b, m => m.type === 'root' || m.type === 'i')) flag('rad-denom');
        const d = n.b.type === 'neg' ? n.b.a : n.b;
        if (d.type === 'num' && isInt(d.v) && Math.abs(d.v) > 1 && gcd(content(n.a), d.v) > 1) flag('reduce');
        if (d.type === 'num' && Math.abs(d.v) === 1) flag('combine');
      }
      if (n.type === 'pow') {
        const e = n.b.type === 'neg' ? n.b.a : n.b;
        if (n.b.type === 'neg') flag('neg-exp');
        else if (e.type !== 'num' || !isInt(e.v)) flag('frac-exp');
        else if (n.a.type === 'var') { /* x^2 is fine */ }
        else if (opts.vertexForm && isSum(n.a) && has(n.a, m => m.type === 'var')) { /* a(x-h)^2 */ }
        else if (isPlain(n.a)) flag('pow-num');
        else flag('pow');
      }
      if (n.type === 'mul' && isPlain(n.a) && isPlain(n.b)) flag('combine');
      if (isSum(n)) { // more than one plain-number term in the same sum, e.g. 5 − 4√5 + 4
        const terms = [], grab = m => { if (isSum(m) && !m.paren) { grab(m.a); grab(m.b); } else terms.push(m); };
        grab(Object.assign({}, n, { paren: false }));
        if (terms.filter(isPlain).length > 1) flag('combine');
      }
      if (n.type === 'mul' && isSum(n.a) && isSum(n.b)) flag('expand');
    });
    if (!issue && opts.maxSpecial != null && countSpecial(tree) > opts.maxSpecial) flag('combine');
    return issue;
  }
  const ISSUE_MSG = {
    'neg-rad': 'There’s a negative under a square root. Rewrite it using i.',
    'rad-factor': 'Pull out every perfect-square factor from under the radical.',
    'rad-frac': 'Don’t leave a fraction under a radical.',
    'rad-denom': 'Rationalize the denominator so there are no radicals (or i) in the denominator.',
    'reduce': 'Reduce the fraction.',
    'pow': 'Simplify the power. Don’t leave a power of a radical, of i, or of parentheses.',
    'pow-num': 'Work out the power of the number.',
    'neg-exp': 'Write it without negative exponents.',
    'frac-exp': 'Write it without fractional exponents.',
    'combine': 'Combine like terms and simplify completely.',
    'expand': 'Multiply out the parentheses.',
  };

  /* ================= Checking ================= */
  const R = (status, msg) => ({ status, msg });
  const MSG_RIGHT = 'Correct!';
  const MSG_WRONG = 'Not quite. Check your work and try again.';
  const almost = code => R('almost', 'The value is right, but it isn’t fully simplified. ' + ISSUE_MSG[code]);

  function cleanText(raw, spec) {
    let s = String(raw).trim();
    if (spec.units) s = s.replace(/\s*(seconds?|secs?|s|feet|foot|ft|miles?|mi)\.?\s*$/i, '');
    return normalize(s);
  }
  const stripLhs = s => s.replace(/^[a-z]=/i, '');
  const looksDecimal = s => /\d\.\d|\.\d/.test(s);

  function approxHint(studentVals, targets, text) {
    if (!looksDecimal(text)) return null;
    const near = studentVals.some(v => targets.some(t => sameAt(v, t, 2e-3)));
    return near ? R('almost', 'That looks like a rounded decimal. Give the exact answer (keep radicals and fractions).') : null;
  }

  function checkExpr(raw, spec) {
    const text = stripLhs(cleanText(raw, spec));
    const tree = parse(text);
    const vals = splitValues(tree);
    if (vals.length > 1) return R('error', 'Enter just one answer here (no ±).');
    const expTree = parse(normalize(spec.ans)), exp = splitValues(expTree)[0];
    if (!sameAt(vals[0], exp)) return approxHint(vals, [exp], text) || R('wrong', MSG_WRONG);
    if (spec.vertexForm) {
      let xs = 0; walk(tree, m => { if (m.type === 'var' && m.name === 'x') xs++; });
      if (xs !== 1) return R('almost', 'That’s equal, but it isn’t in vertex form: y = a(x − h)² + k.');
    }
    const issue = simplifyIssue(tree, { vertexForm: spec.vertexForm, maxSpecial: countSpecial(expTree) });
    return issue ? almost(issue) : R('right', MSG_RIGHT);
  }

  function checkSolve(raw, spec) {
    const text = cleanText(raw, spec);
    const none = /^(nosolutions?|norealsolutions?|none|∅|\(\))$/i.test(text);
    const exp = spec.ans.map(a => splitValues(parse(normalize(a)))[0]);
    const extr = (spec.extraneous || []).map(a => splitValues(parse(normalize(a)))[0]);
    const extMsg = spec.extraneousMsg || 'At least one answer is extraneous. It doesn’t check in the original equation.';
    if (none) return exp.length ? R('wrong', 'There is a solution. Check your work again.') : R('right', MSG_RIGHT);
    if (/^no/i.test(text)) fail('To say there’s no solution, type “no solution”.');

    const items = text.split(/,|;|or|and/i).map(stripLhs).filter(Boolean);
    if (!items.length) fail('Type an answer first.');
    const trees = items.map(parse);
    const vals = []; // unique values
    trees.forEach(t => splitValues(t).forEach(v => { if (!vals.some(u => sameAt(u, v))) vals.push(v); }));

    const unmatched = vals.filter(v => !exp.some(e => sameAt(v, e)));
    const missing = exp.filter(e => !vals.some(v => sameAt(v, e)));
    if (!exp.length) return unmatched.some(v => extr.some(e => sameAt(v, e))) ? R('wrong', 'That answer doesn’t check in the original equation (it’s extraneous). What does that tell you about the solution?') : R('wrong', MSG_WRONG);
    if (unmatched.length) {
      if (unmatched.some(v => extr.some(e => sameAt(v, e)))) return R('wrong', extMsg);
      return approxHint(unmatched, exp, text) || R('wrong', vals.length > 1 ? 'At least one of your answers isn’t right. Check your work.' : MSG_WRONG);
    }
    if (missing.length) return R('almost', 'Correct so far, but there’s another solution.');
    const maxSpecial = Math.max(...spec.ans.map(a => countSpecial(parse(normalize(a)))));
    for (const t of trees) { const issue = simplifyIssue(t, { maxSpecial }); if (issue) return almost(issue); }
    return R('right', MSG_RIGHT);
  }

  function checkPoint(raw, spec) {
    const text = normalize(raw).replace(/^\((.*)\)$/, '$1');
    const parts = text.split(',');
    if (parts.length !== 2 || !parts[0] || !parts[1]) fail('Type the vertex as a point, like (2, −5).');
    const ok = parts.every((p, k) => {
      const v = splitValues(parse(p)); return v.length === 1 && sameAt(v[0], splitValues(parse(normalize(spec.ans[k])))[0]);
    });
    return ok ? R('right', MSG_RIGHT) : R('wrong', MSG_WRONG);
  }

  function check(raw, spec) {
    try {
      if (!String(raw).trim()) return R('error', 'Type an answer first.');
      if (spec.type === 'solve') return checkSolve(raw, spec);
      if (spec.type === 'point') return checkPoint(raw, spec);
      return checkExpr(raw, spec);
    } catch (e) {
      if (e instanceof InputError) return R('error', e.message);
      throw e;
    }
  }

  /* ================= Preview (LaTeX) ================= */
  function tex(n, strip) {
    let s;
    switch (n.type) {
      case 'num': s = n.txt; break;
      case 'var': s = n.name; break;
      case 'i': s = 'i'; break;
      case 'neg': s = '-' + tex(n.a); break;
      case 'pmu': s = '\\pm ' + tex(n.a); break;
      case 'add': s = tex(n.a) + '+' + tex(n.b); break;
      case 'sub': s = tex(n.a) + '-' + tex(n.b); break;
      case 'pm': s = tex(n.a) + '\\pm ' + tex(n.b); break;
      case 'mul': s = tex(n.a) + (n.implicit && !(n.b.type === 'num' && !n.b.paren) ? ' ' : ' \\cdot ') + tex(n.b); break;
      case 'div': s = '\\frac{' + tex(n.a, true) + '}{' + tex(n.b, true) + '}'; break;
      case 'pow': s = '{' + tex(n.a) + '}^{' + tex(n.b, true) + '}'; break;
      case 'root': s = (n.n === 3 ? '\\sqrt[3]{' : '\\sqrt{') + tex(n.a, true) + '}'; break;
    }
    return n.paren && !strip ? '\\left(' + s + '\\right)' : s;
  }
  function previewTex(raw, spec) {
    try {
      const text = cleanText(raw, spec);
      if (!text) return '';
      if (spec.type === 'solve') {
        if (/^(nosolutions?|norealsolutions?|none|∅)$/i.test(text)) return '\\text{no solution}';
        return text.split(/,|;|or|and/i).map(stripLhs).filter(Boolean).map(t => tex(parse(t))).join(',\\ ');
      }
      if (spec.type === 'point') {
        const parts = normalize(raw).replace(/^\((.*)\)$/, '$1').split(',');
        return parts.length === 2 ? '\\left(' + parts.map(p => tex(parse(p))).join(',\\ ') + '\\right)' : '';
      }
      return tex(parse(stripLhs(text)));
    } catch (e) { return null; }
  }

  const api = { KEY, check, parse, normalize, previewTex, simplifyIssue, splitValues, values };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ReviewChecker = api;

  /* ================= Page UI ================= */
  if (typeof document === 'undefined') return;
  const KEYS = ['√', 'i', '^', '±', '(', ')', ','];
  const solved = new Set();
  const total = Object.keys(KEY).length;
  api.progress = () => ({ solved: [...solved].sort((a, b) => a - b), total });

  function insertAt(input, text) {
    const s = input.selectionStart ?? input.value.length, e = input.selectionEnd ?? s;
    const v = input.value;
    let ins = text, caret = s + text.length;
    if (text === '√' || text === '∛') { const sel = v.slice(s, e); ins = text + '(' + sel + ')'; caret = s + 2 + sel.length + (sel ? 1 : 0); }
    input.value = v.slice(0, s) + ins + v.slice(e);
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new Event('input'));
  }
  function updateScore() {
    const el = document.getElementById('score');
    if (el) el.textContent = `${solved.size} / ${total} correct`;
  }
  function typeset(el) {
    if (window.MathJax && MathJax.typesetPromise) {
      if (MathJax.typesetClear) MathJax.typesetClear([el]);
      MathJax.typesetPromise([el]).catch(() => {});
    }
  }

  function build(li, num) {
    const spec = KEY[num];
    const parts = spec.parts || [spec];
    const box = document.createElement('div'); box.className = 'work';
    let lastInput = null;
    const rows = parts.map((part, k) => {
      const row = document.createElement('div'); row.className = 'ansrow';
      const id = `q${num}${parts.length > 1 ? String.fromCharCode(97 + k) : ''}`;
      const label = part.label || (part.type === 'solve' ? 'x =' : 'Answer:');
      row.innerHTML = `<label for="${id}">${label}</label>`;
      const input = document.createElement('input');
      Object.assign(input, { id, type: 'text', autocomplete: 'off', spellcheck: false });
      input.setAttribute('autocapitalize', 'off'); input.setAttribute('autocorrect', 'off');
      input.placeholder = part.type === 'solve' ? 'e.g. 3, −5   or   no solution' : part.type === 'point' ? '(x, y)' : 'Your answer';
      row.appendChild(input);
      if (part.suffix) { const u = document.createElement('span'); u.className = 'suffix'; u.textContent = part.suffix; row.appendChild(u); }
      const preview = document.createElement('div'); preview.className = 'preview'; preview.setAttribute('aria-hidden', 'true');
      const fb = document.createElement('div'); fb.className = 'feedback'; fb.setAttribute('aria-live', 'polite');
      box.append(row, preview, fb);
      let timer;
      input.addEventListener('focus', () => { lastInput = input; });
      input.addEventListener('input', () => {
        fb.textContent = ''; fb.className = 'feedback';
        clearTimeout(timer);
        timer = setTimeout(() => {
          const t = previewTex(input.value, part);
          preview.innerHTML = t ? `You entered: \\(${t}\\)` : '';
          if (t) typeset(preview);
        }, 300);
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
      if (!lastInput) lastInput = input;
      return { part, input, fb };
    });

    const pad = document.createElement('div'); pad.className = 'keypad';
    const keys = KEYS.concat(parts.some(p => p.type === 'solve') ? ['no solution'] : []);
    keys.forEach(k => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = k; b.tabIndex = -1;
      b.addEventListener('pointerdown', e => e.preventDefault()); // keep focus/keyboard on the input
      b.addEventListener('click', () => {
        const inp = lastInput; if (!inp) return;
        if (k === 'no solution') { inp.value = 'no solution'; inp.dispatchEvent(new Event('input')); }
        else insertAt(inp, k);
        inp.focus();
      });
      pad.appendChild(b);
    });
    const go = document.createElement('button'); go.type = 'button'; go.className = 'checkbtn'; go.textContent = 'Check work';
    pad.appendChild(go);
    box.appendChild(pad);

    function run() {
      let allRight = true;
      rows.forEach(({ part, input, fb }) => {
        const r = check(input.value, part);
        if (r.status !== 'right') allRight = false;
        const icon = r.status === 'right' ? '✓ ' : r.status === 'wrong' ? '✗ ' : '⚠ ';
        fb.textContent = icon + r.msg;
        fb.className = 'feedback ' + r.status;
      });
      li.classList.toggle('solved', allRight);
      if (allRight) solved.add(num); else solved.delete(num);
      updateScore();
    }
    go.addEventListener('click', run);
    li.appendChild(box);
  }

  function init() {
    document.querySelectorAll('ol.problems > li').forEach(li => {
      const n = parseInt(li.querySelector('.num').textContent, 10);
      if (KEY[n]) build(li, n);
    });
    updateScore();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
