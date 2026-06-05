## ADDED Requirements

### Requirement: 上傳單一 PPT 至公槽
系統 SHALL 提供需登入保護的 multipart 上傳端點，接收單一 `.pptx` 並將其存入公槽（來源儲存），回傳存入的檔名；**不在此時轉換**——轉換沿用既有排程或手動觸發攝取。同名檔自動去重，不覆蓋既有來源。

#### Scenario: 上傳有效 .pptx
- **WHEN** 已登入使用者以 multipart 上傳一個有效的 `.pptx`
- **THEN** 系統 MUST 將檔案存入來源儲存並回傳存入檔名（之後可由排程或手動觸發轉換）

#### Scenario: 非 pptx 或過大
- **WHEN** 上傳非 `.pptx` 檔或超過大小上限
- **THEN** 系統 MUST 回 `400`，不存入

#### Scenario: 同名檔不覆蓋
- **WHEN** 上傳的檔名與來源中既有檔案相同
- **THEN** 系統 MUST 以去重後的檔名存入，不覆蓋既有來源檔

#### Scenario: 未登入
- **WHEN** 未登入即呼叫上傳端點
- **THEN** 系統 MUST 回 `401`
