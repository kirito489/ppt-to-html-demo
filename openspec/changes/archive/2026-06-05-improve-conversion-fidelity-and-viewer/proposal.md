## Why

實機用真實 KGI 財經簡報測試後發現：轉出的 HTML 雖然準確率數字高，但**視覺版面跑掉**——標題與內文（placeholder）疊在左上角、投影片背景色與形狀填色（橘底、表格底色）全變白、樣式掉失。另外上傳到公槽（未轉換）的檔在 UI 看不到，個人資料還殘留無意義的「角色」欄。需要把「視覺貼近原稿」這個核心價值補起來，並補齊上傳/檢視的 UX。

## What Changes

- **版面與樣式還原（核心）**：轉換引擎補上
  - **placeholder 繼承座標**：標題/內文等無自身 `<a:xfrm>` 的 placeholder，依 `type`/`idx` 從 slideLayout（再 fallback slideMaster）取得位置與大小（修「全部疊在左上角」）。
  - **投影片背景色**：讀 slide → layout → master 的 `<p:bg>`（solidFill / 簡單漸層），套到頁面背景（不再一律白底）。
  - **形狀填色**：形狀 `<a:solidFill>` 套為元素底色；表格儲存格 `<a:tcPr>` 填色套為 `td` 底色（橘底、米色表格還原）。
  - **段落對齊**：讀 `<a:pPr algn>` → `text-align`。
- **PPT 翻頁檢視**：文章詳情頁新增「簡報模式」，一頁一頁顯示 + 上一頁/下一頁（含鍵盤 ←/→）。
- **待轉換清單**：新增 `GET /api/articles/pending` 列出公槽已上傳、尚未轉換的檔；前端列表頁顯示「待轉換」清單/數量。
- **個人資料**：`/api/me` 補回會員名稱；首頁個人資料顯示「名稱」、移除已無意義的「角色」列。

## Capabilities

### New Capabilities
<!-- 無全新能力；皆為既有能力的新增/修改需求。 -->

### Modified Capabilities
- `ppt-conversion`: 新增 placeholder 座標繼承、投影片背景、形狀/儲存格填色、段落對齊的還原需求。
- `ppt-ingestion`: 新增「列出公槽待轉換來源檔」需求。
- `converted-article-ui`: 新增「簡報模式翻頁檢視」「待轉換清單顯示」「個人資料顯示名稱（不顯示角色）」需求。

## Impact

- **後端**：`ConvertPptService` 解析 slideLayout/slideMaster（placeholder map、`p:bg`）、形狀/儲存格 `solidFill`、段落 `algn`；新增 `ListPendingSourcesUseCase` + 服務 + `GET /api/articles/pending`；`/api/me` 回傳名稱（`ProfileController` 取會員名）。
- **Swagger / api-client**：新增 `articles/pending.yaml`、更新 `get-me.yaml`（加 `member` 名稱）；bundle + regenerate。
- **前端**：詳情頁簡報模式元件；列表頁待轉換區塊；首頁個人資料調整。
- **資料表**：不變（沿用既有）。
- **預期**：版面顯著貼近原稿（位置/背景/填色回來），但不保證像素級一致（主題色 `bgRef`、自動縮字、複雜漸層/群組巢狀變換列為非目標）。
