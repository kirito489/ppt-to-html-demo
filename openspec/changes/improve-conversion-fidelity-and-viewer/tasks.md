## 1. 引擎：Placeholder 座標繼承（TDD）

- [x] 1.1 先寫 spec：含 placeholder（無自身 xfrm）的合成 pptx + slideLayout，驗證標題/內文取得 layout 座標、不重疊；無對應時 fallback
- [x] 1.2 解析 slide rels → slideLayout、layout rels → slideMaster，建立 placeholder map（key=type|idx → xfrm），單次轉換內快取
- [x] 1.3 形狀無自身 xfrm 且具 `<p:ph>` 時，依 slide→layout(idx→type)→master 取座標，皆無才整頁 fallback；4.x spec 綠

## 2. 引擎：背景 / 填色 / 對齊（TDD）

- [ ] 2.1 先寫 spec：背景 solidFill、形狀 solidFill、表格儲存格填色、段落 algn 各一案
- [ ] 2.2 投影片背景：slide→layout→master `<p:bg>`（solidFill / 線性漸層）→ 套 `.ppt-slide` 背景
- [ ] 2.3 形狀 `solidFill` → 元素底色；表格儲存格 `tcPr/solidFill` → td 底色；`noFill` 透明
- [ ] 2.4 段落 `pPr@algn` → text-align；所有 2.x spec 綠

## 3. 後端：待轉換 API + /me 名稱

- [ ] 3.1 `ListPendingSourcesUseCase` + service（用 `SOURCE_STORAGE_PORT.list`）；`PptFacade.listPending`
- [ ] 3.2 `ArticleController` 新增 `GET /articles/pending`（JwtAuthGuard）回 `{ items: [{ name }] }`
- [ ] 3.3 `/me`：`LoadMemberContextPort` 補 `name`、`ProfileController` 回 `{ id, email, name, roleCode, permissionCodes }`
- [ ] 3.4 Swagger：新增 `articles/pending.yaml`、更新 `profile/get-me.yaml`（加 name）；bundle + api-client generate

## 4. 前端：個人資料 + 待轉換清單

- [ ] 4.1 首頁個人資料：顯示「名稱」（`/me` 的 name）、移除「角色」列
- [ ] 4.2 文章列表頁：上方「待轉換（N）」區塊（查 `/articles/pending`），列檔名 + 引導按「立即抓取轉換」；觸發/上傳後重整

## 5. 前端：簡報模式翻頁

- [ ] 5.1 詳情頁「轉換結果」加切換：捲動 / 簡報模式
- [ ] 5.2 簡報模式：以 `</section>` 切頁、只渲染當前頁、上一頁/下一頁 + 頁碼 + 鍵盤 ←/→

## 6. 測試 / 驗證 / 收尾

- [ ] 6.1 補/更新單元測試（引擎 placeholder/背景/填色/對齊、ListPendingSources）
- [ ] 6.2 article.e2e：`GET /articles/pending`（200/401）；`/me` 含 name
- [ ] 6.3 `pnpm typecheck && pnpm lint && pnpm test`（含 e2e）全綠
- [ ] 6.4 實機驗證：上傳→待轉換清單→抓取→詳情版面（標題/內文不疊、背景/填色還原）→簡報模式翻頁→個人資料名稱
- [ ] 6.5 更新 `tasks/lessons.md`；提供繁中 conventional commit 訊息
