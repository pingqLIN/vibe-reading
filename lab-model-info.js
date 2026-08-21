'use strict';

(function (root) {
  async function probeModelInfo(sourceLang = 'en', targetLang = 'zh-Hant') {
    const unavailableField = label => ({ value: null, label });
    const gemini = {
      name: 'Gemini Nano',
      api: 'Prompt API / LanguageModel',
      availability: 'unavailable',
      params: null,
      storage: 'Chrome-managed',
      location: unavailableField('Chrome 管理；公開 API 未提供路徑'),
      size: unavailableField('公開 API 未提供精確大小'),
    };
    const translator = {
      name: 'Chrome Translator language pack',
      api: 'Translator API',
      availability: 'unavailable',
      sourceLang,
      targetLang,
      storage: 'Chrome-managed',
      location: unavailableField('Chrome 管理；公開 API 未提供路徑'),
      size: unavailableField('公開 API 未提供精確大小'),
    };

    if (typeof LanguageModel !== 'undefined') {
      try { gemini.availability = await LanguageModel.availability(); } catch (_) {}
      if (typeof LanguageModel.params === 'function') {
        try { gemini.params = await LanguageModel.params(); } catch (_) { gemini.params = null; }
      }
    }

    if (typeof Translator !== 'undefined') {
      try { translator.availability = await Translator.availability({ sourceLanguage: sourceLang, targetLanguage: targetLang }); } catch (_) {}
    }

    return {
      gemini,
      translator,
      guidance: {
        internalUrl: 'chrome://on-device-internals',
        note: 'Gemini Nano 的實際檔案大小與 Chrome 內部狀態需由 chrome://on-device-internals 檢查。',
      },
    };
  }

  const core = { probeModelInfo };
  root.VibeModelInfoCore = core;
  if (typeof document === 'undefined') return;

  const cards = document.getElementById('modelCards');
  const refreshButton = document.getElementById('refreshModelInfo');
  const copyButton = document.getElementById('copyOnDeviceUrl');
  const status = document.getElementById('modelInfoStatus');
  if (!cards || !refreshButton || !copyButton || !status) return;

  let selectedDocument = null;
  let contextSnapshot = null;
  let refreshGeneration = 0;

  function availabilityLabel(value) {
    const labels = {
      available: '可使用',
      downloadable: '可下載',
      downloading: '下載中',
      unavailable: '不可使用',
    };
    return labels[value] || String(value || '未知');
  }

  function detailRow(term, value) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = value == null || value === '' ? '—' : String(value);
    return [dt, dd];
  }

  function createCard(model, kind, extraRows = []) {
    const card = document.createElement('article');
    card.className = 'model-card';
    const header = document.createElement('header');
    header.className = 'model-card-header';
    const titleWrap = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = model.name;
    const api = document.createElement('div');
    api.className = 'model-api';
    api.textContent = model.api;
    titleWrap.append(title, api);
    const badge = document.createElement('span');
    badge.className = `availability ${model.availability || 'unavailable'}`;
    badge.textContent = availabilityLabel(model.availability);
    header.append(titleWrap, badge);

    const details = document.createElement('dl');
    details.className = 'model-details';
    const rows = [
      ['類型', kind],
      ['管理方式', model.storage],
      ['安裝位置', model.location.label],
      ['精確大小', model.size.label],
      ...extraRows,
    ];
    for (const [key, value] of rows) details.append(...detailRow(key, value));

    const note = document.createElement('div');
    note.className = 'model-note';
    note.textContent = 'Vibe Reading 不掃描 Chrome profile，也不推測模型檔案名稱、版本或容量。';
    card.append(header, details, note);
    return card;
  }

  async function currentMode() {
    return await new Promise(resolve => chrome.storage.local.get('translationEngineMode', cfg => resolve(cfg.translationEngineMode || 'auto')));
  }

  async function refresh() {
    const generation = ++refreshGeneration;
    refreshButton.disabled = true;
    status.textContent = '正在讀取 Chrome 本機 AI 狀態…';
    status.classList.remove('is-error');
    try {
      selectedDocument = root.VibeLabDocuments?.getSelectedDocument?.() || selectedDocument;
      const sourceLang = selectedDocument?.sourceLang || 'en';
      const targetLang = selectedDocument?.targetLang || root.VibePromptLab?.getTargetLang?.() || 'zh-Hant';
      const [info, mode] = await Promise.all([probeModelInfo(sourceLang, targetLang), currentMode()]);
      if (generation !== refreshGeneration) return;

      cards.replaceChildren();
      const params = info.gemini.params;
      const context = contextSnapshot || root.VibeLabBenchmark?.getLastContextSnapshot?.() || null;
      const geminiRows = [
        ['目前模式', mode === 'gemini' ? 'Force Gemini Nano' : mode === 'translator' ? 'Force Translator API' : 'Auto / 混合'],
        ['Context', context?.contextWindow ? `${Math.round(context.contextUsage || 0)} / ${Math.round(context.contextWindow)}` : '尚無作用中或最近基準測試資料'],
        ['Default / Max Top-K', params ? `${params.defaultTopK} / ${params.maxTopK}` : '此環境未公開'],
        ['Default / Max Temperature', params ? `${params.defaultTemperature} / ${params.maxTemperature}` : '此環境未公開'],
      ];
      const translatorRows = [
        ['語言配對', `${sourceLang} → ${targetLang}`],
        ['模型形式', '按語言配對管理的 language pack'],
      ];
      cards.append(
        createCard(info.gemini, 'Foundation model', geminiRows),
        createCard(info.translator, 'Translation language pack', translatorRows)
      );
      status.textContent = info.guidance.note;
    } catch (error) {
      status.textContent = `讀取模型資訊失敗：${error.message || error}`;
      status.classList.add('is-error');
    } finally {
      refreshButton.disabled = false;
    }
  }

  refreshButton.addEventListener('click', refresh);
  copyButton.addEventListener('click', async () => {
    const value = 'chrome://on-device-internals';
    try {
      await navigator.clipboard.writeText(value);
      status.textContent = `已複製 ${value}`;
    } catch (_) {
      status.textContent = `請手動在網址列開啟：${value}`;
    }
  });
  document.addEventListener('vibe-lab-document-selected', event => { selectedDocument = event.detail?.document || null; refresh(); });
  document.addEventListener('vibe-lab-target-changed', refresh);
  document.addEventListener('vibe-lab-model-context', event => { contextSnapshot = event.detail || null; refresh(); });
  document.addEventListener('vibe-lab-tab-changed', event => { if (event.detail?.value === 'models') refresh(); });

  refresh();
})(typeof window !== 'undefined' ? window : globalThis);
