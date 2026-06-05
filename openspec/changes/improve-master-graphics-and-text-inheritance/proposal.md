## Why

以更多真實簡報（美股盤前／個股訊息／台股盤中等）比對後發現兩個保真度缺口：(1) 每頁右下角的「凱基投顧」logo（在 slideMaster 上的圖片）完全沒被渲染；(2) 沒有自身 `sz` 的 placeholder 文字（如「個股訊息」條列）字級偏小——引擎只讀 master `txStyles`，且把只有 `idx`、無 `type` 的內容框誤判為 `otherStyle`(18pt)，但 PowerPoint 實際取自該 placeholder 在 **layout 的 `lstStyle`**（如 24pt），導致字太小、框沒填滿、視覺與 PPT 不一致並連帶造成重疊感。

## What Changes

- **渲染 layout/master 的非 placeholder 圖片**：把 slideMaster／slideLayout `spTree` 中無 `<p:ph>` 的 `<p:pic>`（logo、頁首色條等品牌圖）以各自的關係檔解析、內嵌渲染，置於 slide 內容之下（master 在最底、layout 次之），補回每頁共用的版面圖片。不計入準確率（與既有裝飾文字一致）。
- **placeholder 字級／顏色繼承補上 layout/master placeholder 的 `lstStyle`**：run 無自身 `sz`／顏色時，依 placeholder 的 `idx`（優先）或 `type` 比對 layout→master 的 placeholder，取其 `lstStyle` lvl1 `defRPr` 的字級／顏色；皆無時才退回 master `txStyles`（依 type）→ 預設。修正只有 `idx` 的內容框字級誤判（個股訊息 18pt→24pt）。

不在範圍：文字溢出的額外裁切處理（使用者決定保持現狀，字級修正後重疊會自然改善）；list 多階層（lvl2+）完整繼承；EMF/WMF 等向量 logo（非 PNG/JPeg 仍輸出占位）。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `ppt-conversion`: 擴充「Layout/Master 非 placeholder 文字渲染」為亦渲染非 placeholder 圖片；強化「無字級文字自 Layout/Master 繼承字級」改為優先取 placeholder 在 layout/master 的 `lstStyle`（字級與顏色），修正 idx-only 內容框誤判。

## Impact

- 引擎：`apps/api/src/application/service/ppt/ConvertPptService.ts`（layout/master 非-ph 圖片渲染；`readPlaceholders` 增讀 lstStyle lvl1 `defRPr` sz/color；`resolveDefaultSize`/`resolveDefaultColor` 改走 placeholder lstStyle 優先）。
- 測試：`ConvertPptService.*.spec.ts` 新增「master 圖片渲染」「placeholder lstStyle 字級/顏色繼承」案例。
- 無 DB schema、無 API 合約、無前端變更。既有資料不回溯重轉。
