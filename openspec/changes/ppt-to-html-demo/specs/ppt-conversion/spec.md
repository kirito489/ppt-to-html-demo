## ADDED Requirements

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
系統 SHALL 還原文字框內的段落與文字 run，包含文字內容與常見樣式（粗體、斜體、底線、字級、顏色），確保文字內容準確。

#### Scenario: 還原段落與文字
- **WHEN** 文字框含多個 `<a:p>` 段落與 `<a:r>/<a:t>` run
- **THEN** 輸出 HTML MUST 完整包含所有文字內容，且段落結構與原稿一致

#### Scenario: 套用文字樣式
- **WHEN** run 帶有 `<a:rPr>` 樣式（如 `b="1"`、`sz`、`<a:srgbClr>`）
- **THEN** 對應 HTML MUST 反映粗體/字級/顏色等樣式

### Requirement: 圖片擷取與內嵌
系統 SHALL 透過投影片關係檔解析圖片，並以 base64 data URI 內嵌進輸出 HTML，使文章自包含；無法解析或不支援格式時輸出占位框並計為擷取失敗。

#### Scenario: 內嵌可支援的點陣圖片
- **WHEN** 投影片含 `<p:pic>` 且其關係指向 `ppt/media` 內的 png/jpeg
- **THEN** 輸出 HTML MUST 以 data URI 內嵌該圖片於對應百分比位置

#### Scenario: 不支援格式輸出占位
- **WHEN** 圖片為不支援格式（如 EMF/WMF）或關係無法解析
- **THEN** 系統 MUST 輸出占位框，並將該圖片計入「圖片擷取失敗」

### Requirement: 表格還原
系統 SHALL 將 `<p:graphicFrame>` 內的 `<a:tbl>` 還原為 HTML 表格，保留列、欄與儲存格文字。

#### Scenario: 還原表格內容
- **WHEN** 投影片含表格
- **THEN** 輸出 MUST 為對應列數/欄數的 `<table>`，每個儲存格文字與原稿一致

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
