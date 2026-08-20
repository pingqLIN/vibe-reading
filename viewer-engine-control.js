'use strict';

// PDF viewer translation-engine selector.
// Replaces the legacy availability badge with a native dropdown so the selected
// routing mode is always visible and can be changed without opening settings.
(function () {
  const VT = window.VibeTranslate;
  const legacyBadge = document.getElementById('aiBadge');
  const targetLang = document.getElementById('targetLang');
  const translateBtn = document.getElementById('translateBtn');
  if (!VT || !legacyBadge || !targetLang || !translateBtn) return;

  const MODE_LABELS = {
    translator: 'Translator API',
    auto: '混合',
    gemini: 'Gemini Nano',
  };
  const MODE_DESCRIPTIONS = {
    translator: '固定使用 Chrome Translator API；命中專業辭庫時以 placeholder 保護指定譯名。',
    auto: '混合模式：一般段落優先 Translator API；命中專業辭庫時優先 Gemini Nano，必要時自動 fallback。',
    gemini: '固定使用 Gemini Nano / Prompt API，並套用目前的翻譯 prompt 與專業辭庫。',
  };

  const select = document.createElement('select');
  select.id = 'engineModeSelect';
  select.className = 'engine-mode-select';
  select.setAttribute('aria-label', '翻譯引擎模式');
  for (const mode of ['translator', 'auto', 'gemini']) {
    const option = document.createElement('option');
    option.value = mode;
    option.textContent = MODE_LABELS[mode];
    select.appendChild(option);
  }
  legacyBadge.replaceWith(select);

  const style = document.createElement('style');
  style.textContent = `
    .engine-mode-select {
      min-width: 104px;
      max-width: 132px;
      padding: 3px 22px 3px 8px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface-2);
      color: var(--muted);
      font-size: 10px;
      font-weight: 600;
      font-family: inherit;
      line-height: 1.4;
      white-space: nowrap;
      cursor: pointer;
      outline: none;
    }
    .engine-mode-select:hover,
    .engine-mode-select:focus { border-color: var(--accent); }
    .engine-mode-select.mode-translator { background: #203248; color: var(--accent); }
    .engine-mode-select.mode-auto { background: #3a3420; color: var(--warn); }
    .engine-mode-select.mode-gemini { background: var(--ok-bg); color: var(--ok-fg); }
    .engine-mode-select.mode-degraded { border-color: var(--warn); }
    .engine-mode-select.mode-error { background: var(--err-bg); color: var(--err-fg); border-color: var(--err-fg); }
    .engine-mode-select option { background: var(--surface-2); color: var(--text); }
  `;
  document.head.appendChild(style);

  let currentDiagnostics = null;
  let currentAvailability = { translator: false, gemini: false };
  let currentModeReady = false;
  let switchGeneration = 0;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const storageGet = keys => new Promise(resolve => chrome.storage.local.get(keys, resolve));
  const storageSet = values => new Promise(resolve => chrome.storage.local.set(values, resolve));

  function normalizeMode(value) {
    return ['translator', 'auto', 'gemini'].includes(value) ? value : 'auto';
  }

  function isPdfReady() {
    try {
      return typeof pdfDoc !== 'undefined' && !!pdfDoc &&
        typeof paragraphs !== 'undefined' && Array.isArray(paragraphs) && paragraphs.length > 0;
    } catch (_) {
      return false;
    }
  }

  function isTranslationActive() {
    try { return typeof abortCtrl !== 'undefined' && !!abortCtrl; }
    catch (_) { return false; }
  }

  function hasTranslationOutput() {
    return !!document.querySelector('#results .segment');
  }

  function setViewerStatus(message) {
    try {
      if (typeof setStatus === 'function') setStatus(message);
    } catch (_) {}
  }

  async function probeAvailability(target) {
    const result = { translator: false, gemini: false, translatorState: 'unavailable', geminiState: 'unavailable' };
    const probeSource = target === 'en' ? 'fr' : 'en';

    if ('Translator' in self) {
      try {
        const state = await Translator.availability({ sourceLanguage: probeSource, targetLanguage: target });
        result.translatorState = state;
        result.translator = state !== 'unavailable';
      } catch (_) {}
    }

    if ('LanguageModel' in self) {
      try {
        const state = await LanguageModel.availability();
        result.geminiState = state;
        result.gemini = state !== 'unavailable';
      } catch (_) {}
    }
    return result;
  }

  function modeIsReady(mode, availability) {
    if (mode === 'translator') return availability.translator;
    if (mode === 'gemini') return availability.gemini;
    return availability.translator || availability.gemini;
  }

  function routeText(diag) {
    if (!diag) return '';
    const effective = diag.effectiveEngine === 'gemini' ? 'Gemini Nano' : 'Translator API';
    const glossary = diag.glossaryEnabled
      ? `辭庫 ${diag.loaded || 0} 載入 / ${diag.matched || 0} 命中 / ${diag.applied || 0} 套用`
      : '辭庫關閉';
    return `最近段落：${effective}；${glossary}${diag.fallback ? `；Fallback：${diag.fallback}` : ''}`;
  }

  function updateControlAppearance(mode, availability, diag) {
    const translatorOption = select.querySelector('option[value="translator"]');
    const autoOption = select.querySelector('option[value="auto"]');
    const geminiOption = select.querySelector('option[value="gemini"]');
    translatorOption.disabled = !availability.translator;
    geminiOption.disabled = !availability.gemini;
    autoOption.disabled = !(availability.translator || availability.gemini);

    select.className = `engine-mode-select mode-${mode}`;
    currentModeReady = modeIsReady(mode, availability);
    if (!currentModeReady) select.classList.add('mode-error');
    else if (mode === 'auto' && !(availability.translator && availability.gemini)) select.classList.add('mode-degraded');

    const availableText = `Translator ${availability.translator ? '✓' : '×'} / Gemini ${availability.gemini ? '✓' : '×'}`;
    const degraded = mode === 'auto' && currentModeReady && !(availability.translator && availability.gemini)
      ? '目前只有一種引擎可用，混合模式會退化運作。'
      : '';
    const lastRoute = diag && normalizeMode(diag.mode) === mode ? routeText(diag) : '';
    select.title = [MODE_DESCRIPTIONS[mode], availableText, degraded, lastRoute].filter(Boolean).join('\n');

    if (!currentModeReady) {
      translateBtn.disabled = true;
    } else if (isPdfReady() && !isTranslationActive()) {
      translateBtn.disabled = false;
    }
  }

  async function refreshEngineControl() {
    const stored = await storageGet(['translationEngineMode', 'translationDiagnostics']);
    const mode = normalizeMode(stored.translationEngineMode);
    if (select.value !== mode) select.value = mode;
    if (!currentDiagnostics && stored.translationDiagnostics) currentDiagnostics = stored.translationDiagnostics;
    currentAvailability = await probeAvailability(targetLang.value || 'zh-Hant');
    updateControlAppearance(mode, currentAvailability, currentDiagnostics);
    return { mode, availability: currentAvailability, ready: currentModeReady };
  }

  // Keep viewer.js's existing checkAI() for error guidance, but always follow it
  // with mode-aware availability so Force Gemini/Translator cannot be mislabeled.
  try {
    if (typeof checkAI === 'function') {
      const legacyCheckAI = checkAI;
      checkAI = async function () {
        await legacyCheckAI();
        return await refreshEngineControl();
      };
    }
  } catch (_) {}

  async function restartPdfForModeChange(mode) {
    const generation = ++switchGeneration;
    currentDiagnostics = null;

    await refreshEngineControl();
    if (!currentModeReady) {
      setViewerStatus(`${MODE_LABELS[mode]} 目前不可用；請改選其他模式或完成模型下載。`);
      return;
    }

    if (!isPdfReady() || (!isTranslationActive() && !hasTranslationOutput())) {
      setViewerStatus(`已切換至 ${MODE_LABELS[mode]}。`);
      return;
    }

    setViewerStatus(`正在切換至 ${MODE_LABELS[mode]}，停止目前翻譯後將從頭重翻…`);
    try {
      if (typeof abortCtrl !== 'undefined' && abortCtrl) abortCtrl.abort();
    } catch (_) {}

    const deadline = Date.now() + 60000;
    while (isTranslationActive() && Date.now() < deadline) {
      if (generation !== switchGeneration) return;
      await sleep(100);
    }
    if (generation !== switchGeneration) return;

    if (isTranslationActive()) {
      setViewerStatus(`已切換至 ${MODE_LABELS[mode]}；目前模型呼叫尚未結束，結束後請按「翻譯」重新執行。`);
      return;
    }

    try {
      if (typeof translatorObj !== 'undefined') translatorObj = null;
    } catch (_) {}

    await refreshEngineControl();
    if (generation !== switchGeneration || !currentModeReady) return;

    try {
      if (typeof startTranslation === 'function') startTranslation(true);
    } catch (e) {
      setViewerStatus(`切換成功，但重新翻譯失敗：${e.message || e}`);
    }
  }

  select.addEventListener('change', async () => {
    const mode = normalizeMode(select.value);
    await storageSet({ translationEngineMode: mode });
    // onChanged will perform the restart for this viewer and all other open PDF viewers.
  });

  targetLang.addEventListener('change', () => {
    setTimeout(() => refreshEngineControl().catch(() => {}), 0);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.translationDiagnostics) {
      currentDiagnostics = changes.translationDiagnostics.newValue || null;
      updateControlAppearance(normalizeMode(select.value), currentAvailability, currentDiagnostics);
    }
    if (changes.translationEngineMode) {
      const mode = normalizeMode(changes.translationEngineMode.newValue);
      select.value = mode;
      restartPdfForModeChange(mode).catch(() => {});
    }
  });

  // If viewer.js later enables the button while a forced engine is unavailable,
  // enforce the mode-aware disabled state without interfering with normal loading.
  const buttonObserver = new MutationObserver(() => {
    if (!currentModeReady && !translateBtn.disabled) translateBtn.disabled = true;
  });
  buttonObserver.observe(translateBtn, { attributes: true, attributeFilter: ['disabled'] });

  // Initial state. checkAI() will run again during viewer initialization.
  refreshEngineControl().catch(() => {});
})();
