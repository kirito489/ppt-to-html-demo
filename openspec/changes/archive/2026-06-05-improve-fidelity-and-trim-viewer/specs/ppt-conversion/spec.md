## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: 表格還原
系統 SHALL 將 `<p:graphicFrame>` 內的 `<a:tbl>` 還原為 HTML 表格，保留列、欄與儲存格文字，並 SHALL 依來源 `<a:tblGrid>/<a:gridCol>` 欄寬、`<a:tr>` 列高與儲存格 run 的字級/顏色/粗體渲染，使表格內容貼近原框尺寸、不因字級寫死而超出框被裁切。

#### Scenario: 還原表格內容
- **WHEN** 投影片含表格
- **THEN** 輸出 MUST 為對應列數/欄數的 `<table>`，每個儲存格文字與原稿一致

#### Scenario: 套用表格尺寸與儲存格樣式
- **WHEN** 表格定義了 `<a:gridCol>` 欄寬、`<a:tr h>` 列高，且儲存格 run 帶字級/顏色/粗體
- **THEN** 輸出表格 MUST 反映欄寬比例、列高與儲存格字級/顏色/粗體，且內容不溢出表格配置框
