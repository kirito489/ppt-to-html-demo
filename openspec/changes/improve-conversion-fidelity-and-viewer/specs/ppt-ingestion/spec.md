## ADDED Requirements

### Requirement: 列出公槽待轉換來源檔
系統 SHALL 提供需登入保護的端點，列出公槽（來源儲存）中已上傳、尚未轉換的 `.pptx` 檔，供前端顯示「待轉換」清單。

#### Scenario: 列出待轉換檔
- **WHEN** 已登入使用者查詢待轉換清單，且公槽中有未處理的 `.pptx`
- **THEN** 系統 MUST 回傳這些來源檔的檔名清單

#### Scenario: 公槽為空
- **WHEN** 公槽中沒有待處理檔
- **THEN** 系統 MUST 回傳空清單

#### Scenario: 未登入
- **WHEN** 未登入即查詢待轉換清單
- **THEN** 系統 MUST 回 `401`
