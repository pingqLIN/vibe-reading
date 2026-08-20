'use strict';

(function () {
  const VT = window.VibeTranslate;
  if (!VT) throw new Error('VibeTranslate 未載入');

  const els = {
    targetLang: document.getElementById('targetLang'),
    diffMode: document.getElementById('diffMode'),
    loadBuiltin: document.getElementById('loadBuiltin'),
    swapPrompts: document.getElementById('swapPrompts'),
    clearPrompts: document.getElementById('clearPrompts'),
    beforePrompt: document.getElementById('beforePrompt'),
    afterPrompt: document.getElementById('afterPrompt'),
    beforeChars: document.getElementById('beforeChars'),
    afterChars: document.getElementById('afterChars'),
    addedCount: document.getElementById('addedCount'),
    removedCount: document.getElementById('removedCount'),
    similarity: document.getElementById('similarity'),
    beforeDiff: document.getElementById('beforeDiff'),
    afterDiff: document.getElementById('afterDiff'),
    unifiedDiff: document.getElementById('unifiedDiff'),
    ruleList: document.getElementById('ruleList'),
    modeHint: document.getElementById('modeHint'),
    status: document.getElementById('status'),
    engineMode: document.getElementById('engineMode'),
    diagnosticsVerbose: document.getElementById('diagnosticsVerbose'),
    refreshDiagnostics: document.getElementById('refreshDiagnostics'),
    clearDiagnostics: document.getElementById('clearDiagnostics'),
    routingExplanation: document.getElementById('routingExplanation'),
    diagMode: document.getElementById('diagMode'),
    diagRoute: document.getElementById('diagRoute'),
    diagLoaded: document.getElementById('diagLoaded'),
    diagMatched: document.getElementById('diagMatched'),
    diagApplied: document.getElementById('diagApplied'),
    diagGlossary: document.getElementById('diagGlossary'),
    diagTarget: document.getElementById('diagTarget'),
    diagFallback: document.getElementById('diagFallback'),
    diagTime: document.getElementById('diagTime'),
    matchedTerms: document.getElementById('matchedTerms'),
  };

  const MAX_UNITS = 1200;
  let presetActive = true;
  let renderTimer = null;

  const RULES = [
    { name: '目標語言／locale 明確化', test: text => /target language|locale|翻譯成|目標語言/i.test(text) },
    { name: '忠實保留原意', test: text => /preserve.{0,30}(meaning|information)|original meaning|保留.{0,20}(原意|資訊)/i.test(text) },
    { name: '禁止摘要／增刪／改寫', test: text => /do not.{0,60}(summarize|add|omit|reinterpret)|不得.{0,30}(摘要|增|刪|改寫)/i.test(text) },
    { name: '數字／單位／程式碼等保護', test: text => /(numbers?.{0,30}units?|URLs?|code|formulas?|citations?|數字|單位|網址|程式碼|公式|引用)/i.test(text) },
    { name: 'Glossary／術語一致性', test: text => /(glossary|terminology consistent|術語.{0,12}一致|辭庫|詞庫)/i.test(text) },
    { name: '來源資料／Prompt Injection 邊界', test: text => /(untrusted data|never as instructions|不得.{0,20}指令|不要.{0,20}指令)/i.test(text) },
    { name: '只輸出翻譯結果', test: text => /(output only|only.{0,20}translated text|只輸出.{0,20}(翻譯|譯文)|不加任何說明)/i.test(text) },
  ];

  const ROUTE_EXPLANATIONS = {
    auto: 'Auto（推薦）：無辭庫命中時優先 Translator API；命中術語時改走 Gemini Nano + glossary。若 Gemini 不可用或首次下載需要使用者手勢，才退回 Translator placeholder。',
    translator: 'Force Translator API：所有段落都使用 Translator。命中 glossary 時先以 placeholder 保護來源術語，再還原成指定 target；僅供 A/B 與相容性測試。',
    gemini: 'Force Gemini Nano：所有段落都使用 Prompt API 與目前 system prompt；最適合直接比較原版／修正版 prompt 行為。',
  };

  function originalSystemPrompt(targetLang) {
    return `你是專業翻譯員。請將輸入的文字翻譯成${VT.langName(targetLang)}，只輸出翻譯結果，不加任何說明文字。`;
  }

  function fillLanguages() {
    els.targetLang.innerHTML = VT.TARGET_LANGS
      .map(item => `<option value="${escapeAttr(item.code)}">${escapeHtml(item.name)} · ${escapeHtml(item.locale || item.code)}</option>`)
      .join('');
    els.targetLang.value = VT.browserDefaultTarget();
  }

  function fillEngineModes() {
    const modes = VT.ENGINE_MODES || [
      { value: 'auto', name: 'Auto（Glossary Hybrid）' },
      { value: 'translator', name: 'Force Translator API' },
      { value: 'gemini', name: 'Force Gemini Nano' },
    ];
    els.engineMode.innerHTML = modes
      .map(item => `<option value="${escapeAttr(item.value)}">${escapeHtml(item.name)}</option>`)
      .join('');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) { return escapeHtml(value); }

  function storageGet(keys) {
    return new Promise(resolve => chrome.storage.local.get(keys, resolve));
  }

  function storageSet(values) {
    return new Promise(resolve => chrome.storage.local.set(values, resolve));
  }

  function loadBuiltinPrompts() {
    const lang = els.targetLang.value || VT.browserDefaultTarget();
    els.beforePrompt.value = originalSystemPrompt(lang);
    els.afterPrompt.value = VT.translationSystemPrompt(lang);
    presetActive = true;
    scheduleRender();
    els.status.textContent = `已載入 ${VT.langName(lang)} 的 v1.4 原版與目前 branch prompt。`;
  }

  function tokenUnits(text) {
    return String(text).match(/\s+|[\p{L}\p{N}_-]+|[^\s\p{L}\p{N}_-]/gu) || [];
  }

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
      for (let j = 1; j <= m; j++) {
        curr[j] = a[i - 1] === b[j - 1]
          ? prev[j - 1] + 1
          : Math.max(prev[j], curr[j - 1]);
      }
    }
    const ops = [];
    let i = n;
    let j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        ops.push({ type: 'same', value: a[i - 1] }); i--; j--;
      } else if (j > 0 && (i === 0 || rows[i][j - 1] >= rows[i - 1][j])) {
        ops.push({ type: 'add', value: b[j - 1] }); j--;
      } else {
        ops.push({ type: 'del', value: a[i - 1] }); i--;
      }
    }
    ops.reverse();
    return ops;
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
    for (const rule of RULES) {
      const row = document.createElement('div'); row.className = 'rule';
      const name = document.createElement('span'); name.textContent = rule.name;
      const left = document.createElement('span');
      left.className = rule.test(before) ? 'yes' : 'no';
      left.textContent = rule.test(before) ? 'Before ✓' : 'Before —';
      const right = document.createElement('span');
      right.className = rule.test(after) ? 'yes' : 'no';
      right.textContent = rule.test(after) ? 'After ✓' : 'After —';
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
      els.status.textContent = '內容較長，已暫時改用逐行 diff，避免瀏覽器耗用過多記憶體。';
    }
    if (beforeUnits.length > MAX_UNITS || afterUnits.length > MAX_UNITS) {
      els.beforeDiff.textContent = '內容過長，請縮短後比較。';
      els.afterDiff.textContent = '內容過長，請縮短後比較。';
      els.unifiedDiff.textContent = '為避免 diff 計算佔用過多記憶體，單邊最多比較 1200 個單位。';
      return;
    }

    const ops = diffSequence(beforeUnits, afterUnits);
    renderOps(ops);
    renderRules(before, after);
    const added = ops.filter(op => op.type === 'add' && visibleUnit(op.value, mode)).length;
    const removed = ops.filter(op => op.type === 'del' && visibleUnit(op.value, mode)).length;
    const common = ops.filter(op => op.type === 'same' && visibleUnit(op.value, mode)).length;
    const beforeVisible = beforeUnits.filter(unit => visibleUnit(unit, mode)).length;
    const afterVisible = afterUnits.filter(unit => visibleUnit(unit, mode)).length;
    const denominator = Math.max(beforeVisible, afterVisible, 1);
    const similarity = Math.round((common / denominator) * 100);

    els.beforeChars.textContent = before.length.toLocaleString();
    els.afterChars.textContent = after.length.toLocaleString();
    els.addedCount.textContent = added.toLocaleString();
    els.removedCount.textContent = removed.toLocaleString();
    els.similarity.textContent = `${similarity}%`;
    els.modeHint.textContent = mode === 'line' ? '逐行' : '逐詞／符號';
  }

  function scheduleRender() { clearTimeout(renderTimer); renderTimer = setTimeout(render, 80); }

  function renderDiagnostics(diag) {
    const d = diag && typeof diag === 'object' ? diag : null;
    els.matchedTerms.replaceChildren();
    if (!d) {
      els.diagMode.textContent = '—';
      els.diagRoute.textContent = '—';
      els.diagLoaded.textContent = '0';
      els.diagMatched.textContent = '0';
      els.diagApplied.textContent = '0';
      els.diagGlossary.textContent = '—';
      els.diagTarget.textContent = '—';
      els.diagFallback.textContent = '—';
      els.diagTime.textContent = '尚未收到翻譯診斷。請在另一個頁面或 PDF 執行一次翻譯。';
      return;
    }
    els.diagMode.textContent = d.mode || 'auto';
    els.diagRoute.textContent = `${d.baseEngine || '—'} → ${d.effectiveEngine || '—'}`;
    els.diagLoaded.textContent = Number(d.loaded || 0).toLocaleString();
    els.diagMatched.textContent = Number(d.matched || 0).toLocaleString();
    els.diagApplied.textContent = Number(d.applied || 0).toLocaleString();
    els.diagGlossary.textContent = d.glossaryEnabled ? 'ON' : 'OFF';
    els.diagTarget.textContent = d.targetLang || '—';
    els.diagFallback.textContent = d.fallback || '—';
    els.diagTime.textContent = `最後更新：${new Date(d.timestamp || Date.now()).toLocaleString()}。Loaded / Matched / Applied 分別代表可用詞條、此段命中詞條、譯文中實際觀察到 target 的詞條。`;
    for (const term of d.matchedTerms || []) {
      const li = document.createElement('li');
      li.textContent = `${term.source} → ${term.target}`;
      els.matchedTerms.appendChild(li);
    }
  }

  async function refreshDebugSettings() {
    const cfg = await storageGet(['translationEngineMode', 'translationDiagnosticsVerbose', 'translationDiagnostics']);
    const mode = ['auto', 'translator', 'gemini'].includes(cfg.translationEngineMode)
      ? cfg.translationEngineMode : 'auto';
    els.engineMode.value = mode;
    els.diagnosticsVerbose.checked = cfg.translationDiagnosticsVerbose === true;
    els.routingExplanation.textContent = ROUTE_EXPLANATIONS[mode];
    renderDiagnostics(cfg.translationDiagnostics);
  }

  els.loadBuiltin.addEventListener('click', loadBuiltinPrompts);
  els.swapPrompts.addEventListener('click', () => {
    const left = els.beforePrompt.value;
    els.beforePrompt.value = els.afterPrompt.value;
    els.afterPrompt.value = left;
    presetActive = false;
    els.status.textContent = '已交換左右內容。';
    scheduleRender();
  });
  els.clearPrompts.addEventListener('click', () => {
    els.beforePrompt.value = '';
    els.afterPrompt.value = '';
    presetActive = false;
    els.status.textContent = '已清空；可貼入任意兩版 prompt。';
    scheduleRender();
  });
  els.targetLang.addEventListener('change', () => {
    if (presetActive) loadBuiltinPrompts();
    else els.status.textContent = '目標語言已切換；按「載入原版 vs 現行版」可重新產生內建 prompt。';
  });
  els.diffMode.addEventListener('change', scheduleRender);
  for (const textarea of [els.beforePrompt, els.afterPrompt]) {
    textarea.addEventListener('input', () => { presetActive = false; scheduleRender(); });
  }

  els.engineMode.addEventListener('change', async () => {
    const mode = els.engineMode.value;
    await storageSet({ translationEngineMode: mode });
    els.routingExplanation.textContent = ROUTE_EXPLANATIONS[mode];
    els.status.textContent = `Engine Mode 已切換為 ${mode}。下一個翻譯段落即採用新路由；已完成的譯文不會自動重翻。`;
  });
  els.diagnosticsVerbose.addEventListener('change', async () => {
    await storageSet({ translationDiagnosticsVerbose: els.diagnosticsVerbose.checked });
    els.status.textContent = els.diagnosticsVerbose.checked
      ? '已開啟翻譯狀態列診斷。' : '已關閉翻譯狀態列診斷。';
  });
  els.refreshDiagnostics.addEventListener('click', refreshDebugSettings);
  els.clearDiagnostics.addEventListener('click', async () => {
    await storageSet({ translationDiagnostics: null });
    renderDiagnostics(null);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.translationDiagnostics) renderDiagnostics(changes.translationDiagnostics.newValue);
    if (changes.translationEngineMode) {
      const mode = ['auto', 'translator', 'gemini'].includes(changes.translationEngineMode.newValue)
        ? changes.translationEngineMode.newValue : 'auto';
      els.engineMode.value = mode;
      els.routingExplanation.textContent = ROUTE_EXPLANATIONS[mode];
    }
    if (changes.translationDiagnosticsVerbose) {
      els.diagnosticsVerbose.checked = changes.translationDiagnosticsVerbose.newValue === true;
    }
  });

  fillLanguages();
  fillEngineModes();
  loadBuiltinPrompts();
  refreshDebugSettings();
})();
