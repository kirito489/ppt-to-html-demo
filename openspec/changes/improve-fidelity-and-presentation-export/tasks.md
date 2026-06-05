## 1. 前端：移除重覆按鈕

- [x] 1.1 `articles/page.tsx` 移除「待轉換」卡片內的「立即抓取轉換」按鈕，只留 header 那顆；卡片改為檔名清單 + 一行引導文字
- [x] 1.2 web typecheck/lint/test 綠

## 2. 引擎：圖片填滿形狀框（TDD）

- [ ] 2.1 先寫 spec：含 `<p:pic>` 的合成 pptx → 輸出 `<img>` 樣式含 `object-fit:fill`
- [ ] 2.2 `convertPicture` 將 `object-fit:contain` 改為 `fill`；2.x spec 綠

## 3. 引擎：Layout/Master 非 placeholder 文字渲染（TDD）

- [ ] 3.1 先寫 spec：slide 無該文字、slideLayout 有一個非 ph 文字框（如「僅供參考」）→ 輸出含該文字且位於 slide 元素之前
- [ ] 3.2 `convertSlide` 走訪 layout（必要時 master）spTree 的 `<p:sp>`，挑「有 `txBody` 且無 `<p:ph>`」者轉成定位文字，prepend 在 slide 內容前；3.x spec 綠

## 4. 引擎：無字級時字級繼承（TDD）

- [ ] 4.1 先寫 spec：master `bodyStyle` lvl1 設字級、body run 無 `sz` → 套繼承字級而非 18pt；無對應來源時退 18pt
- [ ] 4.2 解析 master `<p:txStyles>`（title/body/other × lvl）建字級表；run 無 `@_sz` 時依 ph 型別 + 段落 `lvl` 查表（layout/placeholder `lstStyle` 優先），皆無才退 18pt；4.x spec 綠

## 5. 前端：簡報匯出

- [ ] 5.1 新增 `articles/lib/build-presentation-html.ts`：以 `DOMParser` 取各 `section.ppt-slide`，組自包含 HTML（固定視窗 + `overflow:hidden` + 內嵌極簡 JS：←/→ 與點擊翻頁、頁碼、全螢幕）
- [ ] 5.2 `build-presentation-html` 單元測試：切頁數正確、輸出含翻頁 script、空輸入不爆
- [ ] 5.3 `detail.tsx` 新增「下載簡報 HTML」按鈕呼叫之；`article.html` 內嵌版不動

## 6. 測試 / 驗證 / 收尾

- [ ] 6.1 `pnpm typecheck && pnpm lint && pnpm test`（含既有引擎 spec/e2e 不回歸）全綠
- [ ] 6.2 實機驗證：美股 disclaimer 補回、圖片撐滿、內文不再溢出/被蓋；下載簡報 HTML 開瀏覽器可 ←/→ 翻頁
- [ ] 6.3 更新 `tasks/lessons.md`（如有新坑）；提供繁中 conventional commit 訊息；`openspec archive`
