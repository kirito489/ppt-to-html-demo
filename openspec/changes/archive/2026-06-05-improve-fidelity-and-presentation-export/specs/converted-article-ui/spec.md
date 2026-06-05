## MODIFIED Requirements

### Requirement: 待轉換清單顯示
前端 SHALL 在文章列表頁顯示公槽中「待轉換」的來源檔（檔名與數量）；觸發轉換沿用頁面右上既有的「立即抓取轉換」按鈕，待轉換區塊本身不得再放重覆的觸發按鈕。

#### Scenario: 顯示待轉換
- **WHEN** 公槽有已上傳、未轉換的 `.pptx`
- **THEN** 列表頁 MUST 顯示待轉換檔名清單與數量

#### Scenario: 不重覆按鈕
- **WHEN** 顯示待轉換區塊
- **THEN** 該區塊 MUST NOT 內含「立即抓取轉換」按鈕（觸發以頁面右上既有按鈕為唯一入口）

#### Scenario: 無待轉換
- **WHEN** 公槽沒有待轉換檔
- **THEN** 列表頁 MUST 不顯示待轉換區塊（或顯示為 0/空）

## ADDED Requirements

### Requirement: 下載簡報 HTML
前端 SHALL 在文章詳情頁提供「下載簡報 HTML」，產生自包含、可在瀏覽器像 PPT 一頁頁翻的獨立 HTML 檔；既有「下載 HTML」（內嵌版）維持不變。

#### Scenario: 下載簡報檔
- **WHEN** 使用者於詳情頁點「下載簡報 HTML」
- **THEN** 前端 MUST 以 `.html` 檔下載一個自包含檔，內含該文章各投影片頁與翻頁控制

#### Scenario: 瀏覽器翻頁
- **WHEN** 使用者以瀏覽器開啟下載的簡報 HTML 並按 → 或點擊
- **THEN** 畫面 MUST 切換到下一頁、更新頁碼，且維持不跑版（一次顯示一頁）

#### Scenario: 內嵌版不受影響
- **WHEN** 產生簡報 HTML
- **THEN** 文章原本的內嵌版 `article.html` MUST 維持不變（不混入翻頁用 JS/CSS）
