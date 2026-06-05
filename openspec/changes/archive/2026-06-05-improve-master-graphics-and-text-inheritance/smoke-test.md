# Smoke Test — improve-master-graphics-and-text-inheritance

無新增 API；以「真實簡報轉換輸出」為驗證重點。

## 前置

- 樣本：`/Users/alantsai/Downloads` 的美股盤前／台股盤中／台股盤後／量化策略 `.pptx`。
- 放回 `apps/api/storage/incoming/`，`pnpm dev` 後按列表頁「立即抓取轉換」。

## A. logo（layout/master 圖片）

1. 進每份文章詳情頁，確認**右下角「凱基投顧」logo 出現**（含包在群組內的 logo）。
2. logo 位於內容之下、不蓋住正文。
3. 準確率不受影響：整體與既往相近（98–100%），**不破百**（logo 不計入元素/圖片率）。

## B. placeholder 字級（字太小）

1. 「個股訊息」頁的條列文字字級明顯放大、填滿內容框（取自 layout placeholder 的 lstStyle，如 24pt），不再是偏小的 18pt。
2. 標題等有 type 的 placeholder 字級仍正確（後備 master txStyles 未退步）。

## 實機驗證實證（引擎跑真檔）

| 樣本 | logo data URI 數 | 整體準確率 | 圖片率 |
| --- | --- | --- | --- |
| 美股盤前 | 6 | 0.998 | 1 |
| 台股盤中 | 6 | 1.000 | 1 |
| 台股盤後 | 3 | 0.999 | 1 |
| 量化策略 | 4 | 0.980 | 1 |

美股 s2 個股訊息字級：`font-size:1.875cqw`(18pt) → `font-size:2.5cqw`(24pt)。

## 快速回歸（不需起服務）

```bash
pnpm typecheck && pnpm lint && pnpm test          # api 126 + web 30
pnpm --filter @app/api test:e2e                   # e2e 34（需本機 MySQL+Redis）
```
