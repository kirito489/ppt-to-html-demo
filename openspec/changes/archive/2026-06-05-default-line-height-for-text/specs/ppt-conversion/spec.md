## MODIFIED Requirements

### Requirement: 文字內容與樣式還原
系統 SHALL 還原文字框內的段落與文字 run，包含文字內容與常見樣式（粗體、斜體、底線、字級、顏色），並 SHALL 設定字型堆疊（優先使用來源字型如微軟正黑體，fallback 至 Microsoft JhengHei、Noto Sans TC 等）與行距：段落帶 `<a:lnSpc>` 時依來源換算，未帶 `<a:lnSpc>` 時 SHALL 套用接近 PowerPoint 單行間距的預設行高（約 1.2），取代瀏覽器偏鬆的 `normal`，降低替代字型行高差異造成文字溢出原框、覆蓋相鄰元素的情形。

#### Scenario: 還原段落與文字
- **WHEN** 文字框含多個 `<a:p>` 段落與 `<a:r>/<a:t>` run
- **THEN** 輸出 HTML MUST 完整包含所有文字內容，且段落結構與原稿一致

#### Scenario: 套用文字樣式
- **WHEN** run 帶有 `<a:rPr>` 樣式（如 `b="1"`、`sz`、`<a:srgbClr>`）
- **THEN** 對應 HTML MUST 反映粗體/字級/顏色等樣式

#### Scenario: 依來源行距
- **WHEN** 段落帶 `<a:lnSpc>`（spcPct 或 spcPts）
- **THEN** 輸出該段落 MUST 套用依來源換算的 `line-height`

#### Scenario: 無行距時套預設行高
- **WHEN** 段落未帶 `<a:lnSpc>`
- **THEN** 輸出該段落 MUST 套用接近 PowerPoint 單行間距的預設 `line-height`（約 1.2），而非瀏覽器 `normal`

#### Scenario: 設定字型以抑制溢出
- **WHEN** 文字框含中文段落（來源字型如微軟正黑體）
- **THEN** 輸出 HTML 的文字框 MUST 設定對應字型堆疊，使渲染高度貼近原框、不溢出至下方元素
