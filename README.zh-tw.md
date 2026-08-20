# 氛圍閱讀 Vibe Reading 📖

在裝置本地端翻譯 PDF 與網頁——零 API Key、零雲端、零費用。
使用 Chrome 內建 AI（Gemini Nano / Translator API），為研究論文提供雙語並排檢視，並對任意網頁提供沈浸式行內翻譯。

[English Version](README.md)

![氛圍閱讀 Vibe Reading 介面預覽](preview.png)

> 離線。隱私。免費。

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20線上應用程式商店-氛圍閱讀%20Vibe%20Reading-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/%E6%B0%9B%E5%9C%8D%E9%96%B1%E8%AE%80-vibe-reading/aaiiajcclefdjeegondambmholpnkjme)
[![License MIT](https://img.shields.io/badge/授權-MIT-yellow.svg)](LICENSE)
[![Chrome 138+](https://img.shields.io/badge/Chrome-138%2B-4285F4?logo=googlechrome&logoColor=white)](#系統需求)
[![Buy Me a Coffee](https://img.shields.io/badge/請我喝杯咖啡-aaaddress1-FFDD00?logo=buymeacoffee&logoColor=black)](https://www.buymeacoffee.com/aaaddress1)

---

## 目錄

- [這是什麼？](#這是什麼)
- [功能](#功能)
- [安裝](#安裝)
- [使用方式](#使用方式)
  - [翻譯 PDF](#翻譯-pdf)
  - [翻譯一般網頁](#翻譯一般網頁)
- [本機 PDF 注意事項](#本機-pdf-注意事項)
- [Alt+T 沒反應？](#altt-沒反應)
- [技術架構](#技術架構)
- [系統需求](#系統需求)
- [致謝](#致謝)
- [授權](#授權)

---

## 這是什麼？

一個 Chrome 擴充功能。打開任何 PDF（例如 arXiv 論文）後，**自動**把全文逐段翻譯，並排顯示在右側；在**一般網頁**上則以行內雙語對照就地翻譯。所有 AI 推理都跑在你自己的電腦上——內容**不會送到任何雲端**。

- 🔒 **完全離線**——使用 Chrome 138+ 內建的 Gemini Nano / Translator API，資料不離開瀏覽器
- 💸 **零成本**——沒有 OpenAI / Anthropic 帳單，沒有 rate limit
- 🌗 **暗黑主題**——護眼的雙欄閱讀介面

---

## 功能

### 📄 PDF 翻譯

- **逐段翻譯**——左側渲染原始論文、右側對照翻譯（併發加速）
- **雙向定位**——點翻譯 → 左側論文捲動並**高亮對應原文**；點原文 → 右側翻譯高亮
- **自動偵測來源語言**——你只需選「翻譯成」哪種語言（預設＝瀏覽器語言，可記憶設定）
- **開啟即自動翻譯**，也可手動重翻
- **🧠 AI 摘要**——掃描完整份論文後，Gemini Nano 在頂部生成四大重點：背景知識、相關研究、突破亮點、總結
- **🤖 反白問 AI**——在論文中反白文字，直接向 Gemini Nano 提問；提問附上 AI 摘要與前後文作為上下文；可隨時停止，視窗不鎖住、可邊讀邊問
- **🌐 反白快速翻譯**——反白文字後點「翻譯」，面板立即顯示譯文，零輸入，輸入框保留供追問
- **✏️ 字卡編輯模式**——雙擊任一段譯文就地編輯；Enter 重新分段，失焦或 Ctrl+Enter 儲存，Esc 取消
- **⌨️ Alt+T 熱鍵**——在任意 PDF 分頁一鍵開啟翻譯（也可點工具列圖示或右鍵選單）
- **🔍 PDF 獨立縮放**——Ctrl+滾輪 / 觸控板雙指只縮放左側 PDF（不連動整頁），平滑如原生；←/→ 翻頁
- **📰 雙欄論文支援**——自動偵測分欄，左右欄正確分開讀取
- **🔤 翻譯字體調整**——A− / A+ 調整右側字體大小（記憶設定）

### 🌐 網頁沈浸式翻譯

每個網頁右下角**常駐一顆翻譯球**（可在設定頁關閉）。

- **點球＝整頁翻譯**——行內雙語對照，自動跟隨無限捲動 / SPA 新增的內容；再點一次切回原文
- **懸停翻譯**——按住修飾鍵（預設 `Shift`，可在設定頁更改）將滑鼠移到段落即翻該段
- **選取翻譯**——反白文字後右鍵「翻譯選取的文字」，只翻選取（浮卡顯示）
- 滑鼠移到球上展開選單：切換語言（與 PDF 共用）、開關懸停、⚙ 設定、隱藏球

### ⚙️ 設定與首次啟動

- **🧭 首次安裝導覽**——安裝後依瀏覽器語系顯示繁中 / 英文設定頁，提示選擇預設目標語言，並引導開啟「允許存取檔案網址」
- **可重新開啟設定**——右上角齒輪圖示，隨時重新選擇預設目標語言或檢查本機檔案權限

---

## 安裝

**方法一（推薦）——Chrome 線上應用程式商店：**

👉 [一鍵安裝氛圍閱讀 Vibe Reading](https://chromewebstore.google.com/detail/%E6%B0%9B%E5%9C%8D%E9%96%B1%E8%AE%80-vibe-reading/aaiiajcclefdjeegondambmholpnkjme)——無需額外設定。

**方法二——手動載入開發版**（也可到 [Releases](https://github.com/aaaddress1/vibe-reading/releases) 下載打包 zip）：

1. 開啟 `chrome://extensions` → 啟用右上角**開發人員模式** → 點「**載入未封裝項目**」→ 選擇本資料夾（已內含 `lib/`，無需額外下載）。

**首次啟用（兩種安裝方式都需要）：**

2. 開啟 `chrome://flags` → 啟用 **Prompt API for Gemini Nano** 與 **Translator API** → 重啟 Chrome。
3. 開啟 `chrome://components` → 更新 **Optimization Guide On Device Model**（首次約需下載 2.4 GB）。
4. 若要翻譯本機 PDF，請到 `chrome://extensions` → 管理氛圍閱讀 → 開啟「**允許存取檔案網址**」。

---

## 使用方式

### 翻譯 PDF

1. 打開任何 PDF（例如 `https://arxiv.org/pdf/2507.02092`）。
2. 點工具列的擴充圖示，或在頁面上**右鍵 →「翻譯整份 PDF」**。
3. 新分頁開啟雙欄檢視器，自動開始翻譯。
4. 點右上角齒輪可更改預設目標語言或檢查本機檔案權限。
5. 點翻譯卡片定位原文、反白文字向 AI 提問、閱讀頂部 AI 摘要。

### 翻譯一般網頁

1. 每個網頁右下角會出現**翻譯球**。
   - **點球**＝整頁行內雙語翻譯；再點一次切回原文。
   - 也可使用工具列圖示或按 `Alt+T`。
2. **懸停翻譯**（預設開啟）——按住 `Shift` 並將滑鼠移到段落即翻該段。
3. **選取翻譯**——反白文字後**右鍵 →「翻譯選取的文字」**。
4. 滑鼠移到球上展開選單：切換目標語言、開關懸停、⚙ 設定、隱藏球。
5. 修改修飾鍵或停用翻譯球：球選單的 ⚙，或 `chrome://extensions` →「詳細資料」→「擴充功能選項」。

---

## 本機 PDF 注意事項

Chrome 擴充功能預設**無法讀取 `file://` 本機檔案網址**。如果要翻譯電腦裡的 PDF，請手動開啟：

1. 到 `chrome://extensions`。
2. 找到「**氛圍閱讀 Vibe Reading**」，點「詳細資料」。
3. 將「**允許存取檔案網址**」設成開啟。

未開啟此權限時，線上 PDF 仍可正常使用，但本機 PDF 會無法載入。

---

## Alt+T 沒反應？

Chrome 的 `commands.suggested_key` 只是**建議**快捷鍵；如果 `Alt+T` 已被其他擴充功能、開發版、Chrome 或作業系統占用，Chrome 可能不會把它指派給商城版。

1. 開啟 `chrome://extensions/shortcuts`。
2. 找到「**氛圍閱讀 Vibe Reading**」，確認「用氛圍閱讀翻譯目前分頁的 PDF」已設成 `Alt+T`。
3. 如果同時安裝了開發版與商城版，請停用其中一個，或為其中一個改設其他快捷鍵。

---

## 技術架構

| 元件 | 用途 |
|---|---|
| **Translator API** | 地端翻譯模型（優先——快且不需 GPU） |
| **Gemini Nano（Prompt API）** | 翻譯備援 + AI 摘要 + 反白問答 |
| **LanguageDetector API** | 自動偵測來源語言 |
| **PDF.js** | 渲染 PDF 與可選取文字層 |
| **Content script 注入** | 一般網頁的沈浸式行內翻譯（共用同一套引擎） |

---

## 系統需求

| | 說明 |
|---|---|
| **瀏覽器** | Chrome **138+**（Windows 10/11、macOS 13+、Linux、Chromebook Plus） |
| **Translator / LanguageDetector API** | 自 Chrome 138 起正式穩定，**免開 flag** |
| **Gemini Nano（Prompt API）** | 需手動啟用 flag；硬體門檻較高（詳見下方） |
| **不支援** | Android / iOS；Edge、Brave 等其他 Chromium 瀏覽器（`Translator` / `LanguageModel` 為 Chrome 專屬 API） |

**Gemini Nano 硬體需求：**

- `chrome://flags` → 啟用 **Prompt API for Gemini Nano** → 重啟 → `chrome://components` → 更新 **Optimization Guide On Device Model**（或查 `chrome://on-device-internals` 確認狀態）
- 需 macOS 13+ / Windows 10+ / Linux；磁碟 **≥ 22 GB 可用**；**GPU VRAM > 4 GB**
  （Chrome 140+ CPU 後援：16 GB RAM + 4 核）；首次需不限流量網路下載模型（約 2–4 GB）
- Apple Silicon（M 系列）符合需求；較舊的 Intel Mac 可能需靠 CPU 後援

---

## 致謝

感謝以下貢獻者讓這個專案變得更好：

- **[@hackerpeanutjohn](https://github.com/hackerpeanutjohn)**
  - [#3](https://github.com/aaaddress1/vibe-reading/pull/3) — **一般網頁沈浸式翻譯**：常駐翻譯球、整頁行內雙語對照、選取翻譯、修飾鍵懸停翻譯，並把翻譯引擎抽成 `translate-core.js`，讓 PDF 檢視器與一般網頁共用同一套實作
  - [#1](https://github.com/aaaddress1/vibe-reading/pull/1) — PDF 雙欄 / 區塊翻譯改進，以及 macOS 安裝支援

也向啟發本專案的「[沈浸式翻譯](https://immersivetranslate.com/)」致敬。

歡迎 issue 與 PR——[到 Issues 頁面](https://github.com/aaaddress1/vibe-reading/issues)是個好的起點。

---

## 授權

[MIT](LICENSE)
