## Context

`ConvertPptService` 目前只讀形狀「自身」的 `<a:xfrm>`、文字 run 樣式與圖片；不解析 slideLayout/slideMaster，也不處理背景與形狀填色。實測 KGI 財經簡報：標題/內文是 placeholder（無自身 xfrm，座標在 layout），背景為 slide/master 的 `p:bg`、橘底/表格底是形狀與儲存格 `solidFill`——這些都沒還原，導致版面疊在左上角、全白。本 change 補齊版面與樣式還原，並加翻頁檢視、待轉換清單、個人資料名稱。

## Goals / Non-Goals

**Goals:**
- placeholder 無自身 xfrm 時，從 layout→master 依 `type`/`idx` 繼承座標。
- 還原投影片背景（slide→layout→master `p:bg` 的 solidFill / 線性漸層）。
- 還原形狀 `solidFill` 與表格儲存格填色；段落 `algn` → text-align。
- 詳情頁簡報模式（一頁一頁 + 上下頁 + 鍵盤）。
- `GET /api/articles/pending` 列公槽待轉換檔 + 前端顯示。
- `/me` 回名稱；首頁顯示名稱、移除角色列。

**Non-Goals:**
- 主題色解析（`<p:bgRef>` / `<a:schemeClr>` 對應 theme1.xml）—第一版以 srgbClr 為主，scheme 色暫退白/略過。
- 文字 autofit 自動縮放、複雜漸層多停點、群組巢狀座標變換、字型家族對應。
- 像素級一致；目標是「明顯貼近原稿、不跑版」。

## Decisions

### D1. Layout / Master placeholder 座標繼承
解析順序：slide rels → slideLayout；layout rels → slideMaster。各自建立 placeholder map：`key = type|idx`（如 `title`、`body|2`），值為該 placeholder 的 `spPr/a:xfrm`。轉換 slide 形狀時，若該 `p:sp` 帶 `<p:nvSpPr><p:nvPr><p:ph type idx>` 且**無自身 xfrm**，依序查 slide → layout（先 idx 完全相符、再 type 相符）→ master。仍找不到才退回整頁 fallback。
- 解析這些 XML 會被快取在單次轉換的 context，避免每個形狀重讀。

### D2. 投影片背景
取背景優先序 slide `<p:cSld><p:bg>` → layout `<p:bg>` → master `<p:bg>`。支援：
- `<p:bgPr><a:solidFill><a:srgbClr val>` → `background:#RRGGBB`。
- `<a:gradFill>`（取首尾 `<a:gs><a:srgbClr>`）→ `linear-gradient(...)`。
- `<p:bgRef>`（主題色）→ 非目標，略過（維持預設）。
套到 `.ppt-slide` 的 `background`（取代寫死的 `#fff`；無背景時才用白底）。

### D3. 形狀 / 儲存格填色
- 形狀：`p:sp/p:spPr/a:solidFill/a:srgbClr` → 該定位 div 的 `background`。
- 表格儲存格：`a:tc/a:tcPr/a:solidFill/a:srgbClr` → `td` 的 `background`。
- `noFill` → 透明（不設背景）。

### D4. 段落對齊
`a:p/a:pPr@algn`（`l/ctr/r/just`）→ `text-align: left/center/right/justify`，套在段落 `<p>`。

### D5. 前端簡報模式（翻頁）
詳情頁「轉換結果」卡片加切換鈕：一般捲動 / 簡報模式。簡報模式下把 `article.html` 以 `</section>` 切成各頁字串，只渲染當前頁（`dangerouslySetInnerHTML`），提供上一頁/下一頁、頁碼、鍵盤 ←/→。純前端，不改後端輸出。

### D6. 待轉換清單
後端：`ListPendingSourcesUseCase` → `SourceStoragePort.list()` 回 `[{ name }]`；`GET /api/articles/pending`（JwtAuthGuard）。前端：列表頁上方「待轉換（N）」區塊列出檔名，提示按「立即抓取轉換」。

### D7. 個人資料名稱
`ProfileController` 改用會員載入取得名稱（`LoadMemberContextPort` 補 `name`，或新增輕量查詢）→ `/me` 回 `{ id, email, name, roleCode, permissionCodes }`。首頁個人資料顯示「名稱」，移除「角色」列。

## Risks / Trade-offs

- [layout/master 解析增加複雜度與每頁 IO] → 單次轉換內快取 layout/master 解析結果；找不到對應檔時 graceful fallback（維持現行行為）。
- [主題色背景（bgRef/schemeClr）無法還原] → 第一版略過，記為非目標；多數可見色塊用 srgbClr，已能涵蓋本案橘底/表格底。
- [placeholder 比對規則不完美（idx/type 對不上）] → 多層 fallback（idx→type→master→整頁），最差回到現狀不會更糟。
- [簡報模式以字串切 section] → 引擎輸出每頁固定為 `<section class="ppt-slide">…</section>`，切割穩定；若日後改輸出結構需同步調整切割。

## Open Questions

- 文字仍可能溢出 placeholder 框（無 autofit）→ 是否加 `overflow:hidden` 裁切或縮字？暫定先不裁切（保留可讀），視 B 完成後的實際效果再決定。
