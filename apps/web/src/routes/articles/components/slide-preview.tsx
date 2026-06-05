import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** 把整篇文章 HTML 拆成每頁 `<section class="ppt-slide">` 的 outerHTML */
const splitSlides = (html: string): string[] => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return Array.from(doc.querySelectorAll('section.ppt-slide')).map(
    (el) => el.outerHTML,
  )
}

/**
 * 不跑版預覽：翻頁式，一次只渲染一頁（單頁 section 自帶 aspect-ratio 與容器查詢，
 * 直接渲染即等比縮放），提供上一頁/下一頁、頁碼與鍵盤 ←/→ 翻頁。
 */
export const SlidePreview = ({ html }: { html: string }) => {
  const [current, setCurrent] = useState(0)

  const slides = useMemo(() => splitSlides(html), [html])
  // 頁數可能因 html 變動而縮減，夾住避免越界
  const page = Math.min(current, Math.max(slides.length - 1, 0))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrent((c) => Math.min(c + 1, slides.length - 1))
      } else if (e.key === 'ArrowLeft') {
        setCurrent((c) => Math.max(c - 1, 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slides.length])

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-muted/30 rounded-md border p-4">
        {slides.length > 0 ? (
          <div
            className="mx-auto"
            // 引擎輸出的 HTML 已自包含 inline 樣式（aspect-ratio + 百分比定位 + cqw），可安全直接渲染
            dangerouslySetInnerHTML={{ __html: slides[page] }}
          />
        ) : (
          <p className="text-muted-foreground text-sm">沒有可顯示的頁面。</p>
        )}
      </div>

      {slides.length > 0 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 0}
            onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
          >
            <ChevronLeft />
            上一頁
          </Button>
          <span className="text-muted-foreground text-sm tabular-nums">
            {page + 1} / {slides.length}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= slides.length - 1}
            onClick={() => setCurrent((c) => Math.min(c + 1, slides.length - 1))}
          >
            下一頁
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  )
}
