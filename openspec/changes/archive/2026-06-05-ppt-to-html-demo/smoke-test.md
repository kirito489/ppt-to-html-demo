# Smoke Test — PPT → HTML 轉換 Demo

手動驗證整條流程：登入 → 觸發攝取 → 文章列表 → 文章詳情（不跑版 HTML + 準確率 + 對照）→ 來源已清除。

## 前置

- MySQL、Redis 已啟動（demo DB：`ppt_demo_db`，連線設定見 `apps/api/.env`）。
- 已跑過 migration 與 seed（管理員 `admin@test.com` / `Admin1234!`）。
- 把要轉換的 `.pptx` 放到 `apps/api/storage/incoming/`。

## 啟動

```bash
# 後端（cwd 會是 apps/api，掃描 storage/incoming）
pnpm --filter @app/api dev
# 前端（另開終端）
pnpm --filter @app/web dev   # http://localhost:5173
```

> 排程：`.env` 的 `INGEST_CRON` 預設每分鐘掃描一次；放檔後等一分鐘會自動轉換。
> 下方用「手動觸發」可立即驗證，不必等排程。

## 1. 登入取得 Token

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@test.com","password":"Admin1234!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["accessToken"])')
echo "$TOKEN"
```

## 2. 手動觸發一次攝取

```bash
curl -s -X POST http://localhost:3000/api/articles/ingest \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

預期：回傳批次結果 `{ filesScanned, filesConverted, filesFailed, detail[] }`，
且 `storage/incoming` 內成功的 `.pptx` 已搬到 `storage/processed`（`INGEST_AFTER_CONVERT=move`）。

## 3. 文章列表

```bash
curl -s "http://localhost:3000/api/articles?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

預期：`data.items[]` 含標題、來源檔名、頁數、`accuracyOverall`、`status`。

## 4. 文章詳情（不跑版 HTML + 準確率 + 來源對照）

```bash
ARTICLE_ID=<從上一步複製某篇 id>
curl -s "http://localhost:3000/api/articles/$ARTICLE_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

預期：
- `data.html`：每頁為 `aspect-ratio` 鎖定容器 + 百分比絕對定位 + `cqw` 字級（不跑版）。
- `data.accuracy`：`overall / text / image / coverage` 與每頁 `slides[]` 明細。
- `data.inventory`：逐頁元素清單（文字/圖片/表格/未支援），每個元素 `restored` 標記是否還原。

## 5. 轉換紀錄

```bash
curl -s "http://localhost:3000/api/conversion-jobs?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

## 6. 前端檢視

瀏覽器開 `http://localhost:5173` → 登入 → 左側「文章列表」：
- 點文章進詳情，切換「手機 / 平板 / 桌機」寬度確認**不跑版**。
- 看**準確率儀表**（整體 + 文字/圖片/涵蓋 + 每頁明細）。
- 看**來源元素對照**，逐條核對文字與圖片是否準確還原。

## 刪除策略切換

把 `.env` 的 `INGEST_AFTER_CONVERT` 改為 `delete` 可改為「轉換後直接刪除來源」（對齊正式需求）；預設 `move`（搬到 processed，demo 安全）。
