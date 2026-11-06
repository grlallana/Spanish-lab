/* Spanish Lab: exercise engine (Class A closed exercises + Class B shells)
 * No dependencies. Load it in the forked Writing Lab with a script tag pointing at engine/sl-engine.js,
 * or paste it inside the main script block.
 *
 * Public API (window.SL):
 *   SL.check(type, item, answer, grade)  -> { status: 'correct'|'accent'|'wrong', expected, message }
 *   SL.renderTheory(el, module, level)
 *   SL.renderSet(el, module, set, opts)  opts = { grade, onXP(xp, meta), onDone(result), getFeedback(text, set) -> Promise<string> }
 *   SL.defaultLevel(grade)
 *   SL.ACCENT_MODE                        grade -> 'flag' | 'strict'
 */
(function () {
  'use strict';

  // ---------- Config (decided 2026-11-04, change here if needed) ----------
  const ACCENT_MODE = { MYP3: 'flag', MYP4: 'strict', MYP5: 'strict' };
  const LEVEL_FOR_GRADE = { MYP3: 1, MYP4: 2, MYP5: 3 };

  // ---------- Normalising and checking ----------
  // Lowercase, trim, collapse spaces, drop ¿ ¡ and sentence punctuation. Keep accents and ñ.
  function norm(s) {
    return String(s ?? '')
      .toLowerCase()
      .replace(/[¿¡"“”«»]/g, '')
      .replace(/[.,;:!?…]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  // Remove vowel accents and diaeresis only. ñ is a letter, not an accent.
  function stripAccents(s) {
    return s.replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
            .replace(/[óòôö]/g, 'o').replace(/[úùûü]/g, 'u');
  }

  function check(type, item, answer, grade) {
    if (type === 'choice') {
      const ok = Number(answer) === item.answer;
      return { status: ok ? 'correct' : 'wrong', expected: item.options[item.answer], message: item.why || '' };
    }
    const valid = [item.answer, ...(item.accept || [])];
    const a = norm(answer);
    if (!a) return { status: 'wrong', expected: item.answer, message: 'No answer yet.' };
    if (valid.some(v => norm(v) === a)) return { status: 'correct', expected: item.answer, message: '' };
    const a0 = stripAccents(a);
    if (valid.some(v => stripAccents(norm(v)) === a0)) {
      const mode = ACCENT_MODE[grade] ?? 'strict';
      return {
        status: mode === 'flag' ? 'accent' : 'wrong',
        expected: item.answer,
        message: mode === 'flag'
          ? 'Correct, but watch the accent: ' + item.answer
          : 'Almost! Only the accent is missing: ' + item.answer
      };
    }
    return { status: 'wrong', expected: item.answer, message: '' };
  }

  // ---------- Tiny helpers ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Markdown-lite: **bold**, *italic*, ~~strike~~, newlines
  const md = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const wordCount = s => (String(s).trim().match(/\S+/g) || []).length;

  // ---------- Styles (scoped with sl- prefix; the Writing Lab CSS variables are used if present) ----------
  const CSS = `
  .sl{--sl-accent:var(--accent,#c2410c);--sl-ok:#15803d;--sl-warn:#b45309;--sl-bad:#b91c1c;--sl-line:var(--border,#e5e2dc);--sl-soft:var(--surface-2,#faf8f5);font:inherit;color:inherit}
  .sl h3{margin:1.2em 0 .4em;font-size:1.1rem}
  .sl .sl-tip{border-left:4px solid var(--sl-accent);background:var(--sl-soft);padding:.6em .9em;margin:.6em 0;border-radius:6px}
  .sl table{border-collapse:collapse;margin:.6em 0;width:100%;font-size:.95rem}
  .sl th,.sl td{border:1px solid var(--sl-line);padding:.35em .6em;text-align:left}
  .sl th{background:var(--sl-soft)}
  .sl-set-head{display:flex;justify-content:space-between;align-items:baseline;gap:1em;flex-wrap:wrap}
  .sl-instr{color:var(--muted,#6b665e);margin:.2em 0 1em}
  .sl-item{border:1px solid var(--sl-line);border-radius:10px;padding:.8em 1em;margin:.6em 0}
  .sl-item.ok{border-color:var(--sl-ok);background:#f0fdf4}
  .sl-item.accent{border-color:var(--sl-warn);background:#fffbeb}
  .sl-item.bad{border-color:var(--sl-bad);background:#fef2f2}
  .sl-q{margin-bottom:.5em}
  .sl-hint{color:var(--muted,#6b665e);font-size:.9em}
  .sl input[type=text],.sl textarea{font:inherit;padding:.45em .6em;border:1px solid var(--sl-line);border-radius:8px;width:100%;box-sizing:border-box;background:#fff}
  .sl textarea{min-height:9em;resize:vertical}
  .sl-row{display:flex;gap:.5em;align-items:center}
  .sl-btn{font:inherit;cursor:pointer;border:1px solid var(--sl-line);background:#fff;border-radius:8px;padding:.4em .8em}
  .sl-btn.primary{background:var(--sl-accent);color:#fff;border-color:var(--sl-accent)}
  .sl-btn:disabled{opacity:.5;cursor:default}
  .sl-opts{display:flex;flex-wrap:wrap;gap:.4em}
  .sl-opts .sl-btn.sel{outline:2px solid var(--sl-accent)}
  .sl-msg{margin-top:.4em;font-size:.92em}
  .sl-msg.ok{color:var(--sl-ok)} .sl-msg.accent{color:var(--sl-warn)} .sl-msg.bad{color:var(--sl-bad)}
  .sl-chips{display:flex;flex-wrap:wrap;gap:.35em;min-height:2.2em;padding:.3em;border:1px dashed var(--sl-line);border-radius:8px;margin:.3em 0}
  .sl-chip{cursor:pointer;border:1px solid var(--sl-line);background:#fff;border-radius:999px;padding:.2em .7em}
  .sl-match{display:grid;grid-template-columns:1fr 1fr;gap:.4em}
  .sl-match .sl-btn.done{background:#f0fdf4;border-color:var(--sl-ok);color:var(--sl-ok);cursor:default}
  .sl-match .sl-btn.wrongflash{background:#fef2f2;border-color:var(--sl-bad)}
  .sl-score{font-weight:600}
  .sl-wc{font-size:.85em;color:var(--muted,#6b665e)}
  .sl-crit{margin:.4em 0 .8em;padding-left:1.2em}
  .sl-fb{white-space:pre-wrap;background:var(--sl-soft);border-radius:8px;padding:.8em 1em;margin-top:.8em}
  details.sl-model{margin-top:.6em}
  `;
  function injectCSS() {
    if (document.getElementById('sl-css')) return;
    const s = document.createElement('style'); s.id = 'sl-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  // ---------- Theory ----------
  function renderTheory(el, mod, level) {
    injectCSS();
    const secs = mod.theory.filter(t => !level || t.level <= level);
    el.innerHTML = '<div class="sl">' + secs.map(t => `
      <h3>${esc(t.heading)} <span class="sl-hint">· Nivel ${t.level}</span></h3>
      <div>${md(t.body || '')}</div>
      ${t.table ? `<table><thead><tr>${t.table.head.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${t.table.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
      ${t.tip ? `<div class="sl-tip"><strong>Ojo:</strong> ${md(t.tip)}</div>` : ''}`).join('') + '</div>';
  }

  // ---------- Exercise sets ----------
  function renderSet(el, mod, set, opts = {}) {
    injectCSS();
    const grade = opts.grade || 'MYP5';
    const onXP = opts.onXP || (() => {});
    const onDone = opts.onDone || (() => {});
    el.innerHTML = '';
    const root = h(`<div class="sl"><div class="sl-set-head"><h3>${esc(set.title)}</h3><span class="sl-score"></span></div>
      <p class="sl-instr">${esc(set.instructions || '')}</p><div class="sl-items"></div></div>`);
    el.appendChild(root);
    const list = root.querySelector('.sl-items');
    const scoreEl = root.querySelector('.sl-score');

    if (set.type === 'writing' || set.type === 'reading') return renderOpen(list, mod, set, grade, onXP, onDone, opts.getFeedback, opts.formatFeedback);

    const total = set.items.length;
    const state = set.items.map(() => null);   // null | 'correct' | 'accent' | 'wrong'
    const details = set.items.map(() => null); // { q, given, expected, status } for the teacher's view
    const xpEach = set.xpPerItem ?? 1;

    function updateScore() {
      const done = state.filter(Boolean).length;
      const right = state.filter(s => s === 'correct' || s === 'accent').length;
      scoreEl.textContent = `${right} / ${total}`;
      if (done === total) {
        const xp = right * xpEach;
        const perfect = right === total;
        const res = { setId: set.id, moduleId: mod.id, level: set.level, type: set.type, title: set.title, right, total, xp, perfect, details: details.filter(Boolean) };
        const box = h(`<div class="sl-item ${perfect ? 'ok' : ''}"><strong>${right}/${total}</strong> · +${xp} XP
          ${perfect ? ' · ¡Perfecto! 🎉' : ''} <button class="sl-btn" style="margin-left:1em">Repeat</button></div>`);
        box.querySelector('button').onclick = () => renderSet(el, mod, set, opts);
        list.appendChild(box);
        onXP(xp, res);
        onDone(res);
      }
    }
    // Lock an item after its first answer, so XP can't be farmed by retrying the same item.
    function settle(i, itemEl, r, given) {
      if (state[i]) return;
      state[i] = r.status;
      details[i] = { q: itemLabel(set, set.items[i]), given: given ?? '', expected: r.expected, status: r.status };
      itemEl.classList.add(r.status === 'correct' ? 'ok' : r.status === 'accent' ? 'accent' : 'bad');
      const msg = itemEl.querySelector('.sl-msg');
      const cls = r.status === 'correct' ? 'ok' : r.status === 'accent' ? 'accent' : 'bad';
      msg.className = 'sl-msg ' + cls;
      msg.innerHTML = r.status === 'correct' ? '✓ ' + esc(r.message || '¡Correcto!')
        : r.status === 'accent' ? '⚠︎ ' + esc(r.message)
        : '✗ ' + (r.message ? esc(r.message) + ' · ' : '') + 'Answer: <strong>' + esc(r.expected) + '</strong>';
      itemEl.querySelectorAll('input,button').forEach(b => { b.disabled = true; });
      updateScore();
    }

    set.items.forEach((item, i) => {
      let itemEl;
      if (set.type === 'choice') {
        itemEl = h(`<div class="sl-item"><div class="sl-q">${i + 1}. ${md(item.q)}</div>
          <div class="sl-opts">${item.options.map((o, k) => `<button class="sl-btn" data-k="${k}">${esc(o)}</button>`).join('')}</div>
          <div class="sl-msg"></div></div>`);
        itemEl.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
          b.classList.add('sel');
          settle(i, itemEl, check('choice', item, b.dataset.k, grade), item.options[b.dataset.k]);
        });
      } else if (set.type === 'match') {
        itemEl = renderMatch(item, i, (status) => settle(i, itemEl, { status, expected: 'all pairs', message: status === 'correct' ? 'All matched first time!' : 'Done, with some mistakes.' }, status === 'correct' ? 'no mistakes' : 'with mistakes'));
      } else if (set.type === 'order') {
        itemEl = renderOrder(item, i, grade, (r, given) => settle(i, itemEl, r, given));
      } else {
        // conjugate | gap | translate | transform: a text input
        const prompt =
          set.type === 'conjugate' ? `<strong>${esc(item.subject)}</strong> + <em>${esc(item.verb)}</em>` :
          set.type === 'gap' ? md(item.text).replace('___', '<span class="sl-hint">_____</span>') + (item.hint ? ` <span class="sl-hint">(${esc(item.hint)})</span>` : '') :
          set.type === 'translate' ? `🇬🇧 ${esc(item.en)}` :
          `${esc(item.from)} <span class="sl-hint">→ ${esc(item.instruction)}</span>`;
        itemEl = h(`<div class="sl-item"><div class="sl-q">${i + 1}. ${prompt}</div>
          <div class="sl-row"><input type="text" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off" data-allow-paste="false"><button class="sl-btn primary">Check</button></div>
          <div class="sl-msg"></div></div>`);
        const inp = itemEl.querySelector('input');
        const go = () => settle(i, itemEl, check(set.type, item, inp.value, grade), inp.value);
        itemEl.querySelector('button').onclick = go;
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      }
      list.appendChild(itemEl);
    });
    if (set.bank) list.prepend(h(`<div class="sl-tip"><strong>Banco de palabras:</strong> ${set.bank.map(esc).join(' · ')}</div>`));
    updateScore();
  }

  function renderMatch(item, i, finish) {
    const left = shuffle(item.pairs.map(p => p[0]));
    const right = shuffle(item.pairs.map(p => p[1]));
    const answer = Object.fromEntries(item.pairs);
    const el = h(`<div class="sl-item"><div class="sl-q">${i + 1}. Tap a Spanish word, then its meaning.</div>
      <div class="sl-match"><div class="sl-l"></div><div class="sl-r"></div></div><div class="sl-msg"></div></div>`);
    let picked = null, mistakes = 0, matched = 0;
    const L = el.querySelector('.sl-l'), R = el.querySelector('.sl-r');
    left.forEach(w => { const b = h(`<button class="sl-btn" style="display:block;width:100%;margin:.2em 0">${esc(w)}</button>`); b.onclick = () => { if (b.classList.contains('done')) return; L.querySelectorAll('.sl-btn').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); picked = { w, b }; }; L.appendChild(b); });
    right.forEach(w => { const b = h(`<button class="sl-btn" style="display:block;width:100%;margin:.2em 0">${esc(w)}</button>`); b.onclick = () => {
      if (!picked || b.classList.contains('done')) return;
      if (answer[picked.w] === w) { picked.b.classList.add('done'); picked.b.classList.remove('sel'); b.classList.add('done'); matched++; picked = null; if (matched === item.pairs.length) finish(mistakes === 0 ? 'correct' : 'wrong'); }
      else { mistakes++; b.classList.add('wrongflash'); setTimeout(() => b.classList.remove('wrongflash'), 500); }
    }; R.appendChild(b); });
    return el;
  }

  function renderOrder(item, i, grade, finish) {
    const el = h(`<div class="sl-item"><div class="sl-q">${i + 1}. Build the sentence:</div>
      <div class="sl-chips sl-built"></div><div class="sl-chips sl-pool" style="border-style:solid"></div>
      <div class="sl-row"><button class="sl-btn">Reset</button><button class="sl-btn primary">Check</button></div><div class="sl-msg"></div></div>`);
    const built = el.querySelector('.sl-built'), pool = el.querySelector('.sl-pool');
    const draw = () => {
      pool.innerHTML = ''; built.innerHTML = '';
      shuffle(item.words).forEach(w => { const c = h(`<span class="sl-chip">${esc(w)}</span>`); c.onclick = () => { if (el.classList.contains('ok') || el.classList.contains('bad')) return; (c.parentNode === pool ? built : pool).appendChild(c); }; pool.appendChild(c); });
    };
    draw();
    const [reset, go] = el.querySelectorAll('.sl-row .sl-btn');
    reset.onclick = draw;
    go.onclick = () => { const given = [...built.children].map(c => c.textContent).join(' '); finish(check('order', item, given, grade), given); };
    return el;
  }

  function itemLabel(set, it) {
    switch (set.type) {
      case 'conjugate': return it.subject + ' + ' + it.verb;
      case 'gap': return it.text + (it.hint ? ' (' + it.hint + ')' : '');
      case 'translate': return it.en;
      case 'transform': return it.from + ' → ' + it.instruction;
      case 'choice': return it.q;
      case 'order': return it.words.join(' / ');
      case 'match': return it.pairs.map(p => p[0]).join(', ');
      default: return '';
    }
  }

  // ---------- Class B: open tasks ----------
  function renderOpen(list, mod, set, grade, onXP, onDone, getFeedback, formatFeedback) {
    const box = h(`<div>
      ${set.type === 'reading' ? `<div class="sl-tip" style="border-color:#999">${md(set.text)}</div>
        <ol>${set.questions.map(q => `<li>${esc(q)}</li>`).join('')}</ol>` : `<p><strong>${esc(set.prompt)}</strong></p>`}
      ${set.criteria ? `<div class="sl-hint">Checklist:</div><ul class="sl-crit">${set.criteria.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
      <textarea placeholder="Escribe aquí en español…" spellcheck="false" autocorrect="off"></textarea>
      <div class="sl-row" style="justify-content:space-between"><span class="sl-wc">0 words</span><button class="sl-btn primary">Get feedback</button></div>
      <div class="sl-fb" hidden></div>
      ${set.model ? `<details class="sl-model"><summary>Show a model text (try first!)</summary><p>${md(set.model)}</p></details>` : ''}
    </div>`);
    list.appendChild(box);
    const ta = box.querySelector('textarea'), wc = box.querySelector('.sl-wc'), btn = box.querySelector('.sl-btn'), fb = box.querySelector('.sl-fb');
    ta.addEventListener('input', () => { wc.textContent = wordCount(ta.value) + ' words' + (set.minWords ? ` (aim: ${set.minWords}–${set.maxWords})` : ''); });
    btn.onclick = async () => {
      const text = ta.value.trim();
      if (wordCount(text) < Math.min(10, set.minWords || 10)) { fb.hidden = false; fb.textContent = 'Write a bit more before asking for feedback.'; return; }
      btn.disabled = true; fb.hidden = false; fb.textContent = 'Reading your text…';
      const res = { setId: set.id, moduleId: mod.id, level: set.level, type: set.type, title: set.title, xp: set.xp ?? 0, text, feedback: '', feedbackFailed: false };
      try {
        res.feedback = getFeedback ? await getFeedback(text, set, mod, grade) : 'AI feedback is connected in the real site.';
        if (formatFeedback) fb.innerHTML = formatFeedback(res.feedback); else fb.textContent = res.feedback;
      } catch (e) {
        // Same rule as the Writing Lab: never lose the student's text if the AI fails.
        res.feedbackFailed = true;
        fb.textContent = 'Feedback could not load (is an ad-blocker on?). Your text has still been saved.';
      }
      // XP once per attempt on this page; redrafts get feedback but no extra XP.
      res.firstSend = !box.dataset.awarded;
      if (!box.dataset.awarded) { box.dataset.awarded = '1'; onXP(res.xp, res); }
      onDone(res);
      btn.disabled = false;
    };
  }

  window.SL = {
    check, norm, stripAccents, renderTheory, renderSet, ACCENT_MODE, itemLabel,
    defaultLevel: g => LEVEL_FOR_GRADE[g] ?? 1
  };
})();
