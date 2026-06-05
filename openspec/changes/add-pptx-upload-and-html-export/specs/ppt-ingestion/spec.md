## ADDED Requirements

### Requirement: 上傳單一 PPT 立即轉換
系統 SHALL 提供需登入保護的 multipart 上傳端點，接收單一 `.pptx`，以記憶體緩衝直接呼叫轉換引擎、持久化為文章並回傳該文章；不經過公槽資料夾，也不建立攝取批次紀錄。

#### Scenario: 上傳有效 .pptx
- **WHEN** 已登入使用者以 multipart 上傳一個有效的 `.pptx`
- **THEN** 系統 MUST 轉換並存成一篇文章，回傳該文章完整內容（含 HTML、準確率、來源元素清單）

#### Scenario: 非 pptx 或過大
- **WHEN** 上傳非 `.pptx` 檔或超過大小上限
- **THEN** 系統 MUST 回 `400`，不進行轉換

#### Scenario: 損壞的 pptx
- **WHEN** 上傳的檔案無法解析為簡報
- **THEN** 系統 MUST 回 `422`（`PPT_PARSE_ERROR`）

#### Scenario: 未登入
- **WHEN** 未登入即呼叫上傳端點
- **THEN** 系統 MUST 回 `401`
