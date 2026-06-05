## Why

目前 demo 只能用檔案總管把 `.pptx` 丟進公槽資料夾，沒有從後台上傳的入口；且轉換後的 HTML 只能在詳情頁預覽、無法取走。demo 給主管看時，希望能在後台直接「上傳 PPT 到公槽」（轉換沿用既有「立即抓取轉換」按鈕或排程），並把轉出的 HTML「下載或複製」帶走貼到別處。

## What Changes

- **新增上傳 API**：`POST /api/articles/upload`（multipart，單一 `.pptx`）→ 將檔案**存入公槽（來源資料夾）**，回傳存入檔名。**不在此時轉換**；轉換沿用既有排程或手動觸發 `POST /api/articles/ingest`。
- **新增前端上傳**：文章列表頁加「上傳 PPT」按鈕（選檔即上傳），完成後提示「已上傳，請按『立即抓取轉換』或等排程」。
- **新增 HTML 匯出**：文章詳情頁加「下載 HTML」（存成 `.html` 檔）與「複製 HTML」（複製到剪貼簿）兩個動作。
- **Swagger / api-client**：新增 upload endpoint yaml（multipart requestBody），重新 bundle 並 regenerate 型別。

## Capabilities

### New Capabilities
<!-- 無全新能力；皆為既有能力的新增需求。 -->

### Modified Capabilities
- `ppt-ingestion`: 新增「以 HTTP 上傳單一 .pptx 至公槽（不立即轉換）」的需求（既有為「排程/手動掃描公槽攝取」）。
- `converted-article-ui`: 新增「前端上傳 .pptx」與「文章詳情頁下載/複製 HTML」的需求。

## Impact

- **後端**：`SourceStoragePort` 新增 `save()` + `LocalFolderSourceAdapter` 實作（寫入來源資料夾、同名去重）；新增 `UploadPptUseCase` + `UploadPptService`（存入公槽、回檔名）、`PptFacade.upload`、`ArticleController` 的 `POST /articles/upload`（`FileInterceptor` 記憶體儲存 + 檔案型別/大小驗證）；新增 `@types/multer`（dev）。
- **Swagger / api-client**：新增 `articles/upload.yaml`、重新 bundle + regenerate。
- **前端**：文章列表頁上傳按鈕（multipart，走原生 fetch 帶 Authorization，因型別化 client 處理 multipart 較不便）；詳情頁下載/複製 HTML（純前端，使用 `data.html`）。
- **不影響**：既有排程攝取、轉換引擎、準確率、資料表結構（沿用 `ConvertedArticleRecord`）。
