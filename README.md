# Vibe Reading 📖

Translate PDFs and web pages entirely on-device — no API key, no cloud, no cost.
Uses Chrome's built-in AI (Gemini Nano / Translator API) to render bilingual side-by-side views for research papers and immersive inline translations for any webpage.

[繁體中文版本](README.zh-tw.md)

![Vibe Reading interface preview](preview.png)

> Offline. Private. Free.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Vibe%20Reading-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/%E6%B0%9B%E5%9C%8D%E9%96%B1%E8%AE%80-vibe-reading/aaiiajcclefdjeegondambmholpnkjme)
[![License MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Chrome 138+](https://img.shields.io/badge/Chrome-138%2B-4285F4?logo=googlechrome&logoColor=white)](#requirements)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-aaaddress1-FFDD00?logo=buymeacoffee&logoColor=black)](https://www.buymeacoffee.com/aaaddress1)

---

## Table of Contents

- [What is this?](#what-is-this)
- [Features](#features)
- [Install](#install)
- [Usage](#usage)
  - [Translate a PDF](#translate-a-pdf)
  - [Translate a Web Page](#translate-a-web-page)
- [Local PDF Access](#local-pdf-access)
- [Alt+T Not Working?](#altt-not-working)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Acknowledgements](#acknowledgements)
- [License](#license)

---

## What is this?

A Chrome extension. Open any PDF (e.g. an arXiv paper) and it **automatically** translates the full text paragraph-by-paragraph, displayed side-by-side on the right. On **regular web pages**, it translates inline and bilingually in place. All AI inference runs on your own machine — content **never leaves the browser**.

- 🔒 **Fully offline** — Chrome 138+ built-in Gemini Nano / Translator API; data stays in your browser
- 💸 **Zero cost** — no OpenAI / Anthropic bills, no rate limits
- 🌗 **Dark theme** — easy-on-the-eyes bilingual reading layout

---

## Features

### 📄 PDF Translation

- **Paragraph-by-paragraph translation** — original paper on the left, translations on the right (concurrent rendering)
- **Two-way locate** — click a translation → the paper scrolls and highlights the source paragraph; click source → translation highlights
- **Auto source-language detection** — just pick the *target* language (defaults to your browser language, remembered)
- **Auto-translate on open**, with manual re-run available
- **🧠 AI Summary** — after scanning the full paper, Gemini Nano generates four sections at the top: Background, Related Work, Highlights, Conclusion
- **🤖 Ask AI on selection** — highlight any text and ask Gemini Nano directly; context includes the AI summary and surrounding paragraphs; stoppable, non-blocking panel so you can keep reading
- **🌐 Quick-translate on selection** — highlight text and hit "翻譯" on the floating bar; the panel shows the result instantly with zero typing, input kept for follow-ups
- **✏️ Editable translation cards** — double-click any translation to edit in place; Enter re-paragraphs, blur / Ctrl+Enter saves, Esc cancels
- **⌨️ Alt+T hotkey** — opens the translator on any PDF tab (also via toolbar icon or right-click menu)
- **🔍 Independent PDF zoom** — Ctrl+wheel / trackpad pinch zooms only the left PDF pane (smooth, native-like); ←/→ to flip pages
- **📰 Two-column paper support** — auto-detects column layout and reads left/right columns in order
- **🔤 Adjustable translation font size** — A− / A+ buttons, remembered across sessions

### 🌐 Immersive Web-Page Translation

A persistent **translate ball** sits in the bottom-right corner of every page (can be disabled in options).

- **Click the ball = translate the whole page** inline and bilingually; follows infinite scroll / SPA new content; click again to restore the original
- **Hover translate** — hold the modifier key (default `Shift`, configurable) and hover over any paragraph to translate just that block
- **Selection translate** — highlight text, then right-click → "翻譯選取的文字" to translate the selection in a popup card
- Hover the ball to reveal its panel: target language (shared with the PDF viewer), hover toggle, ⚙ options, hide ball

### ⚙️ Settings & First-Run

- **🧭 First-run guide** — on install, shows Traditional Chinese or English based on your browser language; prompts you to pick a default target language and guides you to enable local file access
- **Reopenable settings** — the top-right gear icon lets you update the default target language or check file-URL permissions at any time

---

## Install

**Option 1 (recommended) — Chrome Web Store:**

👉 [Install Vibe Reading from the Chrome Web Store](https://chromewebstore.google.com/detail/%E6%B0%9B%E5%9C%8D%E9%96%B1%E8%AE%80-vibe-reading/aaiiajcclefdjeegondambmholpnkjme) — one click, no setup.

**Option 2 — Load unpacked** (or grab a zip from [Releases](https://github.com/aaaddress1/vibe-reading/releases)):

1. Open `chrome://extensions` → enable **Developer mode** → click **Load unpacked** → select this folder (`lib/` is already bundled, no extra downloads needed).

**First-run setup (required for both options):**

2. Open `chrome://flags` → enable **Prompt API for Gemini Nano** and **Translator API** → restart Chrome.
3. Open `chrome://components` → update **Optimization Guide On Device Model** (~2.4 GB download on first run).
4. To translate local PDFs, go to `chrome://extensions` → manage Vibe Reading → turn on **Allow access to file URLs**.

---

## Usage

### Translate a PDF

1. Open any PDF (e.g. `https://arxiv.org/pdf/2507.02092`).
2. Click the toolbar icon, or right-click on the page → **"Translate this PDF"**.
3. A new tab opens with the bilingual viewer and translation starts automatically.
4. Click the gear icon (top-right) to change the default target language or check file permissions.
5. Click a translation to locate its source, highlight text to ask AI, or read the AI Summary at the top.

### Translate a Web Page

1. The **translate ball** appears in the bottom-right corner of every page.
   - **Click the ball** to translate the entire page inline and bilingually; click again to restore.
   - Alternatively, use the toolbar icon or press `Alt+T`.
2. **Hover translate** (on by default) — hold `Shift` and move the mouse over any paragraph.
3. **Selection translate** — highlight text → right-click → "翻譯選取的文字".
4. Hover over the ball to open its panel: switch target language, toggle hover mode, open ⚙ settings, or hide the ball.
5. To change the modifier key or disable the ball: ball panel → ⚙, or `chrome://extensions` → Details → Extension options.

---

## Local PDF Access

Chrome extensions cannot access `file://` URLs by default. To translate PDFs stored on your computer:

1. Go to `chrome://extensions`.
2. Find **氛圍閱讀 Vibe Reading** and click **Details**.
3. Turn on **Allow access to file URLs**.

Online PDFs work without this permission. Local PDFs will fail to load until it is enabled.

---

## Alt+T Not Working?

Chrome treats `commands.suggested_key` as a *suggestion*. If `Alt+T` is already claimed by another extension, a developer build, Chrome, or the OS, Chrome may leave the Web Store build unassigned.

1. Open `chrome://extensions/shortcuts`.
2. Find **Vibe Reading** → confirm "用氛圍閱讀翻譯目前分頁的 PDF" is set to `Alt+T`.
3. If both the unpacked build and the Web Store build are installed, disable one or assign them different shortcuts.

---

## Tech Stack

| Component | Role |
|---|---|
| **Translator API** | On-device translation model (primary — fast, no GPU required) |
| **Gemini Nano (Prompt API)** | Translation fallback + AI Summary + Ask-AI |
| **LanguageDetector API** | Automatic source-language detection |
| **PDF.js** | PDF rendering with selectable text layer |
| **Content script injection** | Immersive inline translation for regular web pages (shares the same engine) |

---

## Requirements

| | Detail |
|---|---|
| **Browser** | Chrome **138+** on Windows 10/11, macOS 13+, Linux, or Chromebook Plus |
| **Translator / LanguageDetector API** | Stable since Chrome 138 — **no flag needed** |
| **Gemini Nano (Prompt API)** | Requires manual flag setup; higher hardware bar (see below) |
| **Not supported** | Android / iOS; Edge, Brave, or other Chromium forks (`Translator` / `LanguageModel` are Chrome-only) |

**Gemini Nano hardware requirements:**

- `chrome://flags` → enable **Prompt API for Gemini Nano** → restart → `chrome://components` → update **Optimization Guide On Device Model** (or check `chrome://on-device-internals`)
- macOS 13+ / Windows 10+ / Linux; **≥ 22 GB free disk**; **GPU VRAM > 4 GB**
  (Chrome 140+ CPU fallback: 16 GB RAM + 4 cores; unmetered connection for initial ~2–4 GB model download)
- Apple Silicon (M-series) meets requirements; older Intel Macs may use the CPU fallback

---

## Acknowledgements

Thanks to the contributors who made this project better:

- **[@hackerpeanutjohn](https://github.com/hackerpeanutjohn)**
  - [#3](https://github.com/aaaddress1/vibe-reading/pull/3) — **immersive web-page translation**: the persistent translate ball, inline bilingual full-page mode, selection translate, modifier-key hover translate, and extracting the shared engine into `translate-core.js` so the PDF viewer and web pages share one implementation
  - [#1](https://github.com/aaaddress1/vibe-reading/pull/1) — two-column / block translation improvements for PDFs, plus macOS setup support

And a tribute to [Immersive Translate](https://immersivetranslate.com/) for the inspiration.

Contributions are welcome — [open an issue](https://github.com/aaaddress1/vibe-reading/issues) or submit a PR.

---

## License

[MIT](LICENSE)
