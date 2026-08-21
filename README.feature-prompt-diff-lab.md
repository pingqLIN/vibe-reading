# 氛圍閱讀 Vibe Reading 📖

> **上游審核備案 / Upstream review draft**：此檔案只用來呈現 `feature/prompt-diff-lab` 的 1.5.0 文件提案；原始 `README.md` 保持不變，是否採用由原作者決定。

> 向「沉浸式翻譯」致敬 — **AI 推理在地端、零 API Key、零雲端 AI 費用**。
> 基於 Chrome 內建 AI（Gemini Nano / Translator API），在地端把整份 PDF 論文與**任意網頁**逐段翻成你的語言。選用遠端專業辭庫時，只會下載你指定的辭庫資料，不會上傳 PDF 或網頁原文。

[![Buy Me a Coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&slug=aaaddress1&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://www.buymeacoffee.com/aaaddress1)

### 🚀 [立即安裝 — Chrome 線上應用程式商店](https://chromewebstore.google.com/detail/%E6%B0%9B%E5%9C%8D%E9%96%B1%E8%AE%80-vibe-reading/aaiiajcclefdjeegondambmholpnkjme)

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-%E6%B0%9B%E5%9C%8D%E9%96%B1%E8%AE%80%20Vibe%20Reading-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/%E6%B0%9B%E5%9C%8D%E9%96%B1%E8%AE%80-vibe-reading/aaiiajcclefdjeegondambmholpnkjme)

![氛圍閱讀 Vibe Reading 介面預覽](preview.png)

### 🎬 Demo

![氛圍閱讀 Vibe Reading Demo](demo.gif)

> 🎥 [觀看完整高畫質影片（demo.mp4）](https://github.com/aaaddress1/vibe-reading/raw/main/demo.mp4)

---

## 這是什麼？

一個 Chrome 擴充功能。打開 PDF（例如 arxiv 論文）後，**自動**把全文逐段翻譯，並排顯示在右側；在**一般網頁**上則以行內雙語對照就地翻譯。所有 AI 推理都跑在你自己的電腦上 —— 內容**不會送到任何雲端**。

- 🔒 **在地端 AI**：翻譯與 Gemini Nano 推理都在 Chrome 本機執行；只有你主動啟用遠端辭庫時才會下載指定的辭庫資料
- 💸 **零成本**：沒有 OpenAI / Anthropic 帳單，沒有 rate limit
- 🌗 **暗黑主題**：護眼的雙欄閱讀介面

## ✨ 功能

- **逐段翻譯**：左側渲染原始論文、右側對照翻譯（併發加速）
- **雙向定位**：點翻譯 → 左側論文捲動並**高亮對應原文**；點原文 → 右側翻譯高亮
- **自動偵測來源語言**：你只需選「翻譯成」哪種語言（預設＝瀏覽器語言，可記憶設定）
- **自動翻譯**：開啟即翻，也可手動重翻
- **🧠 AI 摘要**：讀完整份論文後，頂部以 Gemini Nano 生成四大重點 —— 背景知識、相關研究、突破亮點、總結
- **🤖 反白問 AI**：在論文中反白文字，直接向 Gemini Nano 提問；提問會附上 AI 摘要與該段前後文作為上下文，回答更精準（可隨時停止、視窗不鎖住可邊讀邊問）
- **🌐 反白快速翻譯**：反白文字後點「翻譯」，面板立即顯示該段譯文——零輸入，輸入框保留供追問
- **🧭 首次安裝導覽**：安裝後依瀏覽器語系顯示繁中／英文設定頁，提示選擇預設目標語言，並引導開啟「允許存取檔案網址」以讀取本機 PDF
- **⚙️ 可重新開啟設定**：右上角齒輪可隨時重新選擇預設目標語言、檢查本機檔案權限
- **✏️ 字卡編輯模式**：雙擊任一段譯文就地編輯，可手動修改文字、按 Enter 重新分段；失焦或 Ctrl+Enter 儲存、Esc 取消
- **⌨️ Alt+T 熱鍵**：在任意 PDF 分頁按 Alt+T 一鍵開啟翻譯；也可點工具列圖示或右鍵選單
- **🔍 PDF 獨立縮放**：Ctrl+滾輪／觸控板雙指只縮放左側 PDF（不連動整頁），平滑如原生；←/→ 翻頁
- **📰 雙欄論文支援**：自動偵測分欄，左右欄正確分開讀取
- **🔤 翻譯字體調整**：A−／A+ 調整右側字體大小（記憶設定）
- **🌐 網頁沈浸式翻譯**：每個網頁右下角**常駐一顆翻譯球**（可在設定頁關閉）
  - **點球＝整頁翻譯**：行內雙語對照，並自動跟隨無限捲動／SPA 新增的內容；再點一次切回原文
  - **預設懸停翻譯**：**按住修飾鍵（預設 Shift，可在設定頁更改）**移到段落即翻該段
  - **選取翻譯**：反白文字後右鍵「翻譯選取的文字」，只翻選取（浮卡顯示）
  - 滑鼠移到球上展開選單：切換語言、開關懸停、⚙ 設定、隱藏球
- **🌗 暗黑主題、在地端 AI、零 API Key**

## 🧪 1.5.0 新增功能

> 以下為 `feature/prompt-diff-lab` 的 1.5.0 審核內容；Chrome Web Store 是否採用與發布，仍由原作者決定。

### Translator API／混合／Gemini Nano 三種翻譯模式

PDF Viewer 右上角可直接切換：

- **Translator API**：固定使用 Chrome Translator API；命中辭庫術語時以 placeholder 保護指定譯名。
- **混合（Glossary Hybrid）**：一般段落優先 Translator API；段落命中專業辭庫時優先交給 Gemini Nano + glossary prompt，必要時自動 fallback。
- **Gemini Nano**：固定使用 Prompt API，套用目前的翻譯 system prompt 與段落相關辭庫術語。

右上角會同步顯示最近實際執行的引擎、辭庫命中／套用狀態與估算翻譯速度，切換模式後可重新以新模式翻譯 PDF。

### 專業辭庫

專業辭庫為選用功能，支援 [Immersive Translate](https://github.com/immersive-translate/) 專案所使用之 terms 資料格式相容的 `source,target,tgt_lng` CSV。這代表格式可讀取，不代表 Vibe Reading 內建、鏡像、維護或依賴其第三方辭庫資料。

格式參考位置（純文字，不作為內建來源或固定依賴）：

```text
https://github.com/immersive-translate/terms/tree/main/glossaries
```

- 本機 CSV 檔案
- 直接貼上 CSV
- 公開 GitHub 辭庫目錄：讀取目錄後搜尋、勾選並合併多個 CSV
- 直接 CSV URL
- `zh-TW`／`zh-Hant` 等語言相容判斷
- 遠端辭庫手動同步與每 24 小時自動更新
- Loaded／Matched／Applied 翻譯診斷

設定介面已整理成 **本機檔案／貼上 CSV／遠端來源** 三個分頁；遠端來源再區分 GitHub 目錄與直接 CSV URL。第三方辭庫不會預載或自動選取，使用者需自行確認來源與授權。

詳細說明：[`docs/professional-glossary.md`](docs/professional-glossary.md)

### Prompt Diff Lab

Prompt Diff Lab 是與 PDF Viewer 連動的本機分析工作台，包含四個分頁：

1. **提示詞比較**：比較原版與現行 Gemini system prompt，提供編輯、並排 Diff、Unified Diff 與規則覆蓋檢查。
2. **文件與路由**：尋找目前開啟的 Vibe Reading PDF，顯示文件縮圖、翻譯進度、目前模式、最近實際路由與辭庫診斷；可切回原 PDF 或選為效能測試文件。
3. **速度比較**：以同一組 3／5／10／20 個段落依序比較 Translator API、混合與 Gemini Nano，顯示平均／中位段落時間、精確 characters/s、**estimated output tokens/s**、實際路由、Glossary matched/applied 與 fallback 次數。
4. **本機模型**：顯示 Chrome 公開 API 可取得的 Gemini Nano／Translator availability、語言配對、Prompt API sampling parameters 與 context 資訊。Chrome 未公開的模型實際路徑、檔名與精確大小會明確標示為不可取得，不自行推測。

Benchmark 會建立獨立測試 session，不會切換 PDF Viewer 的全域翻譯模式，也不會把測試譯文插入文件。

> `tokens/s` 為估算值；elapsed time 與 characters/s 為實際量測。Chrome 的 Translator API 與 Prompt API 都沒有公開可直接取得精確輸出 token 數的 tokenizer 介面。

詳細說明：[`docs/prompt-diff-lab.md`](docs/prompt-diff-lab.md)

### 開發分支截圖

**Prompt Diff Lab — 提示詞比較**

![Prompt Diff Lab 提示詞比較](docs/images/prompt-diff-lab-prompt.png)

**Prompt Diff Lab — 翻譯速度比較**

![Prompt Diff Lab 翻譯速度比較](docs/images/prompt-diff-lab-benchmark-results.png)

**專業辭庫 — 遠端來源設定**

![專業辭庫設定](docs/images/professional-glossary-settings.png)

## 📦 安裝

**方法一（推薦）：Chrome 線上應用程式商店一鍵安裝**
👉 https://chromewebstore.google.com/detail/%E6%B0%9B%E5%9C%8D%E9%96%B1%E8%AE%80-vibe-reading/aaiiajcclefdjeegondambmholpnkjme

**方法二：手動載入開發版**（也可到 [Releases](https://github.com/aaaddress1/vibe-reading/releases) 下載打包 zip）

1. **載入擴充功能**：
   - 開啟 `chrome://extensions`
   - 右上角開啟「開發人員模式」
   - 點「載入未封裝項目」→ 選擇本資料夾（已內含 `lib/`，無需額外下載）

2. **啟用 Chrome 內建 AI（僅首次，兩種安裝方式都需要）**：
   - `chrome://flags` → 啟用 **Prompt API** 與 **Translator API** → 重啟 Chrome
   - `chrome://components` → 更新 **Optimization Guide On Device Model**（約 2.4GB）
   - 若要讀取本機 PDF，請到 `chrome://extensions` → 管理此擴充功能 → 開啟「允許存取檔案網址」

> 在 Chrome Web Store 1.5.0 上架前，可從本 repository 的 1.5.0 原始碼以「載入未封裝項目」方式測試。

## 📁 本機 PDF 注意事項

Chrome 擴充功能預設**不能讀取 `file://` 本機檔案網址**。如果要翻譯電腦裡的 PDF，請手動開啟：

1. 到 `chrome://extensions`
2. 找到「氛圍閱讀 Vibe Reading」並點「詳細資料」或「管理擴充功能」
3. 將「允許存取檔案網址」設成開啟 / enable

若沒有開啟這個權限，線上 PDF 仍可使用，但本機 PDF 會無法載入。

## 🚀 使用

**翻譯 PDF：**

1. 打開任何 PDF（例如 `https://arxiv.org/pdf/2507.02092`）
2. 點工具列的擴充圖示，或在 PDF 頁面**右鍵 →「翻譯整份 PDF」**
3. 新分頁開啟雙欄檢視器，自動開始翻譯
4. 需要更改預設語言或檢查本機檔案權限時，點右上角齒輪
5. 點翻譯定位原文、反白文字問 AI、看頂部 AI 摘要
6. 在 1.5.0 中，可直接從右上角切換 Translator API／混合／Gemini Nano，或按 **Lab** 開啟 Prompt Diff Lab。

**翻譯一般網頁：**

1. 每個網頁右下角會有一顆翻譯球：**點球＝整頁翻譯**（再點切回原文）；也可用工具列圖示／`Alt+T`
2. **懸停翻譯（預設開）**：按住 `Shift`（可改）將滑鼠移到段落即翻該段
3. 滑鼠移到球上會展開選單：切換目標語言（與 PDF 共用）、開關懸停、⚙ 設定、隱藏球
4. 只想翻一段：反白後**右鍵 →「翻譯選取的文字」**
5. 設定（修飾鍵、是否顯示球）：球選單的 ⚙，或 `chrome://extensions` →「詳細資料」→「擴充功能選項」

## ⌨️ Alt+T 沒反應？

Chrome 的 `commands.suggested_key` 只是建議快捷鍵；如果 `Alt+T` 已被其他擴充功能、開發版、Chrome 或作業系統占用，Chrome 可能不會把它指派給商城版。

請到 `chrome://extensions/shortcuts` 檢查「氛圍閱讀 Vibe Reading」的快捷鍵：

1. 找到「用氛圍閱讀翻譯目前分頁的 PDF」
2. 確認它有被設成 `Alt+T`
3. 如果同時安裝了開發版與商城版，請停用其中一個，或替其中一個改用其他快捷鍵

## 🧩 技術

| 元件 | 用途 |
|------|------|
| **Translator API** | 地端專用翻譯模型；一般段落的高速翻譯，以及混合模式 fallback |
| **Gemini Nano（Prompt API）** | Prompt-aware 翻譯、專業辭庫命中段落、AI 摘要、反白問答 |
| **Glossary Hybrid routing** | 依段落是否命中專業辭庫，在 Translator API 與 Gemini Nano 間選擇實際路由 |
| **LanguageDetector API** | 自動偵測來源語言 |
| **PDF.js** | 渲染 PDF 與可選取文字層 |
| **BroadcastChannel** | 在 PDF Viewer 與 Prompt Diff Lab 間同步文件、縮圖、路由與診斷狀態 |
| **Content script 注入** | 一般網頁的沈浸式行內翻譯（與 PDF 共用 `translate-core.js`） |

## ⚠️ 系統需求

- Chrome **138+**（Windows 10/11、macOS 13+、Linux、Chromebook Plus）
- **Translator / Language Detector API**：自 Chrome 138 起**正式穩定、免開 flag**
- **Gemini Nano（Prompt API）**（AI 摘要 / 反白問答 / Prompt-aware 翻譯）需另外啟用，且硬體門檻較高：
  - `chrome://flags` 啟用 **Prompt API for Gemini Nano** → 重啟 → `chrome://components` 更新
    **Optimization Guide On Device Model**（或查 `chrome://on-device-internals` 確認狀態）
  - 需 **macOS 13+** / Windows 10+ / Linux、磁碟 **≥ 22GB 可用**、**GPU VRAM > 4GB**
    （或 Chrome **140+** 的 CPU 後援：16GB RAM + 4 核）、首次需不限流量網路下載模型（約 2–4GB）
  - Apple Silicon（M 系列）符合需求；較舊的 Intel Mac 可能需靠 CPU 後援
- 不支援 Android / iOS（Chrome 內建 AI 尚未開放）
- ⚠️ Edge / Brave 等其他 Chromium 瀏覽器**無法使用**：`Translator` / `LanguageModel` 為 Chrome 專屬 API

## 🙏 致謝

感謝以下貢獻者讓這個專案變得更好：

- **[@hackerpeanutjohn](https://github.com/hackerpeanutjohn)**
  - [#3](https://github.com/aaaddress1/vibe-reading/pull/3) — **一般網頁沉浸式翻譯**：常駐翻譯球、整頁行內雙語對照、選取翻譯、修飾鍵懸停翻譯，並把翻譯引擎抽成 `translate-core.js`，讓 PDF 檢視器與一般網頁共用同一套實作
  - [#1](https://github.com/aaaddress1/vibe-reading/pull/1) — PDF 雙欄／區塊翻譯改進，以及 macOS 安裝支援

也向啟發本專案的「沉浸式翻譯」致敬。

歡迎 issue 與 PR — [Issues](https://github.com/aaaddress1/vibe-reading/issues) 是個好的起點。

## 📄 授權

MIT License

---

# Vibe Reading 📖 (English)

> A tribute to "Immersive Translate" — **on-device AI, no API key, no cloud-AI bill**.
> Translates PDF papers and web pages with Chrome's built-in on-device AI (Gemini Nano / Translator API). Optional remote glossaries only download the glossary data you explicitly choose; document/page content is not uploaded.

[![Buy Me a Coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&slug=aaaddress1&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://www.buymeacoffee.com/aaaddress1)

## Features

- **Paragraph translation** with original paper on the left, translations on the right
- **Two-way locate**: click a translation → paper scrolls & highlights the source; click source → translation highlights
- **Auto source-language detection** — you only pick the *target* language (defaults to your browser language, remembered)
- **Auto-translate** on open, with manual re-run
- **🧠 AI Summary** by Gemini Nano: Background, Related Work, Highlights, Conclusion
- **🤖 Ask-AI on selection**: highlight text and ask Gemini Nano; the prompt includes the AI summary and the surrounding paragraphs as context. Stoppable, and the panel is non-blocking so you can keep reading
- **🌐 Quick-translate on selection**: hit "翻譯" on the floating bar and the panel instantly shows the translation — zero typing, with the input kept for follow-ups
- **🧭 First-run guide**: shows Traditional Chinese or English based on browser language, lets you choose the default target language, and guides you to enable file URL access for local PDFs
- **⚙️ Reopenable settings**: use the top-right gear anytime to update the default target language or check local file access
- **✏️ Editable translation cards**: double-click any translation to edit in place — fix wording or re-paragraph with Enter; blur/Ctrl+Enter saves, Esc cancels
- **⌨️ Alt+T hotkey** to open the translator on any PDF tab (also via toolbar icon or right-click menu)
- **🔍 Independent PDF zoom**: Ctrl+wheel / trackpad pinch zooms only the left PDF (smooth, native-like); ←/→ flip pages
- **📰 Two-column papers** detected and read column-by-column
- **🔤 Adjustable translation font** (A−/A+, remembered) · **🌗 dark theme · on-device AI · no API key**
- **🌐 Immersive web-page translation**: a persistent translate ball sits on every page (can be disabled in options)
  - **Click the ball = translate the whole page** inline and bilingually, following infinite scroll / SPA updates; click again to restore the original
  - **Hover translate**: hold the modifier key (default `Shift`, configurable) and point at a paragraph to translate just that block
  - **Selection translate**: highlight text, then right-click → "翻譯選取的文字" to translate only the selection in a popup card
  - Hover the ball to reveal its panel: target language (shared with the PDF viewer), hover toggle, ⚙ options, hide ball

## What’s new in 1.5.0

> The items below document the proposed 1.5.0 `feature/prompt-diff-lab` review build. Upstream adoption and Chrome Web Store publication remain the original author's decision.

- **Three translation modes in the PDF Viewer**: Translator API, Glossary Hybrid, and Gemini Nano. Hybrid keeps fast Translator API routing for ordinary paragraphs and prefers Gemini Nano when the paragraph matches professional glossary terms, with automatic fallback.
- **Professional glossary**: `source,target,tgt_lng` CSV compatible with the terms data format used by the [Immersive Translate](https://github.com/immersive-translate/) project; local file, pasted CSV, a user-specified public GitHub glossary directory, or direct CSV URL; optional synchronization and Loaded/Matched/Applied diagnostics. Compatibility does not mean Vibe Reading bundles, mirrors, maintains, or depends on third-party glossary data.

  Reference location (plain text only; not a bundled or fixed dependency): `https://github.com/immersive-translate/terms/tree/main/glossaries`
- **Prompt Diff Lab**: compare the original and current Gemini system prompt using edit, side-by-side diff, Unified diff and rule-coverage views.
- **Linked PDF sessions**: the Lab discovers open Vibe Reading PDF viewers and can show a first-page thumbnail, progress, selected mode, effective route and glossary diagnostics.
- **Translation benchmark**: compare Translator API / Hybrid / Gemini Nano on the same 3/5/10/20 paragraphs. It reports average and median latency, exact characters/s, **estimated output tokens/s**, route distribution, glossary matches/applies and fallbacks.
- **Local model info**: surfaces only information exposed by Chrome APIs, including availability, language pair, Prompt API sampling parameters and available context metrics. Chrome-managed model file paths, filenames and exact installed sizes are explicitly reported as unavailable rather than guessed.

The benchmark uses independent sessions and does not inject its output into the PDF or change the viewer's global translation mode. `tokens/s` is explicitly an estimate; elapsed time and characters/s are directly measured.

See [`docs/prompt-diff-lab.md`](docs/prompt-diff-lab.md) and [`docs/professional-glossary.md`](docs/professional-glossary.md). The screenshots in the development preview section above are shared by both language sections.

## Install

**Option 1 (recommended): [Install from the Chrome Web Store](https://chromewebstore.google.com/detail/%E6%B0%9B%E5%9C%8D%E9%96%B1%E8%AE%80-vibe-reading/aaiiajcclefdjeegondambmholpnkjme)** — one click.

**Option 2: load unpacked** (or grab a packaged zip from [Releases](https://github.com/aaaddress1/vibe-reading/releases)):

1. `chrome://extensions` → Developer mode → **Load unpacked** → select this folder (`lib/` is already bundled).
2. First run (needed for both options): enable **Prompt API** & **Translator API** in `chrome://flags`, restart, then update **Optimization Guide On Device Model** in `chrome://components` (~2.4GB).

> Before Chrome Web Store 1.5.0 is published, load the 1.5.0 source from this repository as an unpacked extension to test these features.

## Local PDF Access

Chrome extensions cannot read `file://` local file URLs by default. To translate PDFs from your computer, enable this manually:

1. Go to `chrome://extensions`
2. Open details / manage extension for "氛圍閱讀 Vibe Reading"
3. Turn on **Allow access to file URLs**

Online PDFs still work without this permission, but local PDFs will fail to load until it is enabled.

## Alt+T Not Working?

Chrome treats `commands.suggested_key` as a suggested shortcut. If `Alt+T` is already used by another extension, an unpacked development build, Chrome, or the operating system, Chrome may leave the Web Store build unassigned.

Open `chrome://extensions/shortcuts`, find Vibe Reading, and confirm that "用氛圍閱讀翻譯目前分頁的 PDF" is assigned to `Alt+T`. If both the unpacked build and the Web Store build are installed, disable one of them or assign different shortcuts.

## Requirements

- Chrome **138+** on Windows 10/11, macOS 13+, Linux, or Chromebook Plus
- Not available on Android/iOS, nor on Edge/other browsers (`Translator` / `LanguageModel` are Chrome-only).

## 🙏 Acknowledgements

Thanks to the contributors who made this project better:

- **[@hackerpeanutjohn](https://github.com/hackerpeanutjohn)**
  - [#3](https://github.com/aaaddress1/vibe-reading/pull/3) — **immersive translation for regular web pages**: the persistent translate ball, inline bilingual full-page mode, selection translate, modifier-hover translate, and extracting the shared engine into `translate-core.js` so the PDF viewer and web pages share one implementation
  - [#1](https://github.com/aaaddress1/vibe-reading/pull/1) — two-column / block translation improvements for PDFs, plus macOS setup support

And a tribute to "Immersive Translate" for the inspiration.

## License

MIT
