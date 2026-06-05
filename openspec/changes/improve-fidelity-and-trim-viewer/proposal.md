## Why

以三份真實 LINE 財經簡報（台股盤後／美股盤前／量化策略）的下載 HTML 與原檔逐一比對，發現引擎多項保真度問題：圖片蓋住文字框、文字溢出框、項目符號與編號全失、繼承色／主題色變黑、表格超框被裁。同時詳情頁的「捲動模式＋模擬寬度」與「複製 HTML」在實際使用上多餘，需精簡。

## What Changes

**引擎保真度（ppt-conversion）**

- **形狀堆疊順序（z-index）還原**：改為依 `.pptx` 文件順序決定上下層，修正「先畫全部文字再畫全部圖片」導致該在上層的文字框被圖片蓋住而消失（美股 slide1 紅字框案例）。
- **文字防溢出**：文字框補上 `font-family`（微軟正黑體 → Microsoft JhengHei fallback）與行距（`a:lnSpc`），避免瀏覽器 fallback 字體較高造成文字超出原框、掉進下方圖片區（台股案例）。
- **項目符號與編號還原**：解析段落 `a:buChar`（含 Wingdings 常用符號對應，如 `n`＝■）與 `a:buAutoNum`（自動編號），渲染為對應的項目符號／序號。
- **文字繼承色與主題色還原**：run 自身無 `srgbClr` 時，依 placeholder → layout → master `txStyles` → `theme1.xml` 色盤解析顏色，並支援 `a:schemeClr`，修正藍色內文變黑。
- **表格保真度**：表格儲存格改讀來源 `rPr` 字級、`a:gridCol` 欄寬、`a:tr` 列高，並還原儲存格文字顏色／粗體，修正字級寫死 `2cqw` 導致內容超框被 `overflow:hidden` 裁掉。

**前端預覽精簡（converted-article-ui）**

- **移除「捲動」模式與「模擬寬度（手機／平板／桌機）」切換**：詳情頁預覽只保留翻頁式檢視。
- **移除「複製 HTML」按鈕**：保留「下載 HTML」與「下載簡報 HTML」。

不在範圍：座標對照評分（使用者決定暫時不做）；分頁（經確認為誤會，無 bug）。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `ppt-conversion`: 新增形狀堆疊順序還原、文字繼承色／主題色還原、項目符號與編號還原；修改文字樣式還原（補字體與行距）與表格還原（字級／欄寬／列高／儲存格樣式）。
- `converted-article-ui`: 修改不跑版預覽（移除捲動模式與模擬寬度切換，預覽僅保留翻頁）與 HTML 匯出（移除複製 HTML）。

## Impact

- 引擎：`apps/api/src/application/service/ppt/ConvertPptService.ts`（z-index、字體/行距、bullets/編號、繼承色/主題色、表格）。新增讀取 `ppt/theme/theme*.xml` 色盤。
- 前端：`apps/web/src/routes/articles/components/slide-preview.tsx`（移除捲動/寬度）、`apps/web/src/routes/articles/detail.tsx`（移除複製 HTML）。
- 測試：`ConvertPptService.*.spec.ts`（新增 z-order／bullets／繼承色／表格保真度案例）、前端 slide-preview 測試調整。
- 無 DB schema、無 API 合約變更。
