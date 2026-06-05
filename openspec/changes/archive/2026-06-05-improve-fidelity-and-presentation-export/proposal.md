## Why

實機驗證真實 LINE 財經簡報時，發現轉換後 HTML 有數個保真度落差：圖片留白縮小、layout 上的頁尾/免責聲明被丟掉、內文字級過大導致溢出被裁或被圖片蓋住；同時使用者期望的「簡報模式」其實是「把匯出的 HTML 開在瀏覽器能像 PPT 一頁頁翻」，而非後台預覽頁的切換鈕。本次補齊這些落差並新增簡報匯出。

## What Changes

- **引擎**：圖片由 `object-fit:contain` 改為 `fill`，比照 PPT 把圖撐滿形狀框（原本 contain 會留白縮小、看起來大小不對）。
- **引擎**：渲染 slideLayout／slideMaster 上的「非 placeholder 文字框」（頁尾、免責聲明等），墊在 slide 內容之下；補回先前被丟掉的 disclaimer。
- **引擎**：文字 run 無 `sz` 時，依 placeholder 型別（title／body／other）＋段落 `lvl`，從 master `txStyles`（必要時 layout／placeholder 的 `lstStyle`）繼承字級，查不到才退回 18pt；治本「字太大 → 溢出被裁／被圖蓋」。
- **前端**：移除文章列表頁「待轉換」卡片內重覆的「立即抓取轉換」按鈕，只保留 header 那顆。
- **前端**：新增「下載簡報 HTML」——把 `article.html` 各 `section.ppt-slide` 包成自包含、可在瀏覽器像 PPT 翻頁的獨立 HTML（內嵌極簡 JS：←／→ 與點擊翻頁、頁碼、全螢幕）；既有內嵌版 `article.html` 維持不變。

非目標（延後）：當文字 run 已帶 `sz`、純因瀏覽器與 PowerPoint 換行行數不同造成的微溢出（像素級一致）。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `ppt-conversion`：圖片填滿方式、layout/master 非 placeholder 文字渲染、無 `sz` 時字級繼承三項還原規則。
- `converted-article-ui`：移除待轉換卡片內重覆按鈕；新增「下載簡報 HTML」（自包含、瀏覽器可翻頁的獨立簡報檔）。

## Impact

- 引擎：`apps/api/src/application/service/ppt/ConvertPptService.ts`（含 `.spec` / `.layout.spec` / `.style.spec`）。
- 前端：`apps/web/src/routes/articles/page.tsx`、`detail.tsx`、新增 `apps/web/src/routes/articles/lib/build-presentation-html.ts`（含單元測試）。
- 無 API／schema／swagger 變動；無相依套件異動。
- 風險：layout/master 文字渲染與字級繼承屬 OOXML 解析新增分支，以 TDD 守住既有 4.x／2.x spec 不回歸。
