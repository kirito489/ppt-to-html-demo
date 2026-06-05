## Why

文字框沒有 `<a:lnSpc>` 行距設定時，引擎不設 `line-height`，瀏覽器套用 `normal`（CJK 替代字型約 1.4–1.5），比 PowerPoint 預設單行間距（約 1.2）鬆很多。文字量大的框（如台股盤中右欄 600+ 字）累積多出 15–25% 高度 → 文字溢出框、向下覆蓋頁尾聲明與 logo（即回報的「重疊／被截」）。

## What Changes

- **文字框無 `<a:lnSpc>` 時，套用接近 PowerPoint 單行間距的預設 `line-height`（約 1.2）**，取代瀏覽器偏鬆的 `normal`，使多行中文段落的渲染高度更貼近原框、不溢出覆蓋相鄰元素。有 `<a:lnSpc>` 者維持依來源換算（不變）。

不在範圍：依文字量動態縮字（normAutofit 模擬）；文字溢出裁切；字級調整（字級已忠實照來源，不在此改）。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `ppt-conversion`: 強化「文字內容與樣式還原」——無 `<a:lnSpc>` 時套用預設行高（約 1.2）以抑制溢出。

## Impact

- 引擎：`apps/api/src/application/service/ppt/ConvertPptService.ts`（`lineHeight` 無 lnSpc 時回傳預設行高）。
- 測試：`ConvertPptService.textflow.spec.ts` 增「無 lnSpc → 預設行高」案例。
- 無 DB／API／前端變更。
