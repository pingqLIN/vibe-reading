'use strict';

(function (root) {
  const CHANNEL_NAME = 'vibe-reading-lab-v1';

  function parseProgress(value) {
    const match = String(value || '').match(/(\d+)\s*\/\s*(\d+)/);
    return match ? { done: Number(match[1]), total: Number(match[2]) } : { done: 0, total: 0 };
  }

  function estimateTokens(text, targetLang = '') {
    const value = String(text || '').trim();
    if (!value) return 0;
    const cjk = (value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) || []).length;
    const latinWords = (value.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, ' ').match(/[\p{L}\p{N}_]+/gu) || []).length;
    const punctuation = (value.match(/[^\p{L}\p{N}\s]/gu) || []).length;
    const localeBoost = /^zh|^ja|^ko/i.test(targetLang) ? 1 : 0.9;
    return Math.max(1, Math.ceil(cjk * localeBoost + latinWords * 1.25 + punctuation * 0.35));
  }

  function modeLabel(mode) {
    return mode === 'translator' ? 'Translator API' : mode === 'gemini' ? 'Gemini Nano' : '混合';
  }

  const core = { parseProgress, estimateTokens, modeLabel };
  root.VibeViewerBridgeCore = core;
  if (typeof document === 'undefined') return;

  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL_NAME) : null;
  const viewerId = crypto.randomUUID ? crypto.randomUUID() : `viewer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let engineMode = 'auto';
  let diagnostics = null;
  let broadcastTimer = null;
  let translationStartedAt = 0;
  let previousCompleted = 0;
  let previousTotalSegments = 0;
  let summaryElement = null;
  let labButton = null;

  function safeGlobal(name, fallback = null) {
    try {
      if (name === 'pdfUrl') return typeof pdfUrl !== 'undefined' ? pdfUrl : fallback;
      if (name === 'pdfDoc') return typeof pdfDoc !== 'undefined' ? pdfDoc : fallback;
      if (name === 'paragraphs') return typeof paragraphs !== 'undefined' ? paragraphs : fallback;
      if (name === 'detectedSource') return typeof detectedSource !== 'undefined' ? detectedSource : fallback;
      if (name === 'translatorObj') return typeof translatorObj !== 'undefined' ? translatorObj : fallback;
    } catch (_) {}
    return fallback;
  }

  function completedSegments() {
    return [...document.querySelectorAll('#results .seg-trans')].filter(node => !node.classList.contains('loading') && !node.classList.contains('err'));
  }

  function rollingSpeed() {
    const allSegments = document.querySelectorAll('#results .segment').length;
    const completed = completedSegments();
    if (allSegments < previousTotalSegments || completed.length < previousCompleted) translationStartedAt = 0;
    previousTotalSegments = allSegments;
    previousCompleted = completed.length;

    const status = document.getElementById('statusText')?.textContent || '';
    if (!translationStartedAt && (completed.length || /翻譯中|初始化翻譯引擎/.test(status))) translationStartedAt = Date.now();
    if (!translationStartedAt || !completed.length) return null;

    const text = completed.map(node => node.textContent || '').join('\n');
    const elapsedMs = Math.max(1, Date.now() - translationStartedAt);
    const seconds = elapsedMs / 1000;
    const chars = text.length;
    const target = document.getElementById('targetLang')?.value || '';
    return {
      elapsedMs,
      completed: completed.length,
      outputChars: chars,
      estimatedTokens: estimateTokens(text, target),
      charsPerSec: chars / seconds,
      estimatedTokensPerSec: estimateTokens(text, target) / seconds,
    };
  }

  function currentTitle() {
    return String(document.title || '').replace(/^\[氛圍閱讀\]\s*/, '').trim() || '未命名 PDF';
  }

  function collectState() {
    const doc = safeGlobal('pdfDoc');
    const para = safeGlobal('paragraphs', []);
    const target = document.getElementById('targetLang')?.value || '';
    const localDiagnostics = safeGlobal('translatorObj')?.lastDiagnostics || diagnostics;
    const progress = parseProgress(document.getElementById('progressLabel')?.textContent || '');
    const segmentsDone = completedSegments().length;
    if (!progress.total && Array.isArray(para) && para.length) progress.total = para.length;
    if (!progress.done && segmentsDone) progress.done = segmentsDone;
    return {
      type: 'viewer:state',
      viewerId,
      viewerHref: location.href,
      title: currentTitle(),
      tabTitle: currentTitle(),
      pdfUrl: String(safeGlobal('pdfUrl', '') || ''),
      pageCount: Number(doc?.numPages || 0),
      paragraphCount: Array.isArray(para) ? para.length : 0,
      sourceLang: String(safeGlobal('detectedSource', '') || ''),
      targetLang: target,
      engineMode,
      status: document.getElementById('statusText')?.textContent || '',
      progress,
      diagnostics: localDiagnostics,
      rollingSpeed: rollingSpeed(),
      updatedAt: Date.now(),
    };
  }

  function routeSummary(state) {
    const diag = state.diagnostics;
    const route = diag ? (diag.effectiveEngine === 'gemini' ? 'Gemini' : 'Translator') : modeLabel(state.engineMode);
    const glossary = diag?.glossaryEnabled ? `辭庫 ${diag.matched || 0}/${diag.applied || 0}` : '辭庫關閉';
    const speed = state.rollingSpeed?.estimatedTokensPerSec
      ? `${state.rollingSpeed.estimatedTokensPerSec.toFixed(1)} est tok/s`
      : '';
    return [route, glossary, speed].filter(Boolean).join(' · ');
  }

  function updateViewerChrome(state) {
    ensureViewerControls();
    if (!summaryElement) return;
    summaryElement.textContent = routeSummary(state);
    const detail = [];
    if (state.diagnostics) {
      detail.push(`模式：${modeLabel(state.engineMode)}`);
      detail.push(`最近實際引擎：${state.diagnostics.effectiveEngine === 'gemini' ? 'Gemini Nano' : 'Translator API'}`);
      detail.push(state.diagnostics.glossaryEnabled
        ? `專業辭庫：${state.diagnostics.loaded || 0} 載入 / ${state.diagnostics.matched || 0} 命中 / ${state.diagnostics.applied || 0} 套用`
        : '專業辭庫：關閉');
      if (state.diagnostics.fallback) detail.push(`Fallback：${state.diagnostics.fallback}`);
    }
    if (state.rollingSpeed) {
      detail.push(`目前平均：${state.rollingSpeed.charsPerSec.toFixed(1)} chars/s`);
      detail.push(`目前估算：${state.rollingSpeed.estimatedTokensPerSec.toFixed(1)} tokens/s`);
    }
    summaryElement.title = detail.join('\n');
  }

  function ensureViewerControls() {
    if (summaryElement?.isConnected && labButton?.isConnected) return;
    const engineSelect = document.getElementById('engineModeSelect');
    if (!engineSelect) return;

    summaryElement = document.getElementById('engineRouteSummary');
    if (!summaryElement) {
      summaryElement = document.createElement('span');
      summaryElement.id = 'engineRouteSummary';
      summaryElement.className = 'engine-route-summary';
      summaryElement.textContent = '等待翻譯資料…';
      engineSelect.insertAdjacentElement('afterend', summaryElement);
    }

    labButton = document.getElementById('openPromptLab');
    if (!labButton) {
      labButton = document.createElement('button');
      labButton.id = 'openPromptLab';
      labButton.className = 'engine-lab-button';
      labButton.type = 'button';
      labButton.textContent = 'Lab';
      labButton.title = '開啟 Prompt Diff Lab';
      summaryElement.insertAdjacentElement('afterend', labButton);
      labButton.addEventListener('click', async () => {
        const url = chrome.runtime.getURL('prompt-diff.html');
        try {
          const tabs = await chrome.tabs.query({});
          const existing = tabs.find(tab => tab.url === url);
          if (existing?.id) {
            await chrome.tabs.update(existing.id, { active: true });
            if (existing.windowId != null && chrome.windows?.update) await chrome.windows.update(existing.windowId, { focused: true });
          } else {
            await chrome.tabs.create({ url });
          }
        } catch (_) {
          window.open(url, '_blank');
        }
      });
    }

    if (!document.getElementById('vibeViewerLabStyle')) {
      const style = document.createElement('style');
      style.id = 'vibeViewerLabStyle';
      style.textContent = `
        .engine-route-summary {
          max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          color: var(--faint); font-size: 10px; cursor: help;
        }
        .engine-lab-button {
          min-height: 25px; padding: 3px 8px; border: 1px solid var(--border); border-radius: 8px;
          background: var(--surface-2); color: var(--muted); font: 600 10px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          cursor: pointer;
        }
        .engine-lab-button:hover { color: var(--accent); border-color: var(--accent); }
        @media (max-width: 1100px) { .engine-route-summary { display: none; } }
      `;
      document.head.appendChild(style);
    }
  }

  function broadcastState() {
    const state = collectState();
    updateViewerChrome(state);
    channel?.postMessage(state);
  }

  function scheduleBroadcast() {
    clearTimeout(broadcastTimer);
    broadcastTimer = setTimeout(broadcastState, 80);
  }

  function thumbnailData(maxWidth = 320) {
    const source = document.querySelector('#pdfInner .page-wrap canvas');
    if (!source?.width || !source?.height) return '';
    const width = Math.min(Math.max(120, Number(maxWidth || 320)), 320);
    const ratio = width / source.width;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.max(1, Math.round(source.height * ratio));
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.72);
  }

  function sampleParagraphs(limit) {
    const para = safeGlobal('paragraphs', []);
    if (!Array.isArray(para)) return [];
    return para.map(item => String(item?.text || '').trim()).filter(text => text.length >= 20).slice(0, Math.min(20, Math.max(1, Number(limit || 5))));
  }

  channel?.addEventListener('message', event => {
    const message = event.data || {};
    if (message.type === 'lab:discover') scheduleBroadcast();
    else if (message.type === 'viewer:thumbnail-request' && message.viewerId === viewerId) {
      channel.postMessage({ type: 'viewer:thumbnail', viewerId, dataUrl: thumbnailData(message.maxWidth), updatedAt: Date.now() });
    } else if (message.type === 'viewer:sample-request' && message.viewerId === viewerId) {
      try {
        channel.postMessage({
          type: 'viewer:sample', viewerId, requestId: message.requestId,
          sourceLang: String(safeGlobal('detectedSource', '') || ''),
          targetLang: document.getElementById('targetLang')?.value || '',
          paragraphs: sampleParagraphs(message.limit),
        });
      } catch (error) {
        channel.postMessage({ type: 'viewer:sample', viewerId, requestId: message.requestId, error: error.message || String(error) });
      }
    } else if (message.type === 'viewer:focus-request' && message.viewerId === viewerId) {
      window.focus();
    }
  });

  chrome.storage.local.get(['translationEngineMode', 'translationDiagnostics'], cfg => {
    engineMode = ['translator', 'auto', 'gemini'].includes(cfg.translationEngineMode) ? cfg.translationEngineMode : 'auto';
    diagnostics = cfg.translationDiagnostics || null;
    scheduleBroadcast();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.translationEngineMode) engineMode = ['translator', 'auto', 'gemini'].includes(changes.translationEngineMode.newValue) ? changes.translationEngineMode.newValue : 'auto';
    if (changes.translationDiagnostics) diagnostics = changes.translationDiagnostics.newValue || null;
    scheduleBroadcast();
  });

  const observer = new MutationObserver(scheduleBroadcast);
  for (const id of ['statusText', 'progressLabel', 'results', 'pdfInner']) {
    const node = document.getElementById(id);
    if (node) observer.observe(node, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  }
  document.getElementById('targetLang')?.addEventListener('change', scheduleBroadcast);
  window.addEventListener('focus', scheduleBroadcast);
  window.addEventListener('pagehide', () => channel?.postMessage({ type: 'viewer:closed', viewerId, updatedAt: Date.now() }));

  setInterval(broadcastState, 2_000);
  setTimeout(() => { ensureViewerControls(); broadcastState(); }, 0);
})(typeof window !== 'undefined' ? window : globalThis);
