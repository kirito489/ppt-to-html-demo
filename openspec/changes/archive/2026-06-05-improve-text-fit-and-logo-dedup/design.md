## Context

三項視覺差異：稀疏內文偏緊（行高 1.2）、密集內文溢出（無 autofit）、角落多 logo 全渲染。前兩者互相牽制（單一行高無法兩全），故以「較鬆行高 + autofit 縮字」組合解：稀疏的用 1.35 撐滿、密集的由 autofit 縮回。

## Goals / Non-Goals

**Goals:** 稀疏內文撐滿貼近 PP；密集內文 autofit 縮字塞回框不裁字；角落多 logo 只留一個（保留滿版 banner）。

**Non-Goals:** 像素級精確 autofit（估算）、依圖片內容辨識、向量圖、lvl2+ 行距繼承。

## Decisions

### D1：預設行高 1.35

`DEFAULT_LINE_HEIGHT` 1.2 → 1.35（近似微軟正黑體/Noto Sans TC 在 PP 單行間距的渲染行高）。有 `<a:lnSpc>` 者維持依來源換算。

### D2：autofit 縮放（估算）

於 `convertTextShape` 算一個框級 `scale`，再乘到該框 div 與各 run 的 cqw 字級：

- 框寬高取自 `xfrm`（own 或繼承）的 EMU；無 xfrm（fallback 整頁）時不縮放。
- 每段「顯示格數」：CJK/全形=1、其餘≈0.5；`cellsPerLine = floor(boxWidthEMU / fontSizeEMU)`（CJK 約 1em 寬）；`lines = Σ max(1, ceil(cells / cellsPerLine))`。
- `neededEMU = lines × fontSizeEMU × lineHeight`；若 `neededEMU > boxHeightEMU`，`scale = clamp(boxHeightEMU / neededEMU, MIN_AUTOFIT_SCALE, 1)`（MIN 約 0.5，避免過小）。
- 以「框內代表字級」（div baseSize）估算 fontSizeEMU 與 lineHeight；scale 一致套用到 div 與所有 run，維持相對比例。

替代方案（瀏覽器量測 / 內嵌 JS 縮放）否決：article.html 須無 JS、引擎無 DOM。估算雖非精確，但能消除明顯溢出。

### D3：角落 logo 去重

`decorGraphicsHtml` 收集非-ph pic 後分類：滿版（寬 > 50% slide）一律保留；其餘視為「角落 logo」。同一檔的角落 logo 若 ≥ 2，只保留**文件順序最後一個**（PP 通常顯示最新/最上層的當前品牌 logo）。

## Risks / Trade-offs

- [autofit 估算偏差] → CJK 約 1em 寬的假設對純中文準，中英混排略有誤；設 MIN_AUTOFIT_SCALE 與「僅在明顯超框才縮」降低過度縮放；必要時實機微調門檻。
- [行高 1.35 對某些密集框更易超框] → 由 autofit 接手縮回，整體一致。
- [logo「留最後一個」是啟發式] → 對 KGI 這類「新品牌 logo 排在後」的版型成立；若反例再調。滿版 banner 不受影響。
