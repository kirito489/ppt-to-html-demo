# Tasks

逐塊實作，每個 `## N.` 群組＝一塊一 commit；引擎邏輯走 TDD（先寫 spec 跑到 RED → 實作 → GREEN），每塊收尾跑 triad（typecheck/lint/test）全綠再勾選與提交。

## 1. 形狀堆疊順序（z-index）還原（引擎，TDD）

- [x] 1.1 在 `ConvertPptService.spec.ts`（或新 `ConvertPptService.zorder.spec.ts`）合成 fixture：slide 含「圖片在前、文字框在後」與「文字框在前、圖片在後」兩種文件順序，斷言輸出 z-index 上下層正確；跑到 RED
- [x] 1.2 實作：掃描容器原始 XML 取得直屬子形狀型別序列（深度計數排除巢狀群組），`walkShapes` 依序列取出渲染並以共享遞增計數器賦予 `z-index`；群組遞迴沿用、計數持續累加；序列重建失敗回退附加順序
- [x] 1.3 triad 全綠後勾選並提交（feat: 引擎依文件順序還原形狀 z 上下層）

## 2. 字型與行距抑制文字溢出（引擎，TDD）

- [x] 2.1 spec 合成 fixture：文字框帶 `a:latin/a:ea` typeface 與段落 `a:lnSpc`（spcPct／spcPts），斷言輸出含對應 `font-family` 堆疊與 `line-height`；跑到 RED
- [x] 2.2 實作：文字框 `<div>` 設 `font-family`（來源字型 + `"Microsoft JhengHei","微軟正黑體","Noto Sans TC",sans-serif` fallback）與 `line-height`（spcPct→無單位、spcPts→`Xpt`）
- [x] 2.3 triad 全綠後勾選並提交（fix: 文字框補字型堆疊與行距，抑制溢出壓圖）

## 3. 項目符號與編號還原（引擎，TDD）

- [x] 3.1 spec 合成 fixture：段落含 `buChar`（Wingdings `n`）、`buAutoNum`（arabicPeriod）、`buNone`，斷言輸出對應 ■／遞增序號／無符號；跑到 RED
- [x] 3.2 實作：解析 `<a:pPr>` 的 buNone/buChar/buAutoNum；Wingdings 常用碼對應表（n=■、l=●、u=◆、p=❖…）；buAutoNum 於文字框內維護序號；套 `buClr`/`buSzPct`，以前置 `<span>`+縮排渲染
- [x] 3.3 triad 全綠後勾選並提交（feat: 還原段落項目符號與自動編號）

## 4. 文字繼承色與主題色還原（引擎，TDD）

- [x] 4.1 spec 合成 fixture：含 theme `clrScheme` + master `clrMap`，文字用 `schemeClr`，以及 run 無色但 master `txStyles` 定義色的情形；斷言輸出顏色正確；跑到 RED
- [x] 4.2 實作：讀 `ppt/theme/theme*.xml` `clrScheme` 與 master `<p:clrMap>` 建 `schemeClr→#RRGGBB` 對應；解析序：run solidFill（srgbClr/schemeClr）→ placeholder 型別自 master `txStyles` 取色 → 預設；`srgbClr` 行為不變
- [x] 4.3 triad 全綠後勾選並提交（fix: 還原文字繼承色與主題色，避免變黑）

## 5. 表格保真度（引擎，TDD）

- [x] 5.1 spec 合成 fixture：表格含 `gridCol` 欄寬、`tr h` 列高、儲存格 run 帶字級/顏色/粗體；斷言輸出 `colgroup` 欄寬、列高、儲存格樣式且不寫死字級；跑到 RED
- [x] 5.2 實作：`convertTable` 依 `tblGrid/gridCol` 產 `colgroup`、`tr h` 設列高、儲存格讀首個 run `rPr` 套字級(cqw)/顏色/粗體（沿用 D4 色彩解析），保留底色/框線
- [x] 5.3 triad 全綠後勾選並提交（fix: 表格還原欄寬/列高/儲存格樣式，避免超框被裁）

## 6. 前端預覽精簡（前端）

- [x] 6.1 `slide-preview.tsx`：移除 `mode`/`width` 狀態與「捲動」「簡報模式」「模擬寬度（手機/平板/桌機）」按鈕，固定為翻頁檢視（保留上一頁/下一頁/頁碼/鍵盤 ←/→）
- [x] 6.2 `detail.tsx`：移除「複製 HTML」按鈕與 `copyHtml`，保留「下載 HTML」「下載簡報 HTML」
- [x] 6.3 調整對應前端測試（slide-preview / detail 相關），triad（含 web 測試）全綠後勾選並提交（refactor: 詳情頁預覽只留翻頁，移除捲動/模擬寬度/複製 HTML）

## 7. 驗證

- [ ] 7.1 triad 全綠：`pnpm typecheck && pnpm lint && pnpm test`（含 api e2e 若有受影響）
- [ ] 7.2 實機驗證：將三份樣本（台股盤後／美股盤前／量化策略）放回 `storage/incoming/` 重新攝取，下載 HTML 比對原檔——美股紅字框不再被圖蓋、台股文字不溢出壓圖、UiPath 頁 ■ 與藍字還原、表格不截斷；確認準確率不異常變動、不破百
- [ ] 7.3 撰寫／更新 `smoke-test.md`（重現步驟與比對重點）

## 8. 收尾

- [ ] 8.1 更新 `tasks/lessons.md`（z-order 文件順序、繼承色/主題色、bullets、表格保真度等新教訓）與 `tasks/todo.md`
- [ ] 8.2 `openspec archive improve-fidelity-and-trim-viewer -y`（併 master specs + 移 archive）
- [ ] 8.3 提供 archive commit 指令給使用者（條列格式）
