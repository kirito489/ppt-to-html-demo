## ADDED Requirements

### Requirement: Layout/Master 非 placeholder 圖片渲染
系統 SHALL 渲染 slideMaster 與 slideLayout `spTree` 中「無 `<p:ph>`」的 `<p:pic>`（如每頁共用的 logo、頁首色條），以該圖片所在檔自己的關係檔解析並內嵌，置於 slide 內容之下（master 在最底、layout 次之）。此類圖片 SHALL NOT 計入元素涵蓋率／圖片擷取率（與既有裝飾文字一致）。

#### Scenario: 補回 master 上的 logo
- **WHEN** slide 自身無 logo、但其 slideMaster 有一個非 placeholder 的 `<p:pic>`（PNG/JPEG 的品牌 logo）
- **THEN** 輸出 HTML MUST 以 data URI 內嵌該圖片於對應百分比位置，且位於 slide 自身元素之下（z-order 在底）

#### Scenario: 不影響準確率
- **WHEN** 渲染 layout/master 的非 placeholder 圖片
- **THEN** 該圖片 MUST NOT 計入元素涵蓋率／圖片擷取率（避免準確率失真或破百）

## MODIFIED Requirements

### Requirement: 無字級文字自 Layout/Master 繼承字級
系統 SHALL 在文字 run 無自身 `sz`（或無自身顏色）時，先依該形狀 placeholder 的 `idx`（優先）或 `type`，比對 slideLayout→slideMaster 的對應 placeholder，取其 `<a:lstStyle>` lvl1 `defRPr` 的字級／顏色；其次才退回 master `<p:txStyles>`（依 title/body/other 型別）；皆無對應時退回預設字級（顏色則不套）。顏色為 `schemeClr` 時 SHALL 經主題色盤解析。

#### Scenario: 自 layout placeholder lstStyle 繼承字級
- **WHEN** 某內容 placeholder 只有 `idx`（無 `type`）、其 run 無 `sz`，且該 placeholder 在 slideLayout 的 `lstStyle` lvl1 `defRPr` 設有字級（如 24pt）
- **THEN** 該文字 MUST 套用 layout lstStyle 的字級（24pt），而非誤用 master `otherStyle`(18pt) 或預設

#### Scenario: 退回 master txStyles
- **WHEN** placeholder 在 layout/master 皆無 `lstStyle` 字級，但 master `txStyles` 對應型別的 `defRPr` 設有字級
- **THEN** 該文字 MUST 套用 master `txStyles` 的字級

#### Scenario: 繼承顏色
- **WHEN** run 無自身顏色，且其 placeholder 在 layout/master 的 `lstStyle` lvl1 `defRPr` 設有顏色（srgbClr 或 schemeClr）
- **THEN** 該文字 MUST 套用解析後的顏色

#### Scenario: 無繼承來源時退預設
- **WHEN** run 無 `sz` 且 layout/master placeholder lstStyle 與 master `txStyles` 皆無對應 `defRPr@sz`
- **THEN** 該文字 MUST 退回預設字級（18pt）
