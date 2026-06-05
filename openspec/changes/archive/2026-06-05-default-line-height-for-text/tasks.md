# Tasks

一塊一 commit；引擎邏輯走 TDD。

## 1. 無 lnSpc 時套預設行高（引擎，TDD）

- [x] 1.1 `ConvertPptService.textflow.spec` 增案例：段落無 `<a:lnSpc>` → 輸出含 `line-height:1.2`；有 lnSpc 維持依來源換算；跑到 RED
- [x] 1.2 實作：`lineHeight(pPr)` 無 `<a:lnSpc>` 時回傳 `line-height:1.2;`（常數 DEFAULT_LINE_HEIGHT）
- [x] 1.3 triad 全綠後勾選並提交（fix: 文字框無 lnSpc 套預設行高 1.2，抑制溢出重疊）

## 2. 驗證與收尾

- [x] 2.1 triad 全綠：`pnpm typecheck && pnpm lint && pnpm test`
- [x] 2.2 實機驗證：引擎重跑台股盤中——右欄 600+ 字內文塞回框內、不再覆蓋頁尾/logo；其他樣本無回歸、準確率不破百
- [x] 2.3 更新 `tasks/lessons.md`、`tasks/todo.md`
- [x] 2.4 `openspec archive default-line-height-for-text -y` 並提供 archive commit
