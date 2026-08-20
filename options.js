'use strict';

const sel                    = document.getElementById('hoverModifier');
const showBall               = document.getElementById('showBall');
const saved                  = document.getElementById('saved');
const glossaryEnabled        = document.getElementById('glossaryEnabled');
const glossaryBody           = document.getElementById('glossaryBody');
const glossaryFile           = document.getElementById('glossaryFile');
const glossaryCsv            = document.getElementById('glossaryCsv');
const saveGlossaryCsv        = document.getElementById('saveGlossaryCsv');
const clearGlossaryCsv       = document.getElementById('clearGlossaryCsv');
const glossarySourceUrl      = document.getElementById('glossarySourceUrl');
const glossarySourceConfirmed = document.getElementById('glossarySourceConfirmed');
const glossaryAutoSync       = document.getElementById('glossaryAutoSync');
const syncGlossaryNow        = document.getElementById('syncGlossaryNow');
const glossaryStatus         = document.getElementById('glossaryStatus');

function flashSaved(message = '✓ 已儲存（開啟中的網頁分頁即時生效）') {
  saved.textContent = message;
  setTimeout(() => { saved.textContent = ''; }, 2200);
}

function setGlossaryStatus(message, isError = false) {
  glossaryStatus.textContent = message || '';
  glossaryStatus.classList.toggle('status-err', !!isError);
}

function setGlossaryUiState() {
  glossaryBody.hidden = !glossaryEnabled.checked;
  const remoteReady = glossaryEnabled.checked &&
    glossarySourceConfirmed.checked &&
    !!glossarySourceUrl.value.trim();
  syncGlossaryNow.disabled = !remoteReady;
  glossaryAutoSync.disabled = !remoteReady;
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
  const usable = rows.slice(1).filter(r => (r[sIdx] || '').trim() && (r[tIdx] || '').trim()).length;
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

async function saveCsvText(text, sourceLabel) {
  const count = validateGlossaryCsv(text);
  await storageSet({
    glossaryCsv: text,
    glossaryLastSync: Date.now(),
    glossaryLastError: '',
  });
  glossaryCsv.value = text;
  setGlossaryStatus(`✓ 已載入 ${count} 條辭庫資料（${sourceLabel}）`);
}

chrome.storage.local.get([
  'hoverModifier', 'showBall',
  'glossaryEnabled', 'glossaryCsv', 'glossarySourceUrl',
  'glossarySourceConfirmed', 'glossaryAutoSync',
  'glossaryLastSync', 'glossaryLastError',
], (cfg) => {
  sel.value = cfg.hoverModifier || 'Shift';
  showBall.checked = cfg.showBall !== false;

  glossaryEnabled.checked = cfg.glossaryEnabled === true;
  glossaryCsv.value = cfg.glossaryCsv || '';
  glossarySourceUrl.value = cfg.glossarySourceUrl || '';
  glossarySourceConfirmed.checked = cfg.glossarySourceConfirmed === true;
  glossaryAutoSync.checked = cfg.glossaryAutoSync === true;

  if (cfg.glossaryLastError) {
    setGlossaryStatus(`上次同步失敗：${cfg.glossaryLastError}`, true);
  } else if (cfg.glossaryLastSync && cfg.glossaryCsv) {
    const when = new Date(cfg.glossaryLastSync).toLocaleString();
    setGlossaryStatus(`已載入辭庫；上次更新：${when}`);
  }
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
  await storageSet({
    glossaryCsv: '',
    glossaryLastSync: 0,
    glossaryLastError: '',
  });
  setGlossaryStatus('辭庫內容已清除。');
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

glossarySourceUrl.addEventListener('input', async () => {
  // A confirmation applies to the exact URL the user saw. Editing the URL
  // invalidates the previous confirmation and disables automatic fetching.
  if (glossarySourceConfirmed.checked) {
    glossarySourceConfirmed.checked = false;
    glossaryAutoSync.checked = false;
  }
  await storageSet({
    glossarySourceUrl: glossarySourceUrl.value.trim(),
    glossarySourceConfirmed: false,
    glossaryAutoSync: false,
  });
  setGlossaryUiState();
});

glossarySourceConfirmed.addEventListener('change', async () => {
  await storageSet({
    glossarySourceUrl: glossarySourceUrl.value.trim(),
    glossarySourceConfirmed: glossarySourceConfirmed.checked,
  });
  if (!glossarySourceConfirmed.checked && glossaryAutoSync.checked) {
    glossaryAutoSync.checked = false;
    await storageSet({ glossaryAutoSync: false });
  }
  setGlossaryUiState();
});

glossaryAutoSync.addEventListener('change', async () => {
  if (glossaryAutoSync.checked && !glossarySourceConfirmed.checked) {
    glossaryAutoSync.checked = false;
    setGlossaryStatus('請先勾選資料來源與責任確認。', true);
    return;
  }
  await storageSet({ glossaryAutoSync: glossaryAutoSync.checked });
  setGlossaryStatus(glossaryAutoSync.checked
    ? '✓ 已開啟自動動態匯入（最多每 24 小時更新一次）'
    : '自動動態匯入已關閉。');
});

syncGlossaryNow.addEventListener('click', async () => {
  const url = glossarySourceUrl.value.trim();
  if (!url || !glossarySourceConfirmed.checked) {
    setGlossaryStatus('請先填入網址並勾選資料來源與責任確認。', true);
    return;
  }

  syncGlossaryNow.disabled = true;
  setGlossaryStatus('正在測試網址並下載辭庫…');
  try {
    const resp = await sendMessage({ type: 'VIBE_FETCH_GLOSSARY_URL', url });
    if (!resp?.ok) throw new Error(resp?.error || '下載失敗');
    await saveCsvText(resp.text || '', '遠端網址');
    await storageSet({
      glossarySourceUrl: url,
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
