# Tasks

逐塊一 commit；引擎邏輯走 TDD。

## 1. 預設行高 1.2 → 1.35（引擎，TDD）

- [x] 1.1 textflow.spec 改/增：無 lnSpc → `line-height:1.35`；跑到 RED
- [x] 1.2 實作：`DEFAULT_LINE_HEIGHT` 改 1.35
- [x] 1.3 triad 全綠後勾選並提交（fix: 預設行高改 1.35，稀疏內文撐滿框）

## 2. 文字框 autofit 縮放（引擎，TDD）

- [x] 2.1 spec 合成 fixture：小框塞超多字（估算超框）→ 該框字級被縮小（cqw 變小、且不低於下限）；少字框 → 字級不變；無 xfrm fallback → 不縮放；跑到 RED
- [x] 2.2 實作：`convertTextShape` 算框級 scale（字數×字寬 vs 框面積，CJK≈1em；neededEMU>boxHeightEMU 才縮，clamp[MIN,1]），乘到 div 與各 run 的 cqw 字級；常數 MIN_AUTOFIT_SCALE
- [x] 2.3 triad 全綠後勾選並提交（feat: 文字框 autofit 縮字，密集內文塞回框不溢出）

## 3. 角落 logo 去重（引擎，TDD）

- [x] 3.1 decorpic.spec 增：master 有滿版 banner + 兩個角落小 logo → 輸出保留 banner + 只留最後一個小 logo（第一個小 logo 不出現）；跑到 RED
- [x] 3.2 實作：`decorGraphicsHtml`/`collectDecorPics` 分類滿版（寬>50%）全留、角落小 logo 僅留文件順序最後一個
- [x] 3.3 triad 全綠後勾選並提交（fix: 角落多 logo 去重只留最後一個，保留 banner）

## 4. 驗證與收尾

- [x] 4.1 triad 全綠：`pnpm typecheck && pnpm lint && pnpm test`（含 e2e）
- [x] 4.2 實機驗證：四檔重跑——美股/個股訊息內文撐滿、台股盤中右欄塞回框不蓋 footer/logo、美股 logo 只剩投顧、banner 仍在；準確率不破百、無回歸
- [x] 4.3 更新 `tasks/lessons.md`、`tasks/todo.md`
- [x] 4.4 `openspec archive improve-text-fit-and-logo-dedup -y` 並提供 archive commit
