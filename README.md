# ppt-shift-html-demo（PPT 轉 HTML Demo）

定時從「公槽」抓取員工上傳的 `.pptx`，**純 JS 解析**轉成可在後台 HTML 編輯器顯示、**不跑版**的 HTML，並提供**準確率數據**（文字 / 圖片 / 元素涵蓋）；轉換完成後依策略搬移或刪除來源檔。

- 後端：NestJS（六角架構）+ Prisma。轉換引擎用 `jszip` + `fast-xml-parser`，**無 LLM API、無外部服務**。
- 前端：React + Vite admin SPA（文章列表、不跑版預覽、準確率儀表、來源元素對照、轉換紀錄）。
- 公槽以**本地資料夾模擬 SFTP**（`SourceStoragePort` 抽象，未來換真 SFTP 只改 adapter）。

技術棧、架構與慣例的完整說明在 **`openspec/project.md`**（單一事實來源）。本檔只負責 onboarding。

## Monorepo 結構

```
ppt-shift-html-demo/
├── apps/
│   ├── api/         # NestJS 後端（轉換引擎 + 排程攝取 + 文章 API）
│   │   └── storage/
│   │       ├── incoming/   # 模擬公槽：把 .pptx 放這裡
│   │       └── processed/  # 轉換成功後（move 策略）來源搬來這裡
│   └── web/         # React + Vite admin SPA
└── packages/
    └── api-client/  # OpenAPI → TS 型別 + TanStack Query hooks
```

## 環境需求

- Node.js **20+**（建議用 nvm）
- pnpm **11+**（`corepack enable`）
- MySQL / MariaDB
- Redis

## 快速開始

```bash
# 1. 安裝依賴
pnpm install

# 2. 設定後端環境變數
cp apps/api/.env.example apps/api/.env
# 編輯 apps/api/.env（DB_* / 三組 SECRET / Redis / INGEST_* 見下方）

# 3. 建 DB + migration + seed（建立管理員 admin@test.com / Admin1234!）
pnpm --filter @app/api db:create
pnpm --filter @app/api db:migrate
pnpm --filter @app/api db:seed

# 4. 首次必跑：產生 Prisma client + 前端 API 型別
pnpm --filter @app/api db:generate
pnpm --filter @app/api swagger:bundle
pnpm --filter @app/api-client generate

# 5. 一鍵啟動前後端
pnpm dev
```

啟動後：

- 後端 API：`http://localhost:3000/api`
- Swagger UI：`http://localhost:3000/api/docs`
- 健康檢查：`/api/health`（liveness）、`/api/health/ready`（探 DB + Redis）
- 前端 admin：`http://localhost:5173`

## Demo 流程

1. 把要轉換的 `.pptx` 放到 `apps/api/storage/incoming/`。
2. 等排程（`INGEST_CRON`，預設每分鐘）自動轉換，或在前端「文章列表」按「**立即抓取轉換**」手動觸發。
3. 進入文章詳情：
   - **不跑版預覽**：切換手機 / 平板 / 桌機寬度，投影片整塊等比縮放、版面不破。
   - **準確率儀表**：整體 + 文字還原率 / 圖片擷取率 / 元素涵蓋率 + 每頁明細。
   - **來源元素對照**：逐條核對文字、圖片、表格是否準確還原（✓ 已還原 / ✗ 未還原）。
4. 轉換成功的來源檔依 `INGEST_AFTER_CONVERT` 搬到 `storage/processed`（`move`，預設）或刪除（`delete`）。

> 也可用 `openspec/changes/archive/2026-06-05-ppt-to-html-demo/smoke-test.md` 的 curl 流程驗證。

## 常用指令

```bash
pnpm dev                          # 並行啟動前後端
pnpm --filter @app/api dev        # 只啟動後端
pnpm --filter @app/web dev        # 只啟動前端

# 上 commit 前必跑
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @app/api test:e2e   # 改 controller / 路由時加跑（需 MySQL + Redis）

# 改後端 controller / Swagger 後同步前端型別
pnpm --filter @app/api swagger:bundle
pnpm --filter @app/api-client generate
```

## 必填 / 重要環境變數

`apps/api/.env`（缺必填項啟動會 exit(1)）：

| 變數                    | 說明                                              |
| ----------------------- | ------------------------------------------------- |
| `DB_HOST` / `DB_USERNAME` / `DB_DATABASE` | 資料庫連線（demo 用獨立 DB，如 `ppt_demo_db`）  |
| `ACCESS_SECRET` / `REFRESH_SECRET` / `COOKIE_SECRET` | 各 ≥ 32 字元（`openssl rand -hex 32`）     |
| `REDIS_HOST` / `REDIS_PORT` | Redis（token 黑名單、member-context 快取、throttler） |
| `INGEST_SOURCE_DIR`     | 來源資料夾（模擬公槽），預設 `storage/incoming`   |
| `INGEST_PROCESSED_DIR`  | move 策略的搬移目的地，預設 `storage/processed`   |
| `INGEST_CRON`           | 排程 cron（6 欄位含秒），預設每分鐘 `0 * * * * *` |
| `INGEST_SCHEDULE_ENABLED` | 是否啟用排程（測試環境關閉）                    |
| `INGEST_AFTER_CONVERT`  | 來源處置：`move`（預設）/ `delete`                |
| `ACCURACY_WEIGHT_TEXT/IMAGE/COVERAGE` | 準確率加權（預設 0.5 / 0.3 / 0.2）  |

完整環境變數見 `apps/api/.env.example`。

## 常見啟動問題

| 症狀 | 原因 / 解法 |
| --- | --- |
| typecheck 報「Property X does not exist on PrismaService」 | Prisma client 未生成，跑 `pnpm --filter @app/api db:generate`（`predev`/`prebuild` 已自動處理） |
| `pnpm dev` 報 `Cannot find module '.../dist/main'` | 刪 `apps/api/dist/.tsbuildinfo` 後重跑 |
| 登入回 `pool timeout` | Docker MySQL 剛啟動未 ready，等 10 秒重試 |
| 放了 pptx 但沒轉換 | 確認檔案在 `apps/api/storage/incoming/`、副檔名 `.pptx`、`INGEST_SCHEDULE_ENABLED=true`；或前端按「立即抓取轉換」 |

## 想看更多

| 想知道 | 看哪裡 |
| --- | --- |
| 技術棧、目錄、慣例、轉換引擎細節 | `openspec/project.md` |
| 已踩過的坑與決定 | `tasks/lessons.md` |
| 本功能的提案 / 設計 / 規格 | `openspec/changes/archive/2026-06-05-ppt-to-html-demo/` |
| 能力規格 | `openspec/specs/{ppt-conversion,ppt-ingestion,converted-article-ui}/spec.md` |
| API spec（互動式） | `http://localhost:3000/api/docs` |

## License

ISC
