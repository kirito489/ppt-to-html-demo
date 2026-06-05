# Tasks

逐塊一 commit；引擎邏輯走 TDD（RED → 實作 → GREEN），每塊收尾跑 triad 全綠再勾選與提交。

## 1. 渲染 layout/master 非 placeholder 圖片（logo）（引擎，TDD）

- [x] 1.1 spec 合成 fixture：slide 無圖、slideMaster 有一個非-ph `<p:pic>`（PNG，含 master.rels），斷言輸出含該圖 data URI、位於 slide 元素之前（z 在底）、且不影響 accuracy.image（仍為 1、不破百）；跑到 RED
- [x] 1.2 實作：新增 `decorGraphicsHtml(zip, xmlPath)` 讀該檔 spTree 的非-ph `<p:pic>` + 該檔 rels，呼叫既有 `convertPicture` 內嵌；`convertSlide` 依「master 圖 → layout 圖 → layout 裝飾文字 → slide 內容」push（master 最底）；不加入 elements
- [x] 1.3 triad 全綠後勾選並提交（feat: 渲染 layout/master 非 placeholder 圖片，補回 logo）

## 2. placeholder 字級／顏色繼承優先取 lstStyle（引擎，TDD）

- [x] 2.1 spec 合成 fixture：idx-only 內容框（無 type、run 無 sz/color），其在 layout 的 placeholder `lstStyle` lvl1 `defRPr` 設 sz=2400 與顏色；另含「僅 master txStyles 有值」的後備案例；斷言字級取 24pt（非 18pt）、顏色正確、後備仍走 txStyles；跑到 RED
- [x] 2.2 實作：`readPlaceholders` 增讀 placeholder `lstStyle` lvl1 `defRPr` 的 sz 與顏色（srgb/scheme 原值）；新增依 idx/type 比對的 lstStyle 解析；`resolveDefaultSize`／`resolveDefaultColor` 改為 placeholder lstStyle(layout→master) → master txStyles(依 type) → 預設；schemeClr 經 `resolveScheme`
- [x] 2.3 triad 全綠後勾選並提交（fix: placeholder 字級/顏色優先取 layout lstStyle，修字太小）

## 3. 驗證

- [ ] 3.1 triad 全綠：`pnpm typecheck && pnpm lint && pnpm test`
- [ ] 3.2 實機驗證：引擎重跑樣本（美股盤前/個股訊息/台股盤中/台股盤後）比對原檔——右下 logo 出現、個股訊息字級變大填滿框、台股各頁無回歸；確認準確率不破百
- [ ] 3.3 更新 `smoke-test.md`（logo 與字級檢查點）

## 4. 收尾

- [ ] 4.1 更新 `tasks/lessons.md`（layout/master 圖片渲染、placeholder lstStyle 字級繼承鏈、idx-only 框分類）與 `tasks/todo.md`
- [ ] 4.2 `openspec archive improve-master-graphics-and-text-inheritance -y`
- [ ] 4.3 提供 archive commit 指令（條列格式）
