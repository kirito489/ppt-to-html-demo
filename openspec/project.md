# Project: ppt-shift-html-demo（PPT 轉 HTML Demo）

定時從「公槽」抓取員工上傳的 `.pptx`，純 JS 解析轉成可在後台 HTML 編輯器顯示、**不跑版**的 HTML，並提供**準確率數據**；轉換後依策略搬移或刪除來源。後端 NestJS（六角架構）+ Prisma，前端 React admin SPA，API 契約透過 OpenAPI 共享。本檔為架構與慣例的**單一事實來源**，README 與 CLAUDE.md 只連結過來。

> 本專案由一個 hexagonal admin 模板精簡而來：已移除會員/角色/權限 RBAC、安全（IP 名單/帳號鎖定）、firebase/s3/email/recaptcha、密碼重設等，只保留精簡登入與此 demo 所需的基礎建設。

---

## 目的

- **後端**：純 JS 解析 `.pptx` → 不跑版 HTML + 準確率；以 `@nestjs/schedule` 定時掃描來源（`SourceStoragePort`，demo 為本地資料夾）攝取、轉換、持久化、清除來源；提供文章 / 轉換紀錄查詢與手動觸發 API；精簡登入（login/refresh/logout）。
- **前端**：文章列表、文章詳情（不跑版預覽 + 準確率儀表 + 來源元素對照）、轉換紀錄、精簡登入。
- **共用 API client**：從後端 OpenAPI bundle 自動產生型別 + TanStack Query hooks。

---

## Monorepo 結構

```
ppt-shift-html-demo/
├── apps/
│   ├── api/                  # NestJS 後端
│   │   └── storage/          # 模擬公槽：incoming/（放 .pptx）、processed/（move 後）
│   └── web/                  # React 19 + Vite admin SPA
├── packages/
│   └── api-client/           # 由 openapi.bundle.yaml 產生的型別安全 client
├── openspec/                 # 規格驅動產物（本檔 + changes/ + specs/）
├── tasks/                    # lessons.md + todo.md
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

- 套件管理 **pnpm 11+**；workspace 互引用 `workspace:*`；各 workspace `@app/*` scope。
- `apps/web` 透過 Vite proxy（`/api` → `:3000`）；`@app/api-client` 採 **source-first**（exports 直指 `src/index.ts`，無 dist build）。

---

## 技術棧

### 後端 `apps/api`

| 分類          | 套件 |
| ------------- | ---- |
| Framework     | NestJS 11 + Express 5 |
| Language      | TypeScript 5（strict） |
| ORM           | Prisma 7 + `@prisma/adapter-mariadb`（driver 層強制 UTC） |
| Database      | MySQL / MariaDB |
| **PPT 解析**  | `jszip`（拆 pptx zip）+ `fast-xml-parser`（解析 OOXML），純 JS、無 LLM/外部服務 |
| **排程**      | `@nestjs/schedule` + `cron`（動態註冊 CronJob） |
| Validation    | Zod 4（DTO）+ `ParseUUIDPipe`（route param） |
| Auth          | JWT（`@nestjs/jwt`）+ Redis token blacklist + Redis member-context cache |
| Cache / 限流  | Redis（`redis`）；`@nestjs/throttler`（Redis 滑動視窗） |
| Logging       | Pino + `pino-roll` + System Log（DB） |
| Security hdr  | `helmet`（CSP 關閉以相容 Swagger UI） |
| Health        | `@nestjs/terminus`（探 DB / Redis） |
| Observability | Sentry + Prometheus（皆 feature flag、預設關閉） |
| API Docs      | Swagger 3：分檔 yaml + `swagger-cli bundle` |
| Testing       | Jest 29（unit + supertest e2e） |

### 前端 `apps/web`

Vite 8 + React 19 + TS 6（strict）、Tailwind v4、shadcn/ui、React Router v7、TanStack Query v5、react-hook-form + zod（`standardSchemaResolver`）、TanStack Table v8、lucide-react。

### 共用 `packages/api-client`

`openapi-typescript`（yaml → `paths` 型別）+ `openapi-fetch`，包成 TanStack Query hooks（`createApiClient` / `createApiQueryHooks` → `useApiQuery` / `useApiMutation`），自動 unwrap 後端 `{ success, data, timestamp }` 外殼。

---

## 後端架構：六角（Ports & Adapters）

```
apps/api/src/
├── adapter/
│   ├── in/web/        # Controller、DTO、Guard、Filter、Decorator
│   ├── in/scheduler/  # PptIngestScheduler（@nestjs/schedule 動態 cron）
│   └── out/           # Prisma repository、Redis adapter、LocalFolderSourceAdapter
├── application/
│   ├── facade/        # AuthFacade、PptFacade
│   ├── port/in/       # use case 介面（auth/、ppt/、article/）
│   ├── port/out/      # repository / 外部服務介面（ppt/、article/、conversion-job/、member/、auth/）
│   └── service/       # use case 實作（auth/、ppt/、article/、shared/）
├── domain/
│   ├── model/         # Member、conversion 中介結構、ConvertedArticle、ConversionJob
│   └── exception/     # 領域例外（plain Error 子類）
├── infrastructure/    # PrismaModule、Redis、ZodValidationPipe、pagination、date、validate-env
└── modules/           # NestJS DI 接線（auth / member / ppt / redis / feature-flag / system-log / auth-log / health / jwt）
```

**依賴方向**：`adapter/in` → `application` → `port/out` ← `adapter/out`。`application` 與 `domain` 從不引入 `adapter`。

### 後端慣例

- **Module naming**：Controller + DTO → `adapter/in/web/<module>/`；Prisma repository → `adapter/out/persistence/<module>/`；service → `application/service/<module>/`。
- **Facade**：domain area 對外只暴露 `*Facade`（`AuthFacade`、`PptFacade`），Controller 透過 facade 操作。
- **Domain exception → HTTP**：domain exception 是 plain `Error` 子類；映射在 `adapter/in/web/filter/GlobalExceptionFilter.ts`，新增 exception 必須同步加 `instanceof` 分支與 `code`（SCREAMING_SNAKE_CASE）。
- **Controller 回傳原始值**：`TransformInterceptor` 會包成 `{ success, data, timestamp }`，不要自行包 `{ data }`。
- **時區**：DB 一律 UTC（Prisma driver `timezone: 'Z'`）。
- **Port 綁定避免 useExisting 的測試陷阱**：`overrideProvider` 對 `useExisting` 別名 token 無效（見 `tasks/lessons.md`）；e2e 隔離 fs 改用環境變數指向暫存目錄。

---

## PPT → HTML 轉換流程（核心）

### 轉換引擎（`application/service/ppt/ConvertPptService.ts`）

- `.pptx` 為 OOXML zip：`jszip` 解壓 + `fast-xml-parser` 解析（**`removeNSPrefix: false`** 以免 `r:id` 與 `id` 衝突）。
- 讀 `ppt/presentation.xml` 取投影片尺寸（EMU）與頁序；逐頁走訪 `p:spTree`：`p:sp`（文字）、`p:pic`（圖片）、`p:graphicFrame`（表格/圖表）、`p:grpSp`（群組遞迴）。
- **不跑版輸出**：每頁一個 `<section class="ppt-slide">`，`width:100%` + `aspect-ratio:W/H` + `container-type:inline-size`；內部元素 `position:absolute` 用**百分比** `left/top/width/height`、字級用 **`cqw`**（容器寬度單位），**不用 `transform`**（避免被富文本編輯器 sanitize）。圖片以 **base64 data URI 內嵌**，文章自包含。
- **準確率**：
  - 元素涵蓋率 = 成功還原元素 ÷ 可辨識元素總數（chart/SmartArt 等未支援計為未還原）。
  - 文字還原正確率 = 擷取到的 `<a:t>` 字元數 ÷ 全部 `<a:t>` 字元數。
  - 圖片擷取成功率 = 內嵌成功的圖片 ÷ `<p:pic>` 總數（EMF/WMF 等不支援格式輸出占位、計為失敗）。
  - 整體 = 三者加權（`ACCURACY_WEIGHT_*`，預設 0.5/0.3/0.2）；另存每頁明細。
- **容錯**：單檔解析失敗丟 `PptParseException`，由攝取流程隔離（標記 failed、不影響其他檔）。

### 來源攝取與排程

- `SourceStoragePort`（`list` / `read` / `dispose`）：demo 為 `LocalFolderSourceAdapter`（掃 `INGEST_SOURCE_DIR` 的 `.pptx`）；未來換真 SFTP 只改 adapter。
- `IngestPptService`（編排）：list → read → `ConvertPptService` → 存 `ConvertedArticle` → `dispose`（依 `INGEST_AFTER_CONVERT` move/delete）→ 累積 `ConversionJob`。
- `PptIngestScheduler`：`onModuleInit` 動態註冊 `CronJob`（讀 `INGEST_CRON` / 時區，避免 decorator 在 dotenv 前求值的問題）；`INGEST_SCHEDULE_ENABLED=false` 可停用。
- 手動觸發：`POST /api/articles/ingest`。

### 對照中介結構

轉換時產出逐頁「來源元素清單」（文字 / 圖片縮圖 / 表格 / 未支援，含 `restored` 旗標）+ 每頁準確率，存入 `ConvertedArticleRecord.inventory`（JSON），供前端「來源元素對照」面板逐條核對。

---

## Swagger yaml 慣例

- **分檔 + `$ref`**：`docs/swagger/openapi.yaml` 放 components / servers / info / paths 索引；每個 endpoint 一個獨立 yaml。
- **成功回應 inline 寫**：不要 `$ref: SuccessResponse`（其 `data` 為 generic，前端推導無意義）；在 200/201 直接 inline `{ success, data: <具體 shape>, timestamp }`。範例見 `articles/get.yaml`、`auth/login.yaml`。
- **改動後**：`pnpm --filter @app/api swagger:bundle` 重打包；前端 `pnpm --filter @app/api-client generate` 同步型別。

---

## 前端架構（apps/web/src/）

```
apps/web/src/
├── api/client.ts          # apiClient singleton + 401/refresh middleware；export useApiQuery / useApiMutation
├── components/{ui,RequireAuth,RequireRole,ErrorBoundary}
├── routes/
│   ├── _layout.tsx        # Sidebar 共用 layout
│   ├── _nav-items.ts      # 導覽宣告（首頁、文章列表、轉換紀錄）
│   ├── login/page.tsx
│   ├── home/page.tsx
│   ├── articles/          # 列表 page.tsx、詳情 detail.tsx、components/（status-badge / accuracy-gauge / slide-preview / inventory-panel）、types.ts
│   └── jobs/page.tsx      # 轉換紀錄
└── lib/                   # cn、tokenStorage、use-current-member 等
```

### 前端慣例

- **路徑別名**：`@/*` → `src/*`。
- **API 呼叫**一律走 `useApiQuery` / `useApiMutation`（型別由 `@app/api-client` 從 OpenAPI 推導），不要自己寫 fetch。query/path 參數走 `{ params: { query }, params: { path } }`。
- **表單**：react-hook-form + zod + `standardSchemaResolver`（**不要** `zodResolver`，與 zod 4.1+ 衝突）；normalize 放 submit handler，不要在 schema 用 `.transform()`。
- **token**：access token 存 `localStorage`，統一從 `@/lib/storage` 的 `tokenStorage` 存取；401 由 apiClient middleware 處理（refresh rotation → 失敗清 token 跳 login）。
- **不跑版預覽**：用 `dangerouslySetInnerHTML` 渲染引擎輸出的自包含 HTML（已含 inline 樣式），外層提供寬度切換驗證縮放。
- **UI 文字**一律繁體中文 hardcode，不導入 i18n。

---

## 認證流程（精簡）

- **登入** `POST /api/auth/login` → 回 `{ accessToken, refreshToken, ...ExpiresIn, member }`；前端存 `localStorage.access_token`。
- **refresh rotation** `POST /api/auth/refresh`：發新 access + 新 refresh，舊 refresh 進 Redis 黑名單。
- **logout** `POST /api/auth/logout`：access/refresh 進黑名單 + 清 member-context 快取。
- **JwtAuthGuard**：驗 `type: 'access'`；member context 走 Redis 快取（不可用時降級查 DB）。**無 RBAC**：精簡後角色以常數（`管理員` / `ADMIN`）填入、`permissions` 為空陣列。
- 單一管理員由 seed 建立（`ADMIN_DEFAULT_EMAIL` / `ADMIN_DEFAULT_PASSWORD`）。

---

## 環境變數

後端 `apps/api/.env`（範本 `.env.example`）。必填：`DB_HOST` / `DB_USERNAME` / `DB_DATABASE`、`ACCESS_SECRET` / `REFRESH_SECRET` / `COOKIE_SECRET`（各 ≥ 32）。

| 變數 | 說明 |
| --- | --- |
| `INGEST_SOURCE_DIR` | 來源資料夾（模擬公槽），預設 `storage/incoming` |
| `INGEST_PROCESSED_DIR` | move 策略目的地，預設 `storage/processed` |
| `INGEST_CRON` | 排程 cron（6 欄位含秒），預設 `0 * * * * *`（每分鐘） |
| `INGEST_SCHEDULE_ENABLED` | 是否啟用排程（測試環境設 `false`） |
| `INGEST_AFTER_CONVERT` | 來源處置：`move`（預設）/ `delete` |
| `ACCURACY_WEIGHT_TEXT/IMAGE/COVERAGE` | 準確率加權，預設 0.5 / 0.3 / 0.2 |

`CORS_ORIGIN` 預設 `http://localhost:3000,http://localhost:5173`；生產禁 `*`。可觀測性（Sentry / Prometheus）feature flag 預設關閉。

---

## API 端點總覽

所有端點以 `/api` 為前綴。互動式查詢開 Swagger UI（`/api/docs`）。

| 群組 | 路徑 | 權限 |
| --- | --- | --- |
| Auth | `/api/auth/{login,refresh,logout}` | 公開 |
| Me | `GET /api/me` | JWT |
| Articles | `GET /api/articles`（列表）、`GET /api/articles/:id`（詳情）、`POST /api/articles/ingest`（手動觸發） | JWT |
| Jobs | `GET /api/conversion-jobs`（轉換紀錄） | JWT |
| Health | `GET /api/health`、`GET /api/health/ready` | 公開 |
| Metrics | `GET /api/metrics`（flag 開啟才掛載） | 公開（需網路層保護） |

列表回 `{ items, meta }`（`meta` = `{ page, limit, total, totalPages }`）；詳情回完整 `ConvertedArticle`（含 `html` / `accuracy` / `inventory`）。

### 全域中介層（`app.module.ts` 註冊順序 = 執行順序）

`ThrottlerGuard` → `SessionIdleGuard`（FeatureFlag 控制）→ `GlobalExceptionFilter` → `LoggingInterceptor`（FeatureFlag）→ `TransformInterceptor`。

### API 回應格式

成功：`{ success: true, data, timestamp }`；錯誤：`{ success: false, message, code, timestamp }`（`code` 由例外 class name 轉 SCREAMING_SNAKE_CASE）。前端 `@app/api-client` 自動 unwrap `data`。

---

## 資料表（`apps/api/prisma/schema.prisma`）

| Model | 說明 |
| --- | --- |
| `MemberRecord` | 精簡會員（登入用，無 RBAC 欄位） |
| `ConvertedArticleRecord` | 轉換後文章（`html` LongText、`inventory` JSON、4 個準確率欄位、status） |
| `ConversionJobRecord` | 攝取批次紀錄（trigger、起迄、掃描/成功/失敗數、detail JSON） |
| `AuthLogRecord` | 登入/登出/refresh 日誌（FeatureFlag 控制） |
| `SystemLogRecord` | API / 異常日誌（FeatureFlag 控制） |
| `SeedHistoryRecord` | seed 冪等控制 |

修改 schema 後必跑 `pnpm --filter @app/api db:generate`；新欄位/表用 `db:migrate`。

---

## 測試結構

```
apps/api/src/**/*.spec.ts        # 單元（domain / service / guard / filter / interceptor / 轉換引擎 / 攝取）
apps/api/test/
├── test-app.ts                  # createE2EApp()（mock Prisma/Redis/SystemLog）
├── setup-env.ts                 # 測試環境變數（含關閉排程、來源指向暫存目錄）
├── auth.e2e-spec.ts
├── article.e2e-spec.ts
└── health.e2e-spec.ts
```

- 轉換引擎用 `jszip` 在測試內合成 `.pptx` fixture 驗證（無需二進位檔）。
- coverage 門檻聚焦邏輯層，`coveragePathIgnorePatterns` 排除 wiring/DTO/adapter（見 `tasks/lessons.md`）。

---

## 完整指令參考

### Root

```bash
pnpm install
pnpm dev                       # concurrently 啟動 api + web
pnpm build
pnpm typecheck                 # 三 workspace tsc --noEmit
pnpm lint
pnpm test
```

### 後端 `apps/api`

```bash
pnpm --filter @app/api dev               # watch
pnpm --filter @app/api build
pnpm --filter @app/api lint[:fix] / format
pnpm --filter @app/api test[:watch|:cov]
pnpm --filter @app/api test:e2e          # 需 MySQL + Redis

# 資料庫
pnpm --filter @app/api db:create / db:drop
pnpm --filter @app/api db:migrate / db:migrate:deploy
pnpm --filter @app/api db:generate       # 搬 monorepo 後第一次 typecheck 必跑
pnpm --filter @app/api db:seed / db:studio

# Swagger
pnpm --filter @app/api swagger:bundle
```

### 前端 `apps/web`

```bash
pnpm --filter @app/web dev / build / typecheck / lint / preview
cd apps/web && pnpm dlx shadcn@latest add <component>
```

### API client `packages/api-client`

```bash
pnpm --filter @app/api swagger:bundle
pnpm --filter @app/api-client generate    # openapi.bundle.yaml → src/schema.ts
pnpm --filter @app/api-client typecheck
```

---

## 慣例參考索引

| 主題 | 位置 |
| --- | --- |
| 過去踩過的坑與決定 | `tasks/lessons.md` |
| 跨 session 待辦 | `tasks/todo.md` |
| 已封存 change | `openspec/changes/archive/<日期>-<name>/` |
| 已批准能力規格 | `openspec/specs/<capability>/spec.md` |
| Claude 行為與 workflow | `CLAUDE.md` |
| 人類 onboarding | `README.md` |
