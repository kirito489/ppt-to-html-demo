## 1. 相依與環境變數

- [x] 1.1 安裝 `@types/multer`（dev）；`validate-env` 與 `.env.example` 新增 `UPLOAD_MAX_BYTES`（預設 52428800 = 50MB）

## 2. Port / Service / Facade

- [x] 2.1 `SourceStoragePort` 新增 `save(filename, buffer)`；`UploadPptUseCase`（`execute({ buffer, filename }) → { filename }`）
- [x] 2.2 `LocalFolderSourceAdapter.save`（寫入來源資料夾、同名去重）；`UploadPptService` 呼叫 `SOURCE_STORAGE_PORT.save`（不轉換）
- [x] 2.3 `PptFacade.upload(buffer, filename)`；`ppt.module` 綁定 `UPLOAD_PPT_USE_CASE`

## 3. Controller / DTO

- [x] 3.1 `ArticleController` 新增 `POST articles/upload`：`FileInterceptor('file')` + 驗證（.pptx MIME/副檔名、`UPLOAD_MAX_BYTES`）→ facade.upload，回 `{ filename }`；`JwtAuthGuard` 保護；無檔/格式錯回 400

## 4. Swagger / api-client

- [x] 4.1 新增 `docs/swagger/articles/upload.yaml`（multipart/form-data，`file` binary；200 inline `{ filename }`、400/401）並掛到 `openapi.yaml`
- [x] 4.2 `swagger:bundle` + `api-client generate`

## 5. 前端

- [ ] 5.1 文章列表頁「上傳 PPT」按鈕：隱藏 `<input type=file accept=.pptx>` + 原生 `fetch` 帶 `Authorization`，成功後 `toast`（引導按「立即抓取轉換」）
- [ ] 5.2 文章詳情頁「下載 HTML」（Blob → a[download]）與「複製 HTML」（clipboard）按鈕

## 6. 測試

- [ ] 6.1 `UploadPptService` 單元測試（呼叫 source.save、回傳存入檔名）
- [ ] 6.2 `article.e2e` 新增上傳案例（成功 200 回 filename / 未登入 401 / 非 pptx 400）
- [ ] 6.3 `pnpm typecheck && pnpm lint && pnpm test`（含 e2e）全綠

## 7. 驗證與收尾

- [ ] 7.1 實機驗證：列表上傳 .pptx → 公槽出現檔案 → 立即抓取轉換 → 文章出現 → 詳情下載/複製 HTML
- [ ] 7.2 更新 `tasks/lessons.md`（multipart 上傳 / clipboard 經驗）；提供繁中 conventional commit 訊息
