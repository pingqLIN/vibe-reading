'use strict';

const sel                     = document.getElementById('hoverModifier');
const showBall                = document.getElementById('showBall');
const saved                   = document.getElementById('saved');
const glossaryEnabled         = document.getElementById('glossaryEnabled');
const glossaryBody            = document.getElementById('glossaryBody');
const glossaryFile            = document.getElementById('glossaryFile');
const glossaryCsv             = document.getElementById('glossaryCsv');
const saveGlossaryCsv         = document.getElementById('saveGlossaryCsv');
const clearGlossaryCsv        = document.getElementById('clearGlossaryCsv');
const remoteModeCatalog       = document.getElementById('remoteModeCatalog');
const remoteModeSingle        = document.getElementById('remoteModeSingle');
const catalogPane             = document.getElementById('catalogPane');
const singlePane              = document.getElementById('singlePane');
const glossaryCatalogUrl      = document.getElementById('glossaryCatalogUrl');
const fillImmersiveTermsExample = document.getElementById('fillImmersiveTermsExample');
const loadGlossaryCatalog     = document.getElementById('loadGlossaryCatalog');
const catalogSelector         = document.getElementById('catalogSelector');
const glossaryCatalogFilter   = document.getElementById('glossaryCatalogFilter');
const glossaryCatalogList     = document.getElementById('glossaryCatalogList');
const catalogSelectionSummary = document.getElementById('catalogSelectionSummary');
const selectVisibleGlossaries = document.getElementById('selectVisibleGlossaries');
const clearGlossarySelection  = document.getElementById('clearGlossarySelection');
const glossarySourceUrl       = document.getElementById('glossarySourceUrl');
const glossarySourceConfirmed = document.getElementById('glossarySourceConfirmed');
const glossaryAutoSync        = document.getElementById('glossaryAutoSync');
const syncGlossaryNow         = document.getElementById('syncGlossaryNow');
const glossaryStatus          = document.getElementById('glossaryStatus');

const IMMERSIVE_TERMS_GLOSSARIES =
  'https://github.com/immersive-translate/terms/tree/main/glossaries';
const MAX_REMOTE_GLOSSARY_FILES = 20;

let catalogEntries = [];
let catalogSelectedSources = [];
let restored = false;

function flashSaved(message = '✓ 已儲存（開啟中的網頁分頁即時生效）') {
  saved.textContent = message;
  setTimeout(() => { saved.textContent = ''; }, 2200);
}

function setGlossaryStatus(message, isError = false) {
  glossaryStatus.textContent = message || '';
  glossaryStatus.classList.toggle('status-err', !!isError);
}

function currentRemoteMode() {
  return remoteModeSingle.checked ? 'single' : 'catalog';
}

function currentRemoteReady() {
  if (currentRemoteMode() === 'single') return !!glossarySourceUrl.value.trim();
  return catalogSelectedSources.length > 0;
}

function setGlossaryUiState() {
  glossaryBody.hidden = !glossaryEnabled.checked;
  const mode = currentRemoteMode();
  catalogPane.hidden = mode !== 'catalog';
  singlePane.hidden = mode !== 'single';

  const remoteReady =
    glossaryEnabled.checked &&
    glossarySourceConfirmed.checked &&
    currentRemoteReady();

  syncGlossaryNow.disabled = !remoteReady;
  glossaryAutoSync.disabled = !remoteReady;
  syncGlossaryNow.textContent =
    mode === 'catalog' ? '匯入目前選取的辭庫' : '測試網址並立即匯入';
}

function parseCsvRows(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  const src = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); field = '';
      if (row.some(v => v.trim())) rows.push(row);
      row = [];
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  row.push(field);
  if (row.some(v => v.trim())) rows.push(row);
  return rows;
}

function validateGlossaryCsv(text) {
  const rows = parseCsvRows(text);
  if (!rows.length) throw new Error('CSV 是空的。');
  const header = rows[0].map(v => v.trim().toLowerCase());
  if (!header.includes('source') || !header.includes('target')) {
    throw new Error('CSV 第一列至少需要 source,target 欄位。');
  }
  const sIdx = header.indexOf('source');
  const tIdx = header.indexOf('target');
  const usable = rows.slice(1)
    .filter(r => (r[sIdx] || '').trim() && (r[tIdx] || '').trim())
    .length;
  if (!usable) throw new Error('沒有找到可使用的 source → target 術語資料。');
  return usable;
}

function storageSet(values) {
  return new Promise(resolve => chrome.storage.local.set(values, resolve));
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (resp) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(resp);
    });
  });
}

async function saveCsvText(text, sourceLabel, { remote = false } = {}) {
  const count = validateGlossaryCsv(text);
  const values = {
    glossaryCsv: text,
    glossaryLastSync: Date.now(),
    glossaryLastError: '',
  };
  if (!remote) values.glossaryAutoSync = false;
  await storageSet(values);
  glossaryCsv.value = text;
  if (!remote) glossaryAutoSync.checked = false;
  setGlossaryStatus(`✓ 已載入 ${count} 條辭庫資料（${sourceLabel}）`);
  setGlossaryUiState();
  return count;
}

async function invalidateRemoteConfirmation(message = '') {
  glossarySourceConfirmed.checked = false;
  glossaryAutoSync.checked = false;
  await storageSet({
    glossarySourceConfirmed: false,
    glossaryAutoSync: false,
  });
  if (message) setGlossaryStatus(message);
  setGlossaryUiState();
}

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  return `${Math.round(n / 1024)} KB`;
}

function glossaryBaseName(name, language) {
  let stem = String(name || '').replace(/\.csv$/i, '');
  if (language && language !== 'auto') {
    const suffix = '_' + language;
    if (stem.toLocaleLowerCase().endsWith(suffix.toLocaleLowerCase())) {
      stem = stem.slice(0, -suffix.length);
    }
  }
  return stem;
}

function renderCatalog() {
  const q = glossaryCatalogFilter.value.trim().toLocaleLowerCase();
  const selected = new Set(catalogSelectedSources.map(x => x.url));
  const visible = catalogEntries.filter(entry => {
    if (!q) return true;
    return [entry.name, entry.path, entry.language, glossaryBaseName(entry.name, entry.language)]
      .some(v => String(v || '').toLocaleLowerCase().includes(q));
  });

  glossaryCatalogList.innerHTML = '';
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'catalog-empty';
    empty.textContent = catalogEntries.length ? '沒有符合搜尋條件的辭庫。' : '尚未讀取辭庫清單。';
    glossaryCatalogList.appendChild(empty);
  } else {
    for (const entry of visible) {
      const row = document.createElement('label');
      row.className = 'catalog-item';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'catalog-check';
      cb.checked = selected.has(entry.url);
      cb.dataset.url = entry.url;

      const nameWrap = document.createElement('div');
      nameWrap.className = 'catalog-name';
      const title = document.createElement('div');
      title.className = 'catalog-title';
      title.textContent = glossaryBaseName(entry.name, entry.language);
      title.title = entry.name;
      const meta = document.createElement('div');
      meta.className = 'catalog-meta';
      meta.textContent = [entry.name, formatBytes(entry.size)].filter(Boolean).join(' · ');
      nameWrap.append(title, meta);

      const lang = document.createElement('span');
      lang.className = 'catalog-lang';
      lang.textContent = entry.language || 'auto';

      cb.addEventListener('change', () => updateCatalogSelectionFromUi(cb, entry));
      row.append(cb, nameWrap, lang);
      glossaryCatalogList.appendChild(row);
    }
  }

  catalogSelectionSummary.textContent = catalogSelectedSources.length
    ? `已選擇 ${catalogSelectedSources.length} 個辭庫（最多 ${MAX_REMOTE_GLOSSARY_FILES} 個）`
    : '尚未選擇辭庫';
}

async function updateCatalogSelectionFromUi(cb, entry) {
  const map = new Map(catalogSelectedSources.map(x => [x.url, x]));
  if (cb.checked) {
    if (!map.has(entry.url) && map.size >= MAX_REMOTE_GLOSSARY_FILES) {
      cb.checked = false;
      setGlossaryStatus(`一次最多選擇 ${MAX_REMOTE_GLOSSARY_FILES} 個遠端辭庫。`, true);
      return;
    }
    map.set(entry.url, entry);
  } else {
    map.delete(entry.url);
  }

  catalogSelectedSources = [...map.values()];
  await storageSet({ glossarySelectedSources: catalogSelectedSources });
  await invalidateRemoteConfirmation('辭庫選取已變更；請重新確認資料來源責任。');
  renderCatalog();
}

async function handleCatalogUrlChanged() {
  catalogEntries = [];
  catalogSelectedSources = [];
  catalogSelector.hidden = true;
  glossaryCatalogFilter.value = '';
  await storageSet({
    glossaryCatalogUrl: glossaryCatalogUrl.value.trim(),
    glossarySelectedSources: [],
  });
  await invalidateRemoteConfirmation('GitHub 目錄網址已變更；請重新讀取清單並確認來源。');
}

async function loadCatalog() {
  const url = glossaryCatalogUrl.value.trim();
  if (!url) {
    setGlossaryStatus('請先填入 GitHub 辭庫目錄網址。', true);
    return;
  }

  loadGlossaryCatalog.disabled = true;
  setGlossaryStatus('正在讀取 GitHub 辭庫目錄…');
  try {
    const resp = await sendMessage({ type: 'VIBE_LIST_GLOSSARY_DIRECTORY', url });
    if (!resp?.ok) throw new Error(resp?.error || '目錄讀取失敗');
    catalogEntries = Array.isArray(resp.files) ? resp.files : [];
    if (!catalogEntries.length) throw new Error('此目錄沒有可選擇的 CSV 辭庫。');

    const available = new Set(catalogEntries.map(x => x.url));
    catalogSelectedSources = catalogSelectedSources.filter(x => available.has(x.url));
    await storageSet({
      glossaryCatalogUrl: url,
      glossarySelectedSources: catalogSelectedSources,
    });

    catalogSelector.hidden = false;
    renderCatalog();
    setGlossaryStatus(`✓ 找到 ${catalogEntries.length} 個 CSV 辭庫，請勾選要使用的項目。`);
  } catch (e) {
    setGlossaryStatus(`讀取目錄失敗：${e.message || e}`, true);
  } finally {
    loadGlossaryCatalog.disabled = false;
    setGlossaryUiState();
  }
}

chrome.storage.local.get([
  'hoverModifier', 'showBall',
  'glossaryEnabled', 'glossaryCsv',
  'glossaryRemoteMode', 'glossaryCatalogUrl', 'glossarySelectedSources',
  'glossarySourceUrl', 'glossarySourceConfirmed', 'glossaryAutoSync',
  'glossaryLastSync', 'glossaryLastError',
], (cfg) => {
  sel.value = cfg.hoverModifier || 'Shift';
  showBall.checked = cfg.showBall !== false;

  glossaryEnabled.checked = cfg.glossaryEnabled === true;
  glossaryCsv.value = cfg.glossaryCsv || '';
  glossaryCatalogUrl.value = cfg.glossaryCatalogUrl || '';
  glossarySourceUrl.value = cfg.glossarySourceUrl || '';
  catalogSelectedSources = Array.isArray(cfg.glossarySelectedSources)
    ? cfg.glossarySelectedSources
    : [];

  const mode = cfg.glossaryRemoteMode === 'single' ? 'single' : 'catalog';
  remoteModeCatalog.checked = mode === 'catalog';
  remoteModeSingle.checked = mode === 'single';
  glossarySourceConfirmed.checked = cfg.glossarySourceConfirmed === true;
  glossaryAutoSync.checked = cfg.glossaryAutoSync === true;

  if (catalogSelectedSources.length) {
    catalogSelectionSummary.textContent =
      `已儲存 ${catalogSelectedSources.length} 個選取項目；按「讀取辭庫清單」可重新檢視。`;
  }

  if (cfg.glossaryLastError) {
    setGlossaryStatus(`上次同步失敗：${cfg.glossaryLastError}`, true);
  } else if (cfg.glossaryLastSync && cfg.glossaryCsv) {
    const when = new Date(cfg.glossaryLastSync).toLocaleString();
    setGlossaryStatus(`已載入辭庫；上次更新：${when}`);
  }

  restored = true;
  setGlossaryUiState();
});

sel.addEventListener('change', () => {
  chrome.storage.local.set({ hoverModifier: sel.value }, flashSaved);
});

showBall.addEventListener('change', () => {
  chrome.storage.local.set({ showBall: showBall.checked }, flashSaved);
});

glossaryEnabled.addEventListener('change', async () => {
  await storageSet({ glossaryEnabled: glossaryEnabled.checked });
  setGlossaryUiState();
  flashSaved(glossaryEnabled.checked ? '✓ 專業辭庫已啟用' : '✓ 專業辭庫已關閉');
});

saveGlossaryCsv.addEventListener('click', async () => {
  try {
    await saveCsvText(glossaryCsv.value, '貼上內容');
  } catch (e) {
    setGlossaryStatus(e.message || String(e), true);
  }
});

clearGlossaryCsv.addEventListener('click', async () => {
  glossaryCsv.value = '';
  glossaryAutoSync.checked = false;
  await storageSet({
    glossaryCsv: '',
    glossaryLastSync: 0,
    glossaryLastError: '',
    glossaryAutoSync: false,
  });
  setGlossaryStatus('辭庫內容已清除。');
  setGlossaryUiState();
});

glossaryFile.addEventListener('change', async () => {
  const file = glossaryFile.files?.[0];
  if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error('辭庫檔案超過 2 MB 上限。');
    const text = await file.text();
    await saveCsvText(text, file.name);
  } catch (e) {
    setGlossaryStatus(e.message || String(e), true);
  } finally {
    glossaryFile.value = '';
  }
});

remoteModeCatalog.addEventListener('change', async () => {
  if (!remoteModeCatalog.checked || !restored) return;
  await storageSet({ glossaryRemoteMode: 'catalog' });
  await invalidateRemoteConfirmation('遠端來源模式已切換；請重新確認資料來源責任。');
});

remoteModeSingle.addEventListener('change', async () => {
  if (!remoteModeSingle.checked || !restored) return;
  await storageSet({ glossaryRemoteMode: 'single' });
  await invalidateRemoteConfirmation('遠端來源模式已切換；請重新確認資料來源責任。');
});

glossaryCatalogUrl.addEventListener('change', handleCatalogUrlChanged);

fillImmersiveTermsExample.addEventListener('click', async () => {
  if (glossaryCatalogUrl.value.trim() === IMMERSIVE_TERMS_GLOSSARIES) return;
  glossaryCatalogUrl.value = IMMERSIVE_TERMS_GLOSSARIES;
  await handleCatalogUrlChanged();
  setGlossaryStatus('已填入範例目錄。按「讀取辭庫清單」查看可選項目。');
});

loadGlossaryCatalog.addEventListener('click', loadCatalog);

glossaryCatalogFilter.addEventListener('input', renderCatalog);

selectVisibleGlossaries.addEventListener('click', async () => {
  const q = glossaryCatalogFilter.value.trim().toLocaleLowerCase();
  const visible = catalogEntries.filter(entry => {
    if (!q) return true;
    return [entry.name, entry.path, entry.language, glossaryBaseName(entry.name, entry.language)]
      .some(v => String(v || '').toLocaleLowerCase().includes(q));
  });

  const map = new Map(catalogSelectedSources.map(x => [x.url, x]));
  let added = 0;
  for (const entry of visible) {
    if (map.size >= MAX_REMOTE_GLOSSARY_FILES) break;
    if (!map.has(entry.url)) { map.set(entry.url, entry); added++; }
  }
  catalogSelectedSources = [...map.values()];
  await storageSet({ glossarySelectedSources: catalogSelectedSources });
  await invalidateRemoteConfirmation(
    added ? `已新增選取 ${added} 個辭庫；請重新確認資料來源責任。`
          : '選取內容未增加。'
  );
  renderCatalog();
});

clearGlossarySelection.addEventListener('click', async () => {
  catalogSelectedSources = [];
  await storageSet({ glossarySelectedSources: [] });
  await invalidateRemoteConfirmation('已取消全部辭庫選取。');
  renderCatalog();
});

glossarySourceUrl.addEventListener('change', async () => {
  await storageSet({ glossarySourceUrl: glossarySourceUrl.value.trim() });
  await invalidateRemoteConfirmation('直接 CSV URL 已變更；請重新確認資料來源責任。');
});

glossarySourceConfirmed.addEventListener('change', async () => {
  if (glossarySourceConfirmed.checked && !currentRemoteReady()) {
    glossarySourceConfirmed.checked = false;
    setGlossaryStatus(
      currentRemoteMode() === 'catalog'
        ? '請先從 GitHub 目錄勾選至少一個辭庫。'
        : '請先填入直接 CSV URL。',
      true
    );
  }

  await storageSet({
    glossarySourceConfirmed: glossarySourceConfirmed.checked,
    glossaryRemoteMode: currentRemoteMode(),
    glossaryCatalogUrl: glossaryCatalogUrl.value.trim(),
    glossarySelectedSources: catalogSelectedSources,
    glossarySourceUrl: glossarySourceUrl.value.trim(),
  });

  if (!glossarySourceConfirmed.checked && glossaryAutoSync.checked) {
    glossaryAutoSync.checked = false;
    await storageSet({ glossaryAutoSync: false });
  }
  setGlossaryUiState();
});

glossaryAutoSync.addEventListener('change', async () => {
  if (glossaryAutoSync.checked &&
      (!glossarySourceConfirmed.checked || !currentRemoteReady())) {
    glossaryAutoSync.checked = false;
    setGlossaryStatus('請先選好遠端辭庫並完成資料來源責任確認。', true);
    return;
  }

  await storageSet({
    glossaryAutoSync: glossaryAutoSync.checked,
    glossaryRemoteMode: currentRemoteMode(),
  });
  setGlossaryStatus(glossaryAutoSync.checked
    ? '✓ 已開啟自動動態匯入（最多每 24 小時更新一次）'
    : '自動動態匯入已關閉。');
});

syncGlossaryNow.addEventListener('click', async () => {
  if (!glossarySourceConfirmed.checked || !currentRemoteReady()) {
    setGlossaryStatus('請先設定遠端來源、選擇辭庫並完成責任確認。', true);
    return;
  }

  const mode = currentRemoteMode();
  syncGlossaryNow.disabled = true;
  setGlossaryStatus(mode === 'catalog'
    ? `正在下載並合併 ${catalogSelectedSources.length} 個辭庫…`
    : '正在測試網址並下載辭庫…');

  try {
    let resp;
    let sourceLabel;

    if (mode === 'catalog') {
      resp = await sendMessage({
        type: 'VIBE_FETCH_GLOSSARY_SET',
        sources: catalogSelectedSources,
      });
      sourceLabel = `${catalogSelectedSources.length} 個 GitHub 辭庫`;
    } else {
      const url = glossarySourceUrl.value.trim();
      resp = await sendMessage({ type: 'VIBE_FETCH_GLOSSARY_URL', url });
      sourceLabel = '直接 CSV URL';
    }

    if (!resp?.ok) throw new Error(resp?.error || '下載失敗');
    await saveCsvText(resp.text || '', sourceLabel, { remote: true });
    await storageSet({
      glossaryRemoteMode: mode,
      glossaryCatalogUrl: glossaryCatalogUrl.value.trim(),
      glossarySelectedSources: catalogSelectedSources,
      glossarySourceUrl: glossarySourceUrl.value.trim(),
      glossarySourceConfirmed: true,
      glossaryLastSync: Date.now(),
      glossaryLastError: '',
    });
  } catch (e) {
    await storageSet({ glossaryLastError: e.message || String(e) });
    setGlossaryStatus(`同步失敗：${e.message || e}`, true);
  } finally {
    setGlossaryUiState();
  }
});
