## ADDED Requirements

### Requirement: Placeholder 座標自 Layout/Master 繼承
轉換時，對於帶有 placeholder 標記（`<p:ph>`）但**無自身 `<a:xfrm>`** 的形狀，系統 SHALL 依 `type`/`idx` 從 slideLayout 取得位置與大小，找不到時再 fallback 至 slideMaster；皆無才退回整頁預設。

#### Scenario: 標題與內文不再疊在一起
- **WHEN** 投影片的標題與內文為無自身座標的 placeholder（座標定義在 slideLayout）
- **THEN** 輸出 HTML MUST 使標題置於 layout 指定的上方區域、內文置於其指定的中間區域，兩者不重疊

#### Scenario: 無對應 placeholder 時 fallback
- **WHEN** 某 placeholder 在 layout 與 master 都找不到對應座標
- **THEN** 系統 MUST 退回原本的整頁預設定位，不致中斷轉換

### Requirement: 投影片背景還原
系統 SHALL 還原投影片背景：優先序 slide → layout → master 的 `<p:bg>`，支援純色（`solidFill` 的 `srgbClr`）與線性漸層（`gradFill` 首尾色），套用為該頁背景；無背景定義時才用白底。

#### Scenario: 還原純色背景
- **WHEN** 投影片（或其 layout/master）定義了 `solidFill` 背景色
- **THEN** 對應頁的容器背景 MUST 為該色，而非白色

### Requirement: 形狀與表格儲存格填色還原
系統 SHALL 將形狀的 `<a:solidFill>` 還原為該元素底色，將表格儲存格 `<a:tcPr>` 的 `solidFill` 還原為該 `td` 底色；`noFill` 視為透明。

#### Scenario: 還原色塊與表格底色
- **WHEN** 投影片含有帶 `solidFill` 的色塊或帶底色的表格儲存格
- **THEN** 輸出 HTML 對應元素/儲存格 MUST 呈現該填色

### Requirement: 段落對齊還原
系統 SHALL 將段落的 `<a:pPr>` 對齊（`l`/`ctr`/`r`/`just`）還原為對應的 `text-align`。

#### Scenario: 置中標題
- **WHEN** 段落對齊為置中（`algn="ctr"`）
- **THEN** 該段落輸出 MUST 為 `text-align:center`
