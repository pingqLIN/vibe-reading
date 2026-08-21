'use strict';

(function (root) {
  const CHANNEL_NAME = 'vibe-reading-lab-v1';
  const EXPIRY_MS = 15_000;

  function normalizeState(input = {}) {
    const title = String(input.title || input.tabTitle || '').trim() || filenameFromUrl(input.pdfUrl) || '未命名 PDF';
    return {
      viewerId: String(input.viewerId || ''),
      viewerHref: String(input.viewerHref || ''),
      title,
      pdfUrl: String(input.pdfUrl || ''),
      pageCount: Number(input.pageCount || 0),
      paragraphCount: Number(input.paragraphCount || 0),
      sourceLang: String(input.sourceLang || ''),
      targetLang: String(input.targetLang || ''),
      engineMode: normalizeMode(input.engineMode),
      status: String(input.status || ''),
      progress: normalizeProgress(input.progress),
      diagnostics: input.diagnostics && typeof input.diagnostics === 'object' ? input.diagnostics : null,
      rollingSpeed: input.rollingSpeed && typeof input.rollingSpeed === 'object' ? input.rollingSpeed : null,
      thumbnail: String(input.thumbnail || ''),
      updatedAt: Number(input.updatedAt || Date.now()),
    };
  }

  function normalizeMode(value) {
    return ['translator', 'auto', 'gemini'].includes(value) ? value : 'auto';
  }

  function normalizeProgress(value) {
    const progress = value && typeof value === 'object' ? value : {};
    return { done: Number(progress.done || 0), total: Number(progress.total || 0) };
  }

  function filenameFromUrl(url) {
    try {
      const parsed = new URL(url);
      return decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
    } catch (_) {
      return '';
    }
  }

  function expireDocuments(documents, now = Date.now(), ttl = EXPIRY_MS) {
    return new Map([...documents].filter(([, state]) => now - Number(state.updatedAt || 0) <= ttl));
  }

  function pickSelectedViewer(documents, selectedViewerId) {
    if (selectedViewerId && documents.has(selectedViewerId)) return selectedViewerId;
    return documents.keys().next().value || null;
  }

  const core = { normalizeState, expireDocuments, pickSelectedViewer, filenameFromUrl, normalizeMode };
  root.VibeLabDocumentCore = core;

  if (typeof document === 'undefined') return;

  const list = document.getElementById('documentsList');
  const refreshButton = document.getElementById('refreshDocuments');
  const connectionStatus = document.getElementById('labConnectionStatus');
  if (!list || !refreshButton || !connectionStatus) return;

  const documents = new Map();
  const thumbnailRequests = new Set();
  const pendingSamples = new Map();
  let selectedViewerId = localStorage.getItem('vibe-lab-selected-viewer') || null;
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL_NAME) : null;

  function modeLabel(mode) {
    return mode === 'translator' ? 'Translator API' : mode === 'gemini' ? 'Gemini Nano' : '混合';
  }

  function effectiveLabel(diag) {
    if (!diag) return '尚無路由資料';
    return diag.effectiveEngine === 'gemini' ? 'Gemini Nano' : 'Translator API';
  }

  function safeHost(url) {
    try { return new URL(url).hostname || url; }
    catch (_) { return url || '本機檔案'; }
  }

  function selectedState() {
    return selectedViewerId ? documents.get(selectedViewerId) || null : null;
  }

  function dispatchSelection() {
    const state = selectedState();
    document.dispatchEvent(new CustomEvent('vibe-lab-document-selected', { detail: { document: state } }));
  }

  function setSelectedViewer(viewerId) {
    selectedViewerId = pickSelectedViewer(documents, viewerId);
    if (selectedViewerId) localStorage.setItem('vibe-lab-selected-viewer', selectedViewerId);
    else localStorage.removeItem('vibe-lab-selected-viewer');
    render();
    dispatchSelection();
  }

  function requestThumbnail(state) {
    if (!channel || !state?.viewerId || state.thumbnail || thumbnailRequests.has(state.viewerId)) return;
    thumbnailRequests.add(state.viewerId);
    channel.postMessage({ type: 'viewer:thumbnail-request', viewerId: state.viewerId, maxWidth: 320 });
  }

  function createButton(label, className, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `button ${className}`;
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function renderEmpty() {
    list.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<strong>尚未找到開啟中的 Vibe Reading PDF</strong><span>先用擴充功能開啟一份 PDF，這裡就會顯示文件、縮圖與目前翻譯路由。</span>';
    list.appendChild(empty);
  }

  function render() {
    const active = expireDocuments(documents);
    if (active.size !== documents.size) {
      documents.clear();
      for (const [id, state] of active) documents.set(id, state);
    }
    selectedViewerId = pickSelectedViewer(documents, selectedViewerId);

    connectionStatus.textContent = documents.size ? `${documents.size} 份 PDF 已連線` : '尚無 PDF Viewer 連線';
    connectionStatus.classList.toggle('is-live', documents.size > 0);
    list.replaceChildren();
    if (!documents.size) {
      renderEmpty();
      dispatchSelection();
      return;
    }

    for (const state of documents.values()) {
      const card = document.createElement('article');
      card.className = 'document-card';
      card.classList.toggle('is-selected', state.viewerId === selectedViewerId);

      let thumb;
      if (state.thumbnail) {
        thumb = document.createElement('img');
        thumb.src = state.thumbnail;
        thumb.alt = `${state.title} 第一頁縮圖`;
        thumb.className = 'document-thumb';
      } else {
        thumb = document.createElement('div');
        thumb.className = 'document-thumb document-thumb-placeholder';
        thumb.textContent = '正在取得第一頁縮圖…';
        requestThumbnail(state);
      }

      const content = document.createElement('div');
      const title = document.createElement('h3');
      title.className = 'document-title';
      title.textContent = state.title;
      const url = document.createElement('div');
      url.className = 'document-url';
      url.textContent = safeHost(state.pdfUrl);
      url.title = state.pdfUrl;

      const meta = document.createElement('div');
      meta.className = 'document-meta';
      const progressText = state.progress.total ? `${state.progress.done}/${state.progress.total} 段` : '尚未翻譯';
      meta.innerHTML = `<span>${state.pageCount || '—'} 頁</span><span>${state.paragraphCount || '—'} 段</span><span>${state.targetLang || '—'}</span><span>${progressText}</span>`;

      const diag = state.diagnostics;
      const route = document.createElement('div');
      route.className = 'document-route';
      route.textContent = `${modeLabel(state.engineMode)} · 最近使用 ${effectiveLabel(diag)}${diag?.glossaryEnabled ? ` · 辭庫 ${diag.loaded || 0}/${diag.matched || 0}/${diag.applied || 0}` : ' · 辭庫關閉'}${state.rollingSpeed?.estimatedTokensPerSec ? ` · ${state.rollingSpeed.estimatedTokensPerSec.toFixed(1)} est tok/s` : ''}`;
      content.append(title, url, meta, route);

      const actions = document.createElement('div');
      actions.className = 'document-actions';
      actions.append(
        createButton('切換到文件', 'secondary', () => focusDocument(state)),
        createButton(state.viewerId === selectedViewerId ? '已選為測試文件' : '選為測試文件', state.viewerId === selectedViewerId ? 'primary' : 'secondary', () => setSelectedViewer(state.viewerId))
      );

      card.append(thumb, content, actions);
      list.appendChild(card);
    }
    dispatchSelection();
  }

  async function focusDocument(state) {
    channel?.postMessage({ type: 'viewer:focus-request', viewerId: state.viewerId });
    if (!chrome?.tabs?.query || !state.viewerHref) return;
    try {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(item => item.url === state.viewerHref);
      if (!tab?.id) return;
      await chrome.tabs.update(tab.id, { active: true });
      if (tab.windowId != null && chrome.windows?.update) await chrome.windows.update(tab.windowId, { focused: true });
    } catch (error) {
      console.warn('[Prompt Diff Lab] 無法聚焦 PDF Viewer：', error);
    }
  }

  function discover() {
    channel?.postMessage({ type: 'lab:discover', timestamp: Date.now() });
  }

  function requestSample(limit = 5) {
    const state = selectedState();
    if (!channel || !state) return Promise.reject(new Error('尚未選擇 PDF 文件。'));
    const requestId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingSamples.delete(requestId);
        reject(new Error('取得 PDF 測試段落逾時。'));
      }, 10_000);
      pendingSamples.set(requestId, { resolve, reject, timer });
      channel.postMessage({ type: 'viewer:sample-request', viewerId: state.viewerId, requestId, limit: Math.min(20, Math.max(1, Number(limit || 5))) });
    });
  }

  if (channel) {
    channel.addEventListener('message', event => {
      const message = event.data || {};
      if (message.type === 'viewer:state' && message.viewerId) {
        const old = documents.get(message.viewerId);
        const state = normalizeState({ ...old, ...message });
        documents.set(state.viewerId, state);
        render();
      } else if (message.type === 'viewer:closed' && message.viewerId) {
        documents.delete(message.viewerId);
        thumbnailRequests.delete(message.viewerId);
        render();
      } else if (message.type === 'viewer:thumbnail' && message.viewerId) {
        const state = documents.get(message.viewerId);
        if (state && message.dataUrl) {
          documents.set(message.viewerId, { ...state, thumbnail: String(message.dataUrl), updatedAt: Date.now() });
          thumbnailRequests.delete(message.viewerId);
          render();
        }
      } else if (message.type === 'viewer:sample' && message.requestId) {
        const pending = pendingSamples.get(message.requestId);
        if (!pending) return;
        clearTimeout(pending.timer);
        pendingSamples.delete(message.requestId);
        if (message.error) pending.reject(new Error(message.error));
        else pending.resolve(message);
      }
    });
  }

  refreshButton.addEventListener('click', discover);
  setInterval(() => {
    const before = documents.size;
    const active = expireDocuments(documents);
    if (active.size !== before) {
      documents.clear();
      for (const [id, state] of active) documents.set(id, state);
      render();
    }
    discover();
  }, 5_000);

  window.VibeLabDocuments = {
    getSelectedDocument: selectedState,
    getDocuments: () => [...documents.values()],
    setSelectedViewer,
    requestSample,
    refresh: discover,
  };

  render();
  discover();
})(typeof window !== 'undefined' ? window : globalThis);
