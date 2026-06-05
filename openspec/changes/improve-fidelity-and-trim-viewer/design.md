## Context

引擎 `ConvertPptService` 以 `fast-xml-parser` 的「具名鍵」模式解析 .pptx，並逐類走訪形狀（先全部 `p:sp`、再 `p:pic`、再 `p:graphicFrame`、再 `p:grpSp`）。此模式遺失「跨型別的兄弟順序」，導致 z 順序錯亂。文字樣式只讀 run 自身 `srgbClr`、表格字級寫死，造成多項保真度問題。前端詳情頁預覽含已不需要的捲動模式與寬度模擬。本次以三份真實簡報為驗證基準修正。

## Goals / Non-Goals

**Goals:**

- 還原形狀真實上下層（文件順序）。
- 文字：繼承色／主題色、項目符號／編號、字型與行距（抑制溢出）。
- 表格：欄寬／列高／儲存格字級與樣式，避免超框被裁。
- 前端：預覽僅保留翻頁，移除捲動／模擬寬度／複製 HTML。
- 不改變準確率母數定義（樣式類改動不得使準確率異常變動或 >100%）。

**Non-Goals:**

- 完整 list-level 多階繼承、`bgRef`／漸層主題填色、autofit 縮字、群組巢狀座標變換、像素級換行一致。
- 既有 DB 內已轉換文章不回溯重轉（本次只影響之後的轉換；驗證以重新攝取樣本為準）。

## Decisions

### D1：z 順序——以原始 XML 重建兄弟順序，賦予遞增 z-index

`fast-xml-parser` 具名鍵模式會遺失跨型別兄弟順序，但**保留同型別陣列的順序**。因此在 `walkShapes` 改為：先掃描該容器（spTree／grpSp）的原始 XML，取得直屬子形狀的「型別序列」（如 `[pic, pic, sp, sp, sp, sp]`，以深度計數排除巢狀群組內的標籤），再依此序列從各型別已解析陣列依序取出渲染，並以一個跨整頁共享的遞增計數器賦予每個元素 `z-index`。群組則遞迴沿用同機制，z-index 持續累加。

- 替代方案：改用 `preserveOrder: true`。否決——需重寫整支服務所有具名鍵存取，風險與成本過高。
- 風險緩解：深層巢狀群組若序列重建失敗，回退為現行「附加順序」，不致 crash。

### D2：顏色——主題色盤 + 繼承鏈

讀 `slideMaster` 的 `<p:clrMap>`（tx1/bg1/tx2/bg2→dk1/lt1/dk2/lt2…）與 `ppt/theme/theme*.xml` 的 `<a:clrScheme>` 建立 `schemeClr val → #RRGGBB` 對應。顏色解析順序：run `rPr` 的 `solidFill`（`srgbClr` 或 `schemeClr`）→ 無則依 placeholder 型別自 master `txStyles`（title/body/other lvl1 `defRPr`）取色 → 仍無則維持預設。`srgbClr` 行為不變（不退步）。

- `sysClr`、`bgRef`、漸層文字色不在範圍，未解析時回退預設。

### D3：項目符號／編號——段落層解析，前置渲染

解析 `<a:pPr>` 的 `buNone`／`buChar`／`buAutoNum`。`buChar` 以小型對應表處理 Wingdings 常用碼（`n`=■、`l`=●、`u`=◆、`p`=❖…），其餘字元直接輸出；`buAutoNum` 以「同一文字框內連續、相同階層」維護序號計數，依 `type`（arabicPeriod 等）格式化。bullet 套用 `buClr`／`buSzPct`。以段落前置 `<span>` + 縮排呈現（不靠 CSS list 樣式，與現行絕對定位段落相容）。

### D4：字型與行距——抑制溢出

文字框 `<div>` 設定 `font-family`：取 run/`bodyPr` 的 `a:latin`/`a:ea` typeface，串接 web fallback（`"Microsoft JhengHei","微軟正黑體","Noto Sans TC",sans-serif`）。行距取段落 `<a:lnSpc>`：`spcPct` → 無單位 line-height（如 100000→1.0）、`spcPts` → `Xpt`。降低替代字型行高差異造成的下溢。

### D5：表格保真度

`convertTable` 改為：依 `<a:tblGrid>/<a:gridCol w>` 產生 `<colgroup>` 欄寬比例；`<a:tr h>` 設列高（相對表格框 %）；儲存格讀首個 run `rPr` 的 `sz`/`solidFill`/`b`，套字級（cqw）/顏色/粗體；維持既有儲存格底色與框線。表格字級不再寫死 `2cqw`。

### D6：前端精簡

`slide-preview.tsx` 移除 `mode`/`width` 狀態與相關按鈕，固定為翻頁檢視（保留上一頁/下一頁/頁碼/鍵盤）。`detail.tsx` 移除「複製 HTML」按鈕與 `copyHtml`，保留下載 HTML／下載簡報 HTML。

## Risks / Trade-offs

- [z-order 重建在極端巢狀群組可能不準] → 回退附加順序；群組本就是 best-effort。
- [Wingdings 對應不完整] → 只對應常用碼，未知碼輸出原字或預設 •。
- [繼承色解析可能解不到某些 sysClr/bgRef] → 回退預設色，不造成比現況更差。
- [行距/字型仍無法 100% 對齊 PowerPoint 換行] → 目標為「貼近、不溢出」而非像素級一致（已列非目標）。
- [準確率波動] → 本次改動皆屬樣式/層級，不改變 inventory 與文字母數；驗證時須確認三份樣本準確率不異常變動、不破百。

## Migration Plan

無 DB schema 與 API 合約變更。驗證時將樣本 .pptx 放回 `storage/incoming/` 重新攝取，比對下載 HTML 與原檔。既有資料不回溯。
