## ADDED Requirements

### Requirement: 圖片填滿形狀框
系統 SHALL 將內嵌圖片延展填滿其形狀框（`object-fit:fill`），比照 PowerPoint `blipFill` 預設行為，使圖片大小與原稿一致，而非在框內留白縮小。

#### Scenario: 圖片撐滿框
- **WHEN** 投影片含 `<p:pic>` 且成功內嵌為 data URI
- **THEN** 對應 `<img>` 樣式 MUST 為填滿形狀框（`object-fit:fill`、寬高各 100%），不得在框內留白

### Requirement: Layout/Master 非 placeholder 文字渲染
系統 SHALL 渲染 slideLayout（必要時 slideMaster）spTree 中「具 `<p:txBody>` 且無 `<p:ph>`」的文字框（如頁尾、免責聲明），並置於 slide 內容之下，補回僅存在於版面/母片上的裝飾文字。

#### Scenario: 補回 layout 上的聲明文字
- **WHEN** slide 自身無該文字、但其 slideLayout 有一個非 placeholder 的文字框（如「本資料僅供參考…」）
- **THEN** 輸出 HTML MUST 包含該文字，且位於 slide 自身元素之前（z-order 在底）

#### Scenario: 不重覆 slide 既有內容
- **WHEN** slide 自身已含某文字框
- **THEN** 系統 MUST 以 slide 自身內容為準，不因 layout/master 而重覆輸出同一文字

### Requirement: 無字級文字自 Layout/Master 繼承字級
系統 SHALL 在文字 run 無自身 `sz` 時，依形狀 placeholder 型別（title/body/other）與段落 `lvl`，自 master `<p:txStyles>`（必要時 layout 或 placeholder 的 `lstStyle`）繼承字級；皆無對應時才退回預設字級。

#### Scenario: 繼承 body 字級
- **WHEN** body placeholder 內某 run 無 `sz`，且 master `bodyStyle` 對應層級的 `defRPr` 設有字級
- **THEN** 該文字 MUST 套用繼承到的字級，而非預設 18pt

#### Scenario: 無繼承來源時退預設
- **WHEN** run 無 `sz` 且 layout/master 皆無對應 `defRPr@sz`
- **THEN** 該文字 MUST 退回預設字級（18pt）
