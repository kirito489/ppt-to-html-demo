# TODO

_Tasks and cross-module items tracked across sessions._

---

## 完成項目

- [x] **文字框預設行高（default-line-height-for-text，2026-06-06）** — 無 `<a:lnSpc>` 時套近 PP 單行的 `line-height:1.2`（取代瀏覽器 normal ~1.4–1.5），修台股盤中右欄長文溢出覆蓋頁尾/logo；不裁字、不改字級。TDD + triad 全綠。

- [x] **版面圖片與字級繼承（improve-master-graphics-and-text-inheritance，2026-06-06）** — 走 openspec + 逐塊 TDD，api 126／web 30／e2e 34 全綠：
  - 渲染 layout/master 非-ph 圖片（含遞迴 grpSp）→ 補回每頁右下 logo；不計準確率、不破百。
  - placeholder 字級/顏色繼承補上 layout/master placeholder 的 lstStyle（idx 優先/type 別名）→ 修個股訊息等內容框字太小（18pt→24pt）。
  - 非目標：文字溢出裁切、lvl2+ 多階繼承、EMF/WMF 向量 logo。

- [x] **保真度修正與檢視精簡（improve-fidelity-and-trim-viewer，2026-06-06）** — 以三份真實 LINE 財經簡報比對原檔修保真度 + 精簡詳情頁；走 openspec + 逐塊 TDD，api 121／web 30 全綠：
  - 引擎：①依文件順序還原形狀 z 上下層（修美股紅字框被圖蓋）②文字框補字型堆疊＋行距（抑制台股文字溢出壓圖）③項目符號 buChar(Wingdings)/buAutoNum/buNone 還原 ④繼承色＋主題色（theme clrScheme + master clrMap，修藍字變黑）⑤表格讀 gridCol 欄寬/tr h 列高/儲存格字級色粗體。
  - 前端：詳情頁預覽只留翻頁（移除捲動/模擬寬度）、移除「複製 HTML」；下載簡報 HTML 依投影片實際長寬比（修正方形簡報被裁——#3 真因）。
  - 非目標：座標對照評分（使用者決定不做）；分頁（確認誤會無 bug）；完整 list-level 多階繼承、sysClr/bgRef/漸層文字色、像素級換行一致。

- [x] **PPT → HTML 轉換 Demo（ppt-to-html-demo，2026-06-05）** — 將模板精簡為此功能專用 demo，皆 typecheck/lint/test（含 e2e）全綠：
  - 精簡模板：移除 RBAC（角色權限）、會員 CRUD、安全(IP/帳號鎖定)、recaptcha/s3/firebase/email/密碼重設；保留 Redis/Throttler/FeatureFlag/AuthLog/SystemLog/SessionIdle 與精簡登入。
  - 轉換引擎（純 JS：jszip + fast-xml-parser，無 LLM/外部服務）：解析 .pptx → 不跑版 HTML（aspect-ratio + 百分比定位 + cqw）、文字/圖片(data URI)/表格還原、未支援元素標記；準確率＝涵蓋率/文字還原率/圖片擷取率 + 加權整體 + 每頁明細。
  - 攝取：`@nestjs/schedule` 動態 CronJob 定時掃描 `SourceStoragePort`（本地資料夾模擬公槽）→ 轉換 → 持久化 → 依策略 move/delete 來源；含手動觸發 API。
  - 前端：文章列表 / 詳情（不跑版預覽 + 準確率儀表 + 來源元素對照）/ 轉換紀錄。
  - 真實簡報驗證：3 份 LINE 財經簡報整體準確率 98–99.9%。
  - **Open Questions（未做，留待正式整合）**：(1) 對照面板的 LibreOffice 原頁快照增強（demo 決定不做）；(2) 正式環境目標 HTML 編輯器需以該編輯器實測「不跑版」與樣式保留；(3) 進階效果（chart/SmartArt/漸層/群組變換）還原。

- [x] **初始包基礎建設補強（2026-05-30）** — 安全與品質四項，皆已 typecheck/lint/test 全綠：
  - Helmet HTTP 安全標頭（`main.ts`，關 CSP 以相容 Swagger UI）。
  - 健康檢查升級 liveness `/health` + readiness `/health/ready`（@nestjs/terminus 探 DB `SELECT 1` + Redis `ping()`），含 Swagger 與 e2e。
  - 可觀測性：Sentry 錯誤追蹤（`instrument.ts`，僅報未預期 500）+ Prometheus `/api/metrics`，皆 feature flag 預設關閉。
  - 測試覆蓋：後端 30.86%→86.77%（補 17 個 service/guard/infra spec），前端建 jsdom+coverage 基建並補元件/hook 測試；前後端皆設保守 coverage 門檻。

---

## 待處理

- [ ] ~~**帳號鎖定管理 CRUD（add-account-lock-management）**~~ — **已失效**：ppt-to-html-demo 精簡已移除整個 security 模組與 RBAC，此預留不再適用。若日後此 repo 不再只當 demo、要恢復安全功能，再從版控歷史取回 security 模組。
