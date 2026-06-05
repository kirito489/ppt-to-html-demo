## MODIFIED Requirements

### Requirement: 文章檢視不跑版預覽
前端 SHALL 在文章詳情頁以「翻頁式」單頁預覽渲染轉換後 HTML，一次呈現一頁、等比縮放且不跑版，忠實呈現原 PPT 版面；不再提供「捲動」整篇直排模式與「模擬寬度（手機／平板／桌機）」切換。

#### Scenario: 預覽不跑版
- **WHEN** 使用者開啟一篇含多頁、含圖片與表格的文章
- **THEN** 預覽 MUST 等比縮放呈現當前頁，視覺貼近原 PPT，且不破壞頁面其他區塊版面

#### Scenario: 不提供捲動與模擬寬度
- **WHEN** 使用者於詳情頁檢視預覽
- **THEN** 介面 MUST NOT 出現「捲動」模式切換與「模擬寬度（手機／平板／桌機）」按鈕

### Requirement: 簡報模式翻頁檢視
前端 SHALL 在文章詳情頁的預覽以翻頁方式呈現：一次顯示一頁（維持不跑版縮放），並提供上一頁/下一頁與頁碼，支援鍵盤 ←/→ 翻頁；翻頁為詳情頁預覽的唯一檢視方式，無需再切換模式。

#### Scenario: 翻頁
- **WHEN** 使用者於詳情頁按「下一頁」或鍵盤 →
- **THEN** 畫面 MUST 切換到下一張投影片，頁碼同步更新

#### Scenario: 邊界
- **WHEN** 已在最後一頁
- **THEN** 「下一頁」MUST 停用或不再前進（第一頁同理對「上一頁」）

### Requirement: 文章 HTML 匯出
前端 SHALL 在文章詳情頁提供「下載 HTML」動作，作用於該文章的轉換後 HTML；不再提供「複製 HTML」動作。

#### Scenario: 下載 HTML
- **WHEN** 使用者於詳情頁點「下載 HTML」
- **THEN** 前端 MUST 將該文章 HTML 以 `.html` 檔下載

#### Scenario: 不提供複製 HTML
- **WHEN** 使用者於詳情頁檢視匯出動作
- **THEN** 介面 MUST NOT 出現「複製 HTML」按鈕
