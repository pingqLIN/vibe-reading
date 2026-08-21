'use strict';

(function (root) {
  function estimateTokens(text, targetLang = '') {
    const value = String(text || '').trim();
    if (!value) return 0;
    const cjk = (value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) || []).length;
    const latinWords = (value.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, ' ').match(/[\p{L}\p{N}_]+/gu) || []).length;
    const punctuation = (value.match(/[^\p{L}\p{N}\s]/gu) || []).length;
    const cjkWeight = /^zh|^ja|^ko/i.test(targetLang) ? 1.05 : 1;
    return Math.max(1, Math.ceil(cjk * cjkWeight + latinWords * 1.3 + punctuation * 0.35));
  }

  function median(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function aggregateMode(mode, records) {
    const successful = records.filter(record => record.ok);
    const elapsed = successful.map(record => Number(record.elapsedMs || 0));
    const totalElapsedMs = elapsed.reduce((sum, value) => sum + value, 0);
    const outputChars = successful.reduce((sum, record) => sum + String(record.output || '').length, 0);
    const estimatedTokens = successful.reduce((sum, record) => sum + Number(record.estimatedTokens || 0), 0);
    const seconds = totalElapsedMs / 1000;
    const routes = {};
    for (const record of successful) {
      const route = record.diagnostics?.effectiveEngine || 'unknown';
      routes[route] = (routes[route] || 0) + 1;
    }
    return {
      mode,
      success: successful.length,
      failures: records.length - successful.length,
      totalElapsedMs,
      averageMs: successful.length ? totalElapsedMs / successful.length : 0,
      medianMs: median(elapsed),
      outputChars,
      estimatedTokens,
      charsPerSec: seconds ? outputChars / seconds : 0,
      estimatedTokensPerSec: seconds ? estimatedTokens / seconds : 0,
      matched: successful.reduce((sum, record) => sum + Number(record.diagnostics?.matched || 0), 0),
      applied: successful.reduce((sum, record) => sum + Number(record.diagnostics?.applied || 0), 0),
      fallbacks: successful.filter(record => record.diagnostics?.fallback).length,
      routes,
      records,
    };
  }

  const core = { estimateTokens, median, aggregateMode };
  root.VibeBenchmarkCore = core;
  if (typeof document === 'undefined') return;

  const VT = root.VibeTranslate;
  if (!VT) return;

  const $ = id => document.getElementById(id);
  const els = {
    summary: $('benchmarkDocumentSummary'), sampleSize: $('benchmarkSampleSize'),
    translator: $('benchmarkModeTranslator'), auto: $('benchmarkModeAuto'), gemini: $('benchmarkModeGemini'),
    warmup: $('benchmarkWarmup'), start: $('benchmarkStart'), stop: $('benchmarkStop'),
    progress: $('benchmarkProgress'), progressLabel: $('benchmarkProgressLabel'),
    body: $('benchmarkResultsBody'), status: $('benchmarkStatus'),
  };
  if (Object.values(els).some(value => !value)) return;

  let selectedDocument = null;
  let cancelled = false;
  let running = false;
  let activeEngine = null;
  let lastResults = [];
  let lastModelContext = null;

  function modeLabel(mode) {
    return mode === 'translator' ? 'Translator API' : mode === 'gemini' ? 'Gemini Nano' : '混合';
  }

  function setStatus(message, error = false) {
    els.status.textContent = message || '';
    els.status.classList.toggle('is-error', error);
  }

  async function refreshModeAvailability() {
    if (!selectedDocument || running) return;
    let sourceLang = selectedDocument.sourceLang || 'en';
    const targetLang = selectedDocument.targetLang || root.VibePromptLab?.getTargetLang?.() || 'zh-Hant';
    if (sourceLang === targetLang) sourceLang = sourceLang === 'en' ? 'fr' : 'en';
    let translatorReady = false;
    let geminiReady = false;
    if ('Translator' in self) {
      try { translatorReady = await Translator.availability({ sourceLanguage: sourceLang, targetLanguage: targetLang }) !== 'unavailable'; } catch (_) {}
    }
    if ('LanguageModel' in self) {
      try { geminiReady = await LanguageModel.availability() !== 'unavailable'; } catch (_) {}
    }
    els.translator.disabled = !translatorReady;
    els.gemini.disabled = !geminiReady;
    els.auto.disabled = !(translatorReady || geminiReady);
    if (!translatorReady) els.translator.checked = false;
    if (!geminiReady) els.gemini.checked = false;
    if (!(translatorReady || geminiReady)) els.auto.checked = false;
    els.translator.title = translatorReady ? '' : '此文件語言配對目前無法使用 Translator API。';
    els.gemini.title = geminiReady ? '' : 'Gemini Nano / Prompt API 目前不可用。';
    els.auto.title = translatorReady || geminiReady ? '' : '目前沒有可用的翻譯引擎。';
    els.start.disabled = running || !selectedDocument || !selectedModes().length;
  }

  function updateSelectedDocument(state) {
    selectedDocument = state || root.VibeLabDocuments?.getSelectedDocument?.() || null;
    els.summary.textContent = selectedDocument
      ? `${selectedDocument.title} · ${selectedDocument.pageCount || '—'} 頁 · ${selectedDocument.paragraphCount || '—'} 段 · ${selectedDocument.targetLang || '—'}`
      : '請先在「文件與路由」選擇一份 PDF。';
    els.start.disabled = running || !selectedDocument;
    refreshModeAvailability();
  }

  function selectedModes() {
    return [
      els.translator.checked ? 'translator' : null,
      els.auto.checked ? 'auto' : null,
      els.gemini.checked ? 'gemini' : null,
    ].filter(Boolean);
  }

  function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function termRegex(source) {
    const raw = String(source || '');
    const pieces = raw.split(/([\s\-‐‑–—]+)/u);
    const body = pieces.map(piece => /^[\s\-‐‑–—]+$/u.test(piece) ? '(?:[\\s\\u00A0]+|[-‐‑–—]\\s*)' : escapeRegex(piece)).join('');
    const startsWord = /^[\p{L}\p{N}_]/u.test(raw);
    const endsWord = /[\p{L}\p{N}_]$/u.test(raw);
    return new RegExp(`${startsWord ? '(?<![\\p{L}\\p{N}_])' : ''}${body}${endsWord ? '(?![\\p{L}\\p{N}_])' : ''}`, 'giu');
  }

  function protectTerms(text, terms) {
    let output = String(text || '');
    const tokens = [];
    for (const term of [...terms].sort((a, b) => b.source.length - a.source.length)) {
      const token = `__VIBE_BENCH_TERM_${tokens.length}__`;
      let replaced = false;
      output = output.replace(termRegex(term.source), () => { replaced = true; return token; });
      if (replaced) tokens.push({ token, term });
    }
    return { text: output, tokens };
  }

  function restoreTerms(text, tokens) {
    let output = String(text || '');
    let restored = 0;
    for (const { token, term } of tokens) {
      if (output.includes(token)) {
        output = output.split(token).join(term.target);
        restored++;
      }
    }
    return { text: output, restored };
  }

  function countApplied(text, terms) {
    const output = String(text || '').toLocaleLowerCase();
    return terms.filter(term => output.includes(String(term.target || '').toLocaleLowerCase())).length;
  }

  async function createTranslator(engine) {
    if (engine.translator) return engine.translator;
    if (!('Translator' in self)) throw new Error('Translator API 不可用。');
    const availability = await Translator.availability({ sourceLanguage: engine.sourceLang, targetLanguage: engine.targetLang });
    if (availability === 'unavailable') throw new Error('此語言配對不支援 Translator API。');
    engine.translator = await Translator.create({ sourceLanguage: engine.sourceLang, targetLanguage: engine.targetLang });
    return engine.translator;
  }

  async function createGemini(engine) {
    if (engine.session) return engine.session;
    if (!('LanguageModel' in self)) throw new Error('Gemini Nano / Prompt API 不可用。');
    const availability = await LanguageModel.availability();
    if (availability === 'unavailable') throw new Error('Gemini Nano / Prompt API 不可用。');
    engine.session = await LanguageModel.create({
      initialPrompts: [{ role: 'system', content: VT.translationSystemPrompt(engine.targetLang) }],
    });
    return engine.session;
  }

  async function createEngine(sourceLang, targetLang, mode) {
    if (sourceLang === targetLang) sourceLang = sourceLang === 'en' ? 'fr' : 'en';
    const glossary = typeof VT.loadGlossary === 'function' ? await VT.loadGlossary(targetLang) : [];
    return { sourceLang, targetLang, mode, glossary, translator: null, session: null };
  }

  async function translatorTranslate(engine, text, terms) {
    const translator = await createTranslator(engine);
    if (!terms.length) return { output: await translator.translate(text), fallback: '' };
    const protectedText = protectTerms(text, terms);
    const translated = await translator.translate(protectedText.text);
    const restored = restoreTerms(translated, protectedText.tokens);
    if (restored.restored === protectedText.tokens.length) return { output: restored.text, fallback: '' };
    return { output: await translator.translate(text), fallback: 'placeholder fallback' };
  }

  async function geminiTranslate(engine, text, terms) {
    const session = await createGemini(engine);
    const payload = JSON.stringify(terms.length ? { source: text, glossary: terms } : { source: text });
    const beforeUsage = Number(session.contextUsage || 0);
    let measuredInput = 0;
    if (typeof session.measureContextUsage === 'function') {
      try { measuredInput = Number(await session.measureContextUsage(payload)) || 0; } catch (_) {}
    }
    const output = await session.prompt(payload);
    const afterUsage = Number(session.contextUsage || 0);
    let contextOutput = afterUsage - beforeUsage - measuredInput;
    if (!Number.isFinite(contextOutput) || contextOutput <= 0) contextOutput = 0;
    lastModelContext = {
      contextUsage: Number(session.contextUsage || 0),
      contextWindow: Number(session.contextWindow || 0),
      estimatedOutputTokens: contextOutput,
      updatedAt: Date.now(),
    };
    document.dispatchEvent(new CustomEvent('vibe-lab-model-context', { detail: lastModelContext }));
    return { output, contextOutput };
  }

  async function createEngine(sourceLang, targetLang, mode) {
    if (sourceLang === targetLang) sourceLang = sourceLang === 'en' ? 'fr' : 'en';
    const glossary = typeof VT.loadGlossary === 'function' ? await VT.loadGlossary(targetLang) : [];
    return { sourceLang, targetLang, mode, glossary, translator: null, session: null };
  }

  async function translateRecord(engine, text) {
    const terms = typeof VT.glossaryTermsForText === 'function' ? VT.glossaryTermsForText(text, engine.glossary) : [];
    const started = performance.now();
    let output = '';
    let effectiveEngine = '';
    let fallback = '';
    let estimateSource = 'language-heuristic';
    let contextOutput = 0;

    try {
      if (engine.mode === 'translator') {
        const result = await translatorTranslate(engine, text, terms);
        output = result.output;
        fallback = result.fallback;
        effectiveEngine = 'translator';
      } else if (engine.mode === 'gemini') {
        const result = await geminiTranslate(engine, text, terms);
        output = result.output;
        contextOutput = result.contextOutput;
        estimateSource = contextOutput > 0 ? 'context-delta' : 'language-heuristic';
        effectiveEngine = 'gemini';
      } else if (terms.length) {
        try {
          const result = await geminiTranslate(engine, text, terms);
          output = result.output;
          contextOutput = result.contextOutput;
          estimateSource = contextOutput > 0 ? 'context-delta' : 'language-heuristic';
          effectiveEngine = 'gemini';
        } catch (error) {
          const result = await translatorTranslate(engine, text, terms);
          output = result.output;
          effectiveEngine = 'translator';
          fallback = `Gemini unavailable${result.fallback ? ` / ${result.fallback}` : ''}`;
        }
      } else {
        try {
          const result = await translatorTranslate(engine, text, []);
          output = result.output;
          effectiveEngine = 'translator';
        } catch (_) {
          const result = await geminiTranslate(engine, text, []);
          output = result.output;
          contextOutput = result.contextOutput;
          estimateSource = contextOutput > 0 ? 'context-delta' : 'language-heuristic';
          effectiveEngine = 'gemini';
          fallback = 'Translator unavailable';
        }
      }

      const elapsedMs = Math.max(0.01, performance.now() - started);
      return {
        ok: true,
        elapsedMs,
        output,
        estimatedTokens: contextOutput > 0 ? contextOutput : estimateTokens(output, engine.targetLang),
        estimateSource,
        diagnostics: {
          effectiveEngine,
          matched: terms.length,
          applied: countApplied(output, terms),
          loaded: engine.glossary.length,
          fallback,
        },
      };
    } catch (error) {
      return {
        ok: false,
        elapsedMs: Math.max(0.01, performance.now() - started),
        output: '',
        estimatedTokens: 0,
        error: error.message || String(error),
        diagnostics: { effectiveEngine: 'error', matched: terms.length, applied: 0, loaded: engine.glossary.length, fallback: '' },
      };
    }
  }

  function destroyEngine(engine) {
    try { engine?.session?.destroy?.(); } catch (_) {}
    try { engine?.translator?.destroy?.(); } catch (_) {}
  }

  function routeSummary(routes) {
    const translator = routes.translator || 0;
    const gemini = routes.gemini || 0;
    if (translator && gemini) return `T ${translator} / G ${gemini}`;
    if (gemini) return 'Gemini Nano';
    if (translator) return 'Translator API';
    return '—';
  }

  function formatMs(value) {
    if (!value) return '—';
    return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
  }

  function renderResult(result) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${modeLabel(result.mode)}</strong></td>
      <td>${routeSummary(result.routes)}</td>
      <td>${result.success}/${result.success + result.failures}</td>
      <td>${formatMs(result.averageMs)}</td>
      <td>${formatMs(result.medianMs)}</td>
      <td>${result.charsPerSec ? result.charsPerSec.toFixed(1) : '—'}</td>
      <td>${result.estimatedTokensPerSec ? result.estimatedTokensPerSec.toFixed(1) : '—'}</td>
      <td>${result.matched}/${result.applied}</td>
      <td>${result.fallbacks || '—'}</td>`;
    row.title = result.records.filter(record => !record.ok).map(record => record.error).join('\n');
    els.body.appendChild(row);
  }

  function setRunning(value) {
    running = value;
    els.start.disabled = value || !selectedDocument;
    els.stop.disabled = !value;
    [els.sampleSize, els.translator, els.auto, els.gemini, els.warmup].forEach(control => { control.disabled = value; });
  }

  async function warmupMode(sourceLang, targetLang, mode, text) {
    const engine = await createEngine(sourceLang, targetLang, mode);
    try { await translateRecord(engine, text); }
    finally { destroyEngine(engine); }
  }

  async function runBenchmark() {
    if (running) return;
    selectedDocument = root.VibeLabDocuments?.getSelectedDocument?.() || selectedDocument;
    if (!selectedDocument) return setStatus('請先選擇一份 PDF 文件。', true);
    const modes = selectedModes();
    if (!modes.length) return setStatus('請至少選擇一種翻譯模式。', true);

    setRunning(true);
    cancelled = false;
    els.body.replaceChildren();
    lastResults = [];
    setStatus('正在取得 PDF 測試段落…');

    try {
      const sample = await root.VibeLabDocuments.requestSample(Number(els.sampleSize.value));
      const paragraphs = Array.isArray(sample.paragraphs) ? sample.paragraphs : [];
      if (!paragraphs.length) throw new Error('選取的 PDF 沒有可測試段落。');
      const sourceLang = sample.sourceLang || selectedDocument.sourceLang || 'en';
      const targetLang = sample.targetLang || selectedDocument.targetLang || root.VibePromptLab?.getTargetLang?.() || 'zh-Hant';
      const total = modes.length * paragraphs.length;
      let completed = 0;
      els.progress.max = total;
      els.progress.value = 0;

      for (const mode of modes) {
        if (cancelled) break;
        const records = [];
        let modeCompleted = 0;
        try {
          setStatus(`準備 ${modeLabel(mode)}…`);
          if (els.warmup.checked) {
            await warmupMode(sourceLang, targetLang, mode, paragraphs[0]);
            if (cancelled) break;
          }

          const engine = await createEngine(sourceLang, targetLang, mode);
          activeEngine = engine;
          try {
            for (let index = 0; index < paragraphs.length; index++) {
              if (cancelled) break;
              setStatus(`${modeLabel(mode)}：第 ${index + 1}/${paragraphs.length} 段`);
              const record = await translateRecord(engine, paragraphs[index]);
              records.push(record);
              modeCompleted++;
              completed++;
              els.progress.value = completed;
              els.progressLabel.textContent = `${completed}/${total}`;
            }
          } finally {
            destroyEngine(engine);
            activeEngine = null;
          }
        } catch (error) {
          records.push({
            ok: false,
            elapsedMs: 0,
            output: '',
            estimatedTokens: 0,
            error: error.message || String(error),
            diagnostics: { effectiveEngine: 'error', matched: 0, applied: 0, loaded: 0, fallback: '' },
          });
          completed += Math.max(0, paragraphs.length - modeCompleted);
          els.progress.value = completed;
          els.progressLabel.textContent = `${completed}/${total}`;
        }
        const aggregate = aggregateMode(mode, records);
        lastResults.push(aggregate);
        renderResult(aggregate);
      }

      if (cancelled) setStatus('已停止；已完成的結果仍保留。');
      else setStatus('比較完成。tokens/s 為端到端估算值。');
    } catch (error) {
      setStatus(error.message || String(error), true);
    } finally {
      destroyEngine(activeEngine);
      activeEngine = null;
      setRunning(false);
    }
  }

  els.start.addEventListener('click', runBenchmark);
  [els.translator, els.auto, els.gemini].forEach(control => control.addEventListener('change', () => {
    els.start.disabled = running || !selectedDocument || !selectedModes().length;
  }));
  els.stop.addEventListener('click', () => {
    cancelled = true;
    destroyEngine(activeEngine);
    setStatus('正在停止；目前呼叫結束後保留已完成結果。');
  });
  document.addEventListener('vibe-lab-document-selected', event => updateSelectedDocument(event.detail?.document));

  root.VibeLabBenchmark = {
    getResults: () => lastResults,
    getLastContextSnapshot: () => lastModelContext,
    estimateTokens,
  };

  setTimeout(() => updateSelectedDocument(root.VibeLabDocuments?.getSelectedDocument?.()), 0);
})(typeof window !== 'undefined' ? window : globalThis);
