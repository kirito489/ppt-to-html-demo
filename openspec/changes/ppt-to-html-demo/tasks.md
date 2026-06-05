## 1. 模板精簡（移除無關功能，由葉往根、每步 typecheck）

- [x] 1.1 前端移除 members/roles/security 路由、components、hooks、lib，並更新 `routes/_nav-items.ts` 與 `App.tsx` 路由註冊
- [x] 1.2 前端 `routes/_layout.tsx` sidebar 改為文章導覽（暫留佔位，文章頁於第 9 階段補上）
- [x] 1.3 後端 `app.module.ts` 移除 role/member/security/firebase/s3/email/recaptcha 模組註冊與全域 guard（`IpBlacklistGuard`/`IpWhitelistGuard`）；保留 Redis/Throttler/FeatureFlag/SystemLog/AuthLog/Health/`SessionIdleGuard`
- [x] 1.4 後端刪除已移除模組對應的 `adapter/in/web`、`application`、`domain`、`adapter/out`、`modules` 檔案與其 `*.spec.ts`（含 `PermissionsGuard`/`RolesGuard`、`permissions.decorator`/`roles.decorator`）
- [x] 1.5 後端精簡 auth：保留 login/refresh/logout 與 `JwtAuthGuard`，移除 forgot/reset-password、password-policy、reCAPTCHA 相依
- [x] 1.6 保留 Redis；精簡 `LoginService` 移除帳號鎖定/IP 封鎖/reCAPTCHA 相依（保留 bcrypt、status 檢查、雙 Token、AuthLog、session activity）；簡化會員載入（角色以常數填入）
- [x] 1.7 Prisma schema 移除 `Role`/`Permission`/`RolePermission`/`IpWhitelistRecord`/`IpBlacklistRecord`/`PasswordResetTokenRecord`/`AttachmentRecord`；保留 `SystemLogRecord`/`AuthLogRecord`/`SeedHistoryRecord`；精簡 `MemberRecord`（移除 `roleId`/role 關聯、`failedLoginCount`、`lockedAt`）
- [x] 1.8 精簡 seeds：只保留建立單一管理員帳號；移除 permissions/roles/其餘 seed
- [x] 1.9 移除已刪 endpoint 的 swagger yaml 與 `openapi.yaml` 索引項目
- [x] 1.10 移除已刪功能的 e2e 測試與 `.env.example` 中無用變數；`pnpm typecheck && pnpm lint` 全綠、可登入

## 2. 相依與資料庫

- [x] 2.1 後端安裝 `@nestjs/schedule`、`jszip`、`fast-xml-parser`，於 `app.module.ts` 註冊 `ScheduleModule.forRoot()`
- [x] 2.2 Prisma schema 新增 `ConvertedArticleRecord` 與 `ConversionJobRecord`（欄位見 design D6）
- [x] 2.3 產生 migration 並 `db:generate`；`.env.example` 新增 `INGEST_SOURCE_DIR`、`INGEST_CRON`、`INGEST_AFTER_CONVERT`、`ACCURACY_WEIGHTS`

## 3. Domain / Port

- [x] 3.1 `domain/model` 新增 `ConvertedArticle`、`ConversionJob` 領域實體；定義轉換中介結構型別（投影片/元素/對照清單/準確率）
- [x] 3.2 `application/port/out` 新增 `SourceStoragePort`（list/read/remove）、`SaveConvertedArticlePort`、`LoadConvertedArticlePort`、`SaveConversionJobPort`
- [x] 3.3 `application/port/in` 新增 `ConvertPptUseCase`、`IngestPptUseCase`、`ListArticlesUseCase`、`GetArticleUseCase`、`ListConversionJobsUseCase`
- [x] 3.4 `domain/exception` 新增 `PptParseException`、`ArticleNotFoundException`

## 4. 轉換引擎 Service（TDD）

- [x] 4.1 先寫 spec：以小型樣本 `.pptx`（純文字 / 含圖片 / 含表格 / 含未支援元素）驗證解析與輸出
- [x] 4.2 實作 `.pptx` 解析（jszip + fast-xml-parser）：投影片尺寸、頁序、形狀位置（EMU→百分比）
- [x] 4.3 實作文字還原（段落/run/樣式）與表格還原
- [x] 4.4 實作圖片擷取（rels→media→data URI 內嵌；不支援格式占位）
- [x] 4.5 實作 HTML 輸出（長寬比鎖定容器 + 百分比定位 + `cqw` 字級，不用 transform）
- [x] 4.6 實作準確率計算（涵蓋率 / 文字 / 圖片 / 加權整體）與每頁明細、對照中介結構
- [x] 4.7 實作單檔容錯（解析例外 → 標記 failed + 原因）；所有 4.x spec 綠燈

## 5. 攝取流程與排程

- [x] 5.1 `adapter/out` 實作 `LocalFolderSourceAdapter`（掃描/讀/移除，含 move 至 processed 或 delete 策略）
- [x] 5.2 實作 `IngestPptService`（編排：list→read→convert→persist→清除來源→累積 job）
- [x] 5.3 實作排程器（`@Cron(INGEST_CRON)` 觸發 `IngestPptUseCase`）

## 6. 持久化 Out Adapter

- [x] 6.1 `adapter/out/persistence` 實作 `PrismaConvertedArticleRepository`（save/list 分頁/findById）
- [x] 6.2 `adapter/out/persistence` 實作 `PrismaConversionJobRepository`（save/list）

## 7. Controller / DTO / Facade / Module

- [x] 7.1 `adapter/in/web/article` 新增 DTO（Zod）：list query、ingest 回應、article 詳情
- [x] 7.2 新增 `ArticleController`：`GET /api/articles`、`GET /api/articles/:id`、`POST /api/articles/ingest`、`GET /api/conversion-jobs`（皆 `JwtAuthGuard`）
- [x] 7.3 新增 `ArticleFacade` 串接 use case；新增 `ppt.module.ts` 接線（含 `JwtModule` import）並註冊進 `app.module.ts`
- [x] 7.4 `GlobalExceptionFilter` 新增 `PptParseException`、`ArticleNotFoundException` 對應與 code

## 8. Swagger / api-client

- [x] 8.1 新增 articles 端點 swagger yaml（inline shape，不用 `SuccessResponse $ref`）並掛到 `openapi.yaml`
- [x] 8.2 `pnpm --filter @app/api swagger:bundle` + `pnpm --filter @app/api-client generate` 同步型別

## 9. 前端文章功能

- [ ] 9.1 新增 `routes/articles` 路由群組與 nav 項目（文章列表、轉換紀錄）
- [ ] 9.2 文章列表頁（標題/來源檔名/頁數/整體準確率/狀態 + 進入詳情 + 「立即抓取轉換」按鈕）
- [ ] 9.3 文章檢視頁：不跑版自縮放 HTML 預覽容器（對應引擎輸出樣式）
- [ ] 9.4 準確率儀表元件（整體 + 三項分類 + 每頁明細）
- [ ] 9.5 來源元素對照面板（轉換結果 vs 來源元素清單，標記未還原）
- [ ] 9.6 轉換紀錄頁（批次列表）

## 10. 測試

- [ ] 10.1 補轉換引擎與攝取 service 單元測試（含準確率邊界、容錯）
- [ ] 10.2 新增 `article.e2e-spec.ts`（list/get/ingest/jobs + 登入保護），移除舊 e2e
- [ ] 10.3 `pnpm typecheck && pnpm lint && pnpm test` 全綠

## 11. 樣本與端到端驗證

- [ ] 11.1 放置數個樣本 `.pptx` 至 `storage/incoming`，建立 `smoke-test.md`（curl 範例）
- [ ] 11.2 跑手動觸發與排程，驗證：列表→檢視（不跑版）→準確率→對照→來源已依策略清除
- [ ] 11.3 確認文字與圖片內容於對照面板逐條正確

## 12. 收尾

- [ ] 12.1 更新 `tasks/todo.md`（完成項與 Open Questions 待辦）、`tasks/lessons.md`（新教訓）
- [ ] 12.2 `openspec validate ppt-to-html-demo`；提供繁中 conventional commit 訊息（不自動 commit）
