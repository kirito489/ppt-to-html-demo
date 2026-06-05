import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const WIDTHS = [
  { label: '手機', value: '375px' },
  { label: '平板', value: '768px' },
  { label: '桌機', value: '100%' },
] as const

type ViewMode = 'scroll' | 'present'

/** 把整篇文章 HTML 拆成每頁 `<section class="ppt-slide">` 的 outerHTML */
const splitSlides = (html: string): string[] => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return Array.from(doc.querySelectorAll('section.ppt-slide')).map(
    (el) => el.outerHTML,
  )
}

/**
 * 不跑版預覽：渲染轉換後 HTML。
 * - 捲動模式：整篇直排，可切換容器寬度即時驗證「整塊等比縮放、不跑版」。
 * - 簡報模式：一次只渲染一頁，提供上一頁/下一頁、頁碼與鍵盤 ←/→ 翻頁。
 */
export const SlidePreview = ({ html }: { html: string }) => {
  const [mode, setMode] = useState<ViewMode>('scroll')
  const [width, setWidth] = useState<string>('100%')
  const [current, setCurrent] = useState(0)

  const slides = useMemo(() => splitSlides(html), [html])
  // 頁數可能因 html 變動而縮減，夾住避免越界
  const page = Math.min(current, Math.max(slides.length - 1, 0))

  useEffect(() => {
    if (mode !== 'present') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrent((c) => Math.min(c + 1, slides.length - 1))
      } else if (e.key === 'ArrowLeft') {
        setCurrent((c) => Math.max(c - 1, 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, slides.length])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={mode === 'scroll' ? 'default' : 'outline'}
          onClick={() => setMode('scroll')}
        >
          捲動
        </Button>
        <Button
          size="sm"
          variant={mode === 'present' ? 'default' : 'outline'}
          onClick={() => setMode('present')}
        >
          簡報模式
        </Button>

        {mode === 'scroll' && (
          <>
            <span className="text-muted-foreground ml-2 text-xs">
              模擬寬度：
            </span>
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
          </>
        )}
      </div>

      {mode === 'scroll' ? (
        <div className="bg-muted/30 overflow-x-auto rounded-md border p-4">
          <div
            className="mx-auto flex flex-col gap-4 transition-[max-width]"
            style={{ maxWidth: width }}
            // 引擎輸出的 HTML 已自包含 inline 樣式（aspect-ratio + 百分比定位 + cqw），可安全直接渲染
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="bg-muted/30 rounded-md border p-4">
            {slides.length > 0 ? (
              <div
                className="mx-auto"
                // 單頁 section 自帶 aspect-ratio 與容器查詢，直接渲染即等比縮放
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
                onClick={() =>
                  setCurrent((c) => Math.min(c + 1, slides.length - 1))
                }
              >
                下一頁
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
