## Context

既有流程是「公槽資料夾 → 排程/手動掃描攝取」。本 change 補上「HTTP 直接上傳單檔轉換」與「把轉出 HTML 帶走」兩個 demo 便利功能，沿用現有轉換引擎（`ConvertPptService`）與文章持久化（`SaveConvertedArticlePort` / `LoadConvertedArticlePort`），不動資料表與排程。

## Goals / Non-Goals

**Goals:**
- `POST /api/articles/upload`（multipart 單檔 `.pptx`）→ 立即轉換 → 存檔 → 回傳該文章（前端可直接進詳情）。
- 前端文章列表頁「上傳 PPT」按鈕；詳情頁「下載 HTML」「複製 HTML」。

**Non-Goals:**
- 不做多檔上傳、不做拖放區塊（單一檔案選取即可；之後要再加）。
- 上傳不建立 `ConversionJob`（那是「批次攝取」語意；單檔上傳直接回文章）。
- 不改轉換引擎、準確率、資料表。

## Decisions

### D1. 上傳端點：FileInterceptor 記憶體緩衝 + 驗證
`@Post('articles/upload')` 用 `@nestjs/platform-express` 的 `FileInterceptor('file')`（預設 memoryStorage，取得 `file.buffer`）。驗證：副檔名/MIME 為 pptx（`application/vnd.openxmlformats-officedocument.presentationml.presentation`，並接受副檔名 `.pptx`）、大小上限（`UPLOAD_MAX_BYTES`，預設 50MB）。不符回 `400 BAD_REQUEST`。受 `JwtAuthGuard` 保護。

### D2. UploadPptUseCase / Service
新增 `UploadPptUseCase`（in port）+ `UploadPptService`：呼叫 `ConvertPptUseCase.execute({ buffer, filename })` → `SaveConvertedArticlePort.save(...)` → 以回傳 id 透過 `LoadConvertedArticlePort.findById(id)` 取回完整 `ConvertedArticle` 回傳。轉換失敗（`PptParseException`）由 GlobalExceptionFilter 對應 422。`PptFacade` 加 `upload(buffer, filename)`。

### D3. 回應形狀
回傳完整 `ConvertedArticle`（與 `GET /api/articles/:id` 同 shape），前端上傳成功即可導去 `/articles/:id` 或重整列表。

### D4. 前端上傳：原生 fetch + FormData
multipart 透過型別化 `useApiMutation`（openapi-fetch）較不便，故上傳改用原生 `fetch('/api/articles/upload', { method:'POST', body: FormData, headers:{ Authorization } })`，token 取自 `@/lib/storage` 的 `tokenStorage`；回應沿用後端 `{ success, data }` 外殼，手動取 `data`。上傳中 disable 按鈕、`toast` 顯示結果、`queryClient.invalidateQueries`（或列表 query refetch）後可導向詳情。

### D5. HTML 匯出（純前端）
詳情頁兩個動作，作用於 `article.html`：
- 下載：`new Blob([html], { type: 'text/html' })` → 暫時 `<a download="<title>.html">` 觸發下載。
- 複製：`navigator.clipboard.writeText(html)`（localhost 為 secure context，可用）；失敗 fallback 提示。

### D6. 相依
後端 `@types/multer`（dev，型別 `Express.Multer.File`）；`FileInterceptor` 來自既有 `@nestjs/platform-express`，無新增 runtime 套件。`UPLOAD_MAX_BYTES` 加入 validate-env 與 `.env.example`。

## Risks / Trade-offs

- [memoryStorage 把整個檔案讀進記憶體] → 設 `UPLOAD_MAX_BYTES` 上限 + Multer `limits.fileSize`，超過回 413/400。
- [multipart 不走型別化 client，失去型別保證] → 上傳回應結構簡單（`{ success, data: article }`），前端只取需要欄位；風險可控並註解原因。
- [clipboard API 需 secure context] → localhost / https 可用；非安全環境 fallback 用隱藏 textarea + `execCommand` 或提示改用下載。
- [偽裝副檔名的非 pptx] → 轉換引擎本就會丟 `PptParseException`（→ 422），雙重保護。

## Open Questions

- 上傳成功後預設導向該篇詳情，或留在列表只重整？（暫定：留在列表 + toast，使用者自行點入；實作時可調。）
