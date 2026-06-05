## Context

本專案是一個完整的 NestJS（六角架構）+ React admin 模板，內建認證、會員/角色/權限、安全管理（IP 名單、帳號鎖定）、firebase/s3/email/recaptcha、system-log 等。需求是把它精簡為只服務「PPT→HTML 轉換」的 demo：員工把文章做成 `.pptx` 放公槽（SFTP），系統定時抓取、轉成可在 HTML 編輯器顯示且**不跑版**的 HTML、給出**準確率數據**（含文字與圖片是否準確），轉完刪除來源簡報。

關鍵約束（來自需求方）：
- **不跑版是第一優先**：轉出的 HTML 放進編輯器/頁面不能把版面擠爆。
- **準確率＝畫面與 PPT 差異不大**，且**文字與圖片內容本身也要準確**。
- **不綁 LLM API**：客戶不一定接受 Claude API → 轉換引擎必須離線、純 JS。
- **SFTP 用本地資料夾模擬**、**保留精簡登入**。
- 先求可展示（demo），不追求支援所有 PPT 進階效果。

## Goals / Non-Goals

**Goals:**
- 純 JS 解析 `.pptx`（無外部服務、無 LLM），輸出忠實版面、響應式且不跑版的 HTML。
- 每篇與每頁產出準確率：元素涵蓋率、文字還原正確率、圖片擷取成功率。
- `@nestjs/schedule` 排程掃描來源資料夾 → 轉換 → 持久化 → 刪除來源；提供手動觸發 API。
- 來源儲存以 `SourceStoragePort` 抽象，本地資料夾為 demo adapter，未來可換真 SFTP。
- 前端：文章列表、文章檢視（不跑版預覽 + 準確率儀表 + 來源元素對照）、轉換紀錄/手動觸發、精簡登入。
- 精簡模板：移除與 demo 無關之模組、頁面、資料表、相依。

**Non-Goals:**
- 不支援動畫、轉場、影片/音訊、圖表（chart）、SmartArt 的完整還原（計入「未還原」並反映在準確率）。
- 不做像素級 SSIM 視覺相似度（已選輕量方案）。
- 不接真實 SFTP 伺服器（僅保留抽象，adapter 之後替換）。
- 不做轉換後文章的線上再編輯器（顯示/預覽即可；CMS 內編輯屬後續）。
- 不保留會員/角色/權限/安全等被精簡掉的功能。

## Decisions

### D1. 轉換引擎：純 JS 解析 OOXML（方案 2 忠實 HTML）
`.pptx` 為 OOXML zip。用 `jszip` 解壓 + `fast-xml-parser` 解析 XML（皆純 JS、無 native build）。
- `ppt/presentation.xml` 讀投影片尺寸 `<p:sldSz cx cy>`（EMU）與順序 `<p:sldIdLst>`。
- 每頁 `ppt/slides/slideN.xml` 走訪形狀：`<p:sp>`（文字框）、`<p:pic>`（圖片）、`<p:graphicFrame>`（表格 `<a:tbl>`）。位置/尺寸取 `<a:xfrm><a:off x y/><a:ext cx cy/>`（EMU）。
- 文字：`<a:p>`→段落、`<a:r>/<a:t>`→文字 run，run 樣式 `<a:rPr>`（`sz` 百分點、`b/i/u`、`<a:solidFill><a:srgbClr val>`）。
- 圖片：經 `slideN.xml.rels` 解析 `r:embed` → `ppt/media/imageN.*`，以 **base64 data URI 內嵌**進 HTML（自包含、不需靜態檔服務、最不易壞）。
- EMU→相對單位：px = EMU/9525（96dpi），但輸出採**百分比定位**（見 D2），故換算為相對投影片寬高的百分比。

替代方案與否決理由：LibreOffice 直接轉 HTML（產出髒、絕對定位、易跑版）；影像化（不可編輯、偏離 HTML 文章）；LLM（客戶有 API 疑慮、不確定性、重排不貼近版面）。

### D2. 不跑版技巧：長寬比鎖定 + 百分比定位 + 容器查詢字級
每頁輸出一個自包含區塊：
```html
<div class="ppt-slide" style="position:relative; width:100%; aspect-ratio:<W>/<H>; container-type:inline-size; overflow:hidden;">
  <div style="position:absolute; left:L%; top:T%; width:Wp%; height:Hp%; font-size:<n>cqw; ...">…</div>
</div>
```
- 外層 `width:100%` + `aspect-ratio` → 整塊等比縮放，永遠不擠壓頁面其他內容。
- 內部元素一律 `position:absolute` + **百分比** left/top/width/height（相對投影片畫布）→ 解析度無關、天生響應式、**不需 CSS transform**（transform/絕對 px 較易被富文本編輯器清掉）。
- 字級用 `cqw`（容器寬度單位，1cqw=容器寬 1%）→ 文字隨投影片寬縮放、位置穩定。
- 多頁 = 多個 `.ppt-slide` 垂直堆疊，彼此獨立。

這直接滿足「貼近 PPT 版面」又「不跑版」。替代（transform: scale + 固定 px 畫布）易被編輯器 sanitize，否決。

### D3. 準確率：元素涵蓋率 + 文字還原正確率 + 圖片擷取成功率
轉換時逐元素統計（每頁 + 全篇彙總），存進文章紀錄：
- **元素涵蓋率** = 成功輸出的可還原元素數 ÷ 來源可辨識元素總數。未支援型別（chart/SmartArt/group 過深/未知 graphicData）計為「未還原」。
- **文字還原正確率** = 成功輸出的 `<a:t>` 文字字元數 ÷ 來源所有 `<a:t>` 字元數（落在未支援容器內、無法擷取的文字計為缺漏）。
- **圖片擷取成功率** = 成功內嵌的圖片數 ÷ `<p:pic>` 總數（無法解析關係、或不支援格式如 EMF/WMF 計為失敗，輸出占位框）。
- 整體準確率＝三者加權（預設文字 0.5 / 圖片 0.3 / 涵蓋 0.2，權重可調），前端以儀表呈現並附分類明細。

### D4. 對照（驗證文字/圖片準確）：來源元素清單 vs 轉換結果
為證明「文字、圖片也準確」且不需任何外部 binary：前端文章檢視採並排——
- 左：**轉換後 HTML 預覽**（即實際會顯示的不跑版結果）。
- 右：**來源元素清單**（每頁逐條列出擷取到的文字行、圖片縮圖、表格），並標記哪些元素「未還原」。
審查者可逐條核對文字與圖片是否都在、是否正確。此清單由轉換時產生的中介結構直接提供，純 JS、永遠可用。

（決策）對照採**純清單對照**，不引入 LibreOffice 原頁快照，維持零外部 binary。

### D5. 來源攝取與排程
- `SourceStoragePort`：`list(): SourceFile[]` / `read(path): Buffer` / `remove(path): void`。demo adapter＝`LocalFolderSourceAdapter`，掃描 `INGEST_SOURCE_DIR`（預設 `apps/api/storage/incoming`）下 `.pptx`。
- `@nestjs/schedule` `@Cron`（`INGEST_CRON`，預設每分鐘）觸發 `IngestPptUseCase`：list → 逐檔 read → 轉換 → 存 `ConvertedArticle` + 累積 `ConversionJob` → 依策略刪來源。
- 刪除策略 `INGEST_AFTER_CONVERT`：`move`（搬到 `storage/processed`，demo 預設、安全）/ `delete`（真刪，對齊正式需求）。
- 手動觸發 `POST /api/articles/ingest`（demo 方便，立即跑一次掃描）。

### D6. 持久化
新增 Prisma model：
- `ConvertedArticleRecord`：`id, title, sourceFilename, html(LongText), inventory(Json 中介結構供對照), slideCount, accuracyOverall, accuracyText, accuracyImage, accuracyCoverage, status('success'|'partial'|'failed'), createdAt`。
- `ConversionJobRecord`：`id, trigger('scheduled'|'manual'), startedAt, finishedAt, filesScanned, filesConverted, filesFailed, detail(Json), createdAt`。
圖片 data URI 直接內嵌於 `html`，故文章自包含。

### D7. 模板精簡範圍（依需求方確認修正：保留 Redis 與核心基礎建設）
- **後端移除**：role（RBAC 角色權限）、member CRUD、security（IP 名單/帳號鎖定/解鎖）模組；`PermissionsGuard`/`RolesGuard`/`IpBlacklistGuard`/`IpWhitelistGuard`、`permissions.decorator`/`roles.decorator`；firebase、s3、email(nodemailer)、recaptcha、password-reset/forgot、password-policy；對應 domain/exception/port/adapter/service/seeds/swagger/test。
- **後端保留**：Redis（throttler 速率限制、token 黑名單、member-context 快取、session activity）、FeatureFlag、auth（login/refresh/logout）+ `JwtAuthGuard` + `SessionIdleGuard` + `GET /me`、AuthLog（auth_logs）、SystemLog（system_logs + LoggingInterceptor）、Prisma、health、pino、`GlobalExceptionFilter`、`TransformInterceptor`、`ZodValidationPipe`、pagination、date 工具、單一管理員 seed。
- **`LoginService` 精簡**：移除帳號鎖定 / IP 封鎖 / reCAPTCHA 相依（隨 security、recaptcha 模組移除），保留載入會員、bcrypt 驗證、status 檢查、雙 Token 簽發、AuthLog、session activity。
- **`MemberContext` / 會員載入**：移除角色關聯後，`roleName`/`roleCode` 以常數填入（如「管理員」/`ADMIN`）、`permissions` 為空陣列；`JwtAuthGuard` 維持不動。
- **資料表移除**：`Role`/`Permission`/`RolePermission`/`IpWhitelistRecord`/`IpBlacklistRecord`/`PasswordResetTokenRecord`/`AttachmentRecord`；保留 `SystemLogRecord`、`AuthLogRecord`、`SeedHistoryRecord`；精簡 `MemberRecord`（移除 `roleId`/role 關聯、`failedLoginCount`、`lockedAt`）。
- **前端移除**：members/roles/security 路由、components、hooks 與 nav 項目。
- **前端保留/新增**：login、`RequireAuth`、`_layout` sidebar（改為文章導覽）、新增 articles 路由群組。
- **api-client/Swagger**：移除已刪 endpoint yaml，新增 articles endpoint，重新 bundle + regenerate。

### D8. 新增相依
- 後端：`@nestjs/schedule`、`jszip`、`fast-xml-parser`。（可選增強：`pdfjs-dist`，搭配系統 LibreOffice。）
- 前端：無新套件（用既有 shadcn + Tailwind 實作儀表與對照面板）。

## Risks / Trade-offs

- [進階效果還原有限：chart/SmartArt/漸層/群組/文字藝術字] → 計入「未還原」反映於準確率；對照面板明確標示哪些未還原，不誤導主管。
- [絕對定位 HTML 在第三方富文本編輯器可能被 sanitize 而跑版] → 採百分比定位 + `cqw` + 不用 transform，最大化相容；demo 用我們可控的預覽容器；正式整合前需用目標編輯器實測（列入 Open Questions）。
- [`container-type`/`aspect-ratio`/`cqw` 為較新 CSS] → 現代瀏覽器（demo 目標）皆支援；舊版瀏覽器降級為固定比例 padding-top hack（次要）。
- [來源檔含惡意/壞檔導致解析失敗] → 單檔轉換包 try/catch，標記 `failed` 並寫入 job detail，不阻斷整批；損壞檔不刪除（保留供查）。
- [精簡時誤刪相依造成編譯/啟動失敗] → 移除採「由葉往根」順序，每步 `pnpm typecheck` 驗證；移除模組同步移除 `app.module` 註冊與 seeds/swagger。
- [移除 Redis 影響既有 throttler/blacklist] → 改記憶體 throttler、移除 blacklist 與 context 快取，登入路徑回歸 DB；以 e2e 驗證登入仍正常。

## Migration Plan

1. 先精簡（移除模組/表/前端頁），每步 typecheck 綠燈，確保骨架可啟動可登入。
2. 加相依與 Prisma 新表，產 migration。
3. 實作轉換引擎（TDD：以小型 `.pptx` 樣本驗證文字/圖片/表格/準確率）。
4. 實作來源 adapter + 排程 + 攝取編排 + API。
5. 前端文章頁、儀表、對照、手動觸發。
6. Swagger bundle + api-client regenerate。
7. 放數個樣本 `.pptx` 至 `storage/incoming`，跑排程/手動觸發，驗證列表→檢視→準確率→來源已刪。

Rollback：本 change 為獨立分支，未合併前可整體丟棄；精簡屬破壞性，務必在分支進行。

## Open Questions

- 轉換後刪除預設用 `move`（搬到 processed）還是 `delete`（真刪）？（暫定 `move`，demo 安全。）
- 對照面板是否需要 LibreOffice 原頁快照增強？（暫定可選、預設關閉、未裝即降級。）
- 正式環境目標 HTML 編輯器是哪一套？需於整合期以該編輯器實測「不跑版」與樣式保留程度。
