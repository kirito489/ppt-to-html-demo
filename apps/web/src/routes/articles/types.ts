// 對應後端 articles 端點的回應結構（與 @app/api-client 產生型別結構相容）

export type ArticleStatus = 'success' | 'partial' | 'failed'

export type ElementKind = 'text' | 'image' | 'table' | 'unsupported'

export interface InventoryElement {
  kind: ElementKind
  restored: boolean
  text?: string | null
  image?: string | null
  tableCells?: string[][] | null
  unsupportedType?: string | null
}

export interface SlideInventory {
  index: number
  elements: InventoryElement[]
}

export interface SlideAccuracy {
  index: number
  coverage: number
  text: number
  image: number
  overall: number
}

export interface Accuracy {
  overall: number
  text: number
  image: number
  coverage: number
  slides: SlideAccuracy[]
}
