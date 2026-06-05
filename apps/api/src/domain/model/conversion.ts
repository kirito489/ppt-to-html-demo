/**
 * PPT 轉換的中介結構型別。
 * 供轉換引擎的 HTML 輸出、準確率計算與「來源元素對照」面板共用。
 */

export type SlideElementKind = 'text' | 'image' | 'table' | 'unsupported';

export type ArticleStatus = 'success' | 'partial' | 'failed';

/** 來源元素清單中的單一元素（對照面板逐條核對用） */
export interface InventoryElement {
  kind: SlideElementKind;
  /** 是否成功還原到輸出 HTML */
  restored: boolean;
  /** 文字內容（kind=text 或表格摘要） */
  text?: string;
  /** 圖片 data URI 縮圖（kind=image 且成功擷取） */
  image?: string;
  /** 表格內容，逐列逐格（kind=table） */
  tableCells?: string[][];
  /** 未支援元素的原始型別（kind=unsupported，如 chart / smartArt） */
  unsupportedType?: string;
}

/** 單頁的來源元素清單 */
export interface SlideInventory {
  /** 頁碼（1-based） */
  index: number;
  elements: InventoryElement[];
}

/** 單頁準確率明細（各值 0~1） */
export interface SlideAccuracy {
  index: number;
  coverage: number;
  text: number;
  image: number;
  overall: number;
}

/** 整篇準確率（各值 0~1） */
export interface Accuracy {
  overall: number;
  text: number;
  image: number;
  coverage: number;
  /** 每頁明細 */
  slides: SlideAccuracy[];
}

/** 準確率加權設定（三者建議相加為 1） */
export interface AccuracyWeights {
  text: number;
  image: number;
  coverage: number;
}

/** 轉換引擎輸出 */
export interface ConversionResult {
  /** 文章標題（取自簡報標題或檔名） */
  title: string;
  /** 不跑版的完整 HTML（多頁等比縮放堆疊，圖片以 data URI 內嵌） */
  html: string;
  slideCount: number;
  inventory: SlideInventory[];
  accuracy: Accuracy;
  status: ArticleStatus;
}
