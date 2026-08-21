# Prompt Diff Lab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a compact four-tab Prompt Diff Lab that links to active PDF viewers, benchmarks translation modes, and reports Chrome-managed model information without expanding Vibe Reading beyond its existing extension architecture.

**Architecture:** Keep the PDF Viewer as the operational surface and Prompt Diff Lab as the analysis surface. Connect them through one extension-origin `BroadcastChannel`, add isolated benchmark interfaces to `translate-core.js`, and split Lab responsibilities into focused scripts.

**Tech Stack:** Chrome MV3 extension, classic browser JavaScript, HTML/CSS, PDF.js canvas, Chrome Translator API, Chrome Prompt API, `BroadcastChannel`, `chrome.storage.local`, `chrome.runtime` messaging.

**Spec:** `docs/superpowers/specs/2026-08-21-prompt-diff-lab-redesign-design.md`

## Global Constraints

- Work only on `feature/prompt-diff-lab`; do not modify `main`.
- Do not add a server, cloud service, telemetry upload, dependency, build step, framework, or model engine.
- Preserve Translator API, Hybrid, and Gemini Nano as the only routing modes.
- Keep PDF reading panes and translation cards visually unchanged.
- All token-rate values must be labeled estimated; elapsed time and character rate remain exact.
- Do not fabricate model paths, exact model sizes, versions, or filenames.
- Use a restrained Apple-inspired dark UI with system fonts, neutral surfaces, segmented controls, and responsive single-column layout below 760 px.

---

### Task 1: Lab shell and visual system

**Files:**
- Create: `prompt-diff.css`
- Modify: `prompt-diff.html`
- Modify: `prompt-diff.js`

**Interfaces:**
- Produces: main panel buttons with `data-main-tab`, panels with `data-main-panel`, comparison sub-tabs with `data-compare-tab`, and comparison views with `data-compare-panel`.
- Preserves: existing prompt textarea IDs, metric IDs, diff output IDs, rule-list ID, target-language and action IDs.

- [ ] **Step 1: Add static DOM-contract test**

Create a Node test script in `/tmp/vibe-tests/lab-dom.test.mjs` that reads `prompt-diff.html` and asserts all main/sub-tab IDs and preserved prompt IDs exist.

- [ ] **Step 2: Run the test and verify it fails against the old markup**

Run: `node /tmp/vibe-tests/lab-dom.test.mjs`

Expected: FAIL for missing `mainTabPrompt`, `mainTabDocuments`, `mainTabBenchmark`, `mainTabModels`, and comparison sub-tabs.

- [ ] **Step 3: Replace inline styling with `prompt-diff.css` and build the four-tab shell**

Implement:

```html
<nav class="main-tabs" role="tablist">
  <button id="mainTabPrompt" data-main-tab="prompt">提示詞比較</button>
  <button id="mainTabDocuments" data-main-tab="documents">文件與路由</button>
  <button id="mainTabBenchmark" data-main-tab="benchmark">速度比較</button>
  <button id="mainTabModels" data-main-tab="models">本機模型</button>
</nav>
```

Within the Prompt panel, add the four comparison sub-tabs while retaining the existing editor/diff/rules DOM IDs.

- [ ] **Step 4: Add reusable tab controller to `prompt-diff.js`**

Implement `setupTabs(buttonSelector, panelSelector, storageKey)` with ARIA selection, keyboard Left/Right navigation, and localStorage persistence.

- [ ] **Step 5: Run syntax and DOM-contract tests**

Run:

```bash
node --check prompt-diff.js
node /tmp/vibe-tests/lab-dom.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add prompt-diff.html prompt-diff.css prompt-diff.js
git commit -m "feat: redesign Prompt Diff Lab as a tabbed workspace"
```

### Task 2: Viewer–Lab document bridge

**Files:**
- Create: `viewer-lab-bridge.js`
- Create: `lab-document-sessions.js`
- Modify: `viewer.html`
- Modify: `viewer.js`
- Modify: `background.js`
- Modify: `prompt-diff.html`

**Interfaces:**
- Channel: `new BroadcastChannel('vibe-reading-lab-v1')`.
- Viewer emits: `viewer:state`, `viewer:closed`, `viewer:thumbnail`, `viewer:sample`.
- Viewer consumes: `lab:discover`, `viewer:thumbnail-request`, `viewer:sample-request`, `viewer:focus-request`.
- Lab exposes: `window.VibeLabDocuments.getSelectedDocument()`, `requestSample(limit)`, `getDocuments()`.

- [ ] **Step 1: Write message-schema and expiry tests**

Create `/tmp/vibe-tests/document-session.test.mjs` that imports pure helpers from `lab-document-sessions.js` through a VM sandbox and verifies state normalization, 15-second expiry, and selected-document fallback.

- [ ] **Step 2: Run test and verify failure**

Run: `node /tmp/vibe-tests/document-session.test.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement Viewer state publication**

`viewer-lab-bridge.js` must:

- generate a stable per-page `viewerId`;
- read `pdfUrl`, `pdfDoc`, `paragraphs`, `detectedSource`, `translatorObj`, status/progress DOM, and current target/mode;
- debounce `viewer:state` broadcasts;
- create thumbnail from first canvas only on request;
- return at most 20 paragraph strings on sample request;
- call `chrome.runtime.sendMessage({type:'VIBE_FOCUS_VIEWER'})` on focus request;
- publish `viewer:closed` on `pagehide`.

- [ ] **Step 4: Add stable hooks in `viewer.js`**

Dispatch `vibe-viewer-state-changed` CustomEvents after PDF load, translation start, progress update, completion, stop, target change, and error. Do not move translation logic.

- [ ] **Step 5: Implement background focus and Lab-open messages**

In `background.js`, handle:

```js
{ type: 'VIBE_OPEN_PROMPT_LAB' }
{ type: 'VIBE_FOCUS_VIEWER' }
```

Use `chrome.tabs.create({url: chrome.runtime.getURL('prompt-diff.html')})` for Lab and `chrome.tabs.update(sender.tab.id, {active:true})` plus `chrome.windows.update(..., {focused:true})` when sender metadata exists.

- [ ] **Step 6: Implement Lab document cards**

`lab-document-sessions.js` must render title, thumbnail, pages, paragraphs, target, selected mode, effective route, glossary counts, status, Focus and Use for benchmark actions. Send `lab:discover` on load and expire stale entries every 5 seconds.

- [ ] **Step 7: Wire scripts and markup**

Add the document panel markup to `prompt-diff.html`; load `lab-document-sessions.js`. Load `viewer-lab-bridge.js` after `viewer-engine-control.js` in `viewer.html`.

- [ ] **Step 8: Run tests**

Run:

```bash
node --check viewer-lab-bridge.js
node --check lab-document-sessions.js
node --check background.js
node --check viewer.js
node /tmp/vibe-tests/document-session.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add viewer-lab-bridge.js lab-document-sessions.js viewer.html viewer.js background.js prompt-diff.html
git commit -m "feat: link Prompt Diff Lab with active PDF viewers"
```

### Task 3: Isolated benchmark interfaces

**Files:**
- Modify: `translate-core.js`
- Create: `lab-benchmark.js`
- Modify: `prompt-diff.html`

**Interfaces:**
- Produces:

```js
VibeTranslate.createBenchmarkEngine(sourceLang, targetLang, mode, options)
VibeTranslate.benchmarkTranslate(engine, text)
VibeTranslate.destroyEngine(engine)
VibeTranslate.estimateOutputTokens(text, targetLang)
```

- Consumes: existing `makeEngineState`, Translator/Gemini ensure functions, glossary loading, diagnostics, and engine modes.

- [ ] **Step 1: Write token-estimator and statistics tests**

Create `/tmp/vibe-tests/benchmark.test.mjs` asserting:

- CJK text produces a higher token estimate per character than English words;
- empty text returns 0;
- median handles odd/even arrays;
- per-mode aggregate returns exact character rate and estimated token rate.

- [ ] **Step 2: Run test and verify failure**

Run: `node /tmp/vibe-tests/benchmark.test.mjs`

Expected: FAIL for missing benchmark helpers.

- [ ] **Step 3: Add isolated mode override to translation core**

Refactor `initTranslator()` to accept `options.engineModeOverride` while keeping stored mode as the default. Add `createBenchmarkEngine()` that sets `benchmark: true`, disables diagnostic storage writes, and creates isolated state.

- [ ] **Step 4: Add benchmark measurement**

`benchmarkTranslate()` must measure with `performance.now()`, call the existing route, return diagnostics directly, and estimate output tokens. When the effective session is Gemini and feature detection allows it, compare context usage before/after and label source `context-delta`; otherwise label `language-heuristic`.

- [ ] **Step 5: Implement benchmark UI/orchestration**

`lab-benchmark.js` must:

- consume selected document samples from `VibeLabDocuments`;
- allow 3/5/10/20 paragraphs and mode checkboxes;
- run modes sequentially;
- perform one unmeasured warm-up paragraph when enabled;
- preserve completed results on cancellation;
- render totals, average, median, exact chars/s, estimated tokens/s, failures, glossary counts, fallbacks, and Hybrid route distribution;
- never write `translationEngineMode`.

- [ ] **Step 6: Add benchmark panel markup**

Add document summary, controls, progress, results table, and an explanatory note that token rates are estimates.

- [ ] **Step 7: Run tests**

Run:

```bash
node --check translate-core.js
node --check lab-benchmark.js
node /tmp/vibe-tests/benchmark.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add translate-core.js lab-benchmark.js prompt-diff.html
git commit -m "feat: add isolated translation speed benchmarks"
```

### Task 4: Local model information

**Files:**
- Create: `lab-model-info.js`
- Modify: `prompt-diff.html`

**Interfaces:**
- Produces: `VibeTranslate.getModelInfo(targetLang)` returning `{gemini, translator, guidance}`.
- Consumes: `LanguageModel.availability()`, optional `LanguageModel.params()`, `Translator.availability()`.

- [ ] **Step 1: Write feature-detection tests**

Create `/tmp/vibe-tests/model-info.test.mjs` with mocked APIs for available/unavailable states and missing `LanguageModel.params()`.

- [ ] **Step 2: Run test and verify failure**

Run: `node /tmp/vibe-tests/model-info.test.mjs`

Expected: FAIL for missing model-info interface.

- [ ] **Step 3: Implement `getModelInfo()`**

Return only public API data. Set:

```js
location: { value: null, label: 'Chrome 管理；公開 API 未提供路徑' }
size: { value: null, label: '公開 API 未提供精確大小' }
```

Include `chrome://on-device-internals` as copyable guidance, not a guaranteed clickable navigation.

- [ ] **Step 4: Render model cards**

`lab-model-info.js` renders Gemini and Translator cards, refresh button, target-language pair, availability, parameters, context data when available, and copy guidance button.

- [ ] **Step 5: Run tests**

Run:

```bash
node --check lab-model-info.js
node /tmp/vibe-tests/model-info.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add translate-core.js lab-model-info.js prompt-diff.html
git commit -m "feat: report Chrome-managed local model information"
```

### Task 5: Viewer summary and Lab entry

**Files:**
- Modify: `viewer.html`
- Modify: `viewer-engine-control.js`
- Modify: `prompt-diff.css`

**Interfaces:**
- Produces Viewer controls: `engineModeSelect`, `engineRouteSummary`, `openPromptLab`.
- Consumes `translationDiagnostics` storage and `VIBE_OPEN_PROMPT_LAB` runtime message.

- [ ] **Step 1: Add viewer-control DOM test**

Create `/tmp/vibe-tests/viewer-control.test.mjs` checking the legacy badge replacement creates the select, route summary, and Lab button.

- [ ] **Step 2: Run test and verify initial failure**

Run: `node /tmp/vibe-tests/viewer-control.test.mjs`

Expected: FAIL for missing summary/button.

- [ ] **Step 3: Add compact summary and Lab button**

Keep the native engine selector. Add one-line summary such as `Gemini · 辭庫 3/3 · 7.8 est tok/s`, with details in `title`. Add a `Lab` text button beside it.

- [ ] **Step 4: Publish rolling speed**

During normal PDF translation, calculate a rolling exact chars/s and estimated tokens/s from completed paragraph diagnostics. Do not run an extra translation. Store the latest summary in the Viewer bridge state only.

- [ ] **Step 5: Run tests and syntax checks**

Run:

```bash
node --check viewer-engine-control.js
node /tmp/vibe-tests/viewer-control.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add viewer.html viewer-engine-control.js prompt-diff.css
git commit -m "feat: connect PDF viewer routing status to Prompt Diff Lab"
```

### Task 6: Integration verification and documentation

**Files:**
- Modify: `docs/professional-glossary.md`
- Create: `docs/prompt-diff-lab.md`

**Interfaces:**
- Documents user-visible behavior and limitations.

- [ ] **Step 1: Run all static and mock tests**

Run all `/tmp/vibe-tests/*.test.mjs` plus `node --check` over every changed `.js` file.

- [ ] **Step 2: Verify HTML script wiring and duplicate IDs**

Run a Node script that checks `prompt-diff.html` and `viewer.html` for referenced local scripts, duplicate IDs, and missing script files.

- [ ] **Step 3: Review branch diff for scope**

Confirm no framework, dependency, server, cloud endpoint, persistent benchmark store, PDF pane redesign, or extra engine mode was added.

- [ ] **Step 4: Write user documentation**

Document the four Lab tabs, active-viewer linkage, benchmark methodology, estimate labels, and model-info limitations.

- [ ] **Step 5: Commit**

```bash
git add docs/professional-glossary.md docs/prompt-diff-lab.md
git commit -m "docs: explain Prompt Diff Lab routing and benchmarks"
```

- [ ] **Step 6: Push and verify GitHub branch**

Compare `feature/prompt-diff-lab` against `main`, confirm the branch is ahead and not behind, and report changed files plus unverified Chrome runtime items.
