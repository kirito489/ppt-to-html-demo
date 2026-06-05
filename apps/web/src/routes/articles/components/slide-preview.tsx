import { useState } from 'react'
import { Button } from '@/components/ui/button'

const WIDTHS = [
  { label: '手機', value: '375px' },
  { label: '平板', value: '768px' },
  { label: '桌機', value: '100%' },
] as const

/**
 * 不跑版預覽：渲染轉換後 HTML。
 * 切換容器寬度可即時驗證「整塊等比縮放、不跑版」。
 */
export const SlidePreview = ({ html }: { html: string }) => {
  const [width, setWidth] = useState<string>('100%')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">模擬寬度：</span>
        {WIDTHS.map((w) => (
          <Button
            key={w.label}
            size="sm"
            variant={width === w.value ? 'default' : 'outline'}
            onClick={() => setWidth(w.value)}
          >
            {w.label}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border bg-muted/30 p-4">
        <div
          className="mx-auto flex flex-col gap-4 transition-[max-width]"
          style={{ maxWidth: width }}
          // 引擎輸出的 HTML 已自包含 inline 樣式（aspect-ratio + 百分比定位 + cqw），可安全直接渲染
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
