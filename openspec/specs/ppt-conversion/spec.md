# ppt-conversion Specification

## Purpose
TBD - created by archiving change ppt-to-html-demo. Update Purpose after archive.
## Requirements
### Requirement: 解析 .pptx 結構
系統 SHALL 以純 JS（zip + XML 解析、無外部服務、無 LLM API）讀取 `.pptx`，取得投影片尺寸（EMU）、投影片順序，以及每頁的形狀（文字框、圖片、表格）及其位置與尺寸。

#### Scenario: 讀取簡報尺寸與頁序
- **WHEN** 提供一個含多張投影片的 `.pptx`
- **THEN** 系統 MUST 從 `presentation.xml` 取得投影片畫布寬高與正確的頁面順序，並逐頁建立可轉換的中介結構

#### Scenario: 取得形狀位置與尺寸
- **WHEN** 投影片內含具 `<a:xfrm>` 的形狀
- **THEN** 系統 MUST 解析其 `off`(x,y) 與 `ext`(cx,cy)，並換算為相對投影片畫布的百分比座標

### Requirement: 輸出不跑版的忠實 HTML
系統 SHALL 將每張投影片輸出為自包含區塊：外層鎖定長寬比且寬 100%，內部元素以百分比絕對定位、字級用容器寬度單位（`cqw`），不依賴 CSS transform，確保塞入頁面或編輯器時整塊等比縮放且不影響其他內容。

#### Scenario: 單頁輸出為長寬比鎖定容器
- **WHEN** 轉換一張投影片
- **THEN** 輸出 MUST 包含一個 `width:100%` 且 `aspect-ratio` 等於投影片比例的容器，內部元素以百分比 `left/top/width/height` 定位

#### Scenario: 多頁不互相擠壓
- **WHEN** 簡報有多張投影片
- **THEN** 每頁 MUST 輸出為獨立區塊垂直堆疊，縮放任一頁不會破壞其他頁或頁面版面

#### Scenario: 文字隨容器縮放且位置穩定
- **WHEN** 容器寬度改變
- **THEN** 文字字級 MUST 以 `cqw` 隨容器等比縮放，且文字方塊維持原相對位置（不跑版）

### Requirement: 文字內容與樣式還原
系統 SHALL 還原文字框內的段落與文字 run，包含文字內容與常見樣式（粗體、斜體、底線、字級、顏色），並 SHALL 設定字型堆疊（優先使用來源字型如微軟正黑體，fallback 至 Microsoft JhengHei、Noto Sans TC 等）與行距（`<a:lnSpc>`），降低瀏覽器替代字型與原字型行高差異造成文字溢出原框的情形，確保文字內容準確且不被相鄰元素覆蓋。

#### Scenario: 還原段落與文字
- **WHEN** 文字框含多個 `<a:p>` 段落與 `<a:r>/<a:t>` run
- **THEN** 輸出 HTML MUST 完整包含所有文字內容，且段落結構與原稿一致

#### Scenario: 套用文字樣式
- **WHEN** run 帶有 `<a:rPr>` 樣式（如 `b="1"`、`sz`、`<a:srgbClr>`）
- **THEN** 對應 HTML MUST 反映粗體/字級/顏色等樣式

#### Scenario: 設定字型與行距以抑制溢出
- **WHEN** 文字框含中文段落（來源字型如微軟正黑體，且段落帶 `<a:lnSpc>` 行距）
- **THEN** 輸出 HTML 的文字框 MUST 設定對應字型堆疊與行距，使渲染高度貼近原框、不溢出至下方元素

### Requirement: 圖片擷取與內嵌
系統 SHALL 透過投影片關係檔解析圖片，並以 base64 data URI 內嵌進輸出 HTML，使文章自包含；無法解析或不支援格式時輸出占位框並計為擷取失敗。

#### Scenario: 內嵌可支援的點陣圖片
- **WHEN** 投影片含 `<p:pic>` 且其關係指向 `ppt/media` 內的 png/jpeg
- **THEN** 輸出 HTML MUST 以 data URI 內嵌該圖片於對應百分比位置

#### Scenario: 不支援格式輸出占位
- **WHEN** 圖片為不支援格式（如 EMF/WMF）或關係無法解析
- **THEN** 系統 MUST 輸出占位框，並將該圖片計入「圖片擷取失敗」

### Requirement: 表格還原
系統 SHALL 將 `<p:graphicFrame>` 內的 `<a:tbl>` 還原為 HTML 表格，保留列、欄與儲存格文字，並 SHALL 依來源 `<a:tblGrid>/<a:gridCol>` 欄寬、`<a:tr>` 列高與儲存格 run 的字級/顏色/粗體渲染，使表格內容貼近原框尺寸、不因字級寫死而超出框被裁切。

#### Scenario: 還原表格內容
- **WHEN** 投影片含表格
- **THEN** 輸出 MUST 為對應列數/欄數的 `<table>`，每個儲存格文字與原稿一致

#### Scenario: 套用表格尺寸與儲存格樣式
- **WHEN** 表格定義了 `<a:gridCol>` 欄寬、`<a:tr h>` 列高，且儲存格 run 帶字級/顏色/粗體
- **THEN** 輸出表格 MUST 反映欄寬比例、列高與儲存格字級/顏色/粗體，且內容不溢出表格配置框

### Requirement: 準確率計算
系統 SHALL 於轉換時逐元素統計並輸出每頁與全篇的準確率：元素涵蓋率、文字還原正確率、圖片擷取成功率，以及三者加權的整體準確率。

#### Scenario: 輸出分類準確率
- **WHEN** 一個 `.pptx` 轉換完成
- **THEN** 結果 MUST 包含整體準確率與三項分類數據（涵蓋率、文字、圖片），並可取得每頁明細

#### Scenario: 未支援元素計入未還原
- **WHEN** 投影片含未支援元素（chart、SmartArt、群組過深或未知 graphicData）
- **THEN** 該元素 MUST 計為「未還原」並使元素涵蓋率對應下降，且於中介結構標記其型別

### Requirement: 單檔轉換容錯
系統 SHALL 對單一檔案的轉換錯誤進行隔離，標記為失敗並記錄原因，不影響其他檔案。

#### Scenario: 損壞檔不中斷流程
- **WHEN** 某個 `.pptx` 損壞或解析丟出例外
- **THEN** 系統 MUST 捕捉例外、將該檔標記為 `failed` 並記錄錯誤原因，繼續處理其餘檔案

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

### Requirement: 形狀堆疊順序還原
系統 SHALL 依 `.pptx` 投影片 `spTree` 內形狀的文件順序決定渲染上下層（z 順序），使後出現的形狀疊在先出現者之上，與 PowerPoint 一致；不得將同類形狀（文字框、圖片、表格）分群後改變彼此相對順序。

#### Scenario: 文字框疊在圖片之上
- **WHEN** 投影片文件順序為「圖片在前、文字框在後」（文字框本應在圖片上層）
- **THEN** 輸出 HTML 中該文字框 MUST 疊在圖片之上而非被圖片覆蓋

#### Scenario: 圖片疊在文字框之上
- **WHEN** 投影片文件順序為「文字框在前、圖片在後」（圖片本應在文字上層）
- **THEN** 輸出 HTML 中該圖片 MUST 疊在文字框之上

### Requirement: 文字繼承色與主題色還原
系統 SHALL 在文字 run 自身未指定顏色時，依序由 placeholder → slideLayout → slideMaster `txStyles` 解析繼承顏色；並 SHALL 支援 `<a:schemeClr>` 主題色，透過 `ppt/theme/theme*.xml` 的 `<a:clrScheme>` 對應為實際色碼。

#### Scenario: run 無自身顏色時繼承
- **WHEN** 文字 run 的 `<a:rPr>` 無 `<a:solidFill>`，但其 placeholder 型別於 master `txStyles` 定義了顏色
- **THEN** 輸出 HTML 該文字 MUST 套用繼承到的顏色，而非預設黑色

#### Scenario: 解析主題色
- **WHEN** 顏色以 `<a:schemeClr val="...">` 表示（如 `tx2`、`accent1`）
- **THEN** 系統 MUST 由主題色盤對應為實際 RGB 色碼並套用

### Requirement: 項目符號與編號還原
系統 SHALL 解析段落 `<a:pPr>` 的項目符號設定：`<a:buChar>`（含 Wingdings 常用符號對應，如 `n`＝■、`l`＝●、`u`＝◆）渲染為對應符號；`<a:buAutoNum>` 渲染為自動序號；`<a:buNone>` 不顯示符號。

#### Scenario: 還原符號項目
- **WHEN** 段落 `<a:pPr>` 含 `<a:buChar char="n"/>` 與 `<a:buFont typeface="Wingdings"/>`
- **THEN** 輸出 HTML 該段落前 MUST 顯示對應的 ■ 項目符號

#### Scenario: 還原自動編號
- **WHEN** 段落 `<a:pPr>` 含 `<a:buAutoNum type="arabicPeriod"/>`
- **THEN** 輸出 HTML 該清單各段落前 MUST 顯示遞增序號

