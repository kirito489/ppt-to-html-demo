## ADDED Requirements

### Requirement: 文字框 autofit 縮放避免溢出
系統 SHALL 在文字框內容的估算高度超過框高時，等比縮小該框的字級（近似 PowerPoint normAutofit），使內容塞回框內、不裁切且不覆蓋相鄰元素；縮放比例 SHALL 設下限以避免字級過小；框無明確尺寸（fallback 整頁）時不縮放。估算 SHALL 以「字數×字寬 vs 框面積」為基礎（中文約 1em 寬），非瀏覽器精確量測。

#### Scenario: 內容超框時縮字
- **WHEN** 文字框字數極多、以原字級估算所需高度超過框高
- **THEN** 該框字級 MUST 被等比縮小，使估算高度不超過框高（縮放不低於下限），且不裁掉文字

#### Scenario: 內容未超框時不縮放
- **WHEN** 文字框內容以原字級即可容納於框內
- **THEN** 該框字級 MUST 維持不變

## MODIFIED Requirements

### Requirement: 文字內容與樣式還原
系統 SHALL 還原文字框內的段落與文字 run，包含文字內容與常見樣式（粗體、斜體、底線、字級、顏色），並 SHALL 設定字型堆疊（優先使用來源字型如微軟正黑體，fallback 至 Microsoft JhengHei、Noto Sans TC 等）與行距：段落帶 `<a:lnSpc>` 時依來源換算，未帶 `<a:lnSpc>` 時 SHALL 套用接近 PowerPoint 中文單行渲染的預設行高（約 1.35），使稀疏內文撐滿框、貼近原稿，並降低替代字型行高差異造成的版面落差。

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
- **THEN** 輸出該段落 MUST 套用接近 PowerPoint 中文單行的預設 `line-height`（約 1.35），而非瀏覽器 `normal`

### Requirement: Layout/Master 非 placeholder 圖片渲染
系統 SHALL 渲染 slideMaster 與 slideLayout `spTree` 中「無 `<p:ph>`」的 `<p:pic>`（如每頁共用的 logo、頁首色條），以該圖片所在檔自己的關係檔解析並內嵌，置於 slide 內容之下（master 在最底、layout 次之）。此類圖片 SHALL NOT 計入元素涵蓋率／圖片擷取率。滿版裝飾圖（寬 > 50% 投影片）SHALL 一律保留；位於角落的「小 logo」若同一檔有多個，SHALL 僅保留文件順序最後一個，避免重複出現多個品牌 logo。

#### Scenario: 補回 master 上的 logo
- **WHEN** slide 自身無 logo、但其 slideMaster 有一個非 placeholder 的 `<p:pic>`（PNG/JPEG 的品牌 logo）
- **THEN** 輸出 HTML MUST 以 data URI 內嵌該圖片於對應百分比位置，且位於 slide 自身元素之下（z-order 在底）

#### Scenario: 多個角落 logo 只留一個
- **WHEN** 同一 master/layout 在角落有 2 個以上的小 logo（如投顧＋證券）
- **THEN** 輸出 MUST 僅保留文件順序最後一個小 logo，且滿版色條等大圖不受影響

#### Scenario: 不影響準確率
- **WHEN** 渲染 layout/master 的非 placeholder 圖片
- **THEN** 該圖片 MUST NOT 計入元素涵蓋率／圖片擷取率（避免準確率失真或破百）
