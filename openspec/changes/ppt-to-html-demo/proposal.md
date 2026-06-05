## Why

充電站後台原本支援用 HTML 編輯器上架文章（文字、圖片、表格），但部分員工習慣把文章做成 PPT 上傳到公槽（SFTP）。目前這些 PPT 無法進入後台流程，需要人工重打或重排版。主管希望由系統定時抓取公槽上的簡報、自動轉成可在編輯器顯示且**不跑版**的 HTML、並提供**準確率數據**佐證轉換品質；轉換完成後即刪除原始簡報。本 change 先以可展示的 demo 為目標：把這個現成 admin 模板精簡成只服務此功能的最小骨架，再實作 PPT→HTML 轉換流程。

## What Changes

- **新增 PPT→HTML 轉換引擎**：純 JS 解析 `.pptx`（無外部服務、無 LLM API），每張投影片輸出「鎖定長寬比的自縮放容器 + 絕對定位的真 HTML 文字/表格/圖片」，確保版面貼近原稿且塞進編輯器不跑版。
- **新增準確率計算**：以「還原元素涵蓋率」為主數字，並拆出**文字還原正確率**與**圖片擷取成功率**（文字內容與圖片本身都要準確），輸出每篇與每頁的分類數據。
- **新增排程攝取流程**：以 `@nestjs/schedule` 定時掃描來源儲存（demo 用本地資料夾模擬公槽，經 `SourceStoragePort` 抽象，未來換真 SFTP 只換 adapter）→ 轉換 → 存檔 → 刪除來源簡報。
- **新增後端 API**：轉換後文章列表、單篇 HTML、準確率、轉換紀錄、手動觸發轉換（demo 方便）。
- **新增前端頁面**：文章列表、文章檢視（不跑版自縮放預覽 + 準確率儀表 + 原頁 vs 轉換結果對照）、轉換紀錄/手動觸發。
- **BREAKING — 精簡模板**：移除與 demo 無關的後端模組與前端頁面：會員管理、角色與權限管理、安全管理（IP 白/黑名單、帳號鎖定）、firebase、s3、email、recaptcha、system-log、auth-log；對應的 domain/adapter/test/seeds/swagger 一併移除。保留精簡登入（login + JWT）、Prisma、health 基本檢查與 sidebar 外殼。
- **BREAKING — 移除既有能力規格**：`member-management`、`member-management-ui`、`member-role-options-api`、`role-management`、`role-management-ui`、`security-management`、`security-ui` 不再適用，於 archive 時移出。

## Capabilities

### New Capabilities
- `ppt-conversion`: 將單一 `.pptx` 解析並轉換為忠實版面、可在 HTML 編輯器顯示且不跑版的 HTML，並計算準確率（元素涵蓋率、文字還原正確率、圖片擷取成功率）。
- `ppt-ingestion`: 排程從來源儲存（`SourceStoragePort`，demo 為本地資料夾）攝取簡報、編排轉換、持久化為文章與轉換紀錄、刪除來源檔，並提供後端查詢與手動觸發 API。
- `converted-article-ui`: 後台前端的轉換文章列表、文章檢視（不跑版預覽 + 準確率儀表 + 原頁對照）、轉換紀錄與手動觸發頁面，含精簡登入與 sidebar 調整。

### Modified Capabilities
<!-- 模板精簡屬移除既有能力，於 archive 時處理，不需新增 delta spec。 -->

## Impact

- **新增相依**：`@nestjs/schedule`（排程）、`jszip` 或同級 zip 解析（拆 pptx）、xml 解析器（解析 OOXML drawingml）。前端新增不跑版預覽容器樣式。
- **資料庫**：新增 `ConvertedArticleRecord`、`ConversionJobRecord`；移除 RBAC/security 相關 model（`Role`、`Permission`、`RolePermission`、`AuthLogRecord`、`IpWhitelistRecord`、`IpBlacklistRecord`、`PasswordResetTokenRecord`），保留精簡登入所需 `MemberRecord`。需新增 migration。
- **後端模組**：移除 member/role/security/firebase/s3/email/recaptcha/system-log/auth-log 模組；新增 `ppt-conversion`、`ppt-ingestion`（含排程器、來源儲存 adapter、轉換 service、文章 repository、controller/facade）。
- **前端**：移除 members/roles/security 路由與 nav 項目；新增 articles 路由群組。
- **Swagger / api-client**：移除已刪 endpoint 的 yaml，新增文章相關 endpoint yaml，重新 bundle 並 regenerate 型別。
- **環境變數**：新增來源資料夾路徑、排程 cron、轉換後刪除策略（真刪 / 搬到 processed）等設定。
