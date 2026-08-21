# 專業辭庫（選用）

Vibe Reading 的「專業辭庫」是**由使用者自行決定是否開啟**的進階功能，預設關閉。

它用來固定專業術語的翻譯方式，降低長篇論文、技術文件與特定領域內容中同一術語出現不同譯法的機率。

## 格式相容性

專業辭庫相容 [Immersive Translate](https://github.com/immersive-translate/) 專案所使用之 terms 資料的 CSV 欄位格式：

```csv
source,target,tgt_lng
Algorithm,演算法,zh-TW
Machine Learning,機器學習,zh-TW
API,API,auto
```

- `source`：來源術語。
- `target`：希望使用的譯法。
- `tgt_lng`：目標語言；留白或 `auto` 表示所有目標語言。
- Vibe Reading 會將 `zh-TW` / `zh-HK` / `zh-MO` 視為與 `zh-Hant` 相容，將 `zh-CN` / `zh-SG` 視為與 `zh-Hans` 相容。

「格式相容」只表示 Vibe Reading 能讀取同樣的資料結構，**不表示 Vibe Reading 內建、重新散布、轉授權、維護或保證任何第三方辭庫內容**。

## 如何開啟

開啟 Vibe Reading 的擴充功能設定頁，在「專業辭庫（選用）」切換開關。

可選三種方式：

1. **載入本機 CSV**：選擇電腦中的辭庫檔案。
2. **直接貼上 CSV**：把辭庫文字貼到設定欄位後儲存。
3. **遠端辭庫來源**：
   - GitHub 目錄：自行填入可信任的公開 GitHub 辭庫目錄網址，讀取目錄後勾選一個或多個 CSV。
   - 直接 CSV URL：自行填入單一 CSV URL。

## GitHub 辭庫目錄模式

若要使用遠端辭庫，可自行指定任何可信任、公開且符合支援格式的 GitHub 目錄。Vibe Reading 不預設綁定特定第三方目錄。

作為格式與資料組織方式的參考，可查閱 [Immersive Translate 專案主頁](https://github.com/immersive-translate/)；其 terms glossary 參考位置如下，僅以純文字呈現：

```text
https://github.com/immersive-translate/terms/tree/main/glossaries
```

此位置僅作為格式與目錄結構參考，**不代表 Vibe Reading 內建、維護、鏡像、預選或依賴該資料來源**。

操作流程：

1. 選擇「GitHub 辭庫目錄」。
2. 貼上 GitHub `/tree/<branch>/<folder>` 目錄網址。
3. 按「讀取辭庫清單」。
4. Vibe Reading 只讀取該目錄中的 `.csv` 檔案資訊，並顯示成可搜尋、可勾選的清單。
5. 勾選要使用的辭庫。一次最多選擇 20 個。
6. 閱讀來源與責任說明並勾選確認。
7. 按「匯入目前選取的辭庫」。
8. 如有需要，再開啟「自動動態匯入」。

設定頁只會在使用者明確指定來源、確認責任並執行匯入後才讀取遠端辭庫；**不會在未經使用者操作的情況下自動選取或下載任何第三方辭庫。**

目前自動列目錄支援公開 `github.com` repository 的標準 tree URL。目錄讀取使用 GitHub 公開 Contents API，因此未登入的公開 API 查詢可能受到 GitHub rate limit 限制。

### 選取與語言

清單會依檔名顯示推測的目標語言，例如：

- `tech_zh-TW.csv` → `zh-TW`
- `tech_zh-CN.csv` → `zh-CN`
- `default.csv` → `auto`

實際套用時仍以 CSV 裡的 `tgt_lng` 欄位為準。目標語言不相容的詞條會被忽略。

可以同時選擇多個辭庫。Vibe Reading 下載後會合併有效的 `source,target,tgt_lng` 資料並去除同語言下的重複來源詞條。

## 遠端資料與自動動態匯入

遠端資料來源不會預設開啟。使用者必須：

1. 手動填入 GitHub 目錄或 CSV URL。
2. 在目錄模式下自行勾選要使用的辭庫。
3. 閱讀來源與責任說明。
4. 勾選確認「網址、檔案與資料內容由自己指定，並自行確認授權、可信度與使用責任」。
5. 手動執行第一次匯入。
6. 如有需要，再開啟「自動動態匯入」。

如果使用者變更：

- GitHub 目錄網址；
- 已勾選的辭庫；
- 遠端來源模式；
- 直接 CSV URL；

先前的來源確認會立即失效，自動同步也會自動關閉，必須重新確認。

### 自動同步行為

啟用後，Vibe Reading 在需要翻譯時最多每 24 小時更新一次。

GitHub 目錄模式只會更新**已經由使用者選取的檔案 URL**：

- 上游更新同一 CSV → 下一次同步會取得新版。
- 上游目錄新增新的 CSV → 不會自動選取，使用者需重新讀取清單並自行勾選。
- 更新失敗 → 沿用最後一次成功快取，不阻斷翻譯。

限制：

- 單一遠端 CSV：最多 2 MB。
- 一次遠端選取：最多 20 個 CSV。
- 遠端選取合計：最多 4 MB。
- 合併後最多保留 10,000 列；翻譯引擎最多載入其中 5,000 條與目前目標語言相容的有效術語。
- 遠端來源只允許 HTTPS；本機開發例外允許 `http://localhost`、`http://127.0.0.1`。
- 單次連線 timeout：15 秒。

## 與翻譯引擎的關係

專業辭庫現在採 **Glossary Hybrid routing**，而不是只在 Translator API 翻完後做文字替換。

### Auto（預設）

- **目前段落沒有命中辭庫術語**：優先使用 Chrome Translator API，保留原本的速度優勢。
- **目前段落命中辭庫術語**：優先改走 Gemini Nano / Prompt API，並只把該段實際命中的術語附在 prompt payload 中。
- **Gemini Nano 不可用、尚未下載或首次建立需要使用者手勢**：退回 Translator API，並以 placeholder 保護命中的來源術語，翻譯後再還原成辭庫指定 target。

每次 Gemini Nano 翻譯最多加入 24 條與目前段落相關的術語，不會把整份辭庫塞進 context。

### Force Translator API

所有段落都固定使用 Translator API。命中專業辭庫時會使用 placeholder 保護術語，再還原成指定 target。

這個模式主要用於 A/B、相容性與速度測試，不代表 Translator API 原生支援 glossary。

### Force Gemini Nano

所有段落都固定使用 Gemini Nano / Prompt API，使用目前 `translationSystemPrompt()` 與 glossary payload。

這個模式最適合直接比較舊版／新版 prompt 的行為差異。

## 設定變更何時生效

辭庫開關、辭庫內容、遠端匯入結果與 Engine Mode 變更後，**下一個尚未翻譯的段落就會使用新設定**。

已經完成並顯示在頁面上的舊譯文不會自動重翻；若要比較前後差異，請切回原文後重新翻譯、重新開啟 PDF 翻譯，或手動重新執行該段。

## Prompt Diff Lab 與診斷資訊

設定頁可開啟 **Prompt Diff Lab／提示詞差異工具**。

除了比較 v1.4 原版與目前 system prompt，它也能控制全域翻譯測試模式：

- `Auto（Glossary Hybrid）`
- `Force Translator API`
- `Force Gemini Nano`

每次翻譯會留下最近一次診斷資訊：

- `Base Engine`：最初建立的 engine。
- `Effective Engine`：該段實際使用的 engine。
- `Glossary Loaded`：目前目標語言可用的辭庫詞條數。
- `Matched`：本段原文實際命中的術語數。
- `Applied`：譯文中實際觀察到指定 target 的術語數。
- `Fallback`：是否發生 Gemini unavailable、首次下載手勢限制或 placeholder fallback。

如開啟「在翻譯狀態列顯示診斷」，網頁與 PDF 的狀態列也會顯示簡短路由摘要。

## 第三方資料責任

Vibe Reading 不會自動替使用者選擇、連線或下載第三方辭庫。第三方資料可能具有自己的授權、內容品質、隱私與可用性條件。

在啟用遠端來源前，請自行確認：

- 該資料是否允許你的使用方式；
- 網址是否由可信任來源提供；
- 詞條是否適合你的領域與目標語言；
- 第三方資料變更是否可能影響翻譯結果。

對 Immersive Translate terms 的支援是**格式與 GitHub 目錄讀取相容**；Vibe Reading 不內建、鏡像、維護、重新散布、轉授權或依賴其資料。
