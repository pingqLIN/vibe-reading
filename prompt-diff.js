'use strict';

(function () {
  const VT = window.VibeTranslate;
  if (!VT) throw new Error('VibeTranslate 未載入');

  const $ = id => document.getElementById(id);
  const els = {
    targetLang: $('targetLang'), diffMode: $('diffMode'), loadBuiltin: $('loadBuiltin'),
    swapPrompts: $('swapPrompts'), clearPrompts: $('clearPrompts'), beforePrompt: $('beforePrompt'),
    afterPrompt: $('afterPrompt'), beforeChars: $('beforeChars'), afterChars: $('afterChars'),
    addedCount: $('addedCount'), removedCount: $('removedCount'), similarity: $('similarity'),
    beforeDiff: $('beforeDiff'), afterDiff: $('afterDiff'), unifiedDiff: $('unifiedDiff'),
    ruleList: $('ruleList'), modeHint: $('modeHint'), status: $('status'),
  };

  const MAX_UNITS = 1200;
  let presetActive = true;
  let renderTimer = null;

  const RULES = [
    ['目標語言／locale 明確化', text => /target language|locale|翻譯成|目標語言/i.test(text)],
    ['忠實保留原意', text => /preserve.{0,30}(meaning|information)|original meaning|保留.{0,20}(原意|資訊)/i.test(text)],
    ['禁止摘要／增刪／改寫', text => /do not.{0,60}(summarize|add|omit|reinterpret)|不得.{0,30}(摘要|增|刪|改寫)/i.test(text)],
    ['數字／單位／程式碼等保護', text => /(numbers?.{0,30}units?|URLs?|code|formulas?|citations?|數字|單位|網址|程式碼|公式|引用)/i.test(text)],
    ['Glossary／術語一致性', text => /(glossary|terminology consistent|術語.{0,12}一致|辭庫|詞庫)/i.test(text)],
    ['來源資料／Prompt Injection 邊界', text => /(untrusted data|never as instructions|不得.{0,20}指令|不要.{0,20}指令)/i.test(text)],
    ['只輸出翻譯結果', text => /(output only|only.{0,20}translated text|只輸出.{0,20}(翻譯|譯文)|不加任何說明)/i.test(text)],
  ];

  function setupTabs(buttonSelector, panelSelector, storageKey) {
    const buttons = [...document.querySelectorAll(buttonSelector)];
    const panels = [...document.querySelectorAll(panelSelector)];
    const valueFromButton = button => button.dataset.mainTab || button.dataset.compareTab;
    const stored = localStorage.getItem(storageKey);

    function activate(value, { focus = false, persist = true } = {}) {
      const button = buttons.find(item => valueFromButton(item) === value) || buttons[0];
      if (!button) return;
      const activeValue = valueFromButton(button);
      buttons.forEach(item => {
        const selected = item === button;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      panels.forEach(panel => {
        const panelValue = panel.dataset.mainPanel || panel.dataset.comparePanel;
        panel.hidden = panelValue !== activeValue;
      });
      if (persist) localStorage.setItem(storageKey, activeValue);
      if (focus) button.focus();
      document.dispatchEvent(new CustomEvent('vibe-lab-tab-changed', { detail: { group: storageKey, value: activeValue } }));
    }

    buttons.forEach((button, index) => {
      button.addEventListener('click', () => activate(valueFromButton(button)));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        let nextIndex = index;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + buttons.length) % buttons.length;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % buttons.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = buttons.length - 1;
        activate(valueFromButton(buttons[nextIndex]), { focus: true });
      });
    });

    activate(stored || valueFromButton(buttons[0]), { persist: false });
    return { activate };
  }

  function originalSystemPrompt(targetLang) {
    return `你是專業翻譯員。請將輸入的文字翻譯成${VT.langName(targetLang)}，只輸出翻譯結果，不加任何說明文字。`;
  }

  function fillLanguages() {
    els.targetLang.innerHTML = VT.TARGET_LANGS.map(item => {
      const locale = item.locale || item.code;
      return `<option value="${escapeHtml(item.code)}">${escapeHtml(item.name)} · ${escapeHtml(locale)}</option>`;
    }).join('');
    els.targetLang.value = VT.browserDefaultTarget();
  }

  function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function setStatus(message, error = false) {
    els.status.textContent = message || '';
    els.status.classList.toggle('is-error', error);
  }

  function loadBuiltinPrompts() {
    const lang = els.targetLang.value || VT.browserDefaultTarget();
    els.beforePrompt.value = originalSystemPrompt(lang);
    els.afterPrompt.value = VT.translationSystemPrompt(lang);
    presetActive = true;
    scheduleRender();
    setStatus(`已載入 ${VT.langName(lang)} 的 v1.4 原版與目前分支提示詞。`);
  }

  function tokenUnits(text) { return String(text).match(/\s+|[\p{L}\p{N}_-]+|[^\s\p{L}\p{N}_-]/gu) || []; }
  function lineUnits(text) { return String(text).match(/[^\n]*\n|[^\n]+$/g) || []; }
  function visibleUnit(unit, mode) { return mode === 'line' ? unit.replace(/\n$/, '').trim().length > 0 : !/^\s+$/.test(unit); }
  function unitsFor(text, mode) { return mode === 'line' ? lineUnits(text) : tokenUnits(text); }

  function diffSequence(a, b) {
    const n = a.length;
    const m = b.length;
    const rows = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = 1; i <= n; i++) {
      const prev = rows[i - 1];
      const curr = rows[i];
      for (let j = 1; j <= m; j++) curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1]);
    }
    const ops = [];
    let i = n;
    let j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) { ops.push({ type: 'same', value: a[i - 1] }); i--; j--; }
      else if (j > 0 && (i === 0 || rows[i][j - 1] >= rows[i - 1][j])) { ops.push({ type: 'add', value: b[j - 1] }); j--; }
      else { ops.push({ type: 'del', value: a[i - 1] }); i--; }
    }
    return ops.reverse();
  }

  function appendSpan(container, type, value) {
    const span = document.createElement('span');
    span.className = type;
    span.textContent = value;
    container.appendChild(span);
  }

  function renderOps(ops) {
    els.beforeDiff.replaceChildren();
    els.afterDiff.replaceChildren();
    els.unifiedDiff.replaceChildren();
    for (const op of ops) {
      if (op.type === 'same') {
        appendSpan(els.beforeDiff, 'same', op.value);
        appendSpan(els.afterDiff, 'same', op.value);
        appendSpan(els.unifiedDiff, 'same', op.value);
      } else if (op.type === 'del') {
        appendSpan(els.beforeDiff, 'del', op.value);
        appendSpan(els.unifiedDiff, 'del', op.value);
      } else {
        appendSpan(els.afterDiff, 'add', op.value);
        appendSpan(els.unifiedDiff, 'add', op.value);
      }
    }
    if (!ops.length) {
      els.beforeDiff.textContent = '（空白）';
      els.afterDiff.textContent = '（空白）';
      els.unifiedDiff.textContent = '（沒有內容可比較）';
    }
  }

  function renderRules(before, after) {
    els.ruleList.replaceChildren();
    for (const [nameText, test] of RULES) {
      const row = document.createElement('div');
      row.className = 'rule';
      const name = document.createElement('span');
      name.textContent = nameText;
      const left = document.createElement('span');
      left.className = test(before) ? 'yes' : 'no';
      left.textContent = test(before) ? '原版 ✓' : '原版 —';
      const right = document.createElement('span');
      right.className = test(after) ? 'yes' : 'no';
      right.textContent = test(after) ? '修正版 ✓' : '修正版 —';
      row.append(name, left, right);
      els.ruleList.appendChild(row);
    }
  }

  function render() {
    const before = els.beforePrompt.value;
    const after = els.afterPrompt.value;
    let mode = els.diffMode.value;
    let beforeUnits = unitsFor(before, mode);
    let afterUnits = unitsFor(after, mode);
    if ((beforeUnits.length > MAX_UNITS || afterUnits.length > MAX_UNITS) && mode === 'token') {
      mode = 'line';
      beforeUnits = unitsFor(before, mode);
      afterUnits = unitsFor(after, mode);
      setStatus('內容較長，已暫時改用逐行比較以控制記憶體用量。');
    }
    if (beforeUnits.length > MAX_UNITS || afterUnits.length > MAX_UNITS) {
      els.beforeDiff.textContent = '內容過長，請縮短後比較。';
      els.afterDiff.textContent = '內容過長，請縮短後比較。';
      els.unifiedDiff.textContent = '單邊最多比較 1200 個單位。';
      return;
    }

    const ops = diffSequence(beforeUnits, afterUnits);
    renderOps(ops);
    renderRules(before, after);
    const added = ops.filter(op => op.type === 'add' && visibleUnit(op.value, mode)).length;
    const removed = ops.filter(op => op.type === 'del' && visibleUnit(op.value, mode)).length;
    const common = ops.filter(op => op.type === 'same' && visibleUnit(op.value, mode)).length;
    const denominator = Math.max(beforeUnits.filter(unit => visibleUnit(unit, mode)).length, afterUnits.filter(unit => visibleUnit(unit, mode)).length, 1);
    els.beforeChars.textContent = before.length.toLocaleString();
    els.afterChars.textContent = after.length.toLocaleString();
    els.addedCount.textContent = added.toLocaleString();
    els.removedCount.textContent = removed.toLocaleString();
    els.similarity.textContent = `${Math.round(common / denominator * 100)}%`;
    els.modeHint.textContent = mode === 'line' ? '逐行' : '逐詞／符號';
  }

  function scheduleRender() { clearTimeout(renderTimer); renderTimer = setTimeout(render, 70); }

  setupTabs('[data-main-tab]', '[data-main-panel]', 'vibe-lab-main-tab');
  setupTabs('[data-compare-tab]', '[data-compare-panel]', 'vibe-lab-compare-tab');
  fillLanguages();

  els.loadBuiltin.addEventListener('click', loadBuiltinPrompts);
  els.swapPrompts.addEventListener('click', () => {
    [els.beforePrompt.value, els.afterPrompt.value] = [els.afterPrompt.value, els.beforePrompt.value];
    presetActive = false;
    setStatus('已交換左右內容。');
    scheduleRender();
  });
  els.clearPrompts.addEventListener('click', () => {
    els.beforePrompt.value = '';
    els.afterPrompt.value = '';
    presetActive = false;
    setStatus('已清空，可貼入任意兩版提示詞。');
    scheduleRender();
  });
  els.targetLang.addEventListener('change', () => {
    document.dispatchEvent(new CustomEvent('vibe-lab-target-changed', { detail: { targetLang: els.targetLang.value } }));
    if (presetActive) loadBuiltinPrompts();
    else setStatus('目標語言已切換；按「載入原版與現行版」可重新產生內建提示詞。');
  });
  els.diffMode.addEventListener('change', scheduleRender);
  [els.beforePrompt, els.afterPrompt].forEach(textarea => textarea.addEventListener('input', () => { presetActive = false; scheduleRender(); }));

  window.VibePromptLab = {
    getTargetLang: () => els.targetLang.value || VT.browserDefaultTarget(),
    activateMainTab(value) { document.querySelector(`[data-main-tab="${value}"]`)?.click(); },
    setStatus,
  };

  loadBuiltinPrompts();
})();
