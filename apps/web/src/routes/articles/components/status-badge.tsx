import type { ArticleStatus } from '../types'

const MAP: Record<string, { label: string; cls: string }> = {
  success: { label: '完整還原', cls: 'bg-green-100 text-green-700' },
  partial: { label: '部分還原', cls: 'bg-amber-100 text-amber-700' },
  failed: { label: '失敗', cls: 'bg-red-100 text-red-700' },
}

/** 轉換狀態徽章 */
export const StatusBadge = ({ status }: { status: ArticleStatus | string }) => {
  const m = MAP[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' }
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${m.cls}`}
    >
      {m.label}
    </span>
  )
}
