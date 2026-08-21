# Prompt Diff Lab Redesign Design

**Date:** 2026-08-21  
**Branch:** `feature/prompt-diff-lab`

## Goal

Redesign Prompt Diff Lab into a compact Apple-inspired analysis workspace that keeps everyday engine switching in the PDF Viewer while moving prompt comparison, document linkage, performance comparison, and local model information into one simple tabbed panel.

## Scope

This change is limited to the existing Vibe Reading Chrome extension. It does not introduce a server, account system, cloud storage, external telemetry, new translation engines, or a general document-management subsystem.

The deliverable contains four Lab tabs:

1. **Prompt Compare** — edit, side-by-side diff, unified diff, and rule coverage inside one tabbed block.
2. **Documents & Routing** — list currently open Vibe Reading PDF viewers, show a first-page thumbnail and current route, and focus the selected viewer tab.
3. **Speed Compare** — benchmark the same PDF paragraphs across Translator API, Hybrid, and Gemini Nano.
4. **Local Models** — show only model information exposed by Chrome APIs, plus clear labels for unavailable location and exact-size data.

## Product Boundary

### PDF Viewer

The PDF Viewer remains the operational surface. It provides:

- direct engine-mode selection (`Translator API`, `Hybrid`, `Gemini Nano`);
- a compact current route/glossary/speed summary;
- one `Lab` button that opens Prompt Diff Lab;
- document-session publication for the Lab.

It does not contain full benchmark tables, prompt editors, model metadata tables, or document history.

### Prompt Diff Lab

The Lab is the analytical surface. It provides:

- prompt inspection and diff tools;
- active PDF document cards;
- translation-route diagnostics;
- controlled benchmark execution;
- Chrome-managed model information.

## Visual Direction

Use a restrained Apple-inspired design language without imitating protected assets:

- system font stack;
- neutral, translucent surfaces;
- generous but compact spacing;
- rounded cards and segmented controls;
- soft borders and shadows;
- one primary accent;
- clear typography hierarchy;
- no decorative gradients, excessive badges, or dashboard clutter;
- responsive single-column behavior below 760 px.

The UI must remain compatible with the existing dark extension theme.

## Information Architecture

### Main navigation

A four-item segmented tab bar appears below the title:

- Prompt Compare
- Documents & Routing
- Speed Compare
- Local Models

Only the active panel is rendered as visible content.

### Prompt Compare panel

The existing comparison functions are merged into one card with a secondary segmented control:

- Edit
- Side-by-side
- Unified
- Rule Coverage

The target-language control and actions remain above the secondary content. Metrics remain compact and do not create a separate full-width dashboard section.

### Documents & Routing panel

Each active viewer is represented by a document card containing:

- first-page thumbnail;
- title or filename;
- page count;
- paragraph count;
- target language;
- selected routing mode;
- most recent effective engine;
- glossary loaded/matched/applied counts;
- translation progress/status;
- `Focus document` action;
- `Use for benchmark` action.

When no viewer is active, the panel explains how to open a PDF in Vibe Reading.

### Speed Compare panel

The benchmark uses one selected open PDF and the same source paragraphs for every mode.

Controls:

- selected document;
- sample size: 3, 5, 10, or 20 paragraphs;
- modes: Translator API, Hybrid, Gemini Nano;
- start/stop;
- optional warm-up, enabled by default.

Execution rules:

- modes run sequentially;
- each mode creates isolated engine state;
- the active global viewer mode is not changed;
- benchmark outputs are not inserted into the PDF translation pane;
- sessions are destroyed after each mode where supported;
- cancellation stops between paragraphs and aborts supported model operations.

Metrics per mode:

- success count and failure count;
- total elapsed time;
- average and median paragraph time;
- exact output characters per second;
- estimated output tokens per second;
- output character count;
- estimated token count;
- glossary match and applied counts;
- fallback count;
- actual effective-engine distribution for Hybrid.

Token-rate labels must explicitly say `Estimated`. Translator output tokens use a deterministic language-aware heuristic. Gemini may use `contextUsage`/`contextWindow` and `measureContextUsage()` when feature-detected, but must still be labeled as an estimate because tokenization is not exposed.

### Local Models panel

#### Gemini Nano card

Show when available:

- display name: Gemini Nano;
- API: Prompt API / `LanguageModel`;
- availability;
- current selected mode;
- context window and usage for an active benchmark session;
- default/max Top-K;
- default/max temperature;
- storage ownership: Chrome-managed;
- location: not exposed by public API;
- exact size: not exposed by public API;
- copyable `chrome://on-device-internals` guidance.

#### Translator card

Show:

- display name: Chrome Translator language pack;
- API: `Translator`;
- active source and target pair;
- availability;
- storage ownership: Chrome-managed;
- location: not exposed by public API;
- exact size: not exposed by public API.

The UI must not infer or fabricate paths, filenames, versions, or sizes.

## Viewer–Lab Communication

Use a single extension-origin `BroadcastChannel` named `vibe-reading-lab-v1`.

### Viewer registration message

```js
{
  type: 'viewer:state',
  viewerId: string,
  tabTitle: string,
  pdfUrl: string,
  pageCount: number,
  paragraphCount: number,
  targetLang: string,
  engineMode: 'translator' | 'auto' | 'gemini',
  status: string,
  progress: { done: number, total: number },
  diagnostics: object | null,
  updatedAt: number
}
```

### Thumbnail response

The Lab sends `viewer:thumbnail-request`. The Viewer responds with a JPEG data URL no larger than 320 px wide. The thumbnail is generated on request from the first rendered canvas and is not persisted.

### Paragraph sample response

The Lab sends `viewer:sample-request` with a requested limit. The Viewer responds with source-language metadata and the first N valid source paragraphs, capped at 20.

### Focus action

The Lab sends `viewer:focus-request`. The Viewer calls `window.focus()` and sends a runtime message to the background service worker to activate its browser tab when a tab ID is available.

### Lifecycle

- Viewer broadcasts on load, state change, progress change, diagnostics change, and target/mode change.
- Viewer sends `viewer:closed` on `pagehide`.
- Lab expires entries not refreshed for 15 seconds.
- Lab sends `lab:discover` on load; viewers immediately rebroadcast.

No cross-origin page content is transmitted. Only extension viewer metadata, requested thumbnail data, and selected source paragraphs are exchanged inside the extension origin.

## Translation Core Additions

Expose focused benchmark interfaces without changing normal translation behavior:

```js
createBenchmarkEngine(sourceLang, targetLang, mode, options)
benchmarkTranslate(engine, text)
destroyEngine(engine)
estimateOutputTokens(text, targetLang)
getModelInfo(targetLang)
```

`createBenchmarkEngine()` accepts a mode override and never writes `translationEngineMode` to storage.

`benchmarkTranslate()` returns:

```js
{
  text: string,
  elapsedMs: number,
  estimatedTokens: number,
  diagnostics: object,
  tokenEstimateSource: 'context-delta' | 'language-heuristic'
}
```

Normal `initTranslator()` and `doTranslate()` remain backward-compatible.

## Error Handling

- Unavailable modes are shown as unavailable before the benchmark starts.
- A failed mode does not prevent remaining selected modes from running.
- Per-paragraph errors are counted and displayed.
- Missing viewers, expired viewers, missing thumbnails, and unsupported model parameters use explicit empty states.
- Benchmark cancellation preserves completed results.
- The Lab never silently changes the global engine mode.

## Files

### Create

- `prompt-diff.css` — Lab visual system and responsive layout.
- `lab-document-sessions.js` — viewer discovery, cards, thumbnails, focus and sample requests.
- `lab-benchmark.js` — benchmark orchestration and metrics.
- `lab-model-info.js` — model metadata probing and rendering.
- `viewer-lab-bridge.js` — Viewer state publication and Lab request handling.

### Modify

- `prompt-diff.html` — new four-tab shell and panel markup.
- `prompt-diff.js` — prompt comparison only, plus main-tab controller.
- `viewer.html` — Lab button and bridge script.
- `viewer-engine-control.js` — compact route/speed summary and Lab launch behavior.
- `viewer.js` — expose viewer state/progress through stable bridge hooks only.
- `translate-core.js` — isolated benchmark and model-info interfaces.
- `background.js` — focus/open Lab messages.

## Non-goals

- No cloud benchmark service.
- No persistent benchmark database.
- No automatic PDF library.
- No model-file filesystem scanning.
- No exact tokenizer implementation.
- No new translation mode beyond Translator, Hybrid, and Gemini.
- No redesign of the PDF reading panes or translation cards.

## Acceptance Criteria

1. Prompt comparison appears in one card with Edit, Side-by-side, Unified, and Rule Coverage sub-tabs.
2. PDF Viewer keeps direct engine switching and adds a compact Lab entry.
3. Lab lists open PDF viewers with title, thumbnail, page/paragraph counts, route, glossary data, and focus/select actions.
4. Viewer and Lab mode/diagnostic state remain synchronized.
5. Benchmark runs identical paragraphs sequentially across selected modes without changing the global mode.
6. Results include exact elapsed time and chars/s plus clearly labeled estimated tokens/s.
7. Local-model cards show public API data and explicitly mark location/exact size as unavailable.
8. UI uses a restrained Apple-inspired dark visual style, remains readable, and collapses to one column below 760 px.
9. Existing PDF translation, glossary, Prompt Diff, and engine-mode behavior do not regress.
10. All new JavaScript files pass syntax checks and mock integration tests.
