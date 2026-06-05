## Why

目前 demo 只能「把 .pptx 放進公槽資料夾 → 排程/手動觸發攝取」，沒有直覺的手動上傳，且轉換後的 HTML 只能在詳情頁預覽、無法取走。demo 給主管看時，希望能直接「拖一個 PPT 上傳就轉換」、並把轉出的 HTML「下載或複製」帶走貼到別處。

## What Changes

- **新增上傳轉換 API**：`POST /api/articles/upload`（multipart，單一 `.pptx`）→ 直接以記憶體緩衝呼叫現有轉換引擎 → 持久化為文章 → 回傳該文章。不經過公槽資料夾、不需排程。
- **新增前端上傳**：文章列表頁加「上傳 PPT」按鈕（選檔即上傳），完成後重整列表並可進入該篇詳情。
- **新增 HTML 匯出**：文章詳情頁加「下載 HTML」（存成 `.html` 檔）與「複製 HTML」（複製到剪貼簿）兩個動作。
- **Swagger / api-client**：新增 upload endpoint yaml（multipart requestBody），重新 bundle 並 regenerate 型別。

## Capabilities

### New Capabilities
<!-- 無全新能力；皆為既有能力的新增需求。 -->

### Modified Capabilities
- `ppt-ingestion`: 新增「以 HTTP 上傳單一 .pptx 立即轉換並存檔」的需求（既有為「排程/手動掃描公槽攝取」）。
- `converted-article-ui`: 新增「前端上傳 .pptx」與「文章詳情頁下載/複製 HTML」的需求。

## Impact

- **後端**：新增 `UploadPptUseCase` + service、`PptFacade.upload`、`ArticleController` 的 `POST /articles/upload`（`FileInterceptor` 記憶體儲存 + 檔案型別/大小驗證）；可能新增 `@types/multer`（dev，用於 `Express.Multer.File` 型別）。
- **Swagger / api-client**：新增 `articles/upload.yaml`、重新 bundle + regenerate。
- **前端**：文章列表頁上傳按鈕（multipart，走原生 fetch 帶 Authorization，因型別化 client 處理 multipart 較不便）；詳情頁下載/複製 HTML（純前端，使用 `data.html`）。
- **不影響**：既有排程攝取、轉換引擎、準確率、資料表結構（沿用 `ConvertedArticleRecord`）。
