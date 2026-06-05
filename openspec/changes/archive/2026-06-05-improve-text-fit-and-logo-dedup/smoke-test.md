# Smoke Test — improve-text-fit-and-logo-dedup

## 前置
樣本放回 `apps/api/storage/incoming/`，`pnpm dev` 後「立即抓取轉換」，進詳情頁/下載簡報 HTML 比對原檔。

## A. 內文填滿（行高 1.35）
- 美股盤前／個股訊息內文以較鬆行高撐滿框、貼近 PP（不再上半擠、下半空）。

## B. autofit 縮字（大框才縮）
- 台股盤中右欄 600+ 字：字級自動縮小（約 16pt→12.5pt）塞回框內、不溢出、不蓋頁尾/logo。
- 圖上紅字標籤（道瓊/標普）與免責聲明等「小框」維持原字級、不被縮（高度 < 25% 投影片不縮）。

## C. logo 去重
- 右下角同時有投顧＋證券時，只保留文件順序最後一個（投顧）；頂部滿版色條 banner 仍在。

## 實機實證（引擎跑真檔）
- 美股 logo 6→4（移除每頁證券、留投顧）；標普標籤 1.667cqw(16pt) 未被縮。
- 台股盤中右欄 div 1.667→1.306cqw（×0.78）；準確率 us .998／tc 1.0／tw .999／q .98，未破百。

## 快速回歸
```bash
pnpm typecheck && pnpm lint && pnpm test     # api 131 + web 30
pnpm --filter @app/api test:e2e              # e2e 34
```
