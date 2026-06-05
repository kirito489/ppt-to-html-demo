import { FileText, History, Home } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { type RoleCode } from '@/lib/role-codes'

export type NavItem = {
  label: string
  path: string
  icon: LucideIcon
  /** 屬於哪個 sidebar group；未指定為「無 group」固定放最上 */
  group?: string
  /** 需要的權限代碼；undefined 表示所有登入者都看得到 */
  requiredPermission?: string
  /** 粗粒度 role gate（與 requiredPermission 並用，兩者皆通才顯示） */
  requiredRoleCode?: RoleCode
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
