'use strict';

const MENU_PAGE      = 'vibe-translate-page';
const MENU_SELECTION = 'vibe-translate-selection';
const MENU_HOVER     = 'vibe-translate-hover';

const MAX_GLOSSARY_BYTES = 2 * 1024 * 1024;
const MAX_GLOSSARY_TOTAL_BYTES = 4 * 1024 * 1024;
const MAX_GLOSSARY_FILES = 20;
const MAX_GLOSSARY_MERGED_ROWS = 10000;
const GLOSSARY_FETCH_TIMEOUT_MS = 15000;

// ─── Open the two-pane PDF translation viewer for a given tab ──────────────────
async function openViewer(tab) {
  let viewer = chrome.runtime.getURL('viewer.html');
  if (tab?.url && isPdf(tab.url)) {
    viewer += '?file=' + encodeURIComponent(tab.url);
  }
  await chrome.tabs.create({ url: viewer });
}

function isPdf(url) {
  try {
    const path = new URL(url).pathname;
    return /\.pdf(\?.*)?$/i.test(path) || /\/pdf\/[^/]+$/i.test(path);
  } catch {
    return false;
  }
}

function canInject(url) {
  if (!/^(https?|file):/i.test(url)) return false;
  if (/^https?:\/\/(chrome\.google\.com\/webstore|chromewebstore\.google\.com)/i.test(url)) return false;
  return true;
}

async function handleTrigger(tab) {
  if (!tab || !tab.id) return;
  const url = tab.url || '';
  if (isPdf(url)) return openViewer(tab);
  if (!canInject(url)) return openViewer(tab);
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'VIBE_TOGGLE_PAGE' });
  } catch (_) {
    try {
      await injectInto(tab.id);
      await chrome.tabs.sendMessage(tab.id, { type: 'VIBE_TOGGLE_PAGE' });
    } catch (e) {
      console.warn('[氛圍閱讀] 內容腳本注入失敗，改開檢視器：', e);
      openViewer(tab);
    }
  }
}

async function injectInto(tabId) {
  await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['translate-core.js', 'content.js'],
  });
}

async function translateSelection(tab, text) {
  if (!tab?.id || !canInject(tab.url || '')) return;
  try {
    await injectInto(tab.id);
    await chrome.tabs.sendMessage(tab.id, { type: 'VIBE_TRANSLATE_SELECTION', text: text || '' });
  } catch (e) {
    console.warn('[氛圍閱讀] 選取翻譯注入失敗：', e);
  }
}

async function enableHover(tab) {
  if (!tab?.id || !canInject(tab.url || '')) return;
  try {
    await injectInto(tab.id);
    await chrome.tabs.sendMessage(tab.id, { type: 'VIBE_ENABLE_HOVER' });
  } catch (e) {
    console.warn('[氛圍閱讀] 懸停翻譯注入失敗：', e);
  }
}

// ─── Optional professional glossary remote sources ────────────────────────────
function isAllowedGlossaryUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { return false; }
  if (u.protocol === 'https:') return true;
  if (u.protocol !== 'http:') return false;
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(u.hostname);
}

async function fetchWithTimeout(url, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GLOSSARY_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'follow',
      ...options,
      signal: ctrl.signal,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('連線逾時（15 秒）。');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGlossaryUrl(rawUrl) {
  if (!isAllowedGlossaryUrl(rawUrl)) {
    throw new Error('辭庫網址僅允許 HTTPS；本機開發可使用 http://localhost 或 127.0.0.1。');
  }

  const resp = await fetchWithTimeout(rawUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const declaredLength = Number(resp.headers.get('content-length') || 0);
  if (declaredLength > MAX_GLOSSARY_BYTES) {
    throw new Error('單一辭庫檔案超過 2 MB 上限。');
  }

  const text = await resp.text();
  if (new Blob([text]).size > MAX_GLOSSARY_BYTES) {
    throw new Error('單一辭庫檔案超過 2 MB 上限。');
  }
  return text;
}

function parseGitHubDirectoryUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch {
    throw new Error('請填入有效的 GitHub 目錄網址。');
  }
  if (u.protocol !== 'https:' || u.hostname.toLowerCase() !== 'github.com') {
    throw new Error('自動讀取目錄目前支援 github.com 的 HTTPS tree 目錄網址。');
  }

  const parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length < 5 || parts[2] !== 'tree') {
    throw new Error('請使用 GitHub 目錄網址，例如 https://github.com/owner/repo/tree/main/glossaries');
  }

  const [owner, repo, , ref, ...pathParts] = parts;
  if (!owner || !repo || !ref || !pathParts.length) {
    throw new Error('GitHub 目錄網址缺少 repository、branch 或目錄路徑。');
  }

  return { owner, repo, ref, path: pathParts.join('/') };
}

function inferGlossaryLanguage(name) {
  const stem = String(name || '').replace(/\.csv$/i, '');
  const match = stem.match(/_(zh-(?:TW|CN|HK|MO|Hant|Hans)|[a-z]{2}(?:-[A-Z]{2})?)$/i);
  return match ? match[1] : 'auto';
}

async function listGitHubGlossaryDirectory(rawUrl) {
  const loc = parseGitHubDirectoryUrl(rawUrl);
  const apiUrl =
    `https://api.github.com/repos/${encodeURIComponent(loc.owner)}/${encodeURIComponent(loc.repo)}` +
    `/contents/${loc.path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(loc.ref)}`;

  const resp = await fetchWithTimeout(apiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!resp.ok) {
    const remain = resp.headers.get('x-ratelimit-remaining');
    if (resp.status === 403 && remain === '0') {
      throw new Error('GitHub API 公開查詢額度暫時用完，請稍後再試。');
    }
    throw new Error(`GitHub 目錄讀取失敗：HTTP ${resp.status}`);
  }

  const data = await resp.json();
  if (!Array.isArray(data)) throw new Error('這個 GitHub 網址不是可列出的目錄。');

  const files = data
    .filter(item => item?.type === 'file' && /\.csv$/i.test(item.name || '') && item.download_url)
    .map(item => ({
      name: item.name,
      path: item.path,
      url: item.download_url,
      htmlUrl: item.html_url || '',
      size: Number(item.size || 0),
      language: inferGlossaryLanguage(item.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  if (!files.length) throw new Error('此目錄沒有找到 CSV 辭庫檔案。');
  return { source: loc, files };
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

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function mergeGlossaryDocuments(documents) {
  const rows = [];
  const seen = new Set();

  for (const doc of documents) {
    const parsed = parseCsvRows(doc.text);
    if (!parsed.length) continue;
    const header = parsed[0].map(v => v.trim().toLowerCase());
    const sIdx = header.indexOf('source');
    const tIdx = header.indexOf('target');
    const lIdx = header.indexOf('tgt_lng');
    if (sIdx < 0 || tIdx < 0) {
      throw new Error(`${doc.name} 缺少 source,target 欄位。`);
    }

    for (const row of parsed.slice(1)) {
      const source = (row[sIdx] || '').trim();
      const target = (row[tIdx] || '').trim();
      const tgtLng = lIdx >= 0 ? (row[lIdx] || '').trim() : '';
      if (!source || !target) continue;
      const key = `${source.toLocaleLowerCase()}\u0000${tgtLng.toLocaleLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push([source, target, tgtLng]);
      if (rows.length >= MAX_GLOSSARY_MERGED_ROWS) break;
    }
    if (rows.length >= MAX_GLOSSARY_MERGED_ROWS) break;
  }

  if (!rows.length) throw new Error('選取的檔案沒有可使用的辭庫資料。');
  return 'source,target,tgt_lng\n' +
    rows.map(row => row.map(csvEscape).join(',')).join('\n');
}

async function fetchGlossarySet(sources) {
  const selected = Array.isArray(sources) ? sources : [];
  if (!selected.length) throw new Error('請至少選擇一個辭庫。');
  if (selected.length > MAX_GLOSSARY_FILES) {
    throw new Error(`一次最多選擇 ${MAX_GLOSSARY_FILES} 個遠端辭庫。`);
  }

  const documents = [];
  let totalBytes = 0;

  for (const source of selected) {
    const url = String(source?.url || '').trim();
    const name = String(source?.name || url || 'glossary.csv');
    if (!url) throw new Error(`辭庫 ${name} 缺少下載網址。`);
    const text = await fetchGlossaryUrl(url);
    totalBytes += new Blob([text]).size;
    if (totalBytes > MAX_GLOSSARY_TOTAL_BYTES) {
      throw new Error('選取的辭庫合計超過 4 MB 上限，請減少選取數量。');
    }
    documents.push({ name, text });
  }

  const text = mergeGlossaryDocuments(documents);
  return {
    text,
    count: parseCsvRows(text).length - 1,
    files: documents.map(d => d.name),
  };
}

// ─── Context menu (right-click) ────────────────────────────────────────────────
function setupMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_PAGE,
      title: '氛圍閱讀：翻譯這個頁面 / 切回原文',
      contexts: ['all'],
    });
    chrome.contextMenus.create({
      id: MENU_SELECTION,
      title: '氛圍閱讀：翻譯選取的文字',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: MENU_HOVER,
      title: '氛圍閱讀：開啟懸停翻譯（按住修飾鍵翻該段）',
      contexts: ['all'],
    });
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  setupMenu();
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html?welcome=1') });
  }
});
chrome.runtime.onStartup.addListener(setupMenu);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_PAGE) handleTrigger(tab);
  else if (info.menuItemId === MENU_SELECTION) translateSelection(tab, info.selectionText);
  else if (info.menuItemId === MENU_HOVER) enableHover(tab);
});

// ─── Messages ──────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'VIBE_OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (msg?.type === 'VIBE_FETCH_GLOSSARY_URL') {
    fetchGlossaryUrl(msg.url)
      .then(text => sendResponse({ ok: true, text }))
      .catch(e => sendResponse({ ok: false, error: e.message || String(e) }));
    return true;
  }

  if (msg?.type === 'VIBE_LIST_GLOSSARY_DIRECTORY') {
    listGitHubGlossaryDirectory(msg.url)
      .then(result => sendResponse({ ok: true, ...result }))
      .catch(e => sendResponse({ ok: false, error: e.message || String(e) }));
    return true;
  }

  if (msg?.type === 'VIBE_FETCH_GLOSSARY_SET') {
    fetchGlossarySet(msg.sources)
      .then(result => sendResponse({ ok: true, ...result }))
      .catch(e => sendResponse({ ok: false, error: e.message || String(e) }));
    return true;
  }
});

// ─── Toolbar icon click ─────────────────────────────────────────────────────────
chrome.action.onClicked.addListener(handleTrigger);

// ─── Keyboard shortcut (Alt+T) ────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'translate-pdf') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) handleTrigger(tab);
});
