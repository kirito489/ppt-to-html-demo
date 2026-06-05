## Context

`ConvertPptService` 目前只渲染 slideLayout 上「非 placeholder 的文字」（`layoutDecorTextHtml`），不渲染任何 layout/master 圖片，因此 master 上的 logo 不出現。字級／顏色繼承只查 master `txStyles`（依 title/body/other），且只有 `idx`、無 `type` 的內容框會落到 `otherStyle`，而 PowerPoint 對這類框的預設文字樣式取自該 placeholder 在 layout（或 master）的 `lstStyle`。

## Goals / Non-Goals

**Goals:**

- 渲染 layout/master 非-ph 圖片（logo、色條），z 序在 slide 內容之下、不計準確率。
- run 無 `sz`／顏色時，優先取 placeholder 在 layout→master 的 `lstStyle` lvl1 字級／顏色，修正 idx-only 框字級。

**Non-Goals:**

- 文字溢出額外裁切；lvl2+ 多階繼承；EMF/WMF 向量圖；master 非-ph「文字」的新增渲染（維持只渲染 layout 文字，避免母片提示字/頁碼洩漏）。

## Decisions

### D1：渲染 layout/master 非-ph 圖片（沿用 convertPicture）

新增 `decorGraphicsHtml(zip, xmlPath)`：讀該 layout/master xml 與其 `_rels`，走訪 `spTree` 中無 `<p:ph>` 的 `<p:pic>`，以該檔自己的 rels 呼叫既有 `convertPicture` 內嵌圖片，回傳 HTML 片段。於 `convertSlide` 依「master 圖片 → layout 圖片 → layout 裝飾文字 → slide 內容」順序 push（master 最底）。這些片段**不**加入 `elements`，不影響 inventory/準確率（與既有裝飾文字一致）。

- 只取 `<p:pic>`（圖片），不取 master 非-ph 文字，避免母片提示字/頁碼污染。
- 圖片關係必須用「該圖片所在檔」的 rels（layout 的 pic 用 layout.rels、master 的用 master.rels），不可用 slide 的 rels。

### D2：placeholder 字級／顏色繼承優先取 layout/master 的 lstStyle

`readPlaceholders` 既已回傳每個 placeholder 的 `{type, idx, xfrm}`，擴充為一併讀其 `<p:txBody><a:lstStyle><a:lvl1pPr><a:defRPr>` 的 `sz` 與顏色（srgbClr 或 schemeClr 原值）。新增比對器（依 idx 優先、再 type 別名）在 layout→master 的 placeholder 清單中找對應，取其 lvl1 `sz`／顏色。

`resolveDefaultSize`：placeholder lstStyle sz（layout→master）→ master `txStyles`（依 type）→ `DEFAULT_FONT_SIZE`。
`resolveDefaultColor`：placeholder lstStyle color（layout→master，schemeClr 經 `resolveScheme` 解析）→ master `txStyles` 顏色（依 type）→ 無。

- idx-only 內容框（無 type）改由「依 idx 比對到 layout placeholder」取得正確字級（個股訊息 idx=2 → 24pt），不再落入 otherStyle(18pt)。
- 既有「依 type 取 master txStyles」維持為後備，不退步。

## Risks / Trade-offs

- [master 圖片可能含大型背景圖或裝飾] → 視為更貼近原樣；以原 xfrm 定位、z 在底，不致蓋住內容。
- [lstStyle 顏色為 schemeClr 需色盤] → 重用本專案既有 `resolveScheme`；解不到則略過顏色（不退步）。
- [placeholder 同時用 idx 與 type 比對可能誤配] → 依「idx 優先、type 別名次之」與既有座標比對同邏輯，行為一致。
- [字級變大後文字仍可能略溢出] → 已知非目標；字級正確後框填充與重疊會明顯改善，殘餘溢出不在本次處理。

## Migration Plan

無 schema／API 變更。驗證以引擎重跑樣本＋比對原檔（logo 出現於右下、個股訊息字級變大填滿、台股盤中無回歸）。既有資料不回溯。
