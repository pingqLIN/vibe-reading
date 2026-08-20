'use strict';

const MENU_PAGE      = 'vibe-translate-page';
const MENU_SELECTION = 'vibe-translate-selection';
const MENU_HOVER     = 'vibe-translate-hover';

const MAX_GLOSSARY_BYTES = 2 * 1024 * 1024;
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

// ─── Optional professional glossary remote source ─────────────────────────────
function isAllowedGlossaryUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { return false; }
  if (u.protocol === 'https:') return true;
  if (u.protocol !== 'http:') return false;
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(u.hostname);
}

async function fetchGlossaryUrl(rawUrl) {
  if (!isAllowedGlossaryUrl(rawUrl)) {
    throw new Error('辭庫網址僅允許 HTTPS；本機開發可使用 http://localhost 或 127.0.0.1。');
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GLOSSARY_FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(rawUrl, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const declaredLength = Number(resp.headers.get('content-length') || 0);
    if (declaredLength > MAX_GLOSSARY_BYTES) {
      throw new Error('辭庫檔案超過 2 MB 上限。');
    }

    const text = await resp.text();
    if (new Blob([text]).size > MAX_GLOSSARY_BYTES) {
      throw new Error('辭庫檔案超過 2 MB 上限。');
    }
    return text;
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('辭庫下載逾時（15 秒）。');
    throw e;
  } finally {
    clearTimeout(timer);
  }
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
});

// ─── Toolbar icon click ─────────────────────────────────────────────────────────
chrome.action.onClicked.addListener(handleTrigger);

// ─── Keyboard shortcut (Alt+T) ────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'translate-pdf') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) handleTrigger(tab);
});
