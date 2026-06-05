## Context

純 JS 轉換引擎（`ConvertPptService`）目前只渲染 slide 自身 spTree 的形狀，layout/master 僅用於 placeholder 座標繼承與背景。實機驗證真實簡報時暴露三個保真度落差（圖片留白、layout 頁尾遺失、無 `sz` 文字過大溢出），以及一個 UI 期望落差（簡報模式應為「匯出 HTML 在瀏覽器可翻頁」）。本設計聚焦這四項治本作法與一個新匯出功能。

## Goals / Non-Goals

**Goals:**

- 圖片比照 PPT 撐滿形狀框（不留白）。
- 補回 layout/master 上的非 placeholder 文字（頁尾、免責聲明）。
- 無 `sz` 的文字 run 依 OOXML 繼承鏈取得正確字級，消除「字太大→溢出被裁/被圖蓋」。
- 文章列表頁不再有重覆的抓取按鈕。
- 提供「下載簡報 HTML」：自包含、瀏覽器可像 PPT 翻頁的獨立檔。

**Non-Goals:**

- 當 run 已帶 `sz`、純因瀏覽器與 PowerPoint 換行行數不同造成的微溢出（像素級一致）。
- 主題色 `schemeClr`、群組巢狀座標變換、chart/SmartArt 還原（沿用既有非目標）。

## Decisions

- **圖片填滿**：`<img>` 由 `object-fit:contain` 改 `fill`。PPT 的 `blipFill` 預設把圖延展填滿形狀矩形；`contain` 會在框內留白縮小，視覺上「大小不對」。`fill` 與 PPT 行為一致；作者已把框比例調成接近圖比例，失真有限。

- **Layout/Master 非 placeholder 文字**：在 `convertSlide` 解析 slide→layout→master 時，額外走訪 layout（必要時 master）spTree 的 `<p:sp>`，挑「有 `txBody` 且無 `<p:ph>`」者（頁尾、聲明等裝飾文字），以與 slide 文字相同的方式轉成定位 `<div>`，並**置於 slide 內容之前**（DOM 在前 = z-order 在底），避免蓋住正文。slide 自身已有的同位文字仍以 slide 為準。
  - 替代方案：只認特定 placeholder（ftr/sldNum/dt）。否決——本案 disclaimer 是「非 ph 自由文字框」，靠 ph 型別抓不到。

- **無 `sz` 字級繼承**：新增解析 master `<p:txStyles>`（`titleStyle`/`bodyStyle`/`otherStyle` 的 `<a:lvlNpPr><a:defRPr@sz>`），轉換時若 run 無 `@_sz`，依該形狀 placeholder 型別（title→titleStyle、body/其它→bodyStyle/otherStyle）＋段落 `@_lvl`（預設 0→lvl1）查 `defRPr@sz`；layout/placeholder 自身 `lstStyle` 若有覆寫則優先。皆查無才退回現行 18pt 預設。
  - 替代方案：直接調低 18pt 預設。否決——只是換一個猜測值，仍不準。

- **簡報匯出（前端純客戶端）**：新增 `lib/build-presentation-html.ts`，以 `DOMParser` 取 `article.html` 各 `section.ppt-slide`，組成自包含 HTML：固定視窗、`overflow:hidden` 維持不跑版、內嵌極簡 JS（←/→ 與點擊翻頁、頁碼、`requestFullscreen`）。後端與 `article.html`（內嵌版）皆不動，避免污染要嵌入富文本編輯器的乾淨輸出。

## Risks / Trade-offs

- [layout/master 文字可能重覆或位置不符] → 只取「無 ph」文字框、置於底層；slide 自身內容覆蓋其上，降低重覆觀感。
- [字級繼承解析新增分支可能影響既有輸出] → 走 TDD，新增 spec 並確保既有 `.layout`/`.style`/`.spec` 全綠。
- [object-fit:fill 對比例不符的圖會輕微變形] → 與 PPT 同行為，屬可接受取捨；保真度優先。
- [匯出 HTML 內嵌 JS] → 僅作用於「下載的獨立檔」，不進 `article.html`，不影響嵌入編輯器的安全性。
