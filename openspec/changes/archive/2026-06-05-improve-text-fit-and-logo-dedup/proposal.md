## Why

以新一輪真實簡報比對 PowerPoint 發現三項視覺差異：(1) 稀疏內文（美股盤前/個股訊息）在 HTML 偏「不滿」——預設行高 1.2 比 PowerPoint 中文單行間距（渲染約 1.35）緊，文字被壓在框上半；(2) 文字量極大的框（台股盤中右欄 600+ 字）仍溢出框、覆蓋頁尾與 logo——PowerPoint 以 autofit 自動縮字塞下，引擎未模擬；(3) 母片同時放了多個角落 logo（投顧＋證券），引擎全部渲染，但 PowerPoint 該頁只顯示一個。

## What Changes

- **預設行高 1.2 → 1.35**：無 `<a:lnSpc>` 的段落改用更接近 PowerPoint 中文單行渲染的行高，稀疏內文得以撐滿框、貼近 PP。
- **文字框 autofit 縮放（近似 normAutofit）**：依「字數 × 字寬 vs 框面積」估算所需高度，超過框高時等比縮小該框字級（設下限避免過小），使密集內文（台股盤中右欄）塞回框內、不裁字、不覆蓋相鄰元素。
- **角落 logo 去重**：layout/master 的滿版裝飾圖（頁首色條，寬 > 50%）一律保留；位於角落的「小 logo」若有多個，只保留文件順序最後一個（PowerPoint 該頁顯示的當前品牌 logo），避免同時出現投顧＋證券。

不在範圍：像素級精確 autofit（本為估算，非瀏覽器量測）；依圖片內容辨識品牌；EMF/WMF 向量圖。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `ppt-conversion`: 「文字內容與樣式還原」預設行高改 1.35；新增「文字框 autofit 縮放避免溢出」；「Layout/Master 非 placeholder 圖片渲染」加入角落小 logo 去重。

## Impact

- 引擎：`apps/api/src/application/service/ppt/ConvertPptService.ts`（`DEFAULT_LINE_HEIGHT`、新增 autofit 估算與字級縮放、`decorGraphicsHtml`/`collectDecorPics` 加去重）。
- 測試：`ConvertPptService.textflow.spec.ts`（行高/autofit）、`ConvertPptService.decorpic.spec.ts`（logo 去重）。
- 無 DB／API／前端變更。既有資料不回溯重轉。
