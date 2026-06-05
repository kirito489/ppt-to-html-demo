## Context

`lineHeight(pPr)` 目前只在有 `<a:lnSpc>` 時回傳 `line-height`（spcPct→無單位、spcPts→pt），否則回傳空字串 → 瀏覽器套 `normal`。CJK 替代字型的 `normal` 約 1.4–1.5，比 PowerPoint 預設單行（約 1.2）鬆，造成多行段落溢出。

## Goals / Non-Goals

**Goals:** 無 `lnSpc` 時套接近 PP 單行的預設行高，抑制溢出且不裁字、不改字級。

**Non-Goals:** normAutofit 動態縮字、溢出裁切、字級調整。

## Decisions

### D1：無 lnSpc 預設 `line-height: 1.2`

`lineHeight(pPr)` 在無 `<a:lnSpc>` 時回傳 `line-height:1.2;`（常數 `DEFAULT_LINE_HEIGHT`）。1.2 為 PowerPoint 預設單行間距的常見近似，較瀏覽器 `normal`（CJK ~1.4–1.5）緊、又不至於黏行。有 `lnSpc` 者維持依來源換算。

- 替代值（1.0 過緊、1.5 等同現況）皆否決；1.2 為平衡點。
- 影響所有無 lnSpc 文字框（含標題）；標題多為單行，行高影響小，整體更貼近 PP。

## Risks / Trade-offs

- [少數本就寬鬆排版的框會變緊] → 1.2 仍屬正常閱讀行高，且更貼近 PP 預設，可接受。
- [極長文字仍可能微溢出] → 已知非目標；1.2 已收掉大部分，不裁字。
