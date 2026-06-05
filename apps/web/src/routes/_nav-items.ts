import { FileText, History, Home } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  path: string
  icon: LucideIcon
  /** 屬於哪個 sidebar group；未指定為「無 group」固定放最上 */
  group?: string
}

/**
 * Sidebar 導航項目宣告。
 */
export const NAV_ITEMS: NavItem[] = [
  { label: '首頁', path: '/', icon: Home },
  { label: '文章列表', path: '/articles', icon: FileText, group: 'PPT 轉換' },
  {
    label: '轉換紀錄',
    path: '/conversion-jobs',
    icon: History,
    group: 'PPT 轉換',
  },
]
