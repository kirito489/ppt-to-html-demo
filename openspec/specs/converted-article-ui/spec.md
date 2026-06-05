# converted-article-ui Specification

## Purpose
TBD - created by archiving change ppt-to-html-demo. Update Purpose after archive.
## Requirements
### Requirement: 精簡登入與路由保護
前端 SHALL 保留精簡登入頁與路由保護；未登入者存取受保護頁面 MUST 導向登入頁。

#### Scenario: 未登入被導向登入
- **WHEN** 未登入使用者直接造訪文章頁
- **THEN** 系統 MUST 將其導向 `/login`

#### Scenario: 登入後進入文章功能
- **WHEN** 使用者以管理員帳號登入成功
- **THEN** 系統 MUST 導向後台並顯示文章相關導覽

### Requirement: 導覽精簡為文章功能
前端 SHALL 將 sidebar 導覽改為文章相關項目（文章列表、轉換紀錄），移除會員/角色/安全等已精簡的項目。

#### Scenario: 導覽只顯示文章功能
- **WHEN** 已登入使用者檢視 sidebar
- **THEN** 導覽 MUST 只包含文章功能項目，不出現會員/角色/安全項目

### Requirement: 文章列表頁
前端 SHALL 提供轉換後文章列表頁，顯示標題、來源檔名、頁數、整體準確率與狀態，並可進入單篇檢視。

#### Scenario: 顯示文章清單
- **WHEN** 已登入使用者開啟文章列表
- **THEN** 頁面 MUST 以列表呈現各文章的標題、來源檔名、頁數、整體準確率與狀態

### Requirement: 文章檢視不跑版預覽
前端 SHALL 在文章檢視頁渲染轉換後 HTML，於響應式容器中等比縮放且不跑版，忠實呈現原 PPT 版面。

#### Scenario: 預覽不跑版
- **WHEN** 使用者開啟一篇含多頁、含圖片與表格的文章
- **THEN** 預覽 MUST 等比縮放呈現每頁，視覺貼近原 PPT，且不破壞頁面其他區塊版面

### Requirement: 準確率儀表
前端 SHALL 在文章檢視頁以儀表呈現整體準確率與分類數據（元素涵蓋率、文字還原正確率、圖片擷取成功率），並可檢視每頁明細。

#### Scenario: 呈現分類準確率
- **WHEN** 使用者檢視某篇文章
- **THEN** 頁面 MUST 顯示整體準確率與三項分類數據，並可展開每頁明細

### Requirement: 來源元素對照面板
前端 SHALL 提供「轉換結果」與「來源元素清單」並排對照：清單逐條列出每頁擷取到的文字、圖片縮圖與表格，並標記未還原元素，供審查者核對文字與圖片是否準確。

#### Scenario: 並排核對文字與圖片
- **WHEN** 使用者開啟對照面板
- **THEN** 面板 MUST 並排顯示轉換後 HTML 與來源元素清單，且明確標記哪些元素未還原

### Requirement: 手動觸發與轉換紀錄
前端 SHALL 提供手動觸發攝取的操作，並提供轉換紀錄頁顯示各批次的觸發方式、起迄時間與成功/失敗檔數。

#### Scenario: 手動觸發攝取
- **WHEN** 已登入使用者按下「立即抓取轉換」
- **THEN** 系統 MUST 觸發一次攝取並於完成後更新文章列表與轉換紀錄

#### Scenario: 檢視轉換紀錄
- **WHEN** 使用者開啟轉換紀錄頁
- **THEN** 頁面 MUST 列出各批次的觸發方式、時間與掃描/成功/失敗檔數

### Requirement: 前端上傳 PPT
前端 SHALL 在文章列表頁提供「上傳 PPT」操作，讓使用者選取單一 `.pptx` 上傳至公槽（不立即轉換），並提示後續以「立即抓取轉換」或排程進行轉換。

#### Scenario: 選檔上傳成功
- **WHEN** 已登入使用者選取一個 `.pptx` 上傳成功
- **THEN** 前端 MUST 顯示成功提示（含「請按『立即抓取轉換』或等排程」的引導）

#### Scenario: 上傳失敗
- **WHEN** 上傳的檔案無效（非 .pptx / 過大）
- **THEN** 前端 MUST 顯示錯誤訊息

### Requirement: 文章 HTML 匯出
前端 SHALL 在文章詳情頁提供「下載 HTML」與「複製 HTML」兩個動作，作用於該文章的轉換後 HTML。

#### Scenario: 下載 HTML
- **WHEN** 使用者於詳情頁點「下載 HTML」
- **THEN** 前端 MUST 將該文章 HTML 以 `.html` 檔下載

#### Scenario: 複製 HTML
- **WHEN** 使用者於詳情頁點「複製 HTML」
- **THEN** 前端 MUST 將該文章 HTML 複製到剪貼簿並顯示提示

### Requirement: 簡報模式翻頁檢視
前端 SHALL 在文章詳情頁提供「簡報模式」，一次顯示一頁（維持不跑版縮放），並提供上一頁/下一頁與頁碼，支援鍵盤 ←/→ 翻頁。

#### Scenario: 翻頁
- **WHEN** 使用者於詳情頁開啟簡報模式並按「下一頁」或鍵盤 →
- **THEN** 畫面 MUST 切換到下一張投影片，頁碼同步更新

#### Scenario: 邊界
- **WHEN** 已在最後一頁
- **THEN** 「下一頁」MUST 停用或不再前進（第一頁同理對「上一頁」）

### Requirement: 待轉換清單顯示
前端 SHALL 在文章列表頁顯示公槽中「待轉換」的來源檔（檔名與數量），並提示以「立即抓取轉換」處理。

#### Scenario: 顯示待轉換
- **WHEN** 公槽有已上傳、未轉換的 `.pptx`
- **THEN** 列表頁 MUST 顯示待轉換檔名清單與數量

#### Scenario: 無待轉換
- **WHEN** 公槽沒有待轉換檔
- **THEN** 列表頁 MUST 不顯示待轉換區塊（或顯示為 0/空）

### Requirement: 個人資料顯示名稱
前端 SHALL 在個人資料顯示登入者名稱，且不再顯示已移除的「角色」欄位。

#### Scenario: 顯示名稱
- **WHEN** 已登入使用者檢視個人資料
- **THEN** 畫面 MUST 顯示其名稱與 Email，且不含「角色」列

