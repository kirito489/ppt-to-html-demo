# ppt-ingestion Specification

## Purpose
TBD - created by archiving change ppt-to-html-demo. Update Purpose after archive.
## Requirements
### Requirement: 來源儲存抽象
系統 SHALL 以 `SourceStoragePort`（列出、讀取、刪除來源檔）抽象來源儲存；demo 提供本地資料夾 adapter 掃描設定目錄下的 `.pptx`，未來可替換為真實 SFTP adapter 而不更動上層流程。

#### Scenario: 列出來源簡報
- **WHEN** 設定的來源資料夾內有數個 `.pptx`
- **THEN** `SourceStoragePort.list()` MUST 回傳所有 `.pptx` 來源檔（忽略非簡報檔）

#### Scenario: 抽象可替換
- **WHEN** 未來改接真實 SFTP
- **THEN** 系統 MUST 僅需新增實作 `SourceStoragePort` 的 adapter，攝取流程與轉換不需修改

### Requirement: 排程定時攝取
系統 SHALL 以排程（cron，可由環境變數設定）定時觸發攝取流程，自動掃描來源並轉換。

#### Scenario: 排程自動執行
- **WHEN** 到達設定的 cron 時點
- **THEN** 系統 MUST 自動列出來源、逐檔轉換並持久化結果，無需人工操作

### Requirement: 攝取編排與來源清除
系統 SHALL 對每個來源檔執行「轉換 → 持久化為文章 → 依策略清除來源」；清除策略可設定為搬移至 processed 或真實刪除；轉換失敗的來源檔不清除。

#### Scenario: 成功轉換後清除來源
- **WHEN** 某個 `.pptx` 成功轉換並存檔
- **THEN** 系統 MUST 依設定策略將來源檔搬移或刪除，使其不會被重複處理

#### Scenario: 失敗來源保留
- **WHEN** 某個 `.pptx` 轉換失敗
- **THEN** 系統 MUST 保留該來源檔且不清除，並記錄失敗原因

### Requirement: 轉換紀錄
系統 SHALL 為每次攝取批次建立轉換紀錄，包含觸發方式、起迄時間、掃描/成功/失敗檔數與明細。

#### Scenario: 記錄批次結果
- **WHEN** 一次攝取批次完成
- **THEN** 系統 MUST 建立一筆轉換紀錄，記載 `trigger`（scheduled/manual）、掃描數、成功數、失敗數與每檔明細

### Requirement: 手動觸發攝取 API
系統 SHALL 提供需登入保護的手動觸發端點，立即執行一次攝取，方便 demo。

#### Scenario: 手動觸發立即執行
- **WHEN** 已登入使用者呼叫手動觸發端點
- **THEN** 系統 MUST 立即執行一次掃描與轉換，並回傳本批次結果摘要

### Requirement: 轉換後文章查詢 API
系統 SHALL 提供需登入保護的 API 查詢轉換後文章列表（分頁）與單篇詳情（含 HTML、準確率、來源元素對照資料）。

#### Scenario: 取得文章列表
- **WHEN** 已登入使用者查詢文章列表
- **THEN** 系統 MUST 回傳分頁的文章清單，含標題、來源檔名、頁數、整體準確率與狀態

#### Scenario: 取得單篇詳情
- **WHEN** 已登入使用者查詢某篇文章
- **THEN** 系統 MUST 回傳該文章的 HTML、分類準確率（涵蓋率/文字/圖片）、每頁明細與來源元素對照資料

