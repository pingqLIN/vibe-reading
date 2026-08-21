# Prompt Diff Lab

Prompt Diff Lab 是 Vibe Reading 的本機分析工具。PDF Viewer 保留日常翻譯與模型切換；Lab 提供提示詞比較、文件連動、速度比較與 Chrome 本機模型資訊。

## 開啟方式

在 Vibe Reading PDF Viewer 右上角的翻譯引擎選單旁按 **Lab**。如果 Lab 已經開啟，會切換到現有分頁，而不是重複建立。

也可以從擴充功能設定頁開啟。

## 四個分頁

### 提示詞比較

同一區塊內提供四種檢視：

- **編輯**：左右編輯原版與修正版 Prompt。
- **並排差異**：逐詞／符號或逐行查看增刪。
- **Unified**：在同一視圖檢查差異。
- **規則覆蓋**：檢查 locale、忠實翻譯、資訊保留、專業辭庫與資料／指令邊界等規則是否存在。

規則覆蓋只檢查文字特徵，不是模型品質分數。

### 文件與路由

Lab 會尋找目前開啟中的 Vibe Reading PDF Viewer，顯示：

- 第一頁縮圖；
- 文件名稱；
- 頁數與段落數；
- 目標語言；
- 翻譯進度；
- 選定模式與最近實際路由；
- 專業辭庫載入／命中／套用數；
- 目前估算翻譯速度。

可按「切換到文件」聚焦原 PDF 分頁，或按「選為測試文件」提供給速度比較。

Viewer 與 Lab 使用 extension-origin `BroadcastChannel` 溝通。縮圖只在 Lab 要求時由已渲染的第一頁 canvas 產生，不會上傳或永久保存。

### 速度比較

同一組來源段落可依序比較：

- Translator API；
- 混合；
- Gemini Nano。

可選 3、5、10 或 20 段。預設每種模式先執行一次不計入結果的暖機翻譯。

每種模式顯示：

- 實際路由；
- 成功／總數；
- 平均與中位段落時間；
- 精確 characters/s；
- 估算 output tokens/s；
- 專業辭庫命中／套用數；
- fallback 次數。

基準測試建立獨立模型工作階段，不會切換 PDF Viewer 的全域翻譯模式，也不會把測試譯文插入文件結果。

#### tokens/s 計算限制

- **elapsed time** 與 **characters/s** 是實際量測。
- **tokens/s** 一律標示為估算值。
- Translator API 不公開 tokenizer，因此以語言感知的字元／字詞規則估算。
- Gemini Nano 若可取得 `contextUsage` 與 `measureContextUsage()`，會使用 context 差額輔助估算；Chrome 仍不公開實際 tokenization，因此不宣稱為精確 token 數。

### 本機模型

顯示 Chrome 公開 API 可取得的基本資料：

- Gemini Nano / Prompt API availability；
- Translator language pack 的語言配對與 availability；
- Prompt API sampling parameter 上限與預設值（環境有提供時）；
- 最近基準測試的 context usage/window（有資料時）；
- 目前全域翻譯模式。

Chrome 公開 API 不提供實際模型檔案路徑、檔名、版本與精確安裝大小。Lab 會明確標示為「Chrome 管理／公開 API 未提供」，不掃描 Chrome profile，也不推測數值。

可複製 `chrome://on-device-internals`，再於 Chrome 網址列開啟以查看瀏覽器提供的內部狀態。

## PDF Viewer 顯示

Viewer 右上角仍可直接切換：

- Translator API；
- 混合；
- Gemini Nano。

旁邊的簡要狀態顯示最近實際路由、辭庫命中／套用與目前估算 tokens/s。滑鼠停留可查看較完整的診斷。

## 隱私

所有 Prompt Diff、縮圖、文件段落與速度統計都留在 Chrome extension context。此功能不新增雲端服務、帳號、遠端分析或遙測上傳。
