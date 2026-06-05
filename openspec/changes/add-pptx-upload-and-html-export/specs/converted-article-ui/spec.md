## ADDED Requirements

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
